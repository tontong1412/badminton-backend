import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const setFacilities = async(
  req: Request<{ id: string }, unknown, { facilities: string[] }>,
  res: Response,
): Promise<void> => {
  const { facilities } = req.body
  if (!Array.isArray(facilities)) {
    res.status(400).json({ message: 'facilities must be an array of strings.' })
    return
  }

  const venue = await VenueModel.findByIdAndUpdate(
    req.params.id,
    { facilities },
    { new: true },
  )

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default setFacilities
