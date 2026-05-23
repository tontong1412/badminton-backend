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
  subStartTime?: string;
  subEndTime?: string;
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

  const { subStartTime, subEndTime } = req.body

  // Validate sub-range if provided
  if (subStartTime || subEndTime) {
    if (!subStartTime || !subEndTime) {
      res.status(400).json({ message: 'Both subStartTime and subEndTime are required together.' })
      return
    }
    const bookingStart = bookingUtils.timeToMinutes(booking.startTime)
    const bookingEnd = bookingUtils.timeToMinutes(booking.endTime)
    const subStart = bookingUtils.timeToMinutes(subStartTime)
    const subEnd = bookingUtils.timeToMinutes(subEndTime)
    if (subStart < bookingStart || subEnd > bookingEnd || subStart >= subEnd) {
      res.status(400).json({ message: 'Sub-range must fall within the booking time and be valid.' })
      return
    }
  }

  // Check for duplicate active listing for the same booking + sub-range
  const existingListing = await ResaleListingModel.findOne({
    bookingID: booking._id,
    status: ResaleStatus.Active,
    subStartTime: subStartTime ?? { $exists: false },
  })
  if (existingListing) {
    res.status(409).json({ message: 'An active resale listing already exists for this slot.' })
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
    subStartTime,
    subEndTime,
  }).save()

  booking.resaleListingID = new Types.ObjectId(listing.id as string)
  booking.resaleOutcome = ResaleOutcome.Listed
  await booking.save()

  res.status(201).json(listing)
}

export default createListing