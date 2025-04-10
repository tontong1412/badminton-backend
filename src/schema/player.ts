import mongoose, { Document, Schema, Types } from 'mongoose'
import { Gender, NewPlayer } from '../type'
import constants from '../constants'

export interface PlayerDocument extends NewPlayer, Document {
  userID?: Types.ObjectId;
}

const playerSchema = new Schema<PlayerDocument>({
  officialName: {
    local: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
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
  dob: { type: Date },
  club: { type: String, trim: true },
  photo: { type: String, trim: true },
  contact: {
    line: { type: String, trim: true },
    tel: { type: String, trim: true },
    tg: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
  },
  userID: { type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.USER },
}, {
  timestamps: { createdAt: true, updatedAt: true }
})

playerSchema.virtual('id').get(function(this: PlayerDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

playerSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

const PlayerModel = mongoose.model<PlayerDocument>('Player', playerSchema)

export default PlayerModel