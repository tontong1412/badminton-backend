import { Request, Response } from 'express'
import ResaleListingModel from '../../schema/resaleListing'
import PlayerModel from '../../schema/player'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import { ResponseLocals, SellerPayoutStatus, UserRole } from '../../type'

const getAdminPayouts = async(_req: Request, res: Response<unknown, ResponseLocals>): Promise<void> => {
  if (res.locals.user.role !== UserRole.Admin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const listings = await ResaleListingModel.find({
    status: 'sold',
    sellerPayoutStatus: SellerPayoutStatus.Pending,
  }).sort({ soldAt: 1 })

  // Enrich with seller player info and booking/court details
  const sellerIDs = [...new Set(listings.map((l) => l.sellerID.toString()))]
  const players = await PlayerModel.find({ userID: { $in: sellerIDs } })
  const playerByUserID = new Map(players.map((p) => [p.userID!.toString(), p]))

  const bookingIDs = listings.map((l) => l.bookingID)
  const bookings = await BookingModel.find({ _id: { $in: bookingIDs } })
  const bookingByID = new Map(bookings.map((b) => [String(b._id), b]))

  const courtIDs = [...new Set(bookings.map((b) => b.courtID.toString()))]
  const courts = await CourtModel.find({ _id: { $in: courtIDs } })
  const courtByID = new Map(courts.map((c) => [String(c._id), c]))

  const result = listings.map((listing) => {
    const json = listing.toJSON() as unknown as Record<string, unknown>
    const player = playerByUserID.get(listing.sellerID.toString())
    const booking = bookingByID.get(listing.bookingID.toString())
    const court = booking ? courtByID.get(booking.courtID.toString()) : undefined

    json.sellerName = player?.displayName?.en || player?.displayName?.th
      || player?.officialName?.en || player?.officialName?.th || undefined
    json.sellerPhone = player?.contact?.tel || undefined
    json.sellerPaymentInfo = player?.paymentInfo ?? undefined

    if (booking) {
      json.bookingDate = booking.date
      json.bookingStartTime = listing.subStartTime ?? booking.startTime
      json.bookingEndTime = listing.subEndTime ?? booking.endTime
    }
    if (court) {
      json.courtName = court.name
    }

    return json
  })

  res.json(result)
}

export default getAdminPayouts
