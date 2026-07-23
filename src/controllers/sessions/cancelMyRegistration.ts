import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, ResponseLocals, SessionRegistrationDetail } from '../../type'

const cancelMyRegistration = async(
  req: Request<{ id: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse, ResponseLocals>,
): Promise<void> => {
  const playerID = res.locals.user.playerID?.toString()
  if (!playerID) {
    res.status(400).json({ message: 'No player profile linked to this account' })
    return
  }

  const registration = await sessionService.cancelPlayerRegistration(req.params.id, playerID)
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default cancelMyRegistration