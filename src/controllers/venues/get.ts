import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'

const get = async(req: Request, res: Response): Promise<void> => {
  const query: Record<string, string> = {}

  if (typeof req.query.ownerUserID === 'string') {
    query.ownerUserID = req.query.ownerUserID
  }

  const venues = await VenueModel.find(query).sort({ createdAt: -1 })
  res.json(venues)
}

export default get