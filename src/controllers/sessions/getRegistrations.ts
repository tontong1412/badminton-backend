import { Request, Response } from 'express'
import sessionService from '../../services/sessionService'
import { SessionRegistrationDetail } from '../../type'

const getRegistrations = async(req: Request<{ id: string }>, res: Response<SessionRegistrationDetail[]>): Promise<void> => {
  const registrations = await sessionService.listRegistrations(req.params.id)
  res.json(registrations)
}

export default getRegistrations