import { NextFunction, Response } from 'express'
import playerService from '../../services/playerService'
import tokenUtils from '../../utils/token'
import config from '../../config'
import { RequestWithCookies } from '../../type'

interface ClaimPlayer {
  playerID: string
}

const claimPlayer = async(
  req: RequestWithCookies,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.cookies.access
  if (!token) {
    res.status(401).send('Unauthorized')
    return
  }

  const decodedToken = tokenUtils.decode(token, config.ACCESS_SECRET)
  if(!decodedToken.id){
    res.status(401).send('Token Invalid')
    return
  }

  const { playerID } = req.body as ClaimPlayer
  if (!playerID) {
    res.status(400).send('Missing playerID')
    return
  }
  try {
    const updatedPlayer = await playerService.update(playerID, {
      userID: decodedToken.id
    })

    if (!updatedPlayer) {
      res.status(404).send('Player not found')
      return
    }

    res.status(200).json(updatedPlayer)
    return

  } catch(error: unknown){
    console.error('Error claiming player:', error)
    next(error)
    return
  }
}
export default claimPlayer