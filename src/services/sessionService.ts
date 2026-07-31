import { Types } from 'mongoose'
import PlayerModel from '../schema/player'
import SessionModel from '../schema/session'
import SessionRegistrationModel, { SessionRegistrationDocument } from '../schema/sessionRegistration'
import {
  SessionAttendanceStatus,
  SessionRegistrationDetail,
  SessionRegistrationPaymentStatus,
  SessionRegistrationPlayerSnapshot,
  SessionRegistrationStatus,
  SessionStatus,
} from '../type'

type HttpError = Error & { status?: number }

type PopulatedPlayerJSON = {
  id?: string;
  officialName?: {
    th?: string;
    en?: string;
    pronunciation?: string;
  };
  displayName?: {
    th?: string;
    en?: string;
    pronunciation?: string;
  };
  photo?: string;
  level?: number;
  club?: string;
  contact?: {
    line?: string;
    tel?: string;
    tg?: string;
    whatsapp?: string;
    email?: string;
  };
}

const activeParticipantStatuses = [SessionRegistrationStatus.Approved]
const waitlistStatuses = [SessionRegistrationStatus.WaitingList]

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError
  error.status = status
  return error
}

const ensureObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `Invalid ${label}`)
  }

  return new Types.ObjectId(value)
}

const getPlayerSnapshot = async(playerID: Types.ObjectId): Promise<SessionRegistrationPlayerSnapshot> => {
  const player = await PlayerModel.findById(playerID)
    .select('officialName displayName photo level club contact')

  if (!player) {
    throw createHttpError(404, 'Player not found')
  }

  return {
    id: player._id,
    officialName: player.officialName,
    displayName: player.displayName,
    photo: player.photo,
    level: player.level,
    club: player.club,
    contact: player.contact,
  }
}

const syncSessionCounts = async(sessionID: string) => {
  const [currentParticipants, waitingCount] = await Promise.all([
    SessionRegistrationModel.countDocuments({
      sessionID,
      registrationStatus: { $in: activeParticipantStatuses },
    }),
    SessionRegistrationModel.countDocuments({
      sessionID,
      registrationStatus: { $in: waitlistStatuses },
    }),
  ])

  const session = await SessionModel.findById(sessionID)
  if (!session) {
    throw createHttpError(404, 'Session not found')
  }

  let nextStatus = session.status
  if (![SessionStatus.Cancelled, SessionStatus.Completed, SessionStatus.Ongoing].includes(session.status)) {
    nextStatus = currentParticipants >= session.maxParticipants ? SessionStatus.Full : SessionStatus.Upcoming
  }

  session.currentParticipants = currentParticipants
  session.waitingCount = waitingCount
  session.status = nextStatus
  await session.save()

  return session
}

const getNextWaitingPosition = async(sessionID: string): Promise<number> => {
  const lastWaiting = await SessionRegistrationModel.findOne({
    sessionID,
    registrationStatus: SessionRegistrationStatus.WaitingList,
  }).sort({ waitingPosition: -1 }).select('waitingPosition')

  return (lastWaiting?.waitingPosition ?? 0) + 1
}

const normalizeWaitingPositions = async(sessionID: string): Promise<void> => {
  const waitlist = await SessionRegistrationModel.find({
    sessionID,
    registrationStatus: SessionRegistrationStatus.WaitingList,
  }).sort({ waitingPosition: 1, registeredAt: 1 })

  await Promise.all(waitlist.map((registration, index) => {
    registration.waitingPosition = index + 1
    return registration.save()
  }))
}

const promoteNextWaitingRegistration = async(sessionID: string): Promise<SessionRegistrationDocument | null> => {
  const session = await SessionModel.findById(sessionID)
  if (!session) {
    throw createHttpError(404, 'Session not found')
  }

  if (session.currentParticipants >= session.maxParticipants) {
    return null
  }

  const nextWaiting = await SessionRegistrationModel.findOne({
    sessionID,
    registrationStatus: SessionRegistrationStatus.WaitingList,
  }).sort({ waitingPosition: 1, registeredAt: 1 })

  if (!nextWaiting) {
    return null
  }

  nextWaiting.registrationStatus = SessionRegistrationStatus.Approved
  nextWaiting.waitingPosition = undefined
  nextWaiting.approvedAt = new Date()
  await nextWaiting.save()
  await normalizeWaitingPositions(sessionID)
  await syncSessionCounts(sessionID)
  return nextWaiting
}

const ensureSessionOpenForPlayerRegistration = async(sessionID: string) => {
  const session = await SessionModel.findById(sessionID)
  if (!session) {
    throw createHttpError(404, 'Session not found')
  }
  if (!session.registrationOpen) {
    throw createHttpError(400, 'Registration is closed for this session')
  }
  if ([SessionStatus.Cancelled, SessionStatus.Completed].includes(session.status)) {
    throw createHttpError(400, 'This session is no longer available for registration')
  }
  return session
}

interface RegisterPlayerOptions {
  sessionID: string;
  playerID: string;
  actorUserID?: string;
  manual?: boolean;
  note?: string;
}

const registerPlayer = async({ sessionID, playerID, actorUserID, manual = false, note }: RegisterPlayerOptions) => {
  const session = manual
    ? await SessionModel.findById(sessionID)
    : await ensureSessionOpenForPlayerRegistration(sessionID)

  if (!session) {
    throw createHttpError(404, 'Session not found')
  }

  const playerObjectId = ensureObjectId(playerID, 'player ID')
  const playerSnapshot = await getPlayerSnapshot(playerObjectId)
  const existingRegistration = await SessionRegistrationModel.findOne({ sessionID, playerID: playerObjectId })

  if (existingRegistration && [SessionRegistrationStatus.Pending, SessionRegistrationStatus.Approved, SessionRegistrationStatus.WaitingList].includes(existingRegistration.registrationStatus)) {
    throw createHttpError(409, 'Player is already registered for this session')
  }

  const shouldApproveImmediately = !session.requiresApproval && session.currentParticipants < session.maxParticipants
  const shouldWaitlist = !session.requiresApproval && session.currentParticipants >= session.maxParticipants

  const registrationStatus = shouldApproveImmediately
    ? SessionRegistrationStatus.Approved
    : shouldWaitlist
      ? SessionRegistrationStatus.WaitingList
      : SessionRegistrationStatus.Pending

  const waitingPosition = registrationStatus === SessionRegistrationStatus.WaitingList
    ? await getNextWaitingPosition(sessionID)
    : undefined

  const payload = {
    sessionID: ensureObjectId(sessionID, 'session ID'),
    playerID: playerObjectId,
    player: playerSnapshot,
    registeredAt: new Date(),
    registrationStatus,
    paymentStatus: SessionRegistrationPaymentStatus.Pending,
    attendanceStatus: SessionAttendanceStatus.Registered,
    waitingPosition,
    approvedByUserID: registrationStatus === SessionRegistrationStatus.Approved && actorUserID ? ensureObjectId(actorUserID, 'user ID') : undefined,
    approvedAt: registrationStatus === SessionRegistrationStatus.Approved ? new Date() : undefined,
    manuallyAddedByUserID: manual && actorUserID ? ensureObjectId(actorUserID, 'user ID') : undefined,
    note,
  }

  const registration = existingRegistration
    ? await SessionRegistrationModel.findByIdAndUpdate(existingRegistration._id, { $set: payload }, { new: true })
    : await new SessionRegistrationModel(payload).save()

  if (!registration) {
    throw createHttpError(500, 'Unable to save registration')
  }

  await syncSessionCounts(sessionID)
  return registration
}

const cancelPlayerRegistration = async(sessionID: string, playerID: string) => {
  const registration = await SessionRegistrationModel.findOne({
    sessionID,
    playerID: ensureObjectId(playerID, 'player ID'),
    registrationStatus: {
      $in: [SessionRegistrationStatus.Pending, SessionRegistrationStatus.Approved, SessionRegistrationStatus.WaitingList],
    },
  })

  if (!registration) {
    throw createHttpError(404, 'Registration not found')
  }

  registration.registrationStatus = SessionRegistrationStatus.Cancelled
  registration.attendanceStatus = SessionAttendanceStatus.Cancelled
  registration.waitingPosition = undefined
  await registration.save()
  await normalizeWaitingPositions(sessionID)
  await syncSessionCounts(sessionID)
  await promoteNextWaitingRegistration(sessionID)
  return registration
}

const approveRegistration = async(sessionID: string, registrationID: string, actorUserID: string) => {
  const session = await SessionModel.findById(sessionID)
  if (!session) throw createHttpError(404, 'Session not found')

  const registration = await SessionRegistrationModel.findOne({ _id: registrationID, sessionID })
  if (!registration) throw createHttpError(404, 'Registration not found')

  if (registration.registrationStatus === SessionRegistrationStatus.Approved) return registration

  if (session.currentParticipants >= session.maxParticipants) {
    registration.registrationStatus = SessionRegistrationStatus.WaitingList
    registration.waitingPosition = await getNextWaitingPosition(sessionID)
    registration.approvedByUserID = undefined
    registration.approvedAt = undefined
  } else {
    registration.registrationStatus = SessionRegistrationStatus.Approved
    registration.waitingPosition = undefined
    registration.approvedByUserID = ensureObjectId(actorUserID, 'user ID')
    registration.approvedAt = new Date()
  }

  await registration.save()
  await normalizeWaitingPositions(sessionID)
  await syncSessionCounts(sessionID)
  return registration
}

const rejectRegistration = async(sessionID: string, registrationID: string) => {
  const registration = await SessionRegistrationModel.findOne({ _id: registrationID, sessionID })
  if (!registration) throw createHttpError(404, 'Registration not found')

  registration.registrationStatus = SessionRegistrationStatus.Rejected
  registration.attendanceStatus = SessionAttendanceStatus.Cancelled
  registration.waitingPosition = undefined
  await registration.save()
  await normalizeWaitingPositions(sessionID)
  await syncSessionCounts(sessionID)
  await promoteNextWaitingRegistration(sessionID)
  return registration
}

const removeRegistration = async(sessionID: string, registrationID: string) => {
  const registration = await SessionRegistrationModel.findOne({ _id: registrationID, sessionID })
  if (!registration) throw createHttpError(404, 'Registration not found')

  registration.registrationStatus = SessionRegistrationStatus.Removed
  registration.attendanceStatus = SessionAttendanceStatus.Cancelled
  registration.waitingPosition = undefined
  await registration.save()
  await normalizeWaitingPositions(sessionID)
  await syncSessionCounts(sessionID)
  await promoteNextWaitingRegistration(sessionID)
  return registration
}

const updatePaymentStatus = async(sessionID: string, registrationID: string, paymentStatus: SessionRegistrationPaymentStatus) => {
  const registration = await SessionRegistrationModel.findOneAndUpdate(
    { _id: registrationID, sessionID },
    { $set: { paymentStatus } },
    { new: true },
  )
  if (!registration) throw createHttpError(404, 'Registration not found')
  return registration
}

const updateAttendanceStatus = async(sessionID: string, registrationID: string, attendanceStatus: SessionAttendanceStatus) => {
  const registration = await SessionRegistrationModel.findOneAndUpdate(
    { _id: registrationID, sessionID },
    { $set: { attendanceStatus } },
    { new: true },
  )
  if (!registration) throw createHttpError(404, 'Registration not found')
  return registration
}

const getRegistrationDetail = async(sessionID: string, playerID: string): Promise<SessionRegistrationDetail | null> => {
  const registration = await SessionRegistrationModel.findOne({ sessionID, playerID: ensureObjectId(playerID, 'player ID') })
    .populate('playerID', 'officialName displayName photo level club contact')

  if (!registration) return null

  const json = registration.toJSON() as unknown as SessionRegistrationDetail & { playerID: Record<string, unknown> & { id?: string } }
  const populatedPlayer = registration.populated('playerID') ? registration.get('playerID') as unknown as PopulatedPlayerJSON : undefined
  const player = json.player ?? (populatedPlayer ? {
    ...populatedPlayer,
    id: ensureObjectId(populatedPlayer.id ?? registration.playerID.toString(), 'player ID'),
  } : undefined)

  return {
    ...json,
    player,
  }
}

const listRegistrations = async(sessionID: string): Promise<SessionRegistrationDetail[]> => {
  const registrations = await SessionRegistrationModel.find({ sessionID })
    .populate('playerID', 'officialName displayName photo level club contact')
    .sort({ waitingPosition: 1, registeredAt: 1 })

  return registrations.map((registration) => {
    const json = registration.toJSON() as unknown as SessionRegistrationDetail & { playerID: Record<string, unknown> & { id?: string } }
    const playerJSON = registration.populated('playerID')
      ? registration.get('playerID') as unknown as PopulatedPlayerJSON
      : undefined

    return {
      ...json,
      player: json.player ?? (playerJSON ? {
        ...playerJSON,
        id: ensureObjectId(playerJSON.id ?? registration.playerID.toString(), 'player ID'),
      } : undefined),
    }
  })
}

export default {
  registerPlayer,
  cancelPlayerRegistration,
  approveRegistration,
  rejectRegistration,
  removeRegistration,
  updatePaymentStatus,
  updateAttendanceStatus,
  getRegistrationDetail,
  listRegistrations,
  promoteNextWaitingRegistration,
  syncSessionCounts,
}