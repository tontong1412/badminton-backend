import { Request, Response } from 'express'
import CouponModel from '../../schema/coupon'
import { Types } from 'mongoose'

interface CreateCouponPayload {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscountAmount?: number;
  maxUses?: number;
  expiresAt?: string;
}

const create = async(
  req: Request<{ id: string }, unknown, CreateCouponPayload>,
  res: Response,
): Promise<void> => {
  const venueID = req.params.id
  const { code, discountType, discountValue, maxDiscountAmount, maxUses, expiresAt } = req.body

  if (!code || !discountType || discountValue == null) {
    res.status(400).json({ message: 'code, discountType, and discountValue are required.' })
    return
  }

  if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
    res.status(400).json({ message: 'Percentage discount must be between 1 and 100.' })
    return
  }

  if (discountType === 'fixed' && discountValue <= 0) {
    res.status(400).json({ message: 'Fixed discount must be greater than 0.' })
    return
  }

  const existing = await CouponModel.findOne({ code: code.toUpperCase().trim() })
  if (existing) {
    res.status(409).json({ message: `Coupon code "${code.toUpperCase()}" already exists.` })
    return
  }

  const coupon = await CouponModel.create({
    code: code.toUpperCase().trim(),
    venueID: new Types.ObjectId(venueID),
    discountType,
    discountValue,
    maxDiscountAmount: (discountType === 'percentage' && maxDiscountAmount && maxDiscountAmount > 0) ? maxDiscountAmount : undefined,
    maxUses: maxUses ?? undefined,
    expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    isActive: true,
    usedCount: 0,
  })

  res.status(201).json(coupon)
}

export default create
