import { Request, Response } from 'express'
import ResaleListingModel from '../../schema/resaleListing'
import { ResponseLocals, SellerPayoutStatus, UserRole } from '../../type'

const markSellerPaid = async(req: Request<{ id: string }>, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const listing = await ResaleListingModel.findById(req.params.id)

  if (!listing) {
    res.status(404).json({ message: 'Resale listing not found' })
    return
  }

  const isVenueOwner = listing.venueOwnerID.toString() === res.locals.user.id.toString()
  const isAdmin = res.locals.user.role === UserRole.Admin

  if (!isVenueOwner && !isAdmin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  listing.sellerPayoutStatus = SellerPayoutStatus.Paid
  listing.sellerPayoutAt = new Date()
  await listing.save()

  res.json(listing)
}

export default markSellerPaid