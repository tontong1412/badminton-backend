import express from 'express'
import matchControllers from '../controllers/matches'

const router = express.Router()

router.get('/', matchControllers.get)

router.post('/', (_req, res) => {
  res.send('Saving a match!')
})

export default router