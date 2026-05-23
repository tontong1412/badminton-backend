import { Response } from 'express'
import BookingModel from '../../schema/booking'
import ResaleListingModel from '../../schema/resaleListing'
import requestUserUtils from '../../utils/requestUser'
import bookingUtils from '../../utils/booking'
import { BookingStatus, BookingType, PaymentStatus, RequestWithCookies, ResaleOutcome, ResaleStatus } from '../../type'

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
    courtID: sourceBooking.courtID,
    date: sourceBooking.date,
    startTime: buyerStartTime,
    endTime: buyerEndTime,
    durationMinutes: buyerDuration,
    totalPrice: listing.askingPrice,
    currency: listing.currency,
    bookerType: currentUser ? 'user' : 'guest',
    userID: currentUser?.id,
    guestName: currentUser ? undefined : req.body.guestName,
    guestPhone: currentUser ? undefined : req.body.guestPhone,
    guestEmail: currentUser ? undefined : req.body.guestEmail,
    bookingType: BookingType.Single,
    status: BookingStatus.Confirmed,
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

  listing.status = ResaleStatus.Sold
  listing.buyerType = currentUser ? 'user' : 'guest'
  listing.buyerID = currentUser?.id
  listing.buyerName = currentUser ? undefined : req.body.guestName
  listing.buyerPhone = currentUser ? undefined : req.body.guestPhone
  listing.buyerEmail = currentUser ? undefined : req.body.guestEmail
  listing.venuePaymentSlip = req.body.slip
  listing.venuePaymentSlipTimestamp = req.body.slip ? new Date() : undefined
  listing.soldAt = new Date()
  await listing.save()

  res.status(201).json({ listing, booking: buyerBooking })
}

export default purchaseListing