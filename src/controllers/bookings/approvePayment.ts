import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, PaymentStatus, RequestWithCookies } from '../../type'

const approvePayment = async(
  req: RequestWithCookies & Request<{ bookingBundleID: string }>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  const { bookingBundleID } = req.params

  const bookings = await BookingModel.find({ bookingBundleID })
  if (bookings.length === 0) {
    res.status(404).json({ message: 'Booking bundle not found' })
    return
  }

  // Verify the current user owns the venue these courts belong to
  const courtID = bookings[0].courtID
  const court = await CourtModel.findById(courtID)
  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  const venue = await VenueModel.findById(court.venueID)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const isOwner = venue.ownerUserID.toString() === currentUser.id.toString()
  const isManager = venue.managerUserIDs.some((id) => id.toString() === currentUser.id.toString())
  if (!isOwner && !isManager) {
    res.status(403).json({ message: 'Only the venue owner or manager can approve payments' })
    return
  }

  if (bookings[0].paymentStatus !== PaymentStatus.Pending) {
    res.status(400).json({ message: 'Booking payment is not pending approval' })
    return
  }

  await BookingModel.updateMany(
    { bookingBundleID },
    { paymentStatus: PaymentStatus.Paid, status: BookingStatus.Confirmed },
  )

  const updatedBookings = await BookingModel.find({ bookingBundleID })
  res.json({ message: 'Payment approved', bookings: updatedBookings })
}

export default approvePayment
