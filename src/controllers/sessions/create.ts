import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import { ResponseLocals } from '../../type'
import { buildSessionDocumentPayload, buildSessionStatus, SessionPayload } from './shared'

const create = async(
  req: Request<unknown, unknown, SessionPayload>,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  const organizerUserIDs = Array.from(new Set([
    String(res.locals.user.id),
    ...(req.body.organizerUserIDs ?? []).map(String),
  ]))
  const sessionPayload = await buildSessionDocumentPayload(req.body, organizerUserIDs)

  const session = new SessionModel({
    ...sessionPayload,
    status: buildSessionStatus(0, sessionPayload.maxParticipants),
  })

  const savedSession = await session.save()
  res.status(201).json(savedSession)
}

export default create