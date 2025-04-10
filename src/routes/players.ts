import express from 'express'
import playerController from '../controllers/players'

const router = express.Router()

router.get('/', playerController.getNonSensitivePlayers)
router.post('/', playerController.createPlayer)
router.get('/:id', playerController.getNonSensitivePlayerById)
router.post('/claim', playerController.claimPlayer)

export default router