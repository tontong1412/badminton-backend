import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import { SessionStatus } from '../../type'

const start = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const session = await SessionModel.findByIdAndUpdate(
    req.params.id,
    { $set: { status: SessionStatus.Ongoing, registrationOpen: false } },
    { new: true },
  )

  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  res.json(session)
}

export default start