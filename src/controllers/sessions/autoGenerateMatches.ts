import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import sessionMatchmakingService from '../../services/sessionMatchmakingService'

const autoGenerateMatches = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const session = await SessionModel.findById(req.params.id)
  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  const created = await sessionMatchmakingService.autoGenerateMatches(req.params.id)

  res.status(201).json(created)
}

export default autoGenerateMatches
