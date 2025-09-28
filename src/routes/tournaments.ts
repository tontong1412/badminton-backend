import express from 'express'
import tournamentController from '../controllers/tournaments'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', tournamentController.get)
router.post('/', middlewares.auth, tournamentController.create)
router.get('/:id', tournamentController.getById)
router.post('/add-manager', middlewares.auth, tournamentController.addManager)
router.post('/add-umpire', middlewares.auth, tournamentController.addUmpire)
router.post('/remove-manager', middlewares.auth, tournamentController.removeManager)
router.post('/remove-umpire', middlewares.auth, tournamentController.removeUmpire)

export default router