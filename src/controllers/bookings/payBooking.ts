import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { PaymentStatus, RequestWithCookies, UserRole } from '../../type'
import mediaUtils from '../../utils/media'
import slipokUtils from '../../utils/slipok'
import encryptionUtils from '../../utils/encryption'
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
  const { slip, note } = req.body as PayBookingPayload

  if (!slip) {
    res.status(400).json({ message: 'Payment slip is required.' })
    return
  }

  if (!slip.startsWith('data:image/')) {
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

  // Verify slip via SlipOK if the venue has configured an API key
  const court = await CourtModel.findById(booking.courtID)
  const venue = court ? await VenueModel.findById(court.venueID) : null
  const slipokConfig = venue?.slipok as { branchId?: string; apiKey?: string } | undefined

  if (slipokConfig?.apiKey && slipokConfig?.branchId) {
    try {
      const apiKey = encryptionUtils.decrypt(slipokConfig.apiKey, config.ENCRYPTION_KEY)
      const apiUrl = `https://api.slipok.com/api/line/apikey/${slipokConfig.branchId}`
      const totalAmount = bookings.reduce((sum, b) => sum + b.totalPrice, 0)
      const matches = slip.match(/^data:(image\/[\w+]+);base64,(.+)$/)
      if (!matches) {
        res.status(400).json({ message: 'Invalid image format.' })
        return
      }
      const mimeType = matches[1]
      const imageBuffer = Buffer.from(matches[2], 'base64')
      const slipResult = await slipokUtils.verifySlip(imageBuffer, mimeType, totalAmount, { url: apiUrl, apiKey })
      if (!slipResult.success) {
        res.status(422).json({
          message: slipResult.errorMessage,
        })
        return
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Slip verification failed'
      res.status(400).json({ message })
      return
    }
  }

  const uploadedSlip = await mediaUtils.uploadPhoto(
    slip,
    `${config.CLOUDINARY_PREFIX}booking/slips`,
    `${bookingBundleID}-${Date.now()}`,
  )

  const updateQuery: Record<string, unknown> = {
    slip: uploadedSlip.url,
    slipTimestamp: new Date(),
    paymentStatus: PaymentStatus.Pending,
  }

  if (note) {
    updateQuery.note = note
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
