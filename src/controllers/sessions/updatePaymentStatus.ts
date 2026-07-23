import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, SessionRegistrationDetail, SessionRegistrationPaymentStatus } from '../../type'

interface UpdatePaymentStatusBody {
  paymentStatus: SessionRegistrationPaymentStatus;
}

const updatePaymentStatus = async(
  req: Request<{ id: string; registrationID: string }, unknown, UpdatePaymentStatusBody>,
  res: Response<SessionRegistrationDetail | ErrorResponse>,
): Promise<void> => {
  const registration = await sessionService.updatePaymentStatus(req.params.id, req.params.registrationID, req.body.paymentStatus)
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default updatePaymentStatus