import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import RecurringGroupModel from '../../schema/recurringGroup'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import { BookingStatus, BookingType, PaymentStatus, RecurringPattern, ResaleOutcome, ResponseLocals } from '../../type'

interface CreateRecurringBookingPayload {
  courtID: string;
  startTime: string;
  endTime: string;
  pattern: RecurringPattern;
  rangeStart: string;
  rangeEnd: string;
  daysOfWeek?: number[];
  slip?: string;
  note?: string;
}

const createRecurring = async(
  req: Request<unknown, unknown, CreateRecurringBookingPayload>,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  bookingUtils.validateBookingWindow(req.body.startTime, req.body.endTime)

  const court = await CourtModel.findById(req.body.courtID)
  if (!court || court.status !== 'active') {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  const venue = await VenueModel.findById(court.venueID)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const dates = bookingUtils.enumerateRecurringDates(
    req.body.pattern,
    new Date(req.body.rangeStart),
    new Date(req.body.rangeEnd),
    req.body.daysOfWeek,
  )

  if (dates.length === 0) {
    res.status(400).json({ message: 'No booking dates generated for the requested range.' })
    return
  }

  const conflicts: { date: string; reason: string }[] = []
  for (const date of dates) {
    const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
    if (!schedule) {
      conflicts.push({ date: date.toISOString(), reason: 'Venue is closed.' })
      continue
    }

    if (
      bookingUtils.timeToMinutes(req.body.startTime) < bookingUtils.timeToMinutes(schedule.open)
      || bookingUtils.timeToMinutes(req.body.endTime) > bookingUtils.timeToMinutes(schedule.close)
    ) {
      conflicts.push({ date: date.toISOString(), reason: 'Outside venue operating hours.' })
      continue
    }

    const availability = await bookingUtils.checkSlotAvailability(
      court.id,
      date,
      req.body.startTime,
      req.body.endTime,
    )
    if (!availability.available) {
      conflicts.push({ date: date.toISOString(), reason: 'Court already booked.' })
      continue
    }

    const gapValidation = await bookingUtils.validateBookingGap(
      court.id,
      date,
      req.body.startTime,
      req.body.endTime,
      venue.gapPolicy,
      schedule.open,
      schedule.close,
    )
    if (!gapValidation.valid) {
      conflicts.push({ date: date.toISOString(), reason: gapValidation.reason ?? 'Gap rule conflict.' })
    }
  }

  if (conflicts.length > 0) {
    res.status(409).json({ message: 'Recurring booking conflicts found.', conflicts })
    return
  }

  const durationMinutes = bookingUtils.calculateDurationMinutes(req.body.startTime, req.body.endTime)
  const bookingBundleID = new Types.ObjectId()
  const recurringGroup = await new RecurringGroupModel({
    courtID: court._id,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    durationMinutes,
    pattern: req.body.pattern,
    daysOfWeek: req.body.pattern === RecurringPattern.Weekly ? req.body.daysOfWeek : undefined,
    rangeStart: bookingUtils.normalizeDate(req.body.rangeStart),
    rangeEnd: bookingUtils.normalizeDate(req.body.rangeEnd),
    userID: res.locals.user.id,
  }).save()

  const bookings = await BookingModel.insertMany(dates.map((date) => ({
    bookingBundleID,
    courtID: court._id,
    date,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    durationMinutes,
    totalPrice: bookingUtils.calculateTotalPrice(court.pricePerHour, durationMinutes),
    currency: court.currency,
    bookerType: 'user',
    userID: res.locals.user.id,
    bookingType: BookingType.Recurring,
    recurringGroupID: recurringGroup._id,
    status: BookingStatus.Confirmed,
    paymentStatus: req.body.slip ? PaymentStatus.Pending : PaymentStatus.Unpaid,
    slip: req.body.slip,
    slipTimestamp: req.body.slip ? new Date() : undefined,
    note: req.body.note,
    resaleOutcome: ResaleOutcome.None,
  })))

  recurringGroup.bookingIDs = bookings.map((booking) => new Types.ObjectId(booking.id))
  await recurringGroup.save()

  res.status(201).json({ recurringGroup, bookings })
}

export default createRecurring