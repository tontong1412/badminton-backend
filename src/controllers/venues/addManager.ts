import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const addManager = async (req: Request<{ id: string }, unknown, { userID: string }>, res: Response): Promise<void> => {
  const { userID } = req.body

  if (!userID) {
    res.status(400).json({ message: 'userID is required' })
    return
  }

  const venue = await VenueModel.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { managerUserIDs: userID } },
    { new: true },
  )

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default addManager
