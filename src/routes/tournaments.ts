import express from 'express'
import tournamentController from '../controllers/tournaments'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', tournamentController.get)
router.post('/', middlewares.auth, tournamentController.create)
router.get('/:id', tournamentController.getById)

export default router