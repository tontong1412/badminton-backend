import { Request, Response } from 'express'
import bookingUtils from '../../utils/booking'
import VenueModel from '../../schema/venue'
import { invalidateCachedVenue } from '../../utils/venueCache'

interface HolidayPayload {
  date: string;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

const addHoliday = async(
  req: Request<{ id: string }, unknown, HolidayPayload>,
  res: Response,
): Promise<void> => {
  const venue = await VenueModel.findById(req.params.id)

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const targetDate = bookingUtils.normalizeDate(req.body.date)
  const remaining = venue.holidays.filter(
    (holiday) => bookingUtils.normalizeDate(holiday.date).getTime() !== targetDate.getTime(),
  )

  remaining.push({
    date: targetDate,
    isClosed: req.body.isClosed,
    openTime: req.body.openTime,
    closeTime: req.body.closeTime,
  })

  venue.holidays = remaining
  await venue.save()

  invalidateCachedVenue(req.params.id)
  res.json(venue)
}

export default addHoliday