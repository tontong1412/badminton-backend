/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import getVenueAnalytics from '../../src/controllers/bookings/getVenueAnalytics'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import VenueModel from '../../src/schema/venue'
import requestUserUtils from '../../src/utils/requestUser'

vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')
vi.mock('../../src/schema/venue')
vi.mock('../../src/utils/requestUser')

describe('getVenueAnalytics controller', () => {
  let mockReq: any
  let mockRes: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockReq = {
      query: {
        venueID: 'venue-1',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      },
      cookies: {
        access: 'token',
      },
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue({ id: 'user-1', role: 'admin' } as any)
  })

  it('returns 401 when unauthenticated', async() => {
    vi.mocked(requestUserUtils.getOptionalUser).mockReturnValue(null)

    await getVenueAnalytics(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Authentication required' })
  })

  it('returns 400 when required query params are missing', async() => {
    mockReq.query = { venueID: 'venue-1', dateFrom: '2026-01-01' }

    await getVenueAnalytics(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(400)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'dateFrom and dateTo must be valid dates' })
  })

  it('returns 403 when venue is not accessible', async() => {
    vi.mocked(VenueModel.findOne).mockResolvedValue(null)

    await getVenueAnalytics(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(403)
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Access denied for this venue' })
  })

  it('returns aggregated analytics payload for valid request', async() => {
    const venue = {
      _id: 'venue-1',
      weeklySchedule: {
        '0': { open: '08:00', close: '22:00' },
        '1': { open: '08:00', close: '22:00' },
        '2': { open: '08:00', close: '22:00' },
        '3': { open: '08:00', close: '22:00' },
        '4': { open: '08:00', close: '22:00' },
        '5': { open: '08:00', close: '22:00' },
        '6': { open: '08:00', close: '22:00' },
      },
    }

    const courts = [
      { _id: 'c1', name: 'Court A', status: 'active' },
      { _id: 'c2', name: 'Court B', status: 'active' },
    ]

    const bookings = [
      {
        courtID: { toString: () => 'c1' },
        date: new Date('2026-01-05T10:00:00.000Z'),
        startTime: '10:00',
        endTime: '12:00',
        durationMinutes: 120,
        totalPrice: 800,
        discountAmount: 100,
        paymentStatus: 'paid',
        status: 'confirmed',
        resaleSourceListingID: undefined,
      },
      {
        courtID: { toString: () => 'c1' },
        date: new Date('2026-01-06T11:00:00.000Z'),
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
        totalPrice: 400,
        discountAmount: 0,
        paymentStatus: 'pending',
        status: 'confirmed',
        resaleSourceListingID: undefined,
      },
      {
        courtID: { toString: () => 'c2' },
        date: new Date('2026-01-07T09:00:00.000Z'),
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        totalPrice: 300,
        discountAmount: 0,
        paymentStatus: 'unpaid',
        status: 'cancelled',
        resaleSourceListingID: undefined,
      },
    ]

    vi.mocked(VenueModel.findOne).mockResolvedValue(venue as any)
    vi.mocked(CourtModel.find).mockResolvedValue(courts as any)
    vi.mocked(BookingModel.find).mockReturnValue({
      sort: vi.fn().mockResolvedValue(bookings),
    } as any)

    await getVenueAnalytics(mockReq, mockRes)

    expect(mockRes.status).not.toHaveBeenCalledWith(400)
    expect(mockRes.status).not.toHaveBeenCalledWith(401)
    expect(mockRes.status).not.toHaveBeenCalledWith(403)

    const payload = mockRes.json.mock.calls[0][0]
    expect(payload.summary.paidRevenue).toBe(800)
    expect(payload.summary.pendingRevenue).toBe(400)
    expect(payload.summary.unpaidRevenue).toBe(0)
    expect(payload.summary.cancelledBookings).toBe(1)
    expect(payload.summary.discountTotal).toBe(100)
    expect(Array.isArray(payload.monthlyRows)).toBe(true)
    expect(Array.isArray(payload.weekdayDemand)).toBe(true)
    expect(Array.isArray(payload.hourDemand)).toBe(true)
    expect(Array.isArray(payload.courtRanking)).toBe(true)
    expect(payload.forecastNextMonth).toBeDefined()
  })
})
