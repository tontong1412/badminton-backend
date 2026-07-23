import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import { SessionStatus, SessionType } from '../../type'

interface SessionListQuery {
  status?: SessionStatus;
  type?: SessionType;
  venueID?: string;
  organizerUserID?: string;
  registrationOpen?: string;
}

const get = async(req: Request<unknown, unknown, unknown, SessionListQuery>, res: Response): Promise<void> => {
  const query: Record<string, unknown> = {}

  if (req.query.status) query.status = req.query.status
  if (req.query.type) query.type = req.query.type
  if (req.query.venueID) query.venueID = req.query.venueID
  if (req.query.organizerUserID) query.organizerUserIDs = req.query.organizerUserID
  if (req.query.registrationOpen !== undefined) query.registrationOpen = req.query.registrationOpen === 'true'

  const sessions = await SessionModel.find(query).sort({ date: 1, startTime: 1 })
  res.json(sessions)
}

export default get