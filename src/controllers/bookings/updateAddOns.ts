import { Response } from 'express'
import BookingModel from '../../schema/booking'
import CourtModel from '../../schema/court'
import VenueModel from '../../schema/venue'
import requestUserUtils from '../../utils/requestUser'
import { BookingStatus, BookingAddOnSnapshot, RequestWithCookies, UserRole } from '../../type'

interface UpdateBookingAddOnsPayload {
  addOnIDs?: string[];
}

const normalizeIDs = (ids: string[]): string[] => Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)))

const updateAddOns = async(
  req: RequestWithCookies<{ id: string }, unknown, UpdateBookingAddOnsPayload>,
  res: Response,
): Promise<void> => {
  const currentUser = requestUserUtils.getOptionalUser(req)
  if (!currentUser) {
    res.status(401).json({ message: 'Authentication required' })
    return
  }

  if (req.body.addOnIDs !== undefined && !Array.isArray(req.body.addOnIDs)) {
    res.status(400).json({ message: 'addOnIDs must be an array of strings.' })
    return
  }

  const booking = await BookingModel.findById(req.params.id)
  if (!booking) {
    res.status(404).json({ message: 'Booking not found' })
    return
  }

  if (booking.status === BookingStatus.Cancelled) {
    res.status(409).json({ message: 'Cannot update add-ons for a cancelled booking.' })
    return
  }

  const court = await CourtModel.findById(booking.courtID)
  if (!court) {
    res.status(404).json({ message: 'Court not found' })
    return
  }

  const venue = await VenueModel.findById(court.venueID)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const isSystemAdmin = currentUser.role === UserRole.Admin
  const isOwner = venue.ownerUserID.toString() === currentUser.id.toString()
  const isManager = venue.managerUserIDs.some((id) => id.toString() === currentUser.id.toString())
  if (!isSystemAdmin && !isOwner && !isManager) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const requestedAddOnIDs = normalizeIDs(req.body.addOnIDs ?? [])
  const activeCourtAddOns = (court.addOns ?? []).filter((addOn) => addOn.isActive !== false)
  const addOnByID = new Map(activeCourtAddOns.map((addOn) => [addOn.id, addOn]))
  const missingAddOnIDs = requestedAddOnIDs.filter((id) => !addOnByID.has(id))
  if (missingAddOnIDs.length > 0) {
    res.status(422).json({
      message: `Invalid add-ons for court ${court.name}.`,
      invalidAddOnIDs: missingAddOnIDs,
    })
    return
  }

  const selectedAddOns: BookingAddOnSnapshot[] = requestedAddOnIDs
    .map((id) => addOnByID.get(id))
    .filter((addOn): addOn is NonNullable<typeof addOn> => Boolean(addOn))
    .map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      price: addOn.price,
      details: addOn.details,
    }))

  const existingAddOnTotal = booking.addOnTotalPrice ?? (booking.selectedAddOns ?? []).reduce((sum, addOn) => sum + addOn.price, 0)
  const baseTotal = Number(booking.totalPrice) - Number(existingAddOnTotal)
  const nextAddOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0)
  const nextTotal = Number((Math.max(0, baseTotal) + nextAddOnTotal).toFixed(2))

  booking.selectedAddOns = selectedAddOns
  booking.addOnTotalPrice = nextAddOnTotal
  booking.totalPrice = nextTotal

  await booking.save()
  res.json(booking)
}

export default updateAddOns