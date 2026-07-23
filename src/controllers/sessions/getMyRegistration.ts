import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, ResponseLocals, SessionRegistrationDetail } from '../../type'

const getMyRegistration = async(
  req: Request<{ id: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse, ResponseLocals>,
): Promise<void> => {
  const playerID = res.locals.user.playerID?.toString()
  if (!playerID) {
    res.status(404).json({ message: 'No player profile linked to this account' })
    return
  }

  const registration = await sessionService.getRegistrationDetail(req.params.id, playerID)
  if (!registration) {
    res.status(404).json({ message: 'Registration not found' })
    return
  }

  res.json(registration)
}

export default getMyRegistration