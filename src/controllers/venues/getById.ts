import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const getById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
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