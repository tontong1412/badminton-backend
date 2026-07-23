import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import {
  SessionAttendanceStatus,
  SessionRegistration,
  SessionRegistrationPaymentStatus,
  SessionRegistrationStatus,
} from '../type'

export interface SessionRegistrationDocument extends Omit<SessionRegistration, 'id'>, Document {
  sessionID: Types.ObjectId;
  playerID: Types.ObjectId;
}

const sessionRegistrationSchema = new Schema<SessionRegistrationDocument>({
  sessionID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.SESSION,
    required: true,
  },
  playerID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.PLAYER,
    required: true,
  },
  registeredAt: { type: Date, required: true, default: Date.now },
  registrationStatus: {
    type: String,
    enum: Object.values(SessionRegistrationStatus),
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(SessionRegistrationPaymentStatus),
    required: true,
    default: SessionRegistrationPaymentStatus.Pending,
  },
  attendanceStatus: {
    type: String,
    enum: Object.values(SessionAttendanceStatus),
    required: true,
    default: SessionAttendanceStatus.Registered,
  },
  waitingPosition: { type: Number, min: 1 },
  approvedByUserID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
  },
  approvedAt: { type: Date },
  manuallyAddedByUserID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
  },
  note: { type: String, trim: true },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

sessionRegistrationSchema.virtual('id').get(function(this: SessionRegistrationDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

sessionRegistrationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  },
})

sessionRegistrationSchema.index({ sessionID: 1, playerID: 1 }, { unique: true })
sessionRegistrationSchema.index({ sessionID: 1, registrationStatus: 1, waitingPosition: 1 })
sessionRegistrationSchema.index({ playerID: 1, registrationStatus: 1, registeredAt: -1 })

const SessionRegistrationModel = mongoose.model<SessionRegistrationDocument>(
  constants.DATABASE.COLLECTION.SESSION_REGISTRATION,
  sessionRegistrationSchema,
)

export default SessionRegistrationModel