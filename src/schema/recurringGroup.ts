import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import { RecurringPattern } from '../type'

export interface RecurringGroupDocument extends Document {
  courtID: Types.ObjectId;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pattern: RecurringPattern;
  daysOfWeek?: number[];
  rangeStart: Date;
  rangeEnd: Date;
  userID: Types.ObjectId;
  bookingIDs: Types.ObjectId[];
}

const recurringGroupSchema = new Schema<RecurringGroupDocument>({
  courtID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.COURT,
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationMinutes: { type: Number, required: true, min: 30 },
  pattern: {
    type: String,
    enum: Object.values(RecurringPattern),
    required: true,
  },
  daysOfWeek: { type: [Number], default: undefined },
  rangeStart: { type: Date, required: true },
  rangeEnd: { type: Date, required: true },
  userID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
    required: true,
  },
  bookingIDs: {
    type: [{ type: Schema.Types.ObjectId, ref: constants.DATABASE.COLLECTION.BOOKING }],
    default: [],
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

recurringGroupSchema.virtual('id').get(function(this: RecurringGroupDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

recurringGroupSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  }
})

const RecurringGroupModel = mongoose.model<RecurringGroupDocument>('RecurringGroup', recurringGroupSchema)

export default RecurringGroupModel