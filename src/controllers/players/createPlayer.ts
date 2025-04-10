import { Request, Response } from 'express'
import { NewPlayer, NonSensitivePlayer } from '../../type'
import playerService from '../../services/playerService'


const createPlayer =  async(req:Request, res: Response<NonSensitivePlayer>) => {
  const newPlayer = await playerService.createPlayer(req.body as NewPlayer)
  res.send(newPlayer)
}

export default createPlayer