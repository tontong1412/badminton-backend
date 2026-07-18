import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel, { VenueDocument } from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import { BookingStatus } from '../../type'
import { getCachedVenue, setCachedVenue, getCachedCourts, setCachedCourts, CourtLean } from '../../utils/venueCache'

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

const getBulkAvailability = async(req: Request, res: Response): Promise<void> => {
  const date = typeof req.query.date === 'string' ? req.query.date : null
  const courtIdsParam = typeof req.query.courtIds === 'string' ? req.query.courtIds : null
  const venueId = typeof req.query.venueId === 'string' ? req.query.venueId : null
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

  if (!venueId) {
    res.status(400).json({ message: 'venueId query is required' })
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

  const normalizedDate = new Date(date)
  normalizedDate.setHours(0, 0, 0, 0)

  const courtObjectIds = courtIds.map((id) => new Types.ObjectId(id))

  // Venue and courts are cached — only bookings need a DB round trip on warm cache
  const cachedVenue = getCachedVenue(venueId)
  const cachedCourts = getCachedCourts(venueId)

  const t0 = performance.now()
  const [fetchedCourtsRaw, allBookings, fetchedVenue] = await Promise.all([
    cachedCourts ? Promise.resolve(null) : CourtModel.find({ venueID: new Types.ObjectId(venueId), _id: { $in: courtObjectIds } }).lean(),
    BookingModel.find({
      courtID: { $in: courtObjectIds },
      date: normalizedDate,
      status: { $in: [BookingStatus.Pending, BookingStatus.Confirmed] },
    }).select({ courtID: 1, startTime: 1, endTime: 1 }).lean(),
    cachedVenue ? Promise.resolve(null) : VenueModel.findById(venueId),
  ])
  const logParts = ['bookings', ...(fetchedCourtsRaw ? ['courts'] : []), ...(fetchedVenue ? ['venue'] : [])]
  console.log(`[bulk-avail] ${logParts.join('+')} query: ${(performance.now() - t0).toFixed(1)}ms`)

  const venue: VenueDocument | null = cachedVenue ?? (fetchedVenue as VenueDocument | null)
  if (fetchedVenue) setCachedVenue(venueId, fetchedVenue as VenueDocument)

  // Build courtsById map — keyed by courtId string for O(1) lookup
  const courtsById = new Map<string, Record<string, unknown>>()
  if (cachedCourts) {
    for (const courtId of courtIds) {
      const c = cachedCourts.get(courtId)
      if (c) courtsById.set(courtId, c)
    }
  } else if (fetchedCourtsRaw) {
    for (const c of fetchedCourtsRaw as unknown as CourtLean[]) {
      courtsById.set(c._id.toHexString(), c as Record<string, unknown>)
    }
    // Cache all venue courts in background for future requests
    CourtModel.find({ venueID: new Types.ObjectId(venueId) }).lean()
      .then((all) => setCachedCourts(venueId, all as unknown as CourtLean[]))
      .catch(() => { /* best-effort */ })
  }

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  // Group bookings by courtID string for O(1) lookup
  const bookingsByCourt = new Map<string, { startTime: string; endTime: string }[]>()
  for (const booking of allBookings) {
    const cid = String(booking.courtID)
    if (!bookingsByCourt.has(cid)) bookingsByCourt.set(cid, [])
    bookingsByCourt.get(cid)!.push({ startTime: booking.startTime, endTime: booking.endTime })
  }

  const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
  const stepMinutes = venue.slotDurationMinutes ?? bookingUtils.SLOT_DURATION_MINUTES

  // Compute availability entirely in memory — zero additional DB queries
  const results = courtIds.map((courtId) => {
    const court = courtsById.get(courtId)
    if (!court) return { courtId, result: null }

    if (!schedule) {
      return { courtId, result: { date, durationMinutes: requestedDuration, court, isClosed: true, slots: [] } }
    }

    const courtBookings = bookingsByCourt.get(courtId) ?? []
    const effectiveClose = bookingUtils.addMinutes(schedule.close, -(requestedDuration - stepMinutes))
    const startSlots = bookingUtils.generateSlots(
      schedule.open, effectiveClose, stepMinutes, Number(court.slotStartOffsetMinutes ?? 0),
    )

    const slots = startSlots.map((startTime) => {
      const endTime = bookingUtils.addMinutes(startTime, requestedDuration)
      const availability = checkSlotInMemory(courtBookings, startTime, endTime)
      if (!availability.available) {
        return { startTime, endTime, available: false, reason: `Conflicts with booking ${availability.conflict}` }
      }
      return { startTime, endTime, available: true }
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
