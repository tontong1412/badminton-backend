import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const getById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const venue = await VenueModel.findById(req.params.id)

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default getById