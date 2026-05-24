import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import UserModel from '../../schema/user'
import requestUserUtils from '../../utils/requestUser'
import sendBookingConfirmationEmail from '../../utils/bookingEmail'
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
  const court = await CourtModel.findById(courtID).select('venueID name')
  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  const venue = await VenueModel.findById(court.venueID).select('ownerUserID managerUserIDs name')
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

  // Update in-memory instead of re-querying
  bookings.forEach((b) => {
    b.paymentStatus = PaymentStatus.Paid
    b.status = BookingStatus.Confirmed
  })

  res.json({ message: 'Payment approved', bookings })

  // Send payment approved email (fire-and-forget)
  const firstBooking = bookings[0]
  if (firstBooking) {
    const guestEmail = firstBooking.guestEmail
    const venueName = venue.name?.en || venue.name?.th || ''
    const bookingRef = firstBooking.bookingRef ?? ''
    const totalPrice = bookings.reduce((sum, b) => sum + b.totalPrice, 0)
    const currency = firstBooking.currency ?? ''

    const uniqueCourtIDs = [...new Set(bookings.map((b) => b.courtID.toString()))]
    const otherCourtIDs = uniqueCourtIDs.filter((id) => id !== court.id.toString())

    // Parallelize user email lookup and remaining court name fetches
    const [booker, otherCourts] = await Promise.all([
      !guestEmail && firstBooking.userID
        ? UserModel.findById(firstBooking.userID, { email: 1 }).lean()
        : Promise.resolve(null),
      otherCourtIDs.length > 0
        ? CourtModel.find({ _id: { $in: otherCourtIDs } }, { name: 1 }).lean()
        : Promise.resolve([]),
    ])

    const userEmail = booker?.email
    const courtNameMap = new Map<string, typeof court.name>([
      [court.id.toString(), court.name],
      ...otherCourts.map((c) => [(c._id as Types.ObjectId).toString(), c.name] as [string, typeof court.name]),
    ])

    sendBookingConfirmationEmail({
      bookings: bookings.map((b) => ({
        ...b.toObject(),
        courtName: courtNameMap.get(b.courtID.toString()),
      })),
      bookingBundleID,
      bookingRef,
      guestEmail,
      guestName: firstBooking.guestName,
      userEmail,
      venueName,
      totalPrice,
      currency,
      emailType: 'payment_approved',
    }).catch((err) => console.error('Failed to send payment approval email:', err))
  }
}

export default approvePayment
