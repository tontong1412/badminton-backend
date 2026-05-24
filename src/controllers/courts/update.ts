import { Request, Response } from 'express'
import { UpdateQuery } from 'mongoose'
import CourtModel, { CourtDocument } from '../../schema/court'
import { invalidateCachedCourts } from '../../utils/venueCache'

const update = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const court = await CourtModel.findByIdAndUpdate(req.params.id, req.body as UpdateQuery<CourtDocument>, { new: true })

  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  invalidateCachedCourts(String(court.venueID))
  res.json(court)
}

export default update