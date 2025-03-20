import  mongoose, { Schema, Document }   from 'mongoose'
import { NewUser } from '../type'
import CONSTANT from '../constants'

export interface UserDocument extends NewUser, Document {}

const userSchema =  new Schema<UserDocument>({
  email: { type: String, required: true, trim: true, unique: true },
  hash: String,
  playerID: { type: Schema.Types.ObjectId, ref: CONSTANT.DATABASE.COLLECTION.PLAYER },
  googleID: String,
}, {
  timestamps: { createdAt: true, updatedAt:true }
})

userSchema.virtual('id').get(function(this: UserDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
    delete ret.hash
  }
})

const UserModel = mongoose.model<UserDocument>('User', userSchema)

export default UserModel
