import mongoose, { Document, Schema, Types } from 'mongoose'
import { DailySchedule, GapPolicy, HolidaySchedule } from '../type'
import constants from '../constants'

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
  weeklySchedule: Record<string, DailySchedule | null>;
  holidays: HolidaySchedule[];
  slotDurationMinutes: number;
  gapPolicy: GapPolicy;
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
    enum: [30],
  },
  gapPolicy: {
    enabled: { type: Boolean, default: true },
    minimumGapMinutes: {
      type: Number,
      enum: [30, 60],
      default: 60,
    },
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
  transform: (_doc: Document, ret: Record<string, unknown>): void => {
    delete ret._id
    delete ret.__v
  }
})

venueSchema.index({ location: '2dsphere' })

const VenueModel = mongoose.model<VenueDocument>('Venue', venueSchema)

export default VenueModel