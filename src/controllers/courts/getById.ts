import { Request, Response } from 'express'
import CourtModel from '../../schema/court'

const getById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const court = await CourtModel.findById(req.params.id)

  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  res.json(court)
}

export default getById