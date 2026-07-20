import { Types } from 'mongoose'
import ResaleListingModel from '../schema/resaleListing'
import { ResaleStatus } from '../type'

interface BookingWithResaleSource {
  resaleSourceListingID?: Types.ObjectId | string | null;
}

interface FinalizeOptions {
  venuePaymentSlip?: string;
  venuePaymentSlipTimestamp?: Date;
}

export async function finalizeResaleListingsForBookings(
  bookings: BookingWithResaleSource[],
  options: FinalizeOptions = {},
): Promise<void> {
  const listingIDs = [...new Set(
    bookings
      .map((b) => b.resaleSourceListingID?.toString())
      .filter((id): id is string => Boolean(id)),
  )]

  if (listingIDs.length === 0) {
    return
  }

  const setFields: Record<string, unknown> = {
    status: ResaleStatus.Sold,
    soldAt: new Date(),
  }

  if (options.venuePaymentSlip) {
    setFields.venuePaymentSlip = options.venuePaymentSlip
    setFields.venuePaymentSlipTimestamp = options.venuePaymentSlipTimestamp ?? new Date()
  }

  await ResaleListingModel.updateMany(
    {
      _id: { $in: listingIDs },
      status: { $ne: ResaleStatus.Sold },
    },
    { $set: setFields },
  )
}
