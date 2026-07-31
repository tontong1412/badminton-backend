import { Request, Response } from 'express'
import SessionModel from '../../schema/session'

const getById = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const session = await SessionModel.findById(req.params.id)

  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  res.json(session)
}

export default getById