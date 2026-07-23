import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, ResponseLocals, SessionRegistrationDetail } from '../../type'

interface AddRegistrationBody {
  playerID: string;
  note?: string;
}

const addRegistration = async(
  req: Request<{ id: string }, unknown, AddRegistrationBody>,
  res: Response<SessionRegistrationDetail | ErrorResponse, ResponseLocals>,
): Promise<void> => {
  const registration = await sessionService.registerPlayer({
    sessionID: req.params.id,
    playerID: req.body.playerID,
    actorUserID: res.locals.user.id.toString(),
    manual: true,
    note: req.body.note,
  })

  const detail = await sessionService.getRegistrationDetail(req.params.id, req.body.playerID)
  res.status(201).json(detail ?? registration.toJSON() as SessionRegistrationDetail)
}

export default addRegistration