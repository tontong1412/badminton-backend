import BookingModel from '../schema/booking'

const EXPIRY_MINUTES = 10
const POLL_INTERVAL_MS = 60_000 // run every minute

async function cancelExpiredBookings(): Promise<void> {
  const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000)

  try {
    const result = await BookingModel.updateMany(
      {
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: { $lte: cutoff },
      },
      { $set: { status: 'cancelled' } },
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
  void cancelExpiredBookings()
  setInterval(() => { void cancelExpiredBookings() }, POLL_INTERVAL_MS)
}
