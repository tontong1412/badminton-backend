import { Response } from 'express'
import { Types } from 'mongoose'
import BookingModel from '../../schema/booking'
import ResaleListingModel from '../../schema/resaleListing'
import requestUserUtils from '../../utils/requestUser'
import bookingUtils from '../../utils/booking'
import { BookingStatus, BookingType, PaymentStatus, RequestWithCookies, ResaleOutcome, ResaleStatus } from '../../type'

function generateBookingRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let ref = ''
  for (let i = 0; i < 6; i++) ref += chars[Math.floor(Math.random() * chars.length)]
  return ref
}

interface PurchaseListingPayload {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  slip?: string;
  note?: string;
}

const purchaseListing = async(
  req: RequestWithCookies<{ id: string }, unknown, PurchaseListingPayload>,
  res: Response,
): Promise<void> => {
  const listing = await ResaleListingModel.findById(req.params.id)
  if (!listing || listing.status !== ResaleStatus.Active) {
    res.status(404).json({ message: 'Active resale listing not found' })
    return
  }

  const sourceBooking = await BookingModel.findById(listing.bookingID)
  if (!sourceBooking || sourceBooking.status !== BookingStatus.Confirmed) {
    res.status(400).json({ message: 'Source booking is not available for resale.' })
    return
  }

  const currentUser = requestUserUtils.getOptionalUser(req)
  if (currentUser && sourceBooking.userID?.toString() === currentUser.id.toString()) {
    res.status(400).json({ message: 'Seller cannot buy their own resale listing.' })
    return
  }

  if (!currentUser && (!req.body.guestName || !req.body.guestPhone || !req.body.guestEmail)) {
    res.status(400).json({ message: 'Guest name, phone, and email are required when not logged in.' })
    return
  }

  // Determine the actual time range being sold (sub-range or full booking)
  const buyerStartTime = listing.subStartTime ?? sourceBooking.startTime
  const buyerEndTime = listing.subEndTime ?? sourceBooking.endTime
  const buyerDuration = bookingUtils.timeToMinutes(buyerEndTime) - bookingUtils.timeToMinutes(buyerStartTime)

  const buyerBooking = await new BookingModel({
    bookingBundleID: new Types.ObjectId(),
    bookingRef: generateBookingRef(),
    courtID: sourceBooking.courtID,
    date: sourceBooking.date,
    startTime: buyerStartTime,
    endTime: buyerEndTime,
    durationMinutes: buyerDuration,
    totalPrice: listing.askingPrice,
    currency: listing.currency,
    bookerType: currentUser ? 'user' : 'guest',
    createdByUserID: currentUser?.id,
    userID: currentUser?.id,
    guestName: currentUser ? undefined : req.body.guestName,
    guestPhone: currentUser ? undefined : req.body.guestPhone,
    guestEmail: currentUser ? undefined : req.body.guestEmail,
    bookingType: BookingType.Single,
    status: BookingStatus.Pending,
    paymentStatus: req.body.slip ? PaymentStatus.Pending : PaymentStatus.Unpaid,
    slip: req.body.slip,
    slipTimestamp: req.body.slip ? new Date() : undefined,
    resaleSourceListingID: listing._id,
    resaleOutcome: ResaleOutcome.None,
    note: req.body.note,
  }).save()

  if (listing.subStartTime && listing.subEndTime) {
    // Sub-range purchase: keep the original booking alive, record the sold range,
    // and reset the listing reference so the seller can list other hours.
    if (!sourceBooking.resaleSoldRanges) sourceBooking.resaleSoldRanges = []
    sourceBooking.resaleSoldRanges.push({ startTime: buyerStartTime, endTime: buyerEndTime })
    sourceBooking.resaleListingID = undefined
    sourceBooking.resaleOutcome = ResaleOutcome.None
    await sourceBooking.save()
  } else {
    // Full-booking purchase: cancel the original booking.
    sourceBooking.status = BookingStatus.Cancelled
    sourceBooking.resaleOutcome = ResaleOutcome.Resold
    await sourceBooking.save()
  }

  listing.status = ResaleStatus.Pending
  listing.buyerType = currentUser ? 'user' : 'guest'
  listing.buyerID = currentUser?.id
  listing.buyerName = currentUser ? undefined : req.body.guestName
  listing.buyerPhone = currentUser ? undefined : req.body.guestPhone
  listing.buyerEmail = currentUser ? undefined : req.body.guestEmail
  listing.venuePaymentSlip = req.body.slip
  listing.venuePaymentSlipTimestamp = req.body.slip ? new Date() : undefined
  listing.soldAt = undefined
  await listing.save()

  res.status(201).json({ listing, booking: buyerBooking })
}

export default purchaseListing