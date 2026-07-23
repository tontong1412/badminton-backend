import { Request, Response } from 'express'
import SessionModel from '../../schema/session'
import { SessionStatus } from '../../type'
import { buildSessionDocumentPayload, buildSessionStatus, SessionPayload } from './shared'

const update = async(req: Request<{ id: string }, unknown, Partial<SessionPayload>>, res: Response): Promise<void> => {
  const existingSession = await SessionModel.findById(req.params.id)
  if (!existingSession) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  const organizerUserIDs = req.body.organizerUserIDs ?? existingSession.organizerUserIDs.map((id) => id.toString())
  const mergedPayload: SessionPayload = {
    type: existingSession.type,
    title: req.body.title ?? existingSession.title,
    date: req.body.date ?? existingSession.date.toISOString(),
    startTime: req.body.startTime ?? existingSession.startTime,
    endTime: req.body.endTime ?? existingSession.endTime,
    venueID: req.body.venueID ?? existingSession.venueID.toString(),
    organizerUserIDs,
    maxParticipants: req.body.maxParticipants ?? existingSession.maxParticipants,
    registrationOpen: req.body.registrationOpen ?? existingSession.registrationOpen,
    organizerContact: req.body.organizerContact ?? existingSession.organizerContact,
    notes: req.body.notes ?? existingSession.notes,
    requiresApproval: req.body.requiresApproval ?? existingSession.requiresApproval,
    pricing: req.body.pricing ?? existingSession.pricing,
  }

  const sessionPayload = await buildSessionDocumentPayload(mergedPayload, organizerUserIDs)
  existingSession.set({
    ...sessionPayload,
    status: buildSessionStatus(
      existingSession.currentParticipants,
      sessionPayload.maxParticipants,
      existingSession.status as SessionStatus,
    ),
  })

  const savedSession = await existingSession.save()
  res.json(savedSession)
}

export default update