import { Request, Response } from 'express'
import BannerModel from '../../schema/banner'

const getAll = async(_req: Request, res: Response): Promise<void> => {
  const banners = await BannerModel.find().sort({ order: 1 })
  res.json(banners)
}

export default getAll
