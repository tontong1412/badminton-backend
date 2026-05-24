import mongoose, { Document, Schema } from 'mongoose'

export interface BannerDocument extends Document {
  title?: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<BannerDocument>(
  {
    title: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String, trim: true },
    order: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  },
)

bannerSchema.index({ order: 1 })

const BannerModel = mongoose.model<BannerDocument>('Banner', bannerSchema)

export default BannerModel
