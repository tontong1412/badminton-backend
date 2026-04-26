import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import requestUserUtils from '../../utils/requestUser'
import { PaymentStatus, RequestWithCookies, UserRole } from '../../type'
import mediaUtils from '../../utils/media'
import config from '../../config'

interface PayBookingPayload {
  slip: string;
  note?: string;
}

const payBooking = async(
  req: RequestWithCookies & Request<{ bookingBundleID: string }, unknown, PayBookingPayload>,
  res: Response,
): Promise<void> => {
  const bookingBundleID = req.params.bookingBundleID

  if (!req.body.slip) {
    res.status(400).json({ message: 'Payment slip is required.' })
    return
  }

  if (!req.body.slip.startsWith('data:image/')) {
    res.status(400).json({ message: 'Payment slip must be a base64 image (data:image/*;base64,...)' })
    return
  }

  const bookings = await BookingModel.find({ bookingBundleID })
  if (bookings.length === 0) {
    res.status(404).json({ message: 'Booking bundle not found' })
    return
  }

  const booking = bookings[0]

  const currentUser = requestUserUtils.getOptionalUser(req)

  if (currentUser) {
    const isOwner = booking.userID?.toString() === currentUser.id.toString()
    const isAdmin = currentUser.role === UserRole.Admin
    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
  } else {
    if (booking.bookerType !== 'guest' || booking.guestEmail !== req.query.guestEmail) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
  }

  const uploadedSlip = await mediaUtils.uploadPhoto(
    req.body.slip,
    `${config.CLOUDINARY_PREFIX}booking/slips`,
    `${bookingBundleID}-${Date.now()}`,
  )

  const updateQuery: Record<string, unknown> = {
    slip: uploadedSlip.url,
    slipTimestamp: new Date(),
    paymentStatus: PaymentStatus.Pending,
  }

  if (req.body.note) {
    updateQuery.note = req.body.note
  }

  await BookingModel.updateMany(
    { bookingBundleID },
    updateQuery,
  )

  const updatedBookings = await BookingModel.find({ bookingBundleID })

  res.json({
    message: 'Payment recorded for entire booking bundle.',
    bundleID: bookingBundleID,
    bookingCount: updatedBookings.length,
    bookings: updatedBookings,
  })
}

export default payBooking
