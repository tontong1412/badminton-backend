import { Request, Response } from 'express'
import CouponModel from '../../schema/coupon'
import { Types } from 'mongoose'

interface ValidateCouponPayload {
  code: string;
  venueID: string;
  totalPrice: number;
}

const validate = async(
  req: Request<unknown, unknown, ValidateCouponPayload>,
  res: Response,
): Promise<void> => {
  const { code, venueID, totalPrice } = req.body

  if (!code || !venueID || totalPrice == null) {
    res.status(400).json({ message: 'code, venueID, and totalPrice are required.' })
    return
  }

  const coupon = await CouponModel.findOne({ code: code.toUpperCase().trim() })

  if (!coupon) {
    res.status(404).json({ message: 'Invalid coupon code.' })
    return
  }

  if (!coupon.isActive) {
    res.status(422).json({ message: 'This coupon is no longer active.' })
    return
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.status(422).json({ message: 'This coupon has expired.' })
    return
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    res.status(422).json({ message: 'This coupon has reached its usage limit.' })
    return
  }

  // Check venue scope
  if (coupon.venueID && coupon.venueID.toString() !== new Types.ObjectId(venueID).toString()) {
    res.status(422).json({ message: 'This coupon is not valid for this venue.' })
    return
  }

  const rawDiscount = coupon.discountType === 'percentage'
    ? Number(((totalPrice * coupon.discountValue) / 100).toFixed(2))
    : Math.min(coupon.discountValue, totalPrice)

  const discountAmount = (coupon.discountType === 'percentage' && coupon.maxDiscountAmount)
    ? Math.min(rawDiscount, coupon.maxDiscountAmount)
    : rawDiscount

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    finalPrice: Number((totalPrice - discountAmount).toFixed(2)),
  })
}

export default validate
