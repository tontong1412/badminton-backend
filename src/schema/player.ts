import mongoose, { Document, Schema, Types } from 'mongoose'
import { FavoriteItemType, Gender, NewPlayer } from '../type'
import constants from '../constants'

export interface PlayerDocument extends NewPlayer, Document {
  userID?: Types.ObjectId;
}

const playerSchema = new Schema<PlayerDocument>({
  officialName: {
    th: { type: String, trim: true },
    en: { type: String, trim: true },
    pronunciation: { type: String }
  },
  level: { type: Number, required: true, default: 0 },
  gender: {
    type: String,
    enum: Object.values(Gender),
  },
  displayName:{
    th: { type: String, trim: true },
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
  paymentInfo: {
    bankName: { type: String, trim: true },
    accountName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    promptPayID: { type: String, trim: true },
  },
  favorites: {
    type: [{
      itemType: {
        type: String,
        enum: Object.values(FavoriteItemType),
        required: true,
      },
      itemID: {
        type: String,
        required: true,
        trim: true,
      },
      addedAt: {
        type: Date,
        required: true,
      }
    }],
    default: [],
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
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  }
})

const playerModelName = constants.DATABASE.COLLECTION.PLAYER
const PlayerModel = (mongoose.models[playerModelName] as mongoose.Model<PlayerDocument> | undefined)
  ?? mongoose.model<PlayerDocument>(playerModelName, playerSchema)

export default PlayerModel