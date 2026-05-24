import { Request, Response } from 'express'
import moment from 'moment'
import ResaleListingModel from '../../schema/resaleListing'
import PlayerModel from '../../schema/player'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import UserModel from '../../schema/user'
import { ResponseLocals, SellerPayoutStatus, UserRole } from '../../type'
import sendEmail from '../../utils/sendEmail'

interface PayoutWithSlipBody {
  listingIDs: string[]
  slipBase64: string
  slipMimeType: string
  slipFileName: string
}

const payoutWithSlip = async(
  req: Request<Record<string, never>, unknown, PayoutWithSlipBody>,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  if (res.locals.user.role !== UserRole.Admin) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const { listingIDs, slipBase64, slipMimeType, slipFileName } = req.body

  if (!listingIDs?.length || !slipBase64) {
    res.status(400).json({ message: 'listingIDs and slipBase64 are required' })
    return
  }

  // Fetch all listings
  const listings = await ResaleListingModel.find({ _id: { $in: listingIDs }, status: 'sold', sellerPayoutStatus: SellerPayoutStatus.Pending })

  if (listings.length === 0) {
    res.status(404).json({ message: 'No pending listings found' })
    return
  }

  // All listings should belong to the same seller
  const sellerUserID = listings[0].sellerID.toString()

  // Mark all as paid
  await ResaleListingModel.updateMany(
    { _id: { $in: listingIDs } },
    { $set: { sellerPayoutStatus: SellerPayoutStatus.Paid } },
  )

  // Fetch seller details for email
  const player = await PlayerModel.findOne({ userID: sellerUserID })
  const user = await UserModel.findById(sellerUserID)

  if (user?.email) {
    const sellerName = player?.displayName?.en || player?.displayName?.th
      || player?.officialName?.en || player?.officialName?.th || 'Seller'

    // Enrich listings with booking + court info
    const bookingIDs = listings.map((l) => l.bookingID)
    const bookings = await BookingModel.find({ _id: { $in: bookingIDs } })
    const bookingByID = new Map(bookings.map((b) => [String(b._id), b]))

    const courtIDs = [...new Set(bookings.map((b) => b.courtID.toString()))]
    const courts = await CourtModel.find({ _id: { $in: courtIDs } })
    const courtByID = new Map(courts.map((c) => [String(c._id), c]))

    const currency = listings[0].currency ?? 'THB'
    const totalGross = listings.reduce((sum, l) => sum + l.askingPrice, 0)
    const fee = totalGross * 0.1
    const netAmount = totalGross * 0.9

    // Build slot rows for email
    const slotRows = listings.map((listing) => {
      const booking = bookingByID.get(listing.bookingID.toString())
      const court = booking ? courtByID.get(booking.courtID.toString()) : undefined
      const courtName = court?.name ?? '—'
      const date = booking ? moment(booking.date).format('DD MMM YYYY') : '—'
      const start = listing.subStartTime ?? booking?.startTime ?? '—'
      const end = listing.subEndTime ?? booking?.endTime ?? '—'
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${courtName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${date}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${start}–${end}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${listing.askingPrice.toFixed(2)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;color:#16a34a">${(listing.askingPrice * 0.9).toFixed(2)}</td>
      </tr>`
    }).join('')

    const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
  <h2 style="color:#1d4ed8">Payout Confirmation</h2>
  <p>Hi ${sellerName},</p>
  <p>We have processed your resale payout. Please see the details below:</p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <thead>
      <tr style="background:#f3f4f6">
        <th style="padding:8px 12px;text-align:left">Court</th>
        <th style="padding:8px 12px;text-align:left">Date</th>
        <th style="padding:8px 12px;text-align:left">Slot</th>
        <th style="padding:8px 12px;text-align:right">Asking Price</th>
        <th style="padding:8px 12px;text-align:right">Net (after fee)</th>
      </tr>
    </thead>
    <tbody>${slotRows}</tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;margin:8px 0">
    <tr>
      <td style="padding:4px 12px">Gross Total</td>
      <td style="padding:4px 12px;text-align:right">${totalGross.toFixed(2)} ${currency}</td>
    </tr>
    <tr>
      <td style="padding:4px 12px;color:#dc2626">Processing Fee (10%)</td>
      <td style="padding:4px 12px;text-align:right;color:#dc2626">−${fee.toFixed(2)} ${currency}</td>
    </tr>
    <tr style="font-weight:bold;font-size:1.1em">
      <td style="padding:8px 12px;border-top:2px solid #e5e7eb">Amount Transferred</td>
      <td style="padding:8px 12px;border-top:2px solid #e5e7eb;text-align:right;color:#16a34a">${netAmount.toFixed(2)} ${currency}</td>
    </tr>
  </table>

  <p style="color:#6b7280;font-size:0.875em">The payment slip is attached to this email as evidence of transfer.</p>
  <p style="color:#6b7280;font-size:0.875em">Thank you for using Badminstar Resale.</p>
</div>`

    await sendEmail({
      to: user.email,
      subject: `Payout Received – ${listings.length} Resale Slot${listings.length > 1 ? 's' : ''}`,
      text: `Hi ${sellerName}, your resale payout of ${netAmount.toFixed(2)} ${currency} has been transferred. Please see the attached slip.`,
      html,
      attachments: [{
        filename: slipFileName || 'payment-slip.jpg',
        content: slipBase64,
        encoding: 'base64',
        contentType: slipMimeType || 'image/jpeg',
      }],
    })
  }

  res.json({ message: 'Payout marked as paid and email sent' })
}

export default payoutWithSlip
