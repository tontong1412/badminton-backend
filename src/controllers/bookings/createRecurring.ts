import { Request, Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import RecurringGroupModel from '../../schema/recurringGroup'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import sendBookingConfirmationEmail from '../../utils/bookingEmail'
import { BookingStatus, BookingType, PaymentStatus, RecurringPattern, ResaleOutcome, ResponseLocals, UserRole } from '../../type'

function generateBookingRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = ''
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
}

interface CreateRecurringBookingPayload {
  courtID?: string;
  courtIDs?: string[];
  startTime: string;
  endTime: string;
  pattern: RecurringPattern;
  rangeStart: string;
  rangeEnd: string;
  daysOfWeek?: number[];
  slip?: string;
  note?: string;
  bookedAsAdmin?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

const createRecurring = async(
  req: Request<unknown, unknown, CreateRecurringBookingPayload>,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  const rawRequestedCourtIDs = req.body.courtIDs && req.body.courtIDs.length > 0
    ? req.body.courtIDs
    : req.body.courtID
      ? [req.body.courtID]
      : []

  const requestedCourtIDs = rawRequestedCourtIDs
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (requestedCourtIDs.length === 0) {
    res.status(400).json({ message: 'courtID or courtIDs is required.' })
    return
  }

  const dedupedCourtIDs = Array.from(new Set(requestedCourtIDs))
  const allCourts = await CourtModel.find({
    _id: { $in: dedupedCourtIDs },
  })
  const courts = allCourts.filter((court) => court.status === 'active')

  if (courts.length !== dedupedCourtIDs.length) {
    const foundIDs = new Set(allCourts.map((court) => court.id as string))
    const missingCourtIDs = dedupedCourtIDs.filter((courtID) => !foundIDs.has(courtID))
    const inactiveCourtIDs = allCourts
      .filter((court) => court.status !== 'active')
      .map((court) => court.id as string)

    res.status(404).json({
      message: 'One or more courts were not found or inactive.',
      missingCourtIDs,
      inactiveCourtIDs,
    })
    return
  }

  const venueID = courts[0].venueID
  const sameVenue = courts.every((court) => court.venueID.toString() === venueID.toString())
  if (!sameVenue) {
    res.status(400).json({ message: 'All recurring courts must belong to the same venue.' })
    return
  }

  const venue = await VenueModel.findById(venueID)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const isSystemAdmin = res.locals.user.role === UserRole.Admin
  const isVenueAdmin = venue.ownerUserID.toString() === res.locals.user.id.toString()
    || venue.managerUserIDs.some((id) => id.toString() === res.locals.user.id.toString())
  const canBookAsAdmin = req.body.bookedAsAdmin === true && (isSystemAdmin || isVenueAdmin)

  if (req.body.bookedAsAdmin === true && !canBookAsAdmin) {
    res.status(403).json({ message: 'You are not allowed to create admin recurring bookings for this venue.' })
    return
  }

  bookingUtils.validateBookingWindow(req.body.startTime, req.body.endTime, {
    skipMinDuration: canBookAsAdmin,
  })

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

  const conflicts: { courtID: string; date: string; reason: string }[] = []
  for (const court of courts) {
    for (const date of dates) {
      const schedule = bookingUtils.getVenueScheduleForDate(venue.toJSON() as never, date)
      if (!schedule) {
        conflicts.push({ courtID: court.id as string, date: date.toISOString(), reason: 'Venue is closed.' })
        continue
      }

      if (
        bookingUtils.timeToMinutes(req.body.startTime) < bookingUtils.timeToMinutes(schedule.open)
        || bookingUtils.timeToMinutes(req.body.endTime) > bookingUtils.timeToMinutes(schedule.close)
      ) {
        conflicts.push({ courtID: court.id as string, date: date.toISOString(), reason: 'Outside venue operating hours.' })
        continue
      }

      const availability = await bookingUtils.checkSlotAvailability(
        court.id as string,
        date,
        req.body.startTime,
        req.body.endTime,
      )
      if (!availability.available) {
        conflicts.push({ courtID: court.id as string, date: date.toISOString(), reason: 'Court already booked.' })
        continue
      }

    }
  }

  if (conflicts.length > 0) {
    res.status(409).json({ message: 'Recurring booking conflicts found.', conflicts })
    return
  }

  const slotDurationMinutes = venue.slotDurationMinutes ?? bookingUtils.SLOT_DURATION_MINUTES
  const windowStartMinutes = bookingUtils.timeToMinutes(req.body.startTime)
  const windowEndMinutes = bookingUtils.timeToMinutes(req.body.endTime)
  const windowDurationMinutes = windowEndMinutes - windowStartMinutes

  if (windowDurationMinutes <= 0 || windowDurationMinutes % slotDurationMinutes !== 0) {
    res.status(400).json({
      message: `Recurring window must align with venue slot duration (${slotDurationMinutes} minutes).`,
    })
    return
  }

  const slotTemplates: Array<{ startTime: string; endTime: string; durationMinutes: number }> = []
  for (let cursor = windowStartMinutes; cursor < windowEndMinutes; cursor += slotDurationMinutes) {
    const slotEnd = cursor + slotDurationMinutes
    slotTemplates.push({
      startTime: bookingUtils.minutesToTime(cursor),
      endTime: bookingUtils.minutesToTime(slotEnd),
      durationMinutes: slotDurationMinutes,
    })
  }

  const bookingBundleID = new Types.ObjectId()
  const bookingRef = generateBookingRef()

  const recurringGroups = await RecurringGroupModel.insertMany(courts.map((court) => ({
    courtID: court._id,
    startTime: req.body.startTime,
    endTime: req.body.endTime,
    durationMinutes: slotDurationMinutes,
    pattern: req.body.pattern,
    daysOfWeek: req.body.pattern === RecurringPattern.Weekly ? req.body.daysOfWeek : undefined,
    rangeStart: bookingUtils.normalizeDate(req.body.rangeStart),
    rangeEnd: bookingUtils.normalizeDate(req.body.rangeEnd),
    userID: res.locals.user.id,
  })))

  const recurringGroupByCourtID = new Map(
    recurringGroups.map((group) => [group.courtID.toString(), group._id])
  )

  const bookings = await BookingModel.insertMany(courts.flatMap((court) => dates.flatMap((date) => {
    const recurringGroupID = recurringGroupByCourtID.get(court._id.toString())

    return slotTemplates.map((slot) => ({
      bookingBundleID,
      bookingRef,
      courtID: court._id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationMinutes: slot.durationMinutes,
      totalPrice: bookingUtils.calculateTotalPriceWithRules(court, slot.startTime, slot.endTime),
      currency: court.currency,
      bookerType: canBookAsAdmin ? 'admin' : 'user',
      userID: canBookAsAdmin ? undefined : res.locals.user.id,
      guestName: req.body.guestName || undefined,
      guestPhone: req.body.guestPhone || undefined,
      guestEmail: req.body.guestEmail || undefined,
      createdByUserID: res.locals.user.id,
      bookingType: BookingType.Recurring,
      recurringGroupID,
      status: canBookAsAdmin ? BookingStatus.Confirmed : BookingStatus.Pending,
      paymentStatus: req.body.slip ? PaymentStatus.Pending : PaymentStatus.Unpaid,
      slip: req.body.slip,
      slipTimestamp: req.body.slip ? new Date() : undefined,
      note: req.body.note,
      resaleOutcome: ResaleOutcome.None,
    }))
  })))

  for (const recurringGroup of recurringGroups) {
    const groupBookings = bookings.filter((booking) => (
      String(booking.recurringGroupID) === String(recurringGroup._id)
    ))
    recurringGroup.bookingIDs = groupBookings.map((booking) => new Types.ObjectId(booking.id as string))
    await recurringGroup.save()
  }

  res.status(201).json({
    bookingBundleID: bookingBundleID.toString(),
    recurringGroups,
    recurringGroup: recurringGroups.length === 1 ? recurringGroups[0] : undefined,
    bookings,
  })

  if (!canBookAsAdmin) {
    // Send confirmation email (fire-and-forget)
    const venueName = venue.name?.en || venue.name?.th || ''
    const totalPrice = bookings.reduce((sum, b) => sum + b.totalPrice, 0)
    sendBookingConfirmationEmail({
      bookings: bookings.map((b) => {
        const bookingCourt = courts.find((court) => String(court._id) === String(b.courtID))
        return { ...b.toObject(), courtName: bookingCourt?.name }
      }),
      bookingBundleID: bookingBundleID.toString(),
      bookingRef,
      userEmail: res.locals.user.email,
      venueName,
      totalPrice,
      currency: courts[0]?.currency ?? 'THB',
    }).catch((err) => console.error('Failed to send booking confirmation email:', err))
  }
}

export default createRecurring