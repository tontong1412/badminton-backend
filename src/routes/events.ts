import express from 'express'
import eventController from '../controllers/events'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/my-events', middlewares.auth, eventController.getMyEvents)
router.get('/:id', eventController.getById)
router.post('/', middlewares.auth, eventController.create)
router.post('/register', middlewares.auth, eventController.register)
router.post('/update-team', middlewares.auth, eventController.updateTeam)
router.post('/withdraw', middlewares.auth, eventController.withdrawTeam)

export default router