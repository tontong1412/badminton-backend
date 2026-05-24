import { Request, Response } from 'express'
import ResaleListingModel from '../../schema/resaleListing'

const getListingById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const listing = await ResaleListingModel.findById(req.params.id).populate('bookingID')

  if (!listing) {
    res.status(404).json({ message: 'Resale listing not found' })
    return
  }

  res.json(listing)
}

export default getListingById