import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, SessionRegistrationDetail } from '../../type'

const removeRegistration = async(
  req: Request<{ id: string; registrationID: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse>,
): Promise<void> => {
  const registration = await sessionService.removeRegistration(req.params.id, req.params.registrationID)
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default removeRegistration