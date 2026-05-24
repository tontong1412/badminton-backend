import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'
import { invalidateCachedVenue } from '../../utils/venueCache'

interface SchedulePayload {
  weeklySchedule?: Record<string, { open: string; close: string } | null>;
  gapPolicy?: { enabled: boolean; minimumGapMinutes: 30 | 60 };
}

const setSchedule = async(
  req: Request<{ id: string }, unknown, SchedulePayload>,
  res: Response,
): Promise<void> => {
  if (req.body.gapPolicy?.enabled && ![30, 60].includes(req.body.gapPolicy.minimumGapMinutes)) {
    res.status(400).json({ message: 'minimumGapMinutes must be 30 or 60.' })
    return
  }

  const venue = await VenueModel.findByIdAndUpdate(
    req.params.id,
    {
      ...(req.body.weeklySchedule ? { weeklySchedule: req.body.weeklySchedule } : {}),
      ...(req.body.gapPolicy ? { gapPolicy: req.body.gapPolicy } : {}),
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