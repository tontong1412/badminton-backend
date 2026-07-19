/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { finalizeResaleListingsForBookings } from '../../src/utils/resaleListingLifecycle'
import ResaleListingModel from '../../src/schema/resaleListing'
import { ResaleStatus } from '../../src/type'

vi.mock('../../src/schema/resaleListing')

describe('resaleListingLifecycle.finalizeResaleListingsForBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does nothing when bookings have no resale source listing IDs', async() => {
    await finalizeResaleListingsForBookings([
      { resaleSourceListingID: undefined },
      { resaleSourceListingID: null },
    ])

    expect(vi.mocked(ResaleListingModel.updateMany)).not.toHaveBeenCalled()
  })

  it('marks unique listings as sold when payment is finalized', async() => {
    await finalizeResaleListingsForBookings([
      { resaleSourceListingID: 'listing-1' },
      { resaleSourceListingID: 'listing-1' },
      { resaleSourceListingID: 'listing-2' },
    ])

    expect(vi.mocked(ResaleListingModel.updateMany)).toHaveBeenCalledTimes(1)

    const [filter, update] = vi.mocked(ResaleListingModel.updateMany).mock.calls[0] as any[]
    expect(filter).toEqual({
      _id: { $in: ['listing-1', 'listing-2'] },
      status: { $ne: ResaleStatus.Sold },
    })
    expect(update.$set.status).toBe(ResaleStatus.Sold)
    expect(update.$set.soldAt).toBeInstanceOf(Date)
  })

  it('stores slip metadata when provided', async() => {
    const ts = new Date('2026-07-19T12:00:00.000Z')

    await finalizeResaleListingsForBookings(
      [{ resaleSourceListingID: 'listing-1' }],
      { venuePaymentSlip: 'https://example.com/slip.jpg', venuePaymentSlipTimestamp: ts },
    )

    const [, update] = vi.mocked(ResaleListingModel.updateMany).mock.calls[0] as any[]
    expect(update.$set.venuePaymentSlip).toBe('https://example.com/slip.jpg')
    expect(update.$set.venuePaymentSlipTimestamp).toEqual(ts)
  })
})
