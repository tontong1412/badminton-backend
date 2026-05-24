import { Request, Response } from 'express'
import bookingUtils from '../../utils/booking'
import VenueModel from '../../schema/venue'
import { invalidateCachedVenue } from '../../utils/venueCache'

const removeHoliday = async(req: Request<{ id: string; date: string }>, res: Response): Promise<void> => {
  const venue = await VenueModel.findById(req.params.id)

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const targetDate = bookingUtils.normalizeDate(req.params.date)
  venue.holidays = venue.holidays.filter(
    (holiday) => bookingUtils.normalizeDate(holiday.date).getTime() !== targetDate.getTime(),
  )
  await venue.save()

  invalidateCachedVenue(req.params.id)
  res.json(venue)
}

export default removeHoliday