import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'

export type DiscountType = 'percentage' | 'fixed'

export interface CouponDocument extends Document {
  code: string;
  venueID?: Types.ObjectId;  // undefined = applies to any venue
  discountType: DiscountType;
  discountValue: number;     // percent (0-100) or fixed amount
  maxDiscountAmount?: number; // cap for percentage discounts
  maxUses?: number;          // undefined = unlimited
  usedCount: number;
  expiresAt?: Date;
  isActive: boolean;
}

const couponSchema = new Schema<CouponDocument>({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
  },
  venueID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.VENUE,
    index: true,
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  maxDiscountAmount: {
    type: Number,
    min: 0,
  },
  maxUses: {
    type: Number,
    min: 1,
  },
  usedCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    required: true,
    default: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

couponSchema.virtual('id').get(function(this: CouponDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }
  return String(this._id)
})

couponSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  },
})

const CouponModel = mongoose.model<CouponDocument>('Coupon', couponSchema)

export default CouponModel
