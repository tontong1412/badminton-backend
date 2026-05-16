import { Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import requestUserUtils from '../../utils/requestUser'
import sendBookingConfirmationEmail from '../../utils/bookingEmail'
import { BookingStatus, BookingType, PaymentStatus, RequestWithCookies, ResaleOutcome } from '../../type'

function generateBookingRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = ''
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
}

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
  bookedAsAdmin?: boolean;
}

const createSingle = async(
  req: RequestWithCookies<unknown, unknown, CreateSingleBookingPayload>,
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
  const courtNameMap = new Map<string, string>()
  const draftBookings: Array<{
    courtID: Types.ObjectId;
    date: Date;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    totalPrice: number;
    currency: string;
  }> = []
  let firstVenueName = ''

  for (const item of bookingItems) {
    const bookingDate = bookingUtils.normalizeDate(item.date)
    // Validate alignment only first; min-duration check happens after venue admin status is known
    bookingUtils.validateBookingWindow(item.startTime, item.endTime, { skipMinDuration: true })

    const court = await CourtModel.findById(item.courtID)
    if (!court || court.status !== 'active') {
      res.status(404).json({ message: `Court not found for item ${item.courtID}` })
      return
    }
    courtNameMap.set(court.id as string, court.name)

    const venue = await VenueModel.findById(court.venueID)
    if (!venue) {
      res.status(404).json({ message: 'Venue not found' })
      return
    }
    if (!firstVenueName) firstVenueName = venue.name?.en || venue.name?.th || ''

    const userID = currentUser?.id?.toString()
    const isVenueAdmin = userID && (
      venue.ownerUserID.toString() === userID
      || venue.managerUserIDs.some((id) => id.toString() === userID)
    )
    if (!isVenueAdmin) {
      // Enforce minimum booking duration for regular users
      bookingUtils.validateBookingWindow(item.startTime, item.endTime)
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

    const availability = await bookingUtils.checkSlotAvailability(court.id as string, bookingDate, item.startTime, item.endTime)
    if (!availability.available) {
      res.status(409).json({ message: `Court ${court.name} is already booked for ${item.startTime}-${item.endTime}.` })
      return
    }

    if (!isVenueAdmin) {
      const gapValidation = await bookingUtils.validateBookingGap(
        court.id as string,
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
    }

    const durationMinutes = bookingUtils.calculateDurationMinutes(item.startTime, item.endTime)
    draftBookings.push({
      courtID: new Types.ObjectId(court.id as string),
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
  const bookingRef = generateBookingRef()

  const savedBookings = await BookingModel.insertMany(draftBookings.map((item) => ({
    bookingBundleID,
    bookingRef,
    courtID: item.courtID,
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    durationMinutes: item.durationMinutes,
    totalPrice: item.totalPrice,
    currency: item.currency,
    bookerType: currentUser ? 'user' : 'guest',
    userID: req.body.bookedAsAdmin ? undefined : currentUser?.id,
    guestName: req.body.guestName || undefined,
    guestPhone: req.body.guestPhone || undefined,
    guestEmail: req.body.guestEmail || undefined,
    bookingType: BookingType.Single,
    status: BookingStatus.Pending,
    paymentStatus: slip ? PaymentStatus.Pending : PaymentStatus.Unpaid,
    slip,
    slipTimestamp: slip ? new Date() : undefined,
    note,
    resaleOutcome: ResaleOutcome.None,
  })))

  if (savedBookings.length === 1 && (!req.body.items || req.body.items.length <= 1)) {
    res.status(201).json(savedBookings[0])
  } else {
    const totalPrice = savedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
    res.status(201).json({
      bookingBundleID,
      bookingRef,
      bookingCount: savedBookings.length,
      totalPrice,
      bookings: savedBookings,
    })
  }

  // Send confirmation email (fire-and-forget — do not block response)
  const totalPrice = savedBookings.reduce((sum, booking) => sum + booking.totalPrice, 0)
  sendBookingConfirmationEmail({
    bookings: savedBookings.map((b) => ({
      ...b.toObject(),
      courtName: courtNameMap.get(b.courtID.toString()),
    })),
    bookingBundleID: bookingBundleID.toString(),
    bookingRef,
    guestEmail: req.body.guestEmail || undefined,
    guestName: req.body.guestName || undefined,
    userEmail: currentUser?.email || undefined,
    venueName: firstVenueName,
    totalPrice,
    currency: savedBookings[0]?.currency ?? '',
  }).catch((err) => console.error('Failed to send booking confirmation email:', err))
}

export default createSingle