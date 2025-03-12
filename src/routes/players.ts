import express, { Response } from 'express'
import playerService from '../services/playerService'
import { NewPlayer, NonSensitivePlayer } from '../type'

const router = express.Router()

router.get('/', async(_req, res: Response<NonSensitivePlayer[]>) => {
  res.send(await playerService.getNonSensitivePlayers())
})

router.post('/', async(req, res: Response<NonSensitivePlayer>) => {
  const newPlayer = await playerService.createPlayer(req.body as NewPlayer)
  res.send(newPlayer)
})

router.get('/:id', async(req, res: Response<NonSensitivePlayer>) => {
  const player = await playerService.findById(req.params.id)
  if (player) {
    res.send(player)
  } else {
    res.sendStatus(404)
  }
})

export default router