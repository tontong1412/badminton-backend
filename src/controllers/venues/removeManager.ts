import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const removeManager = async (req: Request<{ id: string; userID: string }>, res: Response): Promise<void> => {
  const venue = await VenueModel.findByIdAndUpdate(
    req.params.id,
    { $pull: { managerUserIDs: req.params.userID } },
    { new: true },
  )

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default removeManager
