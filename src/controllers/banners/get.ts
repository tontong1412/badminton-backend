import { Request, Response } from 'express'
import BannerModel from '../../schema/banner'

const get = async(_req: Request, res: Response): Promise<void> => {
  const banners = await BannerModel.find({ isActive: true }).sort({ order: 1 })
  res.json(banners)
}

export default get
