import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import { ResaleStatus, SellerPayoutStatus } from '../type'

export interface ResaleListingDocument extends Document {
  bookingID: Types.ObjectId;
  sellerID: Types.ObjectId;
  venueID: Types.ObjectId;
  venueOwnerID: Types.ObjectId;
  askingPrice: number;
  currency: string;
  status: ResaleStatus;
  buyerType?: 'guest' | 'user';
  buyerID?: Types.ObjectId;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  venuePaymentSlip?: string;
  venuePaymentSlipTimestamp?: Date;
  sellerPayoutStatus: SellerPayoutStatus;
  sellerPayoutAt?: Date;
  soldAt?: Date;
}

const resaleListingSchema = new Schema<ResaleListingDocument>({
  bookingID: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  sellerID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
    required: true,
  },
  venueID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.VENUE,
    required: true,
  },
  venueOwnerID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
    required: true,
  },
  askingPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(ResaleStatus),
    required: true,
    default: ResaleStatus.Active,
  },
  buyerType: {
    type: String,
    enum: ['guest', 'user'],
  },
  buyerID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
  },
  buyerName: String,
  buyerPhone: String,
  buyerEmail: String,
  venuePaymentSlip: String,
  venuePaymentSlipTimestamp: Date,
  sellerPayoutStatus: {
    type: String,
    enum: Object.values(SellerPayoutStatus),
    required: true,
    default: SellerPayoutStatus.Pending,
  },
  sellerPayoutAt: Date,
  soldAt: Date,
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

resaleListingSchema.virtual('id').get(function(this: ResaleListingDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

resaleListingSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

resaleListingSchema.index(
  { bookingID: 1 },
  { unique: true, partialFilterExpression: { status: ResaleStatus.Active } }
)

const ResaleListingModel = mongoose.model<ResaleListingDocument>('ResaleListing', resaleListingSchema)

export default ResaleListingModel