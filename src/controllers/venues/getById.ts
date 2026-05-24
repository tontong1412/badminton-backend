import { Request, Response } from 'express'
import { Types } from 'mongoose'
import VenueModel from '../../schema/venue'

const getById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: 'Invalid venue ID' })
    return
  }

  const venue = await VenueModel.findById(req.params.id)

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const venueObj = venue.toJSON() as Record<string, unknown>

  // Never expose the encrypted API key to clients
  if (venueObj.slipok) {
    const slipok = venueObj.slipok as Record<string, unknown>
    venueObj.slipok = { branchId: slipok.branchId, hasApiKey: !!slipok.apiKey, enabled: slipok.enabled ?? false }
  }

  res.json(venueObj)
}

export default getById