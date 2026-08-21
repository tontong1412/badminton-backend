/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'
import updateAddOns from '../../src/controllers/bookings/updateAddOns'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import VenueModel from '../../src/schema/venue'
import requestUserUtils from '../../src/utils/requestUser'

vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')
vi.mock('../../src/schema/venue')
vi.mock('../../src/utils/requestUser')

describe('updateAddOns controller', () => {
  let mockReq: any
  let mockRes: any

  const userID = new Types.ObjectId()
  const bookingID = new Types.ObjectId()
  const courtID = new Types.ObjectId()
  const venueID = new Types.ObjectId()

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      params: { id: bookingID.toString() },
      body: { addOnIDs: ['grip'] },
      cookies: { access: 'token' },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue({
      id: userID,
      role: 'user',
      email: 'owner@example.com',
      playerID: new Types.ObjectId(),
    } as any)
  })

  it('updates selected add-ons and recalculates booking total', async() => {
    const booking = {
      id: bookingID.toString(),
      status: 'confirmed',
      courtID,
      totalPrice: 400,
      addOnTotalPrice: 100,
      selectedAddOns: [{ id: 'ac', name: 'Air Conditioning', price: 100, details: 'Cool court' }],
      save: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(BookingModel.findById).mockResolvedValue(booking as any)
    vi.mocked(CourtModel.findById).mockResolvedValue({
      _id: courtID,
      id: courtID.toString(),
      name: 'Court A',
      venueID,
      addOns: [
        { id: 'ac', name: 'Air Conditioning', price: 100, details: 'Cool court', isActive: true },
        { id: 'grip', name: 'Extra Grip', price: 20, details: 'Overgrip', isActive: true },
      ],
    } as any)
    vi.mocked(VenueModel.findById).mockResolvedValue({
      _id: venueID,
      ownerUserID: userID,
      managerUserIDs: [],
    } as any)

    await updateAddOns(mockReq, mockRes)

    expect(booking.selectedAddOns).toEqual([
      { id: 'grip', name: 'Extra Grip', price: 20, details: 'Overgrip' },
    ])
    expect(booking.addOnTotalPrice).toBe(20)
    expect(booking.totalPrice).toBe(320)
    expect(booking.save).toHaveBeenCalled()
    expect(mockRes.json).toHaveBeenCalledWith(booking)
  })

  it('returns 422 when add-on id is invalid for court', async() => {
    const booking = {
      id: bookingID.toString(),
      status: 'confirmed',
      courtID,
      totalPrice: 300,
      addOnTotalPrice: 0,
      selectedAddOns: [],
      save: vi.fn().mockResolvedValue(undefined),
    }

    mockReq.body.addOnIDs = ['unknown-addon']

    vi.mocked(BookingModel.findById).mockResolvedValue(booking as any)
    vi.mocked(CourtModel.findById).mockResolvedValue({
      _id: courtID,
      id: courtID.toString(),
      name: 'Court A',
      venueID,
      addOns: [{ id: 'grip', name: 'Extra Grip', price: 20, isActive: true }],
    } as any)
    vi.mocked(VenueModel.findById).mockResolvedValue({
      _id: venueID,
      ownerUserID: userID,
      managerUserIDs: [],
    } as any)

    await updateAddOns(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(422)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Invalid add-ons for court Court A.',
      invalidAddOnIDs: ['unknown-addon'],
    }))
    expect(booking.save).not.toHaveBeenCalled()
  })

  it('returns 403 when user is not venue admin/owner/manager', async() => {
    const booking = {
      id: bookingID.toString(),
      status: 'confirmed',
      courtID,
      totalPrice: 300,
      addOnTotalPrice: 0,
      selectedAddOns: [],
      save: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(BookingModel.findById).mockResolvedValue(booking as any)
    vi.mocked(CourtModel.findById).mockResolvedValue({
      _id: courtID,
      id: courtID.toString(),
      name: 'Court A',
      venueID,
      addOns: [],
    } as any)
    vi.mocked(VenueModel.findById).mockResolvedValue({
      _id: venueID,
      ownerUserID: new Types.ObjectId(),
      managerUserIDs: [],
    } as any)

    await updateAddOns(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden' })
    expect(booking.save).not.toHaveBeenCalled()
  })
})
