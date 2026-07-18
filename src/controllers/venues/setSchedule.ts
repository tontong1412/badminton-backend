import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'
import { invalidateCachedVenue } from '../../utils/venueCache'

interface SchedulePayload {
  weeklySchedule?: Record<string, { open: string; close: string } | null>;
}

const setSchedule = async(
  req: Request<{ id: string }, unknown, SchedulePayload>,
  res: Response,
): Promise<void> => {
  const venue = await VenueModel.findByIdAndUpdate(
    req.params.id,
    {
      ...(req.body.weeklySchedule ? { weeklySchedule: req.body.weeklySchedule } : {}),
    },
    { new: true },
  )

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  invalidateCachedVenue(req.params.id)
  res.json(venue)
}

export default setSchedule