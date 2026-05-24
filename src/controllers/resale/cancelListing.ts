import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import ResaleListingModel from '../../schema/resaleListing'
import { ResaleOutcome, ResaleStatus, ResponseLocals, UserRole } from '../../type'

const cancelListing = async(req: Request<{ id: string }>, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const listing = await ResaleListingModel.findById(req.params.id)

  if (!listing) {
    res.status(404).json({ message: 'Resale listing not found' })
    return
  }

  const isSeller = listing.sellerID.toString() === res.locals.user.id.toString()
  const isAdmin = res.locals.user.role === UserRole.Admin
  if (!isSeller && !isAdmin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  listing.status = ResaleStatus.Cancelled
  await listing.save()

  const booking = await BookingModel.findById(listing.bookingID)
  if (booking) {
    booking.resaleOutcome = ResaleOutcome.None
    booking.resaleListingID = undefined
    await booking.save()
  }

  res.json(listing)
}

export default cancelListing