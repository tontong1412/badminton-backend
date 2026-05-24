import { Request, Response } from 'express'
import CourtModel from '../../schema/court'
import VenueModel, { VenueDocument } from '../../schema/venue'
import bookingUtils from '../../utils/booking'

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

  // Fetch all courts in parallel, then group by venueID so each venue is looked up once
  const courts = await Promise.all(courtIds.map((id) => CourtModel.findById(id)))

  const venueIdSet = new Set(courts.flatMap((c) => (c ? [String(c.venueID)] : [])))
  const venueMap = new Map<string, VenueDocument | null>()
  await Promise.all(
    Array.from(venueIdSet).map(async(vid) => {
      venueMap.set(vid, await VenueModel.findById(vid))
    })
  )

  const results = await Promise.all(courtIds.map(async(courtId, idx) => {
    const court = courts[idx]
    if (!court) return { courtId, result: null }

    const venue = venueMap.get(String(court.venueID))
    if (!venue) return { courtId, result: null }

    const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
    if (!schedule) {
      return {
        courtId,
        result: {
          date,
          durationMinutes: requestedDuration,
          court,
          isClosed: true,
          slots: [],
        },
      }
    }

    const stepMinutes = venue.slotDurationMinutes ?? bookingUtils.SLOT_DURATION_MINUTES
    const effectiveClose = bookingUtils.addMinutes(schedule.close, -(requestedDuration - stepMinutes))
    const startSlots = bookingUtils.generateSlots(
      schedule.open,
      effectiveClose,
      stepMinutes,
      Number(court.get('slotStartOffsetMinutes') ?? 0),
    )

    const slots = await Promise.all(startSlots.map(async(startTime) => {
      const endTime = bookingUtils.addMinutes(startTime, requestedDuration)
      const availability = await bookingUtils.checkSlotAvailability(
        court.id as string, new Date(date), startTime, endTime,
      )
      if (!availability.available) {
        return { startTime, endTime, available: false, reason: `Conflicts with booking ${availability.conflict}` }
      }
      const gapValidation = await bookingUtils.validateBookingGap(
        court.id as string, new Date(date), startTime, endTime, venue.gapPolicy, schedule.open, schedule.close,
      )
      return { startTime, endTime, available: gapValidation.valid, reason: gapValidation.reason }
    }))

    return {
      courtId,
      result: { date, durationMinutes: requestedDuration, court, slots },
    }
  }))

  const resultMap: Record<string, unknown> = {}
  results.forEach(({ courtId, result }) => {
    if (result) resultMap[courtId] = result
  })

  res.json(resultMap)
}

export default getBulkAvailability
