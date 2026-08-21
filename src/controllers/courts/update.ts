import { Request, Response } from 'express'
import { Types, UpdateQuery } from 'mongoose'
import CourtModel, { CourtDocument } from '../../schema/court'
import { invalidateCachedCourts } from '../../utils/venueCache'

interface CourtAddOnPayload {
  id?: string;
  name: string;
  price: number;
  details?: string;
  isActive?: boolean;
}

interface UpdateCourtPayload extends Record<string, unknown> {
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

const update = async(req: Request<{ id: string }, unknown, UpdateCourtPayload>, res: Response): Promise<void> => {
  const payload: UpdateCourtPayload = { ...req.body }
  if ('addOns' in payload) {
    payload.addOns = sanitizeAddOns(payload.addOns)
  }

  const court = await CourtModel.findByIdAndUpdate(req.params.id, payload as UpdateQuery<CourtDocument>, { new: true })

  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  invalidateCachedCourts(String(court.venueID))
  res.json(court)
}

export default update