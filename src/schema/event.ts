import mongoose, { Document, Schema } from 'mongoose'
import { BillingMethod, EventFormat, EventStatus, EventType, Gender, NewEvent, PaymentStatus, TeamStatus } from '../type'
import constants from '../constants'

export interface EventDocument extends NewEvent, Document {}

const eventSchema = new Schema<EventDocument>({
  tournament: {
    id:  { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.TOURNAMENT },
    description: String,
    name: {
      local: String,
      en: String,
    },
    shuttlecockFee: Number,
    billingMethod: {
      type: String,
      enum: Object.values(BillingMethod),
      required: true,
    },
    showParticipantList: Boolean,
  },
  name: {
    local: { type: String, required: true, trim: true },
    en: { type: String, trim: true },
  },
  level: Number,
  fee: {
    amount: Number,
    currency: String,
  },
  prize: String,
  format: {
    type: String,
    enum: Object.values(EventFormat),
    required: true,
  },
  limit: Number,
  type: {
    type: String,
    enum: Object.values(EventType),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(EventStatus),
    required: true,
  },
  teams: [{
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.TEAM },
    status: {
      type: String,
      enum: Object.values(TeamStatus),
      required: true,
      default: TeamStatus.Idle
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
      default: PaymentStatus.Unpaid
    },
    contactPerson: {
      id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
      officialName: {
        local: { type: String, required: true, trim: true },
        en: { type: String, trim: true },
        pronunciation: { type: String }
      },
      displayName:{
        local: { type: String, trim: true },
        en: { type: String, trim: true },
        pronunciation: { type: String }
      },
      contact: {
        line: { type: String, trim: true },
        tel: { type: String, trim: true },
        tg: { type: String, trim: true },
        whatsapp: { type: String, trim: true },
        email: { type: String, trim: true },
      },
    },
    players: [{
      id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
      officialName: {
        local: { type: String, required: true, trim: true },
        en: { type: String, trim: true },
        pronunciation: { type: String }
      },
      level: { type: Number, required: true, default: 0 },
      gender: {
        type: String,
        enum: Object.values(Gender),
        required: true,
      },
      displayName:{
        local: { type: String, trim: true },
        en: { type: String, trim: true },
        pronunciation: { type: String }
      },
      club: { type: String, trim: true },
      photo: { type: String, trim: true },
    }]
  }],
}, {
  timestamps: { createdAt: true, updatedAt: true }
})

eventSchema.virtual('id').get(function(this: EventDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

eventSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

const EventModel = mongoose.model<EventDocument>('Event', eventSchema)

export default EventModel