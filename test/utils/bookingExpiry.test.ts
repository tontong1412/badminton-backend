import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startBookingExpiryJob } from '../../src/utils/bookingExpiry'
import { BookingStatus, ResaleOutcome, ResaleStatus } from '../../src/type'

const { find, findBookingById, findListingById, updateMany } = vi.hoisted(() => ({
  find: vi.fn(),
  findBookingById: vi.fn(),
  findListingById: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock('mongoose', () => ({
  default: { connection: { readyState: 1 }, ConnectionStates: { connected: 1 } },
}))
vi.mock('../../src/schema/booking', () => ({ default: { find, findById: findBookingById, updateMany } }))
vi.mock('../../src/schema/resaleListing', () => ({ default: { findById: findListingById } }))

describe('booking expiry resale restoration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    updateMany.mockResolvedValue({ modifiedCount: 0 })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('restores a fully resold source when a sub-range purchase expires', async() => {
    const source = {
      status: BookingStatus.Cancelled,
      resaleOutcome: ResaleOutcome.Resold,
      resaleSoldRanges: [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '10:00', endTime: '11:00' },
      ],
      resaleListingID: undefined,
      save: vi.fn(),
    }
    const listing = {
      _id: 'listing', bookingID: 'source', subStartTime: '10:00', subEndTime: '11:00',
      status: ResaleStatus.Pending, save: vi.fn(),
    }
    const buyer = { _id: 'buyer', resaleSourceListingID: 'listing', status: BookingStatus.Pending, save: vi.fn() }
    find.mockResolvedValue([buyer])
    findBookingById.mockResolvedValue(source)
    findListingById.mockResolvedValue(listing)

    startBookingExpiryJob()
    await vi.advanceTimersByTimeAsync(0)

    expect(source.status).toBe(BookingStatus.Confirmed)
    expect(source.resaleOutcome).toBe(ResaleOutcome.Listed)
    expect(source.resaleSoldRanges).toEqual([{ startTime: '09:00', endTime: '10:00' }])
    expect(listing.status).toBe(ResaleStatus.Active)
    expect(buyer.status).toBe(BookingStatus.Cancelled)
  })
})