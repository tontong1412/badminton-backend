import { Request, Response } from 'express'
import BannerModel from '../../schema/banner'

const remove = async(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const { id } = req.params

  const banner = await BannerModel.findByIdAndDelete(id)

  if (!banner) {
    res.status(404).json({ message: 'Banner not found' })
    return
  }

  res.status(204).send()
}

export default remove
