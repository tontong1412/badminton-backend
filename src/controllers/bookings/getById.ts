import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import requestUserUtils from '../../utils/requestUser'
import { RequestWithCookies, UserRole } from '../../type'

const getById = async(req: RequestWithCookies & Request<{ id: string }>, res: Response): Promise<void> => {
  const booking = await BookingModel.findById(req.params.id)

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  const currentUser = requestUserUtils.getOptionalUser(req)
  if (currentUser) {
    const isOwner = booking.userID?.toString() === currentUser.id.toString()
    const isAdmin = currentUser.role === UserRole.Admin
    if (isOwner || isAdmin) {
      res.json(booking)
      return
    }
  }

  if (booking.bookerType === 'guest' && typeof req.query.guestEmail === 'string' && booking.guestEmail === req.query.guestEmail) {
    res.json(booking)
    return
  }

  res.status(403).json({ message: 'Forbidden' })
}

export default getById