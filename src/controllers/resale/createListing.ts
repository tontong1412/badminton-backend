import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import ResaleListingModel from '../../schema/resaleListing'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import { BookingStatus, ResaleOutcome, ResaleStatus, ResponseLocals } from '../../type'

interface CreateListingPayload {
  bookingID: string;
  askingPrice: number;
}

const createListing = async(
  req: Request<unknown, unknown, CreateListingPayload>,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  const booking = await BookingModel.findById(req.body.bookingID)

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  if (booking.userID?.toString() !== res.locals.user.id.toString()) {
    res.status(403).json({ message: 'Only the booking owner can create a resale listing.' })
    return
  }

  if (booking.status !== BookingStatus.Confirmed) {
    res.status(400).json({ message: 'Only confirmed bookings can be resold.' })
    return
  }

  const startsAt = new Date(booking.date)
  const startMinutes = bookingUtils.timeToMinutes(booking.startTime)
  startsAt.setMinutes(startsAt.getMinutes() + startMinutes)
  if (startsAt <= new Date()) {
    res.status(400).json({ message: 'Past bookings cannot be resold.' })
    return
  }

  const existingListing = await ResaleListingModel.findOne({ bookingID: booking._id, status: ResaleStatus.Active })
  if (existingListing) {
    res.status(409).json({ message: 'An active resale listing already exists for this booking.' })
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

  const listing = await new ResaleListingModel({
    bookingID: booking._id,
    sellerID: res.locals.user.id,
    venueID: venue._id,
    venueOwnerID: venue.ownerUserID,
    askingPrice: req.body.askingPrice,
    currency: booking.currency,
  }).save()

  booking.resaleListingID = new Types.ObjectId(listing.id)
  booking.resaleOutcome = ResaleOutcome.Listed
  await booking.save()

  res.status(201).json(listing)
}

export default createListing