import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'

export interface CourtPricingRule {
  startTime: string; // HH:mm — start of this price window (inclusive)
  endTime: string;   // HH:mm — end of this price window (exclusive)
  pricePerHour: number;
}

export interface CourtAddOn {
  id: string;
  name: string;
  price: number;
  details?: string;
  isActive: boolean;
}

export interface CourtDocument extends Document {
  venueID: Types.ObjectId;
  name: string;
  description?: string;
  pricePerHour: number;  // default fallback price
  pricingRules: CourtPricingRule[];
  addOns: CourtAddOn[];
  slotStartOffsetMinutes: number;
  currency: string;
  status: 'active' | 'inactive';
  courtType?: string;
}

const pricingRuleSchema = new Schema<CourtPricingRule>({
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  pricePerHour: { type: Number, required: true, min: 0 },
}, { _id: false })

const courtAddOnSchema = new Schema<CourtAddOn>({
  id: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  details: { type: String, trim: true },
  isActive: { type: Boolean, required: true, default: true },
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
  addOns: { type: [courtAddOnSchema], default: [] },
  slotStartOffsetMinutes: { type: Number, default: 0, enum: [0, 30] },
  currency: { type: String, required: true, trim: true, default: 'THB' },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    required: true,
  },
  courtType: { type: String, trim: true },
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
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  }
})

const CourtModel = mongoose.model<CourtDocument>('Court', courtSchema)

export default CourtModel