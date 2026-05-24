import { Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import requestUserUtils from '../../utils/requestUser'
import sendBookingConfirmationEmail from '../../utils/bookingEmail'
import { BookingStatus, BookingType, PaymentStatus, RequestWithCookies, ResaleOutcome } from '../../type'
import CouponModel from '../../schema/coupon'

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
  couponCode?: string;
  overridePrice?: number;
}

const createSingle = async(
  req: RequestWithCookies<unknown, unknown, CreateSingleBookingPayload>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  const { slip, note, couponCode, overridePrice } = req.body

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
    discountAmount?: number;
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

    // Split the booking into 1-hour segments; each segment becomes its own booking document
    let cursor = bookingUtils.timeToMinutes(item.startTime)
    const endMinutes = bookingUtils.timeToMinutes(item.endTime)
    while (cursor < endMinutes) {
      const segEnd = Math.min(cursor + 60, endMinutes)
      const segStart = bookingUtils.minutesToTime(cursor)
      const segEndStr = bookingUtils.minutesToTime(segEnd)
      const segDuration = segEnd - cursor
      draftBookings.push({
        courtID: new Types.ObjectId(court.id as string),
        date: bookingDate,
        startTime: segStart,
        endTime: segEndStr,
        durationMinutes: segDuration,
        totalPrice: bookingUtils.calculateTotalPriceWithRules(court, segStart, segEndStr),
        currency: court.currency,
      })
      cursor = segEnd
    }

    inRequestByCourtDate.set(overlapKey, [...existingRanges, { startTime: item.startTime, endTime: item.endTime }])
  }

  // If admin provided an override price, distribute it proportionally across segments
  if (req.body.bookedAsAdmin && overridePrice !== undefined && overridePrice >= 0) {
    const naturalTotal = draftBookings.reduce((s, b) => s + b.totalPrice, 0)
    for (const booking of draftBookings) {
      const share = naturalTotal > 0 ? booking.totalPrice / naturalTotal : 1 / draftBookings.length
      booking.totalPrice = Number((overridePrice * share).toFixed(2))
    }
    // Fix rounding: assign remainder to last booking
    const distributed = draftBookings.reduce((s, b) => s + b.totalPrice, 0)
    draftBookings[draftBookings.length - 1].totalPrice = Number(
      (draftBookings[draftBookings.length - 1].totalPrice + (overridePrice - distributed)).toFixed(2)
    )
  }

  const bookingBundleID = new Types.ObjectId()
  const bookingRef = generateBookingRef()

  // Validate and apply coupon discount if provided
  let appliedCouponCode: string | undefined
  let totalDiscountAmount = 0

  if (couponCode) {
    const coupon = await CouponModel.findOne({ code: couponCode.toUpperCase().trim() })
    if (!coupon || !coupon.isActive) {
      res.status(422).json({ message: 'Invalid or inactive coupon code.' })
      return
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      res.status(422).json({ message: 'This coupon has expired.' })
      return
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      res.status(422).json({ message: 'This coupon has reached its usage limit.' })
      return
    }
    // Check venue scope using first item's venue
    const firstCourt = await CourtModel.findById(draftBookings[0].courtID)
    if (coupon.venueID && coupon.venueID.toString() !== firstCourt?.venueID.toString()) {
      res.status(422).json({ message: 'This coupon is not valid for this venue.' })
      return
    }

    const undiscountedTotal = draftBookings.reduce((s, b) => s + b.totalPrice, 0)
    const rawDiscount = coupon.discountType === 'percentage'
      ? Number(((undiscountedTotal * coupon.discountValue) / 100).toFixed(2))
      : Math.min(coupon.discountValue, undiscountedTotal)
    totalDiscountAmount = (coupon.discountType === 'percentage' && coupon.maxDiscountAmount)
      ? Math.min(rawDiscount, coupon.maxDiscountAmount)
      : rawDiscount

    // Apply discount proportionally across bookings
    if (totalDiscountAmount > 0 && undiscountedTotal > 0) {
      for (const booking of draftBookings) {
        const share = booking.totalPrice / undiscountedTotal
        const bookingDiscount = Number((totalDiscountAmount * share).toFixed(2))
        booking.totalPrice = Number((booking.totalPrice - bookingDiscount).toFixed(2))
        booking.discountAmount = bookingDiscount
      }
    }

    appliedCouponCode = coupon.code
    await CouponModel.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } })
  }

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
    couponCode: appliedCouponCode,
    discountAmount: item.discountAmount,
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
  if (!req.body.bookedAsAdmin) {
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
}

export default createSingle