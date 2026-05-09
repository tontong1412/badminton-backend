import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, BookingType, PaymentStatus, RequestWithCookies, ResaleOutcome } from '../../type'

interface CreateSingleBookingItem {
  courtID: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface CreateSingleBookingPayload {
  courtID?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  items?: CreateSingleBookingItem[];
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  slip?: string;
  note?: string;
}

const createSingle = async(
  req: RequestWithCookies & Request<unknown, unknown, CreateSingleBookingPayload>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  const { slip, note } = req.body

  const bookingItems: CreateSingleBookingItem[] = req.body.items && req.body.items.length > 0
    ? req.body.items
    : (() => {
      if (!req.body.courtID || !req.body.date || !req.body.startTime || !req.body.endTime) {
        return []
      }

      return [{
        courtID: req.body.courtID,
        date: req.body.date,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
      }]
    })()

  if (bookingItems.length === 0) {
    res.status(400).json({ message: 'At least one booking item is required.' })
    return
  }

  if (!currentUser && (!req.body.guestName || !req.body.guestPhone || !req.body.guestEmail)) {
    res.status(400).json({ message: 'Guest name, phone, and email are required when not logged in.' })
    return
  }

  const inRequestByCourtDate = new Map<string, { startTime: string; endTime: string }[]>()
  const draftBookings: Array<{
    courtID: Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    totalPrice: number;
    currency: string;
  }> = []

  for (const item of bookingItems) {
    const bookingDate = bookingUtils.normalizeDate(item.date)
    bookingUtils.validateBookingWindow(item.startTime, item.endTime)

    const court = await CourtModel.findById(item.courtID)
    if (!court || court.status !== 'active') {
      res.status(404).json({ message: `Court not found for item ${item.courtID}` })
      return
    }

    const venue = await VenueModel.findById(court.venueID)
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' })
      return
    }

    const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, bookingDate)
    if (!schedule) {
      res.status(400).json({ message: `Venue is closed on ${bookingDate.toISOString().slice(0, 10)}.` })
      return
    }

    if (
      bookingUtils.timeToMinutes(item.startTime) < bookingUtils.timeToMinutes(schedule.open)
      || bookingUtils.timeToMinutes(item.endTime) > bookingUtils.timeToMinutes(schedule.close)
    ) {
      res.status(400).json({ message: `Booking is outside venue operating hours for court ${court.name}.` })
      return
    }

    const overlapKey = `${court.id}:${bookingDate.toISOString().slice(0, 10)}`
    const existingRanges = inRequestByCourtDate.get(overlapKey) ?? []
    const hasInRequestConflict = existingRanges.some((range) => (
      bookingUtils.timeToMinutes(item.startTime) < bookingUtils.timeToMinutes(range.endTime)
      && bookingUtils.timeToMinutes(item.endTime) > bookingUtils.timeToMinutes(range.startTime)
    ))

    if (hasInRequestConflict) {
      res.status(409).json({ message: `Booking items overlap in the same request for court ${court.name}.` })
      return
    }

    const availability = await bookingUtils.checkSlotAvailability(court.id, bookingDate, item.startTime, item.endTime)
    if (!availability.available) {
      res.status(409).json({ message: `Court ${court.name} is already booked for ${item.startTime}-${item.endTime}.` })
      return
    }

    const gapValidation = await bookingUtils.validateBookingGap(
      court.id,
      bookingDate,
      item.startTime,
      item.endTime,
      venue.gapPolicy,
      schedule.open,
      schedule.close,
    )
    if (!gapValidation.valid) {
      res.status(409).json({ message: gapValidation.reason })
      return
    }

    const durationMinutes = bookingUtils.calculateDurationMinutes(item.startTime, item.endTime)
    draftBookings.push({
      courtID: new Types.ObjectId(court.id),
      date: bookingDate,
      startTime: item.startTime,
      endTime: item.endTime,
      durationMinutes,
      totalPrice: bookingUtils.calculateTotalPriceWithRules(court, item.startTime, item.endTime),
      currency: court.currency,
    })

    inRequestByCourtDate.set(overlapKey, [...existingRanges, { startTime: item.startTime, endTime: item.endTime }])
  }

  const bookingBundleID = new Types.ObjectId()

  const savedBookings = await BookingModel.insertMany(draftBookings.map((item) => ({
    bookingBundleID,
    courtID: item.courtID,
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    durationMinutes: item.durationMinutes,
    totalPrice: item.totalPrice,
    currency: item.currency,
    bookerType: currentUser ? 'user' : 'guest',
    userID: currentUser?.id,
    guestName: currentUser ? undefined : req.body.guestName,
    guestPhone: currentUser ? undefined : req.body.guestPhone,
    guestEmail: currentUser ? undefined : req.body.guestEmail,
    bookingType: BookingType.Single,
    status: BookingStatus.Confirmed,
    paymentStatus: slip ? PaymentStatus.Pending : PaymentStatus.Unpaid,
    slip,
    slipTimestamp: slip ? new Date() : undefined,
    note,
    resaleOutcome: ResaleOutcome.None,
  })))

  if (savedBookings.length === 1 && (!req.body.items || req.body.items.length <= 1)) {
    res.status(201).json(savedBookings[0])
    return
  }

  const totalPrice = savedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
  res.status(201).json({
    bookingBundleID,
    bookingCount: savedBookings.length,
    totalPrice,
    bookings: savedBookings,
  })
}

export default createSingle