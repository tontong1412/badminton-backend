import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import { BookingStatus, ResponseLocals, UserRole } from '../../type'

const cancel = async(req: Request<{ id: string }>, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const booking = await BookingModel.findById(req.params.id)

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  const isBookingOwner = booking.userID?.toString() === res.locals.user.id.toString()
  const isAdmin = res.locals.user.role === UserRole.Admin

  let isVenueAdmin = false
  if (!isBookingOwner && !isAdmin) {
    const court = await CourtModel.findById(booking.courtID)
    if (court) {
      const venue = await VenueModel.findById(court.venueID)
      if (venue) {
        const userID = res.locals.user.id.toString()
        isVenueAdmin = venue.ownerUserID.toString() === userID
          || venue.managerUserIDs.some((id) => id.toString() === userID)
      }
    }
  }

  if (!isBookingOwner && !isAdmin && !isVenueAdmin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  booking.status = BookingStatus.Cancelled
  await booking.save()
  res.json(booking)
}

export default cancel