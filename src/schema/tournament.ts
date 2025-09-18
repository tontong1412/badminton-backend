import mongoose, { Document, Schema } from 'mongoose'
import { BillingMethod, EventFormat, EventType, NewTournament, TournamentStatus } from '../type'
import constants from '../constants'

export interface TournamentDocument extends NewTournament, Document {}

const tournamentSchema = new Schema<TournamentDocument>({
  language: String,
  name: {
    th: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  payment: {
    code: String,
    name: String,
    bank: String,
  },
  venue: {
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.VENUE },
    name: {
      th: String,
      en: String,
    },
    address: String,
    location: {
      type: {
        type: String,   // Must be 'Point'
        enum: ['Point'], // 'Point' is the only allowed value
        required: true
      },
      coordinates: [Number, Number]  // [longitude, latitude]
    },
  },
  events:[{
    id:{ type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.EVENT },
    description: String,
    name:{
      en: String,
      th: String,
    },
    fee: {
      amount: Number,
      currency: String,
    },
    prize: String,
    type: {
      type: String,
      enum: Object.values(EventType),
      default: EventType.Double
    },
    limit: Number,
    format: {
      type: String,
      enum: Object.values(EventFormat)
    }
  }],
  billingMethod: {
    type: String,
    enum: Object.values(BillingMethod),
    default: BillingMethod.Pair
  },
  startDate: Date,
  endDate: Date,
  deadlineDate: Date,
  image: String,
  logo: String,
  poster: String,
  showParticipantList: { type: Boolean, default: true },
  shuttlecockFee: Number,
  useHandicap: Boolean,
  status: {
    type: String,
    enum: Object.values(TournamentStatus),
    default: TournamentStatus.Preparation
  },
  managers: [{
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
    officialName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
    displayName:{
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
  }],
  umpires: [{
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
    officialName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
    displayName:{
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
  }],
  creator: {
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
    officialName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
    displayName:{
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
  },
  contact: {
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
    officialName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String }
    },
    displayName:{
      th: { type: String, trim: true },
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

}, {
  timestamps: { createdAt: true, updatedAt: true }
})

tournamentSchema.virtual('id').get(function(this: TournamentDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

tournamentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

const TournamentModel = mongoose.model<TournamentDocument>('Tournament', tournamentSchema)

export default TournamentModel