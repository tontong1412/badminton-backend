import mongoose, { Document, Schema } from 'mongoose'
import { Gender, MatchStatus, NewMatch, TournamentMatchStep } from '../type'
import constants from '../constants'

export interface MatchDocument extends NewMatch, Document {}

const playerSchema = new Schema({
  id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
  officialName: {
    th: { type: String, trim: true },
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
    th: { type: String, trim: true },
    en: { type: String, trim: true },
    pronunciation: { type: String }
  },
  club: { type: String, trim: true },
  photo: { type: String, trim: true },
})

const teamSchema = {
  id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.TEAM },
  serving: Number,
  receiving: Number,
  isServing: Boolean,
  players:[playerSchema],
  scoreSet: Number,
  scoreDiff: Number,
  score: Number,
}

const matchSchema = new Schema<MatchDocument>({
  shuttlecockUsed: Number,
  level: Number,
  scoreLabel: [String],
  status: {
    type: String,
    enum: Object.values(MatchStatus),
    required: true,
  },
  court: String,
  note: String,
  date: Date,
  teamA: teamSchema,
  teamB: teamSchema,
  event: {
    id: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.EVENT },
    name: {
      en: String,
      th: String,
    },
    fee: {
      amount: Number,
      currency: String,
    }
  },
  matchNumber: Number,
  umpire: {
    id:{ type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER },
    officialName: {
      th: String,
      en: String,
      pronunciation: String,
    },
    displayName: {
      th: String,
      en: String,
    },
    photo: String,
  },
  step:{
    type: String,
    enum: Object.values(TournamentMatchStep),
    required: true,
  },
  skip: Boolean,
  byePosition: Number,
  round: Number,
  groupOrder: Number,
  eventOrder: Number,
  bracketOrder: Number,

}, {
  timestamps: { createdAt: true, updatedAt: true }
})

matchSchema.virtual('id').get(function(this: MatchDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

matchSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

const MatchModel = mongoose.model<MatchDocument>('Match', matchSchema)

export default MatchModel