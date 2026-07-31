import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, SessionRegistrationDetail } from '../../type'

const rejectRegistration = async(
  req: Request<{ id: string; registrationID: string }>,
  res: Response<SessionRegistrationDetail | ErrorResponse>,
): Promise<void> => {
  const registration = await sessionService.rejectRegistration(req.params.id, req.params.registrationID)
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default rejectRegistration