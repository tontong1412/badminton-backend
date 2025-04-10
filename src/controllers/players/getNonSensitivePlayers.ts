import { Request, Response } from 'express'
import { NonSensitivePlayer } from '../../type'
import playerService from '../../services/playerService'

const getNonSensitivePlayers = async(_req: Request, res: Response<NonSensitivePlayer[]>) => {
  res.send(await playerService.getNonSensitivePlayers())
}
export default getNonSensitivePlayers