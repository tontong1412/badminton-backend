import { Request, Response } from 'express'
import CourtModel from '../../schema/court'

const get = async(req: Request, res: Response): Promise<void> => {
  const query: Record<string, string> = {}

  if (typeof req.query.venueID === 'string') {
    query.venueID = req.query.venueID
  }

  if (typeof req.query.status === 'string') {
    query.status = req.query.status
  }

  const courts = await CourtModel.find(query).sort({ venueID: 1, name: 1 })
  res.json(courts)
}

export default get