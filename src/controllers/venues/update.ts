import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'
import encryptionUtils from '../../utils/encryption'
import config from '../../config'

const update = async(req: Request<{ id: string }>, res: Response): Promise<void> => {
  const payload = { ...req.body } as Record<string, unknown>

  if (Array.isArray(payload.holidays)) {
    payload.holidays = payload.holidays.map((holiday) => {
      const value = holiday as { date: string }
      return { ...holiday, date: new Date(value.date) }
    })
  }

  // Encrypt the SlipOK API key before persisting
  const slipok = payload.slipok as { branchId?: string; apiKey?: string } | undefined
  if (slipok?.apiKey) {
    payload.slipok = {
      ...slipok,
      apiKey: encryptionUtils.encrypt(slipok.apiKey, config.ENCRYPTION_KEY),
    }
  }

  const venue = await VenueModel.findByIdAndUpdate(req.params.id, payload, { new: true })

  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  res.json(venue)
}

export default update