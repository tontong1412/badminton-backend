import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import sessionMatchmakingService from '../../services/sessionMatchmakingService'

const getStats = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const session = await SessionModel.findById(req.params.id).select('_id')
  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  const stats = await sessionMatchmakingService.getSessionStats(req.params.id)
  res.json(stats)
}

export default getStats
