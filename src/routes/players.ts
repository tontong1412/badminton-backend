import express from 'express'
import playerController from '../controllers/players'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', playerController.getNonSensitivePlayers)
router.get('/with-account', middlewares.auth, playerController.getPlayersWithAccount)
router.get('/me', middlewares.auth, playerController.getMyPlayer)
router.post('/', playerController.createPlayer)
router.get('/:id/history', playerController.getPlayerHistory)
router.get('/:id', playerController.getNonSensitivePlayerById)
router.put('/:id', middlewares.auth, playerController.updatePlayer)
router.post('/claim', playerController.claimPlayer)

export default router