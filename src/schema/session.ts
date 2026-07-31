import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import {
  OpenPlaySession,
  SessionPricingType,
  SessionStatus,
  SessionType,
} from '../type'

export interface SessionDocument extends Omit<OpenPlaySession, 'id'>, Document {
  venueID: Types.ObjectId;
  organizerUserIDs: Types.ObjectId[];
}

const sessionSchema = new Schema<SessionDocument>({
  type: {
    type: String,
    enum: Object.values(SessionType),
    required: true,
    default: SessionType.OpenPlay,
  },
  title: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  venueID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.VENUE,
    required: true,
  },
  venueSnapshot: {
    id: {
      type: Schema.Types.ObjectId,
      ref: constants.DATABASE.COLLECTION.VENUE,
      required: true,
    },
    name: {
      th: { type: String, required: true, trim: true },
      en: { type: String, required: true, trim: true },
    },
    address: { type: String, required: true, trim: true },
  },
  organizerUserIDs: {
    type: [Schema.Types.ObjectId],
    ref: constants.DATABASE.COLLECTION.USER,
    required: true,
    default: [],
  },
  maxParticipants: { type: Number, required: true, min: 1 },
  currentParticipants: { type: Number, required: true, min: 0, default: 0 },
  waitingCount: { type: Number, required: true, min: 0, default: 0 },
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    required: true,
    default: SessionStatus.Upcoming,
  },
  registrationOpen: { type: Boolean, required: true, default: true },
  organizerContact: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
  },
  notes: { type: String, trim: true },
  requiresApproval: { type: Boolean, required: true, default: false },
  pricing: {
    type: {
      type: String,
      enum: Object.values(SessionPricingType),
      required: true,
    },
    fixedPrice: { type: Number, min: 0 },
    courtRentalCost: { type: Number, min: 0 },
    shuttlecockCost: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    perPlayerCost: { type: Number, min: 0 },
    currency: { type: String, required: true, trim: true, default: 'EUR' },
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

sessionSchema.pre('validate', function(next) {
  if (this.type !== SessionType.OpenPlay) {
    this.invalidate('type', 'Only openPlay sessions are supported currently')
  }

  const pricing = this.pricing
  if (!pricing) {
    this.invalidate('pricing', 'Pricing is required')
    next()
    return
  }

  if (pricing.type === SessionPricingType.Fixed) {
    if (pricing.fixedPrice === undefined) {
      this.invalidate('pricing.fixedPrice', 'Fixed price is required for fixed pricing')
    }
  }

  if (pricing.type === SessionPricingType.Shared) {
    if (pricing.totalCost === undefined) {
      this.invalidate('pricing.totalCost', 'Total cost is required for shared pricing')
    }
  }

  next()
})

sessionSchema.virtual('id').get(function(this: SessionDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

sessionSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  },
})

sessionSchema.index({ date: 1, startTime: 1 })
sessionSchema.index({ organizerUserIDs: 1, date: 1 })
sessionSchema.index({ status: 1, date: 1 })
sessionSchema.index({ venueID: 1, date: 1 })

const SessionModel = mongoose.model<SessionDocument>(constants.DATABASE.COLLECTION.SESSION, sessionSchema)

export default SessionModel