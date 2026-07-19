/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import getAdminPayouts from '../../src/controllers/resale/getAdminPayouts'
import ResaleListingModel from '../../src/schema/resaleListing'
import PlayerModel from '../../src/schema/player'
import BookingModel from '../../src/schema/booking'
import CourtModel from '../../src/schema/court'
import { ResaleStatus, SellerPayoutStatus } from '../../src/type'

vi.mock('../../src/schema/resaleListing')
vi.mock('../../src/schema/player')
vi.mock('../../src/schema/booking')
vi.mock('../../src/schema/court')

describe('getAdminPayouts controller', () => {
  let req: any
  let res: any

  beforeEach(() => {
    vi.clearAllMocks()
    req = {}
    res = {
      locals: { user: { id: 'admin-1', role: 'admin' } },
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
  })

  it('returns 403 for non-admin users', async() => {
    res.locals.user.role = 'manager'

    await getAdminPayouts(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' })
  })

  it('queries only finalized sold listings for pending payouts', async() => {
    vi.mocked(ResaleListingModel.find).mockReturnValue({
      sort: vi.fn().mockResolvedValue([]),
    } as any)
    vi.mocked(PlayerModel.find).mockResolvedValue([] as any)
    vi.mocked(BookingModel.find).mockResolvedValue([] as any)
    vi.mocked(CourtModel.find).mockResolvedValue([] as any)

    await getAdminPayouts(req, res)

    expect(vi.mocked(ResaleListingModel.find)).toHaveBeenCalledWith({
      status: ResaleStatus.Sold,
      soldAt: { $exists: true },
      sellerPayoutStatus: SellerPayoutStatus.Pending,
    })
    expect(res.json).toHaveBeenCalledWith([])
  })
})
