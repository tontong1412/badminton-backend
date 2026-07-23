import { Request, Response } from 'express'
import SessionMatchModel from '../../schema/sessionMatch'

const getMatches = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const matches = await SessionMatchModel.find({ sessionID: req.params.id }).sort({ createdAt: 1 })
  res.json(matches)
}

export default getMatches
