/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'
import createSingle from '../../src/controllers/bookings/createSingle'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import VenueModel from '../../src/schema/venue'
import CouponModel from '../../src/schema/coupon'
import bookingUtils from '../../src/utils/booking'

vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')
vi.mock('../../src/schema/venue')
vi.mock('../../src/schema/coupon')
vi.mock('../../src/utils/bookingEmail', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}))

describe('createSingle controller add-ons', () => {
  let mockReq: any
  let mockRes: any

  const courtObjectId = new Types.ObjectId()
  const venueObjectId = new Types.ObjectId()

  const baseCourt = {
    _id: courtObjectId,
    id: courtObjectId.toString(),
    venueID: venueObjectId,
    status: 'active',
    currency: 'THB',
    pricingRules: [],
    pricePerHour: 300,
    name: 'Court A',
    addOns: [
      { id: 'ac', name: 'Air Conditioning', price: 100, details: 'Cool court', isActive: true },
    ],
  }

  const baseVenue = {
    _id: venueObjectId,
    ownerUserID: new Types.ObjectId(),
    managerUserIDs: [],
    weeklySchedule: {
      '0': { open: '08:00', close: '22:00' },
      '1': { open: '08:00', close: '22:00' },
      '2': { open: '08:00', close: '22:00' },
      '3': { open: '08:00', close: '22:00' },
      '4': { open: '08:00', close: '22:00' },
      '5': { open: '08:00', close: '22:00' },
      '6': { open: '08:00', close: '22:00' },
    },
    holidays: [],
    name: { en: 'Venue A', th: 'Venue A' },
    toJSON() {
      return {
        weeklySchedule: this.weeklySchedule,
        holidays: this.holidays,
      }
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      cookies: {},
      body: {
        items: [{
          courtID: baseCourt.id,
          date: '2026-07-20',
          startTime: '20:00',
          endTime: '22:00',
          addOnIDs: ['ac'],
        }],
        guestName: 'Guest',
        guestPhone: '0999999999',
        guestEmail: 'guest@example.com',
        bookedAsAdmin: true,
      },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    vi.mocked(CourtModel.findById).mockResolvedValue(baseCourt as any)
    vi.mocked(VenueModel.findById).mockResolvedValue(baseVenue as any)
    vi.mocked(CouponModel.findOne).mockResolvedValue(null as any)
    vi.spyOn(bookingUtils, 'getVenueScheduleForDate').mockReturnValue({ open: '08:00', close: '22:00' })
    vi.spyOn(bookingUtils, 'checkSlotAvailability').mockResolvedValue({ available: true })
    vi.spyOn(bookingUtils, 'calculateTotalPriceWithRules').mockReturnValue(300)

    vi.mocked(BookingModel.insertMany).mockImplementation(async(bookings: unknown) => {
      return (bookings as any[]).map((booking, index) => ({
        ...booking,
        id: new Types.ObjectId((index + 1).toString(16).padStart(24, '0')).toString(),
        toObject: () => booking,
      })) as any
    })
  })

  it('applies add-on cost per slot when using legacy item-level add-ons', async() => {
    await createSingle(mockReq, mockRes)

    const insertedPayload = vi.mocked(BookingModel.insertMany).mock.calls[0][0] as any[]
    expect(insertedPayload).toHaveLength(2)
    expect(insertedPayload.map((entry) => `${entry.startTime}-${entry.endTime}`)).toEqual([
      '20:00-21:00',
      '21:00-22:00',
    ])

    expect(insertedPayload.every((entry) => entry.totalPrice === 400)).toBe(true)
    expect(insertedPayload.every((entry) => entry.addOnTotalPrice === 100)).toBe(true)
    expect(insertedPayload[0].selectedAddOns).toEqual([
      { id: 'ac', name: 'Air Conditioning', price: 100, details: 'Cool court' },
    ])
    expect(mockRes.status).toHaveBeenCalledWith(201)
  })

  it('applies add-ons independently per slot when addOnIDsBySlot is provided', async() => {
    mockReq.body.items[0].addOnIDs = undefined
    mockReq.body.items[0].addOnIDsBySlot = {
      '20:00-21:00': ['ac'],
      '21:00-22:00': [],
    }

    await createSingle(mockReq, mockRes)

    const insertedPayload = vi.mocked(BookingModel.insertMany).mock.calls[0][0] as any[]
    expect(insertedPayload).toHaveLength(2)
    expect(insertedPayload[0].totalPrice).toBe(400)
    expect(insertedPayload[0].addOnTotalPrice).toBe(100)
    expect(insertedPayload[1].totalPrice).toBe(300)
    expect(insertedPayload[1].addOnTotalPrice).toBe(0)
  })

  it('returns 422 when add-on id is invalid for the court', async() => {
    mockReq.body.items[0].addOnIDs = ['not-found-addon']

    await createSingle(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(422)
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Invalid add-ons for court Court A at 20:00-21:00.',
      invalidAddOnIDs: ['not-found-addon'],
      slot: '20:00-21:00',
    }))
    expect(vi.mocked(BookingModel.insertMany)).not.toHaveBeenCalled()
  })
})
