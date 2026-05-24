import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel, { VenueDocument } from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import { BookingStatus, GapPolicy } from '../../type'

// Pure in-memory check — no DB queries
const checkSlotInMemory = (
  bookings: { startTime: string; endTime: string }[],
  startTime: string,
  endTime: string,
): { available: boolean; conflict?: string } => {
  const targetStart = bookingUtils.timeToMinutes(startTime)
  const targetEnd = bookingUtils.timeToMinutes(endTime)
  const conflict = bookings.find((b) => {
    const bStart = bookingUtils.timeToMinutes(b.startTime)
    const bEnd = bookingUtils.timeToMinutes(b.endTime)
    return targetStart < bEnd && targetEnd > bStart
  })
  return conflict ? { available: false, conflict: `${conflict.startTime}-${conflict.endTime}` } : { available: true }
}

const validateGapInMemory = (
  bookings: { startTime: string; endTime: string }[],
  startTime: string,
  endTime: string,
  gapPolicy: GapPolicy,
  openTime: string,
  closeTime: string,
): { valid: boolean; reason?: string } => {
  if (!gapPolicy.enabled) return { valid: true }

  const intervals = [
    ...bookings.map((b) => ({ start: bookingUtils.timeToMinutes(b.startTime), end: bookingUtils.timeToMinutes(b.endTime) })),
    { start: bookingUtils.timeToMinutes(startTime), end: bookingUtils.timeToMinutes(endTime) },
  ].sort((a, b) => a.start - b.start)

  let prev = bookingUtils.timeToMinutes(openTime)
  for (const interval of intervals) {
    const gap = interval.start - prev
    if (gap > 0 && gap < gapPolicy.minimumGapMinutes) {
      return { valid: false, reason: `Booking leaves a ${gap}-minute gap, below the venue minimum of ${gapPolicy.minimumGapMinutes} minutes.` }
    }
    prev = interval.end
  }

  const finalGap = bookingUtils.timeToMinutes(closeTime) - prev
  if (finalGap > 0 && finalGap < gapPolicy.minimumGapMinutes) {
    return { valid: false, reason: `Booking leaves a ${finalGap}-minute gap before closing, below the venue minimum of ${gapPolicy.minimumGapMinutes} minutes.` }
  }

  return { valid: true }
}

const getBulkAvailability = async(req: Request, res: Response): Promise<void> => {
  const date = typeof req.query.date === 'string' ? req.query.date : null
  const courtIdsParam = typeof req.query.courtIds === 'string' ? req.query.courtIds : null
  const requestedDuration = typeof req.query.durationMinutes === 'string'
    ? Number(req.query.durationMinutes)
    : bookingUtils.SLOT_DURATION_MINUTES

  if (!date) {
    res.status(400).json({ message: 'date query is required' })
    return
  }

  if (!courtIdsParam) {
    res.status(400).json({ message: 'courtIds query is required' })
    return
  }

  if (
    Number.isNaN(requestedDuration)
    || requestedDuration < bookingUtils.SLOT_DURATION_MINUTES
    || requestedDuration % bookingUtils.SLOT_DURATION_MINUTES !== 0
  ) {
    res.status(400).json({ message: 'durationMinutes must be at least 30 and divisible by 30.' })
    return
  }

  const courtIds = courtIdsParam.split(',').map((id) => id.trim()).filter(Boolean)

  // 1) Fetch courts, venues, and ALL bookings for all courts on this date — 3 queries total
  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)

  const [courts, allBookings] = await Promise.all([
    Promise.all(courtIds.map((id) => CourtModel.findById(id))),
    BookingModel.find({
      courtID: { $in: courtIds.map((id) => new Types.ObjectId(id)) },
      date: normalizedDate,
      status: { $in: [BookingStatus.Pending, BookingStatus.Confirmed] },
    }).select({ courtID: 1, startTime: 1, endTime: 1 }).lean(),
  ])

  // Group bookings by courtID string for O(1) lookup
  const bookingsByCourt = new Map<string, { startTime: string; endTime: string }[]>()
  for (const booking of allBookings) {
    const cid = String(booking.courtID)
    if (!bookingsByCourt.has(cid)) bookingsByCourt.set(cid, [])
    bookingsByCourt.get(cid)!.push({ startTime: booking.startTime, endTime: booking.endTime })
  }

  // 2) Fetch each unique venue once
  const venueIdSet = new Set(courts.flatMap((c) => (c ? [String(c.venueID)] : [])))
  const venueMap = new Map<string, VenueDocument | null>()
  await Promise.all(
    Array.from(venueIdSet).map(async(vid) => {
      venueMap.set(vid, await VenueModel.findById(vid))
    })
  )

  // 3) Compute availability entirely in memory — zero additional DB queries
  const results = courtIds.map((courtId, idx) => {
    const court = courts[idx]
    if (!court) return { courtId, result: null }

    const venue = venueMap.get(String(court.venueID))
    if (!venue) return { courtId, result: null }

    const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
    if (!schedule) {
      return { courtId, result: { date, durationMinutes: requestedDuration, court, isClosed: true, slots: [] } }
    }

    const courtBookings = bookingsByCourt.get(courtId) ?? []
    const stepMinutes = venue.slotDurationMinutes ?? bookingUtils.SLOT_DURATION_MINUTES
    const effectiveClose = bookingUtils.addMinutes(schedule.close, -(requestedDuration - stepMinutes))
    const startSlots = bookingUtils.generateSlots(
      schedule.open, effectiveClose, stepMinutes, Number(court.get('slotStartOffsetMinutes') ?? 0),
    )

    const slots = startSlots.map((startTime) => {
      const endTime = bookingUtils.addMinutes(startTime, requestedDuration)
      const availability = checkSlotInMemory(courtBookings, startTime, endTime)
      if (!availability.available) {
        return { startTime, endTime, available: false, reason: `Conflicts with booking ${availability.conflict}` }
      }
      const gapValidation = validateGapInMemory(courtBookings, startTime, endTime, venue.gapPolicy, schedule.open, schedule.close)
      return { startTime, endTime, available: gapValidation.valid, reason: gapValidation.reason }
    })

    return { courtId, result: { date, durationMinutes: requestedDuration, court, slots } }
  })

  const resultMap: Record<string, unknown> = {}
  results.forEach(({ courtId, result }) => {
    if (result) resultMap[courtId] = result
  })

  res.json(resultMap)
}

export default getBulkAvailability
