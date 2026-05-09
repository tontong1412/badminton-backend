import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'

export interface CourtPricingRule {
  startTime: string; // HH:mm — start of this price window (inclusive)
  endTime: string;   // HH:mm — end of this price window (exclusive)
  pricePerHour: number;
}

export interface CourtDocument extends Document {
  venueID: Types.ObjectId;
  name: string;
  description?: string;
  pricePerHour: number;  // default fallback price
  pricingRules: CourtPricingRule[];
  currency: string;
  status: 'active' | 'inactive';
}

const pricingRuleSchema = new Schema<CourtPricingRule>({
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  pricePerHour: { type: Number, required: true, min: 0 },
}, { _id: false })

const courtSchema = new Schema<CourtDocument>({
  venueID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.VENUE,
    required: true,
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  pricePerHour: { type: Number, required: true, min: 0 },
  pricingRules: { type: [pricingRuleSchema], default: [] },
  currency: { type: String, required: true, trim: true, default: 'THB' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

courtSchema.virtual('id').get(function(this: CourtDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

courtSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

const CourtModel = mongoose.model<CourtDocument>('Court', courtSchema)

export default CourtModel