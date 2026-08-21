import { Request, Response } from 'express'
import { Types } from 'mongoose'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import { invalidateCachedCourts } from '../../utils/venueCache'

interface CourtAddOnPayload {
  id?: string;
  name: string;
  price: number;
  details?: string;
  isActive?: boolean;
}

interface CreateCourtPayload {
  venueID: string;
  name: string;
  description?: string;
  pricePerHour: number;
  currency: string;
  status?: 'active' | 'inactive';
  addOns?: CourtAddOnPayload[];
}

const sanitizeAddOns = (addOns: CourtAddOnPayload[] | undefined): CourtAddOnPayload[] => {
  if (!Array.isArray(addOns)) return []
  return addOns
    .filter((addOn) => addOn && typeof addOn.name === 'string' && addOn.name.trim().length > 0)
    .map((addOn) => ({
      id: addOn.id?.trim() || new Types.ObjectId().toString(),
      name: addOn.name.trim(),
      price: Number.isFinite(addOn.price) ? Number(addOn.price) : 0,
      details: addOn.details?.trim() || undefined,
      isActive: addOn.isActive !== false,
    }))
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

  const payload = {
    ...req.body,
    addOns: sanitizeAddOns(req.body.addOns),
  }

  const court = new CourtModel(payload)
  const savedCourt = await court.save()
  invalidateCachedCourts(req.body.venueID)
  res.status(201).json(savedCourt)
}

export default create