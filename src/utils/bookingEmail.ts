import moment from 'moment'
import config from '../config'
import sendEmail from './sendEmail'

interface BookingLike {
  date: Date | string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  currency: string;
  courtName?: string;
}

interface BookingEmailOptions {
  bookings: BookingLike[]
  bookingBundleID: string
  bookingRef: string
  guestEmail?: string
  guestName?: string
  userEmail?: string
  venueName: string
  totalPrice: number
  currency: string
  emailType?: 'booking_confirmation' | 'payment_approved'
}

const sendBookingConfirmationEmail = async(opts: BookingEmailOptions): Promise<void> => {
  const {
    bookings,
    bookingBundleID,
    bookingRef,
    guestEmail,
    guestName,
    userEmail,
    venueName,
    totalPrice,
    currency,
    emailType = 'booking_confirmation',
  } = opts

  const isApproval = emailType === 'payment_approved'

  const toEmail = guestEmail ?? userEmail
  if (!toEmail) return

  const isGuest = Boolean(guestEmail)
  const clientUrl = config.CLIENT.URL ?? 'http://localhost:3000'

  const payUrl = isGuest
    ? `${clientUrl}/pay?bundleID=${bookingBundleID}&email=${encodeURIComponent(guestEmail!)}`
    : `${clientUrl}/bookings`

  const headerTitle = isApproval ? 'Payment Approved' : 'Booking Confirmed'
  const bodyIntro = isApproval
    ? 'Your payment has been approved and your booking is now confirmed. Here are your booking details:'
    : 'Thank you for your booking. Here are your booking details:'
  const actionText = isApproval ? 'View Bookings' : (isGuest ? 'Pay Now' : 'View Bookings')
  const actionUrl = isApproval
    ? (isGuest ? `${clientUrl}/pay?bundleID=${bookingBundleID}&email=${encodeURIComponent(guestEmail!)}` : `${clientUrl}/bookings`)
    : payUrl

  const sortedBookings = [...bookings].sort((a, b) =>
    moment(a.date).valueOf() - moment(b.date).valueOf() ||
    a.startTime.localeCompare(b.startTime)
  )

  const hasCourtNames = sortedBookings.some((b) => b.courtName)

  const bookingRows = sortedBookings.map((b) => `
    <tr>
      <td style="padding:6px 12px;border-bottom:1px solid #f0e8e0;">${moment(b.date).format('DD MMM YYYY')}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0e8e0;">${b.startTime} – ${b.endTime}</td>
      ${hasCourtNames ? `<td style="padding:6px 12px;border-bottom:1px solid #f0e8e0;">${b.courtName ?? ''}</td>` : ''}
    </tr>
  `).join('')

  const greeting = guestName ? `Hi ${guestName},` : 'Hi,'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f6f3;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f3;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr><td style="background:#80644f;padding:28px 32px;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${headerTitle}</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${venueName}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#333;font-size:15px;">${greeting}</p>
          <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
            ${bodyIntro}
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e8e0;border-radius:6px;margin-bottom:24px;">
            <tr style="background:#f9f6f3;">
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:#9c795f;text-transform:uppercase;letter-spacing:1px;">Date</th>
              <th style="text-align:left;padding:8px 12px;font-size:12px;color:#9c795f;text-transform:uppercase;letter-spacing:1px;">Time</th>
              ${hasCourtNames ? '<th style="text-align:left;padding:8px 12px;font-size:12px;color:#9c795f;text-transform:uppercase;letter-spacing:1px;">Court</th>' : ''}
            </tr>
            ${bookingRows}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="font-size:14px;color:#555;">Booking Ref</td>
              <td align="right" style="font-size:14px;font-weight:700;font-family:monospace;letter-spacing:2px;color:#80644f;">#${bookingRef}</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#555;padding-top:6px;">Total</td>
              <td align="right" style="font-size:18px;font-weight:700;color:#333;padding-top:6px;">${totalPrice.toFixed(2)} ${currency}</td>
            </tr>
          </table>

          ${!isApproval && isGuest ? '<p style=\'margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;\'>Please complete your payment by uploading your transfer slip using the button below.</p>' : ''}

          <div style="text-align:center;margin-bottom:28px;">
            <a href="${actionUrl}" style="display:inline-block;background:#80644f;color:#fff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:700;">
              ${actionText}
            </a>
          </div>

          <p style="margin:0;color:#999;font-size:12px;line-height:1.6;">
            If you did not make this booking, please ignore this email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f6f3;padding:16px 32px;border-top:1px solid #f0e8e0;">
          <p style="margin:0;color:#bbb;font-size:12px;text-align:center;">Badminstar · Court Booking</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim()

  const text = [
    greeting,
    '',
    `Your booking at ${venueName} is confirmed.`,
    '',
    ...sortedBookings.map((b) => `${moment(b.date).format('DD MMM YYYY')}  ${b.startTime}–${b.endTime}${b.courtName ? `  (${b.courtName})` : ''}`),
    '',
    `Booking Ref: #${bookingRef}`,
    `Total: ${totalPrice.toFixed(2)} ${currency}`,
    '',
    `${isApproval ? 'View your bookings' : 'Pay here'}: ${actionUrl}`,
  ].join('\n')

  const subject = isApproval
    ? `Payment Approved – #${bookingRef} at ${venueName}`
    : `Booking Confirmed – #${bookingRef} at ${venueName}`

  await sendEmail({
    to: toEmail,
    subject,
    text,
    html,
  })
}

export default sendBookingConfirmationEmail
