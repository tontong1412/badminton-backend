import { Request, Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import PlayerModel from '../../schema/player'
import requestUserUtils from '../../utils/requestUser'
import { RequestWithCookies } from '../../type'

const getVenueBookings = async(
  req: RequestWithCookies & Request,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  // Find all venues owned or managed by this user
  const venueIDFilter = typeof req.query.venueID === 'string' ? req.query.venueID : undefined
  const venueQuery: Record<string, unknown> = {
    $or: [
      { ownerUserID: currentUser.id },
      { managerUserIDs: currentUser.id },
    ],
  }
  if (venueIDFilter) venueQuery._id = venueIDFilter

  const venues = await VenueModel.find(venueQuery)
  const venueIDs = venues.map((v) => v._id)

  // Find all courts in those venues
  const courts = await CourtModel.find({ venueID: { $in: venueIDs } })
  const courtIDs = courts.map((c) => c._id)

  const query: Record<string, unknown> = { courtID: { $in: courtIDs } }

  const paymentStatusFilter = typeof req.query.paymentStatus === 'string' ? req.query.paymentStatus : undefined
  if (paymentStatusFilter) {
    query.paymentStatus = paymentStatusFilter
  }

  const dateFilter = typeof req.query.date === 'string' ? req.query.date : undefined
  if (dateFilter) {
    const start = new Date(dateFilter)
    const end = new Date(dateFilter)
    end.setDate(end.getDate() + 1)
    query.date = { $gte: start, $lt: end }
  }

  const bookings = await BookingModel.find(query).sort({ date: 1, startTime: 1 })

  // Enrich user bookings with player profile (name + phone)
  const userIDs = [...new Set(
    bookings.filter((b) => b.bookerType === 'user' && b.userID).map((b) => b.userID!.toString()),
  )]
  const players = userIDs.length > 0
    ? await PlayerModel.find({ userID: { $in: userIDs } })
    : []
  const playerByUserID = new Map(players.map((p) => [p.userID!.toString(), p]))

  const enriched = bookings.map((b) => {
    const json = b.toJSON() as unknown as Record<string, unknown>
    if (b.bookerType === 'user' && b.userID) {
      const player = playerByUserID.get(b.userID.toString())
      if (player) {
        json.bookerName = player.displayName?.en || player.displayName?.th
          || player.officialName?.en || player.officialName?.th || undefined
        json.bookerPhone = player.contact?.tel || undefined
      }
    }
    return json
  })

  res.json(enriched)
}

export default getVenueBookings
