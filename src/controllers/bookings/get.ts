import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import { ResponseLocals } from '../../type'

const get = async(_req: Request, res: Response<unknown, ResponseLocals>): Promise<void> => {
  const bookings = await BookingModel.find({ userID: res.locals.user.id }).sort({ date: 1, startTime: 1 })
  res.json(bookings)
}

export default get