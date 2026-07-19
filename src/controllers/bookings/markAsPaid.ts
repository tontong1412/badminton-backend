import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, PaymentStatus, RequestWithCookies } from '../../type'
import { finalizeResaleListingsForBookings } from '../../utils/resaleListingLifecycle'

const markAsPaid = async(
  req: RequestWithCookies & Request<{ id: string }>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  const { id } = req.params

  const booking = await BookingModel.findById(id)
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  const court = await CourtModel.findById(booking.courtID)
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
  const isManager = venue.managerUserIDs.some((mid) => mid.toString() === currentUser.id.toString())
  if (!isOwner && !isManager) {
    res.status(403).json({ message: 'Only the venue owner or manager can mark bookings as paid' })
    return
  }

  if (booking.status === BookingStatus.Cancelled) {
    res.status(400).json({ message: 'Cannot mark a cancelled booking as paid' })
    return
  }

  if (booking.paymentStatus === PaymentStatus.Paid) {
    res.status(400).json({ message: 'Booking is already paid' })
    return
  }

  const updated = await BookingModel.findByIdAndUpdate(
    id,
    { paymentStatus: PaymentStatus.Paid, status: BookingStatus.Confirmed },
    { new: true },
  )

  if (updated) {
    await finalizeResaleListingsForBookings([updated])
  }

  res.json({ message: 'Booking marked as paid', booking: updated })
}

export default markAsPaid
