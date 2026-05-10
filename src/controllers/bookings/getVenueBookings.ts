import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { PaymentStatus, RequestWithCookies } from '../../type'

const getVenueBookings = async(
  req: RequestWithCookies & Request,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  // Find all venues owned by this user
  const venues = await VenueModel.find({ ownerUserID: currentUser.id })
  const venueIDs = venues.map((v) => v._id)

  // Find all courts in those venues
  const courts = await CourtModel.find({ venueID: { $in: venueIDs } })
  const courtIDs = courts.map((c) => c._id)

  // Find bookings for those courts with paymentStatus = pending (slip uploaded, awaiting approval)
  const paymentStatusFilter = req.query.paymentStatus as string | undefined
  const query: Record<string, unknown> = { courtID: { $in: courtIDs } }
  if (paymentStatusFilter) {
    query.paymentStatus = paymentStatusFilter
  } else {
    query.paymentStatus = PaymentStatus.Pending
  }

  const bookings = await BookingModel.find(query).sort({ slipTimestamp: -1 })

  res.json(bookings)
}

export default getVenueBookings
