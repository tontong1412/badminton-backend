/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-return */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Types } from 'mongoose'
import createRecurring from '../../src/controllers/bookings/createRecurring'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import RecurringGroupModel from '../../src/schema/recurringGroup'
import VenueModel from '../../src/schema/venue'
import bookingUtils from '../../src/utils/booking'

vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')
vi.mock('../../src/schema/recurringGroup')
vi.mock('../../src/schema/venue')

describe('createRecurring controller slot splitting', () => {
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
  }

  const buildVenue = (slotDurationMinutes: 30 | 60) => ({
    _id: venueObjectId,
    ownerUserID: new Types.ObjectId(),
    managerUserIDs: [],
    slotDurationMinutes,
    gapPolicy: { enabled: true, minimumGapMinutes: 60 },
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
    toJSON() {
      return {
        weeklySchedule: this.weeklySchedule,
        holidays: this.holidays,
      }
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      body: {
        courtID: baseCourt.id,
        startTime: '20:00',
        endTime: '22:00',
        pattern: 'daily',
        rangeStart: '2026-07-20',
        rangeEnd: '2026-07-20',
        bookedAsAdmin: true,
      },
    }

    mockRes = {
      locals: {
        user: {
          id: new Types.ObjectId().toString(),
          role: 'admin',
          email: 'admin@example.com',
        },
      },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    vi.mocked(CourtModel.find).mockResolvedValue([baseCourt] as any)

    vi.spyOn(bookingUtils, 'validateBookingWindow').mockImplementation(() => undefined)
    vi.spyOn(bookingUtils, 'enumerateRecurringDates').mockReturnValue([new Date('2026-07-20T00:00:00.000Z')])
    vi.spyOn(bookingUtils, 'getVenueScheduleForDate').mockReturnValue({ open: '08:00', close: '22:00' })
    vi.spyOn(bookingUtils, 'checkSlotAvailability').mockResolvedValue({ available: true })
    vi.spyOn(bookingUtils, 'calculateTotalPriceWithRules').mockReturnValue(300)
  })

  it('creates 2 bookings for a 2-hour window when venue slot is 60 minutes', async() => {
    vi.mocked(VenueModel.findById).mockResolvedValue(buildVenue(60) as any)

    const recurringGroupId = new Types.ObjectId()
    vi.mocked(RecurringGroupModel.insertMany).mockResolvedValue([
      {
        _id: recurringGroupId,
        courtID: courtObjectId,
        bookingIDs: [],
        save: vi.fn().mockResolvedValue(undefined),
      },
    ] as any)

    vi.mocked(BookingModel.insertMany).mockImplementation(async(bookings: any[]) => {
      return bookings.map((booking, index) => ({
        ...booking,
        id: new Types.ObjectId((index + 1).toString(16).padStart(24, '0')).toString(),
        toObject: () => booking,
      })) as any
    })

    await createRecurring(mockReq, mockRes)

    const insertedPayload = vi.mocked(BookingModel.insertMany).mock.calls[0][0] as any[]
    expect(insertedPayload).toHaveLength(2)
    expect(insertedPayload.map((entry) => `${entry.startTime}-${entry.endTime}`)).toEqual([
      '20:00-21:00',
      '21:00-22:00',
    ])

    expect(insertedPayload.every((entry) => entry.durationMinutes === 60)).toBe(true)
    expect(mockRes.status).toHaveBeenCalledWith(201)
  })

  it('creates 4 bookings for a 2-hour window when venue slot is 30 minutes', async() => {
    vi.mocked(VenueModel.findById).mockResolvedValue(buildVenue(30) as any)

    const recurringGroupId = new Types.ObjectId()
    vi.mocked(RecurringGroupModel.insertMany).mockResolvedValue([
      {
        _id: recurringGroupId,
        courtID: courtObjectId,
        bookingIDs: [],
        save: vi.fn().mockResolvedValue(undefined),
      },
    ] as any)

    vi.mocked(BookingModel.insertMany).mockImplementation(async(bookings: any[]) => {
      return bookings.map((booking, index) => ({
        ...booking,
        id: new Types.ObjectId((index + 10).toString(16).padStart(24, '0')).toString(),
        toObject: () => booking,
      })) as any
    })

    await createRecurring(mockReq, mockRes)

    const insertedPayload = vi.mocked(BookingModel.insertMany).mock.calls[0][0] as any[]
    expect(insertedPayload).toHaveLength(4)
    expect(insertedPayload.map((entry) => `${entry.startTime}-${entry.endTime}`)).toEqual([
      '20:00-20:30',
      '20:30-21:00',
      '21:00-21:30',
      '21:30-22:00',
    ])

    expect(insertedPayload.every((entry) => entry.durationMinutes === 30)).toBe(true)
    expect(mockRes.status).toHaveBeenCalledWith(201)
  })

  it('returns 400 when recurring window is not divisible by venue slot duration', async() => {
    mockReq.body.startTime = '20:30'
    mockReq.body.endTime = '22:00'

    vi.mocked(VenueModel.findById).mockResolvedValue(buildVenue(60) as any)

    await createRecurring(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Recurring window must align with venue slot duration (60 minutes).',
    })
    expect(vi.mocked(RecurringGroupModel.insertMany)).not.toHaveBeenCalled()
    expect(vi.mocked(BookingModel.insertMany)).not.toHaveBeenCalled()
  })
})
