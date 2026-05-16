import { Request, Response } from 'express'
import CouponModel from '../../schema/coupon'

const remove = async(
  req: Request<{ id: string; couponID: string }>,
  res: Response,
): Promise<void> => {
  const { id: venueID, couponID } = req.params

  const coupon = await CouponModel.findOne({ _id: couponID, venueID })
  if (!coupon) {
    res.status(404).json({ message: 'Coupon not found.' })
    return
  }

  await coupon.deleteOne()
  res.json({ message: 'Coupon deleted.' })
}

export default remove
