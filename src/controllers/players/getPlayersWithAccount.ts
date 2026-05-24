import { Request, Response } from 'express'
import PlayerModel from '../../schema/player'

/**
 * Admin-only: returns players who have a linked user account, including their userID.
 * Used for selecting managers when configuring a venue.
 */
const getPlayersWithAccount = async(_req: Request, res: Response): Promise<void> => {
  const players = await PlayerModel.find({ userID: { $ne: null } }).select({
    dob: 0,
    contact: 0,
    createdAt: 0,
    updatedAt: 0,
    __v: 0,
  })
  res.json(players)
}

export default getPlayersWithAccount
