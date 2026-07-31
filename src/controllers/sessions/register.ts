import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, ResponseLocals, SessionRegistrationDetail } from '../../type'

const register = async(
  req: Request<{ id: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse, ResponseLocals>,
): Promise<void> => {
  const playerID = res.locals.user.playerID?.toString()
  if (!playerID) {
    res.status(400).json({ message: 'No player profile linked to this account' })
    return
  }

  const registration = await sessionService.registerPlayer({
    sessionID: req.params.id,
    playerID,
    actorUserID: res.locals.user.id.toString(),
  })

  const detail = await sessionService.getRegistrationDetail(req.params.id, playerID)
  res.status(201).json(detail ?? registration.toJSON() as SessionRegistrationDetail)
}

export default register