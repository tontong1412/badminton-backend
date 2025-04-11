import { NextFunction, Response } from 'express'
import playerService from '../../services/playerService'
import { NonSensitivePlayer, RequestWithCookies, ResponseLocals, ErrorResponse } from '../../type'

const updatePlayer = async(
  req: RequestWithCookies,
  res: Response<NonSensitivePlayer | ErrorResponse, ResponseLocals>,
  next: NextFunction,
): Promise<void> => {

  const { user } = res.locals

  if(user.playerID.toString() !== req.params.id){
    res.status(404).json({ message: 'Unauthorized: You can\'t modify this player' })
    return
  }

  try {
    const updatedPlayer = await playerService.update(user.playerID.toString(), req.body)

    if (!updatedPlayer) {
      res.status(404).json({ message: 'Player not found' })
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
export default updatePlayer