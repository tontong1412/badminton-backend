import { Request, Response } from 'express'
import BannerModel from '../../schema/banner'

interface UpdateBannerPayload {
  title?: string;
  linkUrl?: string;
  order?: number;
  isActive?: boolean;
}

const update = async(
  req: Request<{ id: string }, unknown, UpdateBannerPayload>,
  res: Response,
): Promise<void> => {
  const { id } = req.params
  const { title, linkUrl, order, isActive } = req.body

  const banner = await BannerModel.findByIdAndUpdate(
    id,
    { title, linkUrl, order, isActive },
    { new: true, runValidators: true },
  )

  if (!banner) {
    res.status(404).json({ message: 'Banner not found' })
    return
  }

  res.json(banner)
}

export default update
