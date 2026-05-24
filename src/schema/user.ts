import  mongoose, { Schema, Document }   from 'mongoose'
import { NewUser, UserRole } from '../type'
import CONSTANT from '../constants'

export interface UserDocument extends NewUser, Document {}

const userSchema =  new Schema<UserDocument>({
  email: { type: String, required: true, trim: true, unique: true },
  hash: String,
  playerID: { type: Schema.Types.ObjectId, ref: CONSTANT.DATABASE.COLLECTION.PLAYER },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.User,
    required: true,
  },
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
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
    delete record.hash
  }
})

const UserModel = mongoose.model<UserDocument>('User', userSchema)

export default UserModel
