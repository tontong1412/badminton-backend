import { Request, Response } from 'express'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'

const getAvailability = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const date = typeof req.query.date === 'string' ? req.query.date : null
  const requestedDuration = typeof req.query.durationMinutes === 'string'
    ? Number(req.query.durationMinutes)
    : bookingUtils.SLOT_DURATION_MINUTES

  if (!date) {
    res.status(400).json({ message: 'date query is required' })
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

  const court = await CourtModel.findById(req.params.id)
  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  const venue = await VenueModel.findById(court.venueID)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
  if (!schedule) {
    res.json({
      date,
      court,
      isClosed: true,
      gapPolicy: venue.gapPolicy,
      slots: [],
    })
    return
  }

  // Step every slotDurationMinutes (venue setting) so all overlapping windows are shown.
  // Adjust the effective close so only starts where startTime + requestedDuration <= closeTime are included.
  const stepMinutes = venue.slotDurationMinutes ?? bookingUtils.SLOT_DURATION_MINUTES
  const effectiveClose = bookingUtils.addMinutes(schedule.close, -(requestedDuration - stepMinutes))
  const startSlots = bookingUtils.generateSlots(schedule.open, effectiveClose, stepMinutes, Number(court.get('slotStartOffsetMinutes') ?? 0))
  const slotResults = await Promise.all(startSlots.map(async(startTime) => {
    const endTime = bookingUtils.addMinutes(startTime, requestedDuration)
    const availability = await bookingUtils.checkSlotAvailability(court.id, new Date(date), startTime, endTime)
    if (!availability.available) {
      return {
        startTime,
        endTime,
        available: false,
        reason: `Conflicts with booking ${availability.conflict}`,
      }
    }

    const gapValidation = await bookingUtils.validateBookingGap(
      court.id,
      new Date(date),
      startTime,
      endTime,
      venue.gapPolicy,
      schedule.open,
      schedule.close,
    )

    return {
      startTime,
      endTime,
      available: gapValidation.valid,
      reason: gapValidation.reason,
    }
  }))

  res.json({
    date,
    durationMinutes: requestedDuration,
    court,
    venue: {
      id: venue.id,
      name: venue.name,
      gapPolicy: venue.gapPolicy,
      openTime: schedule.open,
      closeTime: schedule.close,
    },
    slots: slotResults,
  })
}

export default getAvailability