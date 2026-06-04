import { Response } from 'express'
import CourtModel from '../../schema/court'
import BookingModel from '../../schema/booking'
import VenueModel from '../../schema/venue'
import bookingUtils from '../../utils/booking'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, RequestWithCookies, UserRole } from '../../type'

interface RescheduleBookingPayload {
  courtID?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  applyToBundle?: boolean;
  swapWithBookingID?: string;
}

function toScheduleSource(venue: { weeklySchedule?: unknown; holidays?: unknown }) {
  return {
    weeklySchedule: venue.weeklySchedule as Record<string, { open: string; close: string } | null> | undefined,
    holidays: venue.holidays as { date: Date; isClosed: boolean; openTime?: string; closeTime?: string }[] | undefined,
  }
}

const reschedule = async(
  req: RequestWithCookies<{ id: string }, unknown, RescheduleBookingPayload>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  const booking = await BookingModel.findById(req.params.id)
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  if (booking.status === BookingStatus.Cancelled) {
    res.status(409).json({ message: 'Cannot reschedule a cancelled booking.' })
    return
  }

  const sourceCourt = await CourtModel.findById(booking.courtID)
  if (!sourceCourt) {
    res.status(404).json({ message: 'Source court not found' })
    return
  }

  const targetCourtID = req.body.courtID ?? sourceCourt.id
  const targetDate = req.body.date ?? booking.date
  const targetStartTime = req.body.startTime
  const targetEndTime = req.body.endTime
  const applyToBundle = req.body.applyToBundle === true

  if (!targetStartTime || !targetEndTime) {
    res.status(400).json({ message: 'startTime and endTime are required.' })
    return
  }

  const targetCourt = await CourtModel.findById(targetCourtID)
  if (!targetCourt || targetCourt.status !== 'active') {
    res.status(404).json({ message: 'Target court not found' })
    return
  }

  const targetVenue = await VenueModel.findById(targetCourt.venueID)
  if (!targetVenue) {
    res.status(404).json({ message: 'Target venue not found' })
    return
  }

  const isSystemAdmin = currentUser.role === UserRole.Admin
  const isOwner = targetVenue.ownerUserID.toString() === currentUser.id.toString()
  const isManager = targetVenue.managerUserIDs.some((id) => id.toString() === currentUser.id.toString())
  if (!isSystemAdmin && !isOwner && !isManager) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  // ── Swap mode ─────────────────────────────────────────────────────────────
  if (req.body.swapWithBookingID) {
    const swapTarget = await BookingModel.findById(req.body.swapWithBookingID)
    if (!swapTarget || swapTarget.status === BookingStatus.Cancelled) {
      res.status(404).json({ message: 'Swap target booking not found.' })
      return
    }

    if (swapTarget.durationMinutes !== booking.durationMinutes) {
      res.status(400).json({ message: 'Can only swap bookings with equal duration.' })
      return
    }

    // Save originals before mutating
    const origCourtID = booking.courtID
    const origDate = booking.date
    const origStart = booking.startTime
    const origEnd = booking.endTime

    const swapCourtID = swapTarget.courtID
    const swapDate = swapTarget.date
    const swapStart = swapTarget.startTime
    const swapEnd = swapTarget.endTime

    booking.courtID = swapCourtID
    booking.date = swapDate
    booking.startTime = swapStart
    booking.endTime = swapEnd

    swapTarget.courtID = origCourtID
    swapTarget.date = origDate
    swapTarget.startTime = origStart
    swapTarget.endTime = origEnd

    await booking.save()
    await swapTarget.save()

    res.json(booking)
    return
  }

  const normalizedDate = bookingUtils.normalizeDate(targetDate)
  bookingUtils.validateBookingWindow(targetStartTime, targetEndTime, { skipMinDuration: true })

  const newDuration = bookingUtils.calculateDurationMinutes(targetStartTime, targetEndTime)
  if (newDuration !== booking.durationMinutes) {
    res.status(400).json({ message: 'Duration cannot be changed when moving a booking.' })
    return
  }

  const sourceDate = bookingUtils.normalizeDate(booking.date)
  const dayShift = Math.round((normalizedDate.getTime() - sourceDate.getTime()) / (24 * 60 * 60 * 1000))
  const minuteShift = bookingUtils.timeToMinutes(targetStartTime) - bookingUtils.timeToMinutes(booking.startTime)

  if (applyToBundle && booking.bookingBundleID) {
    const bundleBookings = await BookingModel.find({
      bookingBundleID: booking.bookingBundleID,
      status: { $ne: BookingStatus.Cancelled },
    })

    if (bundleBookings.length === 0) {
      res.status(404).json({ message: 'Booking bundle not found' })
      return
    }

    const changingCourt = targetCourt.id.toString() !== sourceCourt.id.toString()
    const bundleBookingIDs = bundleBookings.map((b) => b.id as string)

    for (const item of bundleBookings) {
      const effectiveCourtID = changingCourt ? targetCourt.id : item.courtID

      const shiftedDate = new Date(item.date)
      shiftedDate.setDate(shiftedDate.getDate() + dayShift)
      const normalizedShiftedDate = bookingUtils.normalizeDate(shiftedDate)
      const shiftedStartMinutes = bookingUtils.timeToMinutes(item.startTime) + minuteShift
      const shiftedEndMinutes = bookingUtils.timeToMinutes(item.endTime) + minuteShift

      if (shiftedStartMinutes < 0 || shiftedEndMinutes > bookingUtils.timeToMinutes('23:59')) {
        res.status(400).json({ message: 'Bundle move results in invalid time range.' })
        return
      }

      const shiftedStart = bookingUtils.minutesToTime(shiftedStartMinutes)
      const shiftedEnd = bookingUtils.minutesToTime(shiftedEndMinutes)

      bookingUtils.validateBookingWindow(shiftedStart, shiftedEnd, { skipMinDuration: true })

      const itemDuration = bookingUtils.calculateDurationMinutes(shiftedStart, shiftedEnd)
      if (itemDuration !== item.durationMinutes) {
        res.status(400).json({ message: 'Duration cannot be changed when moving a bundle.' })
        return
      }

      const schedule = bookingUtils.getVenueScheduleForDate(toScheduleSource(targetVenue), normalizedShiftedDate)
      if (!schedule) {
        res.status(400).json({ message: 'Venue is closed on the selected date.' })
        return
      }

      if (
        bookingUtils.timeToMinutes(shiftedStart) < bookingUtils.timeToMinutes(schedule.open)
        || bookingUtils.timeToMinutes(shiftedEnd) > bookingUtils.timeToMinutes(schedule.close)
      ) {
        res.status(400).json({ message: 'Booking is outside venue operating hours.' })
        return
      }

      const availability = await bookingUtils.checkSlotAvailability(
        effectiveCourtID,
        normalizedShiftedDate,
        shiftedStart,
        shiftedEnd,
        bundleBookingIDs,
      )

      if (!availability.available) {
        res.status(409).json({ message: 'Target slot is already booked.' })
        return
      }
    }

    for (const item of bundleBookings) {
      const shiftedDate = new Date(item.date)
      shiftedDate.setDate(shiftedDate.getDate() + dayShift)
      const normalizedShiftedDate = bookingUtils.normalizeDate(shiftedDate)
      const shiftedStart = bookingUtils.minutesToTime(bookingUtils.timeToMinutes(item.startTime) + minuteShift)
      const shiftedEnd = bookingUtils.minutesToTime(bookingUtils.timeToMinutes(item.endTime) + minuteShift)

      item.date = normalizedShiftedDate
      item.startTime = shiftedStart
      item.endTime = shiftedEnd
      if (changingCourt) item.courtID = targetCourt._id
      await item.save()
    }

    const updatedBooking = await BookingModel.findById(booking.id)
    if (!updatedBooking) {
      res.status(404).json({ message: 'Booking not found after update' })
      return
    }

    res.json(updatedBooking)
    return
  }

  const schedule = bookingUtils.getVenueScheduleForDate(toScheduleSource(targetVenue), normalizedDate)
  if (!schedule) {
    res.status(400).json({ message: 'Venue is closed on the selected date.' })
    return
  }

  if (
    bookingUtils.timeToMinutes(targetStartTime) < bookingUtils.timeToMinutes(schedule.open)
    || bookingUtils.timeToMinutes(targetEndTime) > bookingUtils.timeToMinutes(schedule.close)
  ) {
    res.status(400).json({ message: 'Booking is outside venue operating hours.' })
    return
  }

  const availability = await bookingUtils.checkSlotAvailability(
    targetCourt.id,
    normalizedDate,
    targetStartTime,
    targetEndTime,
    booking.id,
  )
  if (!availability.available) {
    res.status(409).json({ message: 'Target slot is already booked.' })
    return
  }

  booking.courtID = targetCourt._id
  booking.date = normalizedDate
  booking.startTime = targetStartTime
  booking.endTime = targetEndTime

  await booking.save()
  res.json(booking)
}

export default reschedule