import { Request, Response } from 'express'
import ResaleListingModel from '../../schema/resaleListing'

const getListings = async(req: Request, res: Response): Promise<void> => {
  const listings = await ResaleListingModel.find({ status: 'active' })
    .populate('bookingID')
    .sort({ createdAt: -1 })

  const filtered = listings.filter((listing) => {
    if (typeof req.query.venueID === 'string' && listing.venueID.toString() !== req.query.venueID) {
      return false
    }

    const booking = listing.bookingID as { courtID?: string; date?: Date }
    if (booking?.date && booking.date < new Date()) {
      return false
    }

    if (typeof req.query.courtID === 'string' && booking?.courtID?.toString() !== req.query.courtID) {
      return false
    }

    if (typeof req.query.dateFrom === 'string' && booking?.date && booking.date < new Date(req.query.dateFrom)) {
      return false
    }

    if (typeof req.query.dateTo === 'string' && booking?.date && booking.date > new Date(req.query.dateTo)) {
      return false
    }

    return true
  })

  res.json(filtered)
}

export default getListings