import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { RequestWithCookies, UserRole } from '../../type'

const getBundle = async(
  req: RequestWithCookies & Request<{ bookingBundleID: string }>,
  res: Response,
): Promise<void> => {
  const { bookingBundleID } = req.params

  const bookings = await BookingModel.find({ bookingBundleID })

  if (bookings.length === 0) {
    res.status(404).json({ message: 'Booking bundle not found' })
    return
  }

  const firstBooking = bookings[0]
  const currentUser = requestUserUtils.getOptionalUser(req)

  if (currentUser) {
    const isOwner = firstBooking.userID?.toString() === currentUser.id.toString()
    const isAdmin = currentUser.role === UserRole.Admin
    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
  } else {
    const guestEmail = req.query.guestEmail
    if (
      firstBooking.bookerType !== 'guest' ||
      typeof guestEmail !== 'string' ||
      firstBooking.guestEmail !== guestEmail
    ) {
      res.status(403).json({ message: 'Forbidden' })
      return
    }
  }

  // Fetch court and venue info for enriched response
  const court = await CourtModel.findById(firstBooking.courtID)
  const venue = court ? await VenueModel.findById(court.venueID) : null

  res.json({
    bookings,
    venue,
    court,
  })
}

export default getBundle
