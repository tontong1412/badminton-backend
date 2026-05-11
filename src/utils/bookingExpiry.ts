import BookingModel from '../schema/booking'
import { BookingStatus, PaymentStatus } from '../type'

const EXPIRY_MINUTES = 10
const POLL_INTERVAL_MS = 60_000 // run every minute

async function cancelExpiredBookings(): Promise<void> {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000)

  try {
    const result = await BookingModel.updateMany(
      {
        status: BookingStatus.Confirmed,
        paymentStatus: PaymentStatus.Unpaid,
        createdAt: { $lte: cutoff },
      },
      { $set: { status: BookingStatus.Cancelled } },
    )

    if (result.modifiedCount > 0) {
      console.log(`[bookingExpiry] Cancelled ${result.modifiedCount} unpaid booking(s) older than ${EXPIRY_MINUTES} minutes.`)
    }
  } catch (err) {
    console.error('[bookingExpiry] Error cancelling expired bookings:', err)
  }
}

export function startBookingExpiryJob(): void {
  // Run once immediately on startup, then every minute
  cancelExpiredBookings()
  setInterval(cancelExpiredBookings, POLL_INTERVAL_MS)
}
