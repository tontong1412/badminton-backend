import { Types } from 'mongoose'
import BookingModel from '../schema/booking'
import { BookingStatus, GapPolicy } from '../type'

const SLOT_DURATION_MINUTES = 30
const MIN_BOOKING_MINUTES = 60

const normalizeDate = (value: Date | string): Date => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error('Invalid time format. Expected HH:mm.')
  }

  return hours * 60 + minutes
}

const minutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const addMinutes = (time: string, minutes: number): string => {
  return minutesToTime(timeToMinutes(time) + minutes)
}

const calculateDurationMinutes = (startTime: string, endTime: string): number => {
  return timeToMinutes(endTime) - timeToMinutes(startTime)
}

const isThirtyMinuteBoundary = (time: string): boolean => {
  return timeToMinutes(time) % SLOT_DURATION_MINUTES === 0
}

const generateSlots = (openTime: string, closeTime: string, durationMinutes: number, startOffsetMinutes = 0): string[] => {
  const slots: string[] = []
  const openMinutes = timeToMinutes(openTime)
  const closeMinutes = timeToMinutes(closeTime)

  // Find first cursor that is >= open and aligns to the offset within each duration block
  const offsetInBlock = startOffsetMinutes % durationMinutes
  let cursor = openMinutes
  if (offsetInBlock > 0) {
    // advance to first slot whose minutes-of-block match offsetInBlock
    const remainder = (openMinutes - offsetInBlock) % durationMinutes
    if (remainder !== 0) cursor = openMinutes + (durationMinutes - remainder)
    // if openMinutes itself already sits at the right offset, keep it
    if ((openMinutes - offsetInBlock) % durationMinutes === 0) cursor = openMinutes
  }

  for (; cursor + durationMinutes <= closeMinutes; cursor += durationMinutes) {
    slots.push(minutesToTime(cursor))
  }

  return slots
}

const getVenueScheduleForDate = (
  venue: {
    weeklySchedule?: Record<string, { open: string; close: string } | null>;
    holidays?: { date: Date; isClosed: boolean; openTime?: string; closeTime?: string }[];
  },
  value: Date | string,
): { open: string; close: string } | null => {
  const date = normalizeDate(value)
  const holiday = venue.holidays?.find((entry) => normalizeDate(entry.date).getTime() === date.getTime())

  if (holiday) {
    if (holiday.isClosed) {
      return null
    }

    if (holiday.openTime && holiday.closeTime) {
      return { open: holiday.openTime, close: holiday.closeTime }
    }
  }

  const dayKey = String(date.getDay())
  return venue.weeklySchedule?.[dayKey] ?? null
}

const validateBookingWindow = (startTime: string, endTime: string, options?: { skipMinDuration?: boolean }): void => {
  if (!isThirtyMinuteBoundary(startTime) || !isThirtyMinuteBoundary(endTime)) {
    throw new Error('Booking time must align to 30-minute increments.')
  }

  const durationMinutes = calculateDurationMinutes(startTime, endTime)
  if (!options?.skipMinDuration && durationMinutes < MIN_BOOKING_MINUTES) {
    throw new Error('Minimum booking duration is 60 minutes.')
  }

  if (durationMinutes % SLOT_DURATION_MINUTES !== 0) {
    throw new Error('Booking duration must align to 30-minute increments.')
  }
}

const getActiveBookingsForDate = async(
  courtID: string | Types.ObjectId,
  date: Date,
  excludeBookingIDs?: string | string[],
) => {
  const query = {
    courtID,
    date: normalizeDate(date),
    status: { $in: [BookingStatus.Pending, BookingStatus.Confirmed] },
  }

  const bookings = await BookingModel.find(query)
    .sort({ startTime: 1 })
    .select({ startTime: 1, endTime: 1, status: 1 })

  if (!excludeBookingIDs) {
    return bookings
  }

  const excludeSet = new Set(Array.isArray(excludeBookingIDs) ? excludeBookingIDs : [excludeBookingIDs])
  return bookings.filter((booking) => !excludeSet.has(booking.id as string))
}

const checkSlotAvailability = async(
  courtID: string | Types.ObjectId,
  date: Date,
  startTime: string,
  endTime: string,
  excludeBookingIDs?: string | string[],
): Promise<{ available: boolean; conflict?: string }> => {
  const bookings = await getActiveBookingsForDate(courtID, date, excludeBookingIDs)
  const targetStart = timeToMinutes(startTime)
  const targetEnd = timeToMinutes(endTime)

  const conflict = bookings.find((booking) => {
    const bookingStart = timeToMinutes(booking.startTime)
    const bookingEnd = timeToMinutes(booking.endTime)
    return targetStart < bookingEnd && targetEnd > bookingStart
  })

  if (conflict) {
    return {
      available: false,
      conflict: `${conflict.startTime}-${conflict.endTime}`,
    }
  }

  return { available: true }
}

const validateBookingGap = async(
  courtID: string | Types.ObjectId,
  date: Date,
  startTime: string,
  endTime: string,
  gapPolicy: GapPolicy,
  openTime: string,
  closeTime: string,
  excludeBookingID?: string,
): Promise<{ valid: boolean; reason?: string }> => {
  if (!gapPolicy.enabled) {
    return { valid: true }
  }

  const bookings = await getActiveBookingsForDate(courtID, date, excludeBookingID)
  const intervals = bookings.map((booking) => ({
    start: timeToMinutes(booking.startTime),
    end: timeToMinutes(booking.endTime),
  }))

  intervals.push({ start: timeToMinutes(startTime), end: timeToMinutes(endTime) })
  intervals.sort((left, right) => left.start - right.start)

  let previousEnd = timeToMinutes(openTime)
  const closeBoundary = timeToMinutes(closeTime)

  for (const interval of intervals) {
    const gap = interval.start - previousEnd
    if (gap > 0 && gap < gapPolicy.minimumGapMinutes) {
      return {
        valid: false,
        reason: `Booking leaves a ${gap}-minute gap, below the venue minimum of ${gapPolicy.minimumGapMinutes} minutes.`,
      }
    }
    previousEnd = interval.end
  }

  const finalGap = closeBoundary - previousEnd
  if (finalGap > 0 && finalGap < gapPolicy.minimumGapMinutes) {
    return {
      valid: false,
      reason: `Booking leaves a ${finalGap}-minute gap before closing, below the venue minimum of ${gapPolicy.minimumGapMinutes} minutes.`,
    }
  }

  return { valid: true }
}

const calculateTotalPrice = (pricePerHour: number, durationMinutes: number): number => {
  return Number(((pricePerHour / 60) * durationMinutes).toFixed(2))
}

/**
 * Calculates total price for a booking by splitting the booking window into
 * segments and applying the matching pricing rule (or fallback pricePerHour)
 * to each segment.
 */
export const calculateTotalPriceWithRules = (
  court: { pricePerHour: number; pricingRules?: Array<{ startTime: string; endTime: string; pricePerHour: number }> },
  startTime: string,
  endTime: string,
): number => {
  const rules = court.pricingRules ?? []
  const bookingStart = timeToMinutes(startTime)
  const bookingEnd = timeToMinutes(endTime)

  if (rules.length === 0) {
    return calculateTotalPrice(court.pricePerHour, bookingEnd - bookingStart)
  }

  // Collect all boundary points within the booking window
  const boundaries = new Set<number>([bookingStart, bookingEnd])
  for (const rule of rules) {
    const rs = timeToMinutes(rule.startTime)
    const re = timeToMinutes(rule.endTime)
    if (rs > bookingStart && rs < bookingEnd) boundaries.add(rs)
    if (re > bookingStart && re < bookingEnd) boundaries.add(re)
  }

  const sorted = Array.from(boundaries).sort((a, b) => a - b)

  let total = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    const segStart = sorted[i]
    const segEnd = sorted[i + 1]
    const duration = segEnd - segStart
    const rule = rules.find(
      (r) => timeToMinutes(r.startTime) <= segStart && timeToMinutes(r.endTime) >= segEnd,
    )
    const price = rule ? rule.pricePerHour : court.pricePerHour
    total += (price / 60) * duration
  }

  return Number(total.toFixed(2))
}

const enumerateRecurringDates = (
  pattern: 'daily' | 'weekly',
  rangeStart: Date,
  rangeEnd: Date,
  daysOfWeek?: number[],
): Date[] => {
  const start = normalizeDate(rangeStart)
  const end = normalizeDate(rangeEnd)
  const dates: Date[] = []

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    if (pattern === 'weekly' && daysOfWeek && !daysOfWeek.includes(cursor.getDay())) {
      continue
    }

    dates.push(new Date(cursor))
  }

  return dates
}

export default {
  SLOT_DURATION_MINUTES,
  MIN_BOOKING_MINUTES,
  normalizeDate,
  timeToMinutes,
  minutesToTime,
  addMinutes,
  calculateDurationMinutes,
  isThirtyMinuteBoundary,
  generateSlots,
  getVenueScheduleForDate,
  validateBookingWindow,
  checkSlotAvailability,
  validateBookingGap,
  calculateTotalPrice,
  calculateTotalPriceWithRules,
  enumerateRecurringDates,
}