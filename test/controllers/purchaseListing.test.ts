/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import purchaseListing from '../../src/controllers/resale/purchaseListing'
import { BookingStatus, ResaleOutcome, ResaleStatus } from '../../src/type'

const { findBooking, findListing } = vi.hoisted(() => ({
  findBooking: vi.fn(),
  findListing: vi.fn(),
}))

vi.mock('../../src/schema/booking', () => ({
  default: Object.assign(class {
    save() { return Promise.resolve(this) }
  }, { findById: findBooking }),
}))
vi.mock('../../src/schema/resaleListing', () => ({ default: { findById: findListing } }))
vi.mock('../../src/utils/requestUser', () => ({ default: { getOptionalUser: () => null } }))

describe('purchaseListing source booking', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    { start: '09:00', end: '10:00', previous: [], expected: BookingStatus.Confirmed },
    { start: '09:00', end: '11:00', previous: [], expected: BookingStatus.Cancelled },
    { start: '10:00', end: '11:00', previous: [{ startTime: '09:00', endTime: '10:00' }], expected: BookingStatus.Cancelled },
    { start: '10:30', end: '11:00', previous: [{ startTime: '09:00', endTime: '10:00' }], expected: BookingStatus.Confirmed },
  ])('updates status based on coverage: $start to $end', async({ start, end, previous, expected }) => {
    const source = {
      status: BookingStatus.Confirmed,
      startTime: '09:00',
      endTime: '11:00',
      resaleSoldRanges: [...previous],
      resaleOutcome: ResaleOutcome.Listed,
      save: vi.fn(),
    }
    const listing = {
      _id: 'listing', bookingID: 'source', status: ResaleStatus.Active,
      subStartTime: start, subEndTime: end, save: vi.fn(),
    }
    findBooking.mockResolvedValue(source)
    findListing.mockResolvedValue(listing)
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() }

    await purchaseListing({ params: { id: 'listing' }, body: {
      guestName: 'Buyer', guestPhone: '123', guestEmail: 'buyer@example.com',
    } } as any, res)

    expect(source.status).toBe(expected)
    expect(source.resaleOutcome).toBe(expected === BookingStatus.Cancelled ? ResaleOutcome.Resold : ResaleOutcome.None)
    expect(source.save).toHaveBeenCalledOnce()
    expect(listing.status).toBe(ResaleStatus.Pending)
    expect(res.status).toHaveBeenCalledWith(201)
  })
})