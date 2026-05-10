import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { RequestWithCookies } from '../../type'

const getVenueBookings = async(
  req: RequestWithCookies & Request,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  // Find all venues owned or managed by this user
  const venueIDFilter = typeof req.query.venueID === 'string' ? req.query.venueID : undefined
  const venueQuery: Record<string, unknown> = {
    $or: [
      { ownerUserID: currentUser.id },
      { managerUserIDs: currentUser.id },
    ],
  }
  if (venueIDFilter) venueQuery._id = venueIDFilter

  const venues = await VenueModel.find(venueQuery)
  const venueIDs = venues.map((v) => v._id)

  // Find all courts in those venues
  const courts = await CourtModel.find({ venueID: { $in: venueIDs } })
  const courtIDs = courts.map((c) => c._id)

  const query: Record<string, unknown> = { courtID: { $in: courtIDs } }

  const paymentStatusFilter = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus : undefined
  if (paymentStatusFilter) {
    query.paymentStatus = paymentStatusFilter
  }

  const dateFilter = typeof req.query.date === 'string' ? req.query.date : undefined
  if (dateFilter) {
    const start = new Date(dateFilter)
    const end = new Date(dateFilter)
    end.setDate(end.getDate() + 1)
    query.date = { $gte: start, $lt: end }
  }

  const bookings = await BookingModel.find(query).sort({ date: 1, startTime: 1 })

  res.json(bookings)
}

export default getVenueBookings
