import BookingModel from '../schema/booking'
import ResaleListingModel from '../schema/resaleListing'
import { BookingStatus, ResaleOutcome, ResaleStatus } from '../type'
import mongoose from 'mongoose'

const EXPIRY_MINUTES = 10
const POLL_INTERVAL_MS = 60_000 // run every minute

async function cancelExpiredBookings(): Promise<void> {
  // Avoid startup race: this job can be scheduled before MongoDB is connected.
  if (mongoose.connection.readyState !== 1) {
    return
  }

  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000)

  try {
    // Find expired resale buyer bookings separately so we can restore the listing + source booking
    const expiredResaleBookings = await BookingModel.find({
      status: BookingStatus.Pending,
      paymentStatus: 'unpaid',
      createdAt: { $lte: cutoff },
      resaleSourceListingID: { $exists: true },
    })

    for (const buyerBooking of expiredResaleBookings) {
      const listing = await ResaleListingModel.findById(buyerBooking.resaleSourceListingID)
      if (!listing) continue

      const sourceBooking = await BookingModel.findById(listing.bookingID)

      if (listing.subStartTime && listing.subEndTime) {
        // Sub-range purchase: remove the sold range from the source booking and restore the listing
        if (sourceBooking) {
          sourceBooking.resaleSoldRanges = (sourceBooking.resaleSoldRanges ?? []).filter(
            (r) => !(r.startTime === listing.subStartTime && r.endTime === listing.subEndTime),
          )
          sourceBooking.resaleListingID = listing._id as never
          sourceBooking.resaleOutcome = ResaleOutcome.Listed
          await sourceBooking.save()
        }
      } else {
        // Full booking purchase: restore source booking status
        if (sourceBooking) {
          sourceBooking.status = BookingStatus.Confirmed
          sourceBooking.resaleListingID = listing._id as never
          sourceBooking.resaleOutcome = ResaleOutcome.Listed
          await sourceBooking.save()
        }
      }

      listing.status = ResaleStatus.Active
      listing.buyerID = undefined
      listing.buyerType = undefined
      listing.buyerName = undefined
      listing.buyerPhone = undefined
      listing.buyerEmail = undefined
      listing.soldAt = undefined
      await listing.save()

      buyerBooking.status = BookingStatus.Cancelled
      await buyerBooking.save()
    }

    // Cancel remaining expired non-resale bookings in bulk
    const expiredResaleIds = expiredResaleBookings.map((b) => b._id)
    const result = await BookingModel.updateMany(
      {
        status: BookingStatus.Pending,
        paymentStatus: 'unpaid',
        createdAt: { $lte: cutoff },
        _id: { $nin: expiredResaleIds },
      },
      { $set: { status: BookingStatus.Cancelled } },
    )

    const totalCancelled = expiredResaleBookings.length + result.modifiedCount
    if (totalCancelled > 0) {
      console.log(`[bookingExpiry] Cancelled ${totalCancelled} unpaid booking(s) older than ${EXPIRY_MINUTES} minutes (${expiredResaleBookings.length} resale).`)
    }
  } catch (err) {
    console.error('[bookingExpiry] Error cancelling expired bookings:', err)
  }
}

export function startBookingExpiryJob(): void {
  // Run once immediately on startup, then every minute
  void cancelExpiredBookings()
  setInterval(() => { void cancelExpiredBookings() }, POLL_INTERVAL_MS)
}
