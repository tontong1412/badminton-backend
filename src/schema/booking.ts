import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import { BookingStatus, BookingType, PaymentStatus, ResaleOutcome } from '../type'

export interface BookingDocument extends Document {
  bookingBundleID?: Types.ObjectId;
  bookingRef?: string;
  courtID: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  bookerType: 'guest' | 'user';
  userID?: Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  bookingType: BookingType;
  recurringGroupID?: Types.ObjectId;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  slip?: string;
  slipTimestamp?: Date;
  resaleListingID?: Types.ObjectId;
  resaleSourceListingID?: Types.ObjectId;
  resaleOutcome: ResaleOutcome;
  note?: string;
}

const bookingSchema = new Schema<BookingDocument>({
  bookingBundleID: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  bookingRef: {
    type: String,
    index: true,
  },
  courtID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.COURT,
    required: true,
  },
  date: { type: Date, required: true },
  startTime: { type: String, required: true, trim: true },
  endTime: { type: String, required: true, trim: true },
  durationMinutes: { type: Number, required: true, min: 30 },
  totalPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, trim: true },
  bookerType: {
    type: String,
    enum: ['guest', 'user'],
    required: true,
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
  },
  guestName: String,
  guestPhone: String,
  guestEmail: String,
  bookingType: {
    type: String,
    enum: Object.values(BookingType),
    required: true,
  },
  recurringGroupID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.RECURRING_GROUP,
  },
  status: {
    type: String,
    enum: Object.values(BookingStatus),
    required: true,
    default: BookingStatus.Pending,
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PaymentStatus),
    required: true,
    default: PaymentStatus.Unpaid,
  },
  slip: String,
  slipTimestamp: Date,
  resaleListingID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.RESALE_LISTING,
  },
  resaleSourceListingID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.RESALE_LISTING,
  },
  resaleOutcome: {
    type: String,
    enum: Object.values(ResaleOutcome),
    required: true,
    default: ResaleOutcome.None,
  },
  note: String,
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

bookingSchema.virtual('id').get(function(this: BookingDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

bookingSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

bookingSchema.index({ courtID: 1, date: 1, startTime: 1, endTime: 1 })

const BookingModel = mongoose.model<BookingDocument>('Booking', bookingSchema)

export default BookingModel