import mongoose, { Document, Schema, Types } from 'mongoose'
import { DailySchedule, HolidaySchedule } from '../type'
import constants from '../constants'

export interface VenuePayment {
  bankName: string;
  accountNumber: string;
  accountName: string;
  promptPayID?: string;
  qrCodeUrl?: string;
}

export interface VenueSlipOK {
  branchId: string;
  apiKey: string; // stored encrypted
  enabled: boolean; // only system admins can toggle this
}

export interface VenueDocument extends Document {
  name: {
    th: string;
    en: string;
  };
  address: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  ownerUserID: Types.ObjectId;
  managerUserIDs: Types.ObjectId[];
  weeklySchedule: Record<string, DailySchedule | null>;
  holidays: HolidaySchedule[];
  slotDurationMinutes: number;
  payment?: VenuePayment;
  slipok?: VenueSlipOK;
  coverImage?: string;
  logo?: string;
  facilities: string[];
  termsAndConditions?: {
    th?: string;
    en?: string;
  };
}

const holidaySchema = new Schema<HolidaySchedule>({
  date: { type: Date, required: true },
  isClosed: { type: Boolean, required: true, default: true },
  openTime: String,
  closeTime: String,
}, { _id: false })

const venueSchema = new Schema<VenueDocument>({
  name: {
    th: { type: String, required: true, trim: true },
    en: { type: String, required: true, trim: true },
  },
  address: { type: String, required: true, trim: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (value: number[]) => value.length === 2,
        message: 'Location coordinates must include longitude and latitude.',
      },
    },
  },
  ownerUserID: {
    type: Schema.Types.ObjectId,
    ref: constants.DATABASE.COLLECTION.USER,
    required: true,
  },
  managerUserIDs: {
    type: [Schema.Types.ObjectId],
    ref: constants.DATABASE.COLLECTION.USER,
    default: [],
  },
  weeklySchedule: {
    type: Schema.Types.Mixed,
    default: {},
  },
  holidays: {
    type: [holidaySchema],
    default: [],
  },
  slotDurationMinutes: {
    type: Number,
    default: 30,
    enum: [30, 60],
  },
  payment: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountName: { type: String, trim: true },
    promptPayID: { type: String, trim: true },
    qrCodeUrl: { type: String, trim: true },
  },
  slipok: {
    branchId: { type: String, trim: true },
    apiKey: { type: String, trim: true }, // stored encrypted
    enabled: { type: Boolean, default: false }, // only system admins can toggle
  },
  coverImage: { type: String, trim: true },
  logo: { type: String, trim: true },
  facilities: { type: [String], default: [] },
  termsAndConditions: {
    th: { type: String, trim: true },
    en: { type: String, trim: true },
  },
}, {
  timestamps: { createdAt: true, updatedAt: true },
})

venueSchema.virtual('id').get(function(this: VenueDocument): string {
  if (this._id instanceof mongoose.Types.ObjectId) {
    return this._id.toHexString()
  }

  return String(this._id)
})

venueSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
  }
})

venueSchema.index({ location: '2dsphere' })

const VenueModel = mongoose.model<VenueDocument>('Venue', venueSchema)

export default VenueModel