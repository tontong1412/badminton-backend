import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { ErrorResponse, SessionAttendanceStatus, SessionRegistrationDetail } from '../../type'

interface UpdateAttendanceStatusBody {
  attendanceStatus: SessionAttendanceStatus;
}

const updateAttendanceStatus = async(
  req: Request<{ id: string; registrationID: string }, unknown, UpdateAttendanceStatusBody>,
  res: Response<SessionRegistrationDetail | ErrorResponse>,
): Promise<void> => {
  const registration = await sessionService.updateAttendanceStatus(req.params.id, req.params.registrationID, req.body.attendanceStatus)
  res.json(registration.toJSON() as SessionRegistrationDetail)
}

export default updateAttendanceStatus