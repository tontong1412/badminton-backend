import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import { BookingStatus, ResponseLocals, UserRole } from '../../type'

const cancel = async(req: Request<{ id: string }>, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const booking = await BookingModel.findById(req.params.id)

  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  const isOwner = booking.userID?.toString() === res.locals.user.id.toString()
  const isAdmin = res.locals.user.role === UserRole.Admin
  if (!isOwner && !isAdmin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  booking.status = BookingStatus.Cancelled
  await booking.save()
  res.json(booking)
}

export default cancel