import { Request, Response } from 'express'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'

interface CreateCourtPayload {
  venueID: string;
  name: string;
  description?: string;
  pricePerHour: number;
  currency: string;
  status?: 'active' | 'inactive';
}

const create = async(
  req: Request<unknown, unknown, CreateCourtPayload>,
  res: Response,
): Promise<void> => {
  const venue = await VenueModel.findById(req.body.venueID).select({ _id: 1 })

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const court = new CourtModel(req.body)
  const savedCourt = await court.save()
  res.status(201).json(savedCourt)
}

export default create