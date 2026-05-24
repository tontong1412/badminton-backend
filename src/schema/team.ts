import mongoose, { Document, Schema } from 'mongoose'
import { NewTeam } from '../type'
import constants from '../constants'

export interface TeamDocument extends NewTeam, Document {}

const teamSchema = new Schema<TeamDocument>({
  players: [{ type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.PLAYER }]
}, {
  timestamps: { createdAt: true, updatedAt: true }
})

teamSchema.virtual('id').get(function(this: TeamDocument): string {
  if(this._id instanceof mongoose.Types.ObjectId){
    return this._id.toHexString()
  }
  return String(this._id)
})

teamSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  }
})

const TeamModel = mongoose.model<TeamDocument>('Team', teamSchema)

export default TeamModel