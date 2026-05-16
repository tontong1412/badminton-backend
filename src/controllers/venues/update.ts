import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'
import encryptionUtils from '../../utils/encryption'
import config from '../../config'
import { UserRole } from '../../type'

const update = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const payload = { ...req.body } as Record<string, unknown>

  if (Array.isArray(payload.holidays)) {
    payload.holidays = payload.holidays.map((holiday) => {
      const value = holiday as { date: string }
      return { ...(holiday as Record<string, unknown>), date: new Date(value.date) }
    })
  }

  // Encrypt the SlipOK API key before persisting
  const slipok = payload.slipok as { branchId?: string; apiKey?: string; enabled?: boolean } | undefined
  if (slipok?.apiKey) {
    payload.slipok = {
      ...slipok,
      apiKey: encryptionUtils.encrypt(slipok.apiKey, config.ENCRYPTION_KEY),
    }
  }

  // Only system admins can change the slipok.enabled field
  const userRole = (res.locals.user as { role?: UserRole } | undefined)?.role
  if (userRole !== UserRole.Admin && payload.slipok) {
    delete (payload.slipok as Record<string, unknown>).enabled
  }

  // Build $set payload using dot notation for slipok fields to avoid
  // replacing the entire subdocument (which would wipe branchId/apiKey/enabled)
  const setPayload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'slipok' && value && typeof value === 'object') {
      for (const [sk, sv] of Object.entries(value as Record<string, unknown>)) {
        setPayload[`slipok.${sk}`] = sv
      }
    } else {
      setPayload[key] = value
    }
  }

  const venue = await VenueModel.findByIdAndUpdate(req.params.id, { $set: setPayload }, { new: true })

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default update