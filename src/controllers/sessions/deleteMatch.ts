import { Request, Response } from 'express'
import SessionMatchModel from '../../schema/sessionMatch'

const deleteMatch = async(req: Request<{ id: string; matchID: string }>, res: Response): Promise<void> => {
  const match = await SessionMatchModel.findOne({ _id: req.params.matchID, sessionID: req.params.id })
  if (!match) {
    res.status(404).json({ message: 'Match not found' })
    return
  }

  await match.deleteOne()
  res.status(204).send()
}

export default deleteMatch
