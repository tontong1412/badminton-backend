import { Response } from 'express'
import PlayerModel from '../../schema/player'
import { RequestWithCookies, ResponseLocals } from '../../type'

const getMyPlayer = async(
  _req: RequestWithCookies,
  res: Response<unknown, ResponseLocals>,
): Promise<void> => {
  const { user } = res.locals

  if (!user.playerID) {
    res.status(404).json({ message: 'No player profile linked to this account' })
    return
  }

  const player = await PlayerModel.findById(user.playerID)
  if (!player) {
    res.status(404).json({ message: 'Player not found' })
    return
  }

  res.json(player.toJSON())
}

export default getMyPlayer
