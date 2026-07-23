import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import { ResponseLocals } from '../../type'

const getMine = async(_req: Request, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const sessions = await SessionModel.find({ organizerUserIDs: res.locals.user.id }).sort({ date: 1, startTime: 1 })
  res.json(sessions)
}

export default getMine