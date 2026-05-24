import { Request, Response } from 'express'
import BannerModel from '../../schema/banner'
import mediaUtils from '../../utils/media'
import config from '../../config'

interface CreateBannerPayload {
  title?: string;
  image: string; // base64 data URI
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
}

const create = async(
  req: Request<Record<string, never>, unknown, CreateBannerPayload>,
  res: Response,
): Promise<void> => {
  const { title, image, linkUrl, order = 0, isActive = true } = req.body

  if (!image || !image.startsWith('data:image/')) {
    res.status(400).json({ message: 'image must be a base64 data URI (data:image/*;base64,...)' })
    return
  }

  const folder = `${config.CLOUDINARY_PREFIX}banners`
  const publicId = `banner_${Date.now()}`
  const result = await mediaUtils.uploadPhoto(image, folder, publicId)

  const banner = await BannerModel.create({
    title,
    imageUrl: result.secure_url,
    linkUrl,
    order,
    isActive,
  })

  res.status(201).json(banner)
}

export default create
