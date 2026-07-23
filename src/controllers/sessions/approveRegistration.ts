import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, ResponseLocals, SessionRegistrationDetail } from '../../type'

const approveRegistration = async(
  req: Request<{ id: string; registrationID: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse, ResponseLocals>,
): Promise<void> => {
  const registration = await sessionService.approveRegistration(
    req.params.id,
    req.params.registrationID,
    res.locals.user.id.toString(),
  )
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default approveRegistration