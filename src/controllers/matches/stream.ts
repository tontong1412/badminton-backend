import { Request, Response } from 'express'
import { addMatchUpdateStream } from '../../utils/matchUpdates'

const stream = (req: Request, res: Response) => {
  const { tournamentID } = req.query

  if (typeof tournamentID !== 'string' || !tournamentID) {
    res.status(400).json({ message: 'tournamentID is required' })
    return
  }

  addMatchUpdateStream(tournamentID, res)
}

export default stream
