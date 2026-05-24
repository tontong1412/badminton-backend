import { Request, Response } from 'express'
import CouponModel from '../../schema/coupon'

const list = async(
  req: Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const venueID = req.params.id
  const coupons = await CouponModel.find({ venueID }).sort({ createdAt: -1 })
  res.json(coupons)
}

export default list
