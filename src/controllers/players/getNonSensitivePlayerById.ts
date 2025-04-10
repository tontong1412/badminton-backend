import { Request, Response } from 'express'
import { NonSensitivePlayer } from '../../type'
import playerService from '../../services/playerService'

const getNonSensitivePlayerById = async(req: Request, res: Response<NonSensitivePlayer>) => {
  const player = await playerService.findById(req.params.id)
  if (player) {
    res.send(player)
  } else {
    res.sendStatus(404)
  }
}

export default getNonSensitivePlayerById