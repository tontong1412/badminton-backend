import { Request, Response } from 'express'
import BookingModel, { BookingDocument } from '../../schema/booking'
import { BookingStatus, ResponseLocals } from '../../type'

type BookingTab = 'active' | 'past' | 'cancelled'

interface PagedBookingsQuery {
  tab?: BookingTab;
  limit?: string;
  cursor?: string;
}

interface BookingGroup {
  groupKey: string;
  bookings: BookingDocument[];
  dateTimeValue: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  isActive: boolean;
}

const DEFAULT_LIMITS: Record<BookingTab, number> = {
  active: 10,
  past: 5,
  cancelled: 5,
}

const MAX_LIMIT = 50

const getBookingDateBundleGroupKey = (booking: BookingDocument): string => {
  const bookingId = typeof booking.id === 'string' ? booking.id : String(booking.id)
  const bundlePart = booking.bookingBundleID ? String(booking.bookingBundleID) : `single-${bookingId}`
  const bookingDate = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : String(booking.date)
  return `${bookingDate}::${bundlePart}`
}

const toDateTimeValue = (date: Date, time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  const dateTime = new Date(date)
  dateTime.setHours(hours || 0, minutes || 0, 0, 0)
  return dateTime.getTime()
}

const getEffectiveStatus = (bookings: BookingDocument[]): 'confirmed' | 'pending' | 'cancelled' => {
  const allCancelled = bookings.every((booking) => booking.status === BookingStatus.Cancelled)
  if (allCancelled) {
    return 'cancelled'
  }

  const nonCancelled = bookings.filter((booking) => booking.status !== BookingStatus.Cancelled)
  const allConfirmed = nonCancelled.length > 0 && nonCancelled.every((booking) => booking.status === BookingStatus.Confirmed)
  return allConfirmed ? 'confirmed' : 'pending'
}

const isActiveGroup = (bookings: BookingDocument[]): boolean => {
  const nonCancelled = bookings.filter((booking) => booking.status !== BookingStatus.Cancelled)
  const source = nonCancelled.length > 0 ? nonCancelled : bookings
  const lastBooking = source[source.length - 1]

  if (!lastBooking) {
    return false
  }

  const lastEndTime = toDateTimeValue(lastBooking.date, lastBooking.endTime)
  return lastEndTime > Date.now()
}

const get = async(req: Request<unknown, unknown, unknown, PagedBookingsQuery>, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const tab: BookingTab = req.query.tab === 'past' || req.query.tab === 'cancelled' ? req.query.tab : 'active'
  const parsedLimit = Number(req.query.limit)
  const requestedLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : DEFAULT_LIMITS[tab]
  const limit = Math.min(requestedLimit, MAX_LIMIT)

  const allBookings = await BookingModel.find({ userID: res.locals.user.id })
    .populate('resaleListingID', 'subStartTime subEndTime status')
    .sort({ date: -1, startTime: -1, _id: -1 })

  const groupedMap = new Map<string, BookingDocument[]>()
  for (const booking of allBookings) {
    const key = getBookingDateBundleGroupKey(booking)
    const existing = groupedMap.get(key) || []
    existing.push(booking)
    groupedMap.set(key, existing)
  }

  const groupedBookings: BookingGroup[] = Array.from(groupedMap.entries()).map(([groupKey, bookings]) => {
    const sortedBookings = [...bookings].sort((a, b) => toDateTimeValue(a.date, a.startTime) - toDateTimeValue(b.date, b.startTime))
    const nonCancelled = sortedBookings.filter((booking) => booking.status !== BookingStatus.Cancelled)
    const firstReference = nonCancelled[0] ?? sortedBookings[0]
    const dateTimeValue = firstReference ? toDateTimeValue(firstReference.date, firstReference.startTime) : 0
    const status = getEffectiveStatus(sortedBookings)
    return {
      groupKey,
      bookings: sortedBookings,
      dateTimeValue,
      status,
      isActive: isActiveGroup(sortedBookings),
    }
  })

  const filteredGroups = groupedBookings
    .filter((group) => {
      if (tab === 'cancelled') {
        return group.status === 'cancelled'
      }
      if (group.status === 'cancelled') {
        return false
      }
      return tab === 'active' ? group.isActive : !group.isActive
    })
    .sort((a, b) => {
      if (a.dateTimeValue !== b.dateTimeValue) {
        return tab === 'active' ? a.dateTimeValue - b.dateTimeValue : b.dateTimeValue - a.dateTimeValue
      }
      return a.groupKey.localeCompare(b.groupKey)
    })

  const cursor = req.query.cursor
  const startIndex = cursor
    ? Math.max(0, filteredGroups.findIndex((group) => group.groupKey === cursor) + 1)
    : 0

  const pageGroups = filteredGroups.slice(startIndex, startIndex + limit)
  const nextIndex = startIndex + pageGroups.length
  const hasMore = nextIndex < filteredGroups.length
  const nextCursor = hasMore ? pageGroups[pageGroups.length - 1]?.groupKey ?? null : null
  const bookings = pageGroups.flatMap((group) => group.bookings)

  res.json({
    tab,
    limit,
    bookings,
    hasMore,
    nextCursor,
  })
}

export default get