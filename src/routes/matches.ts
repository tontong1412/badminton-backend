import express from 'express'
import matchControllers from '../controllers/matches'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', matchControllers.get)

router.post('/schedule', middlewares.auth, matchControllers.schedule)
router.post('/assign-match-number', matchControllers.assignMatchNumber)
router.post('/', (_req, res) => {
  res.send('Saving a match!')
})

export default router