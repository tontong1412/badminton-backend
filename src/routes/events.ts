import express from 'express'
import eventController from '../controllers/events'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/my-events', middlewares.auth, eventController.getMyEvents)
router.get('/:id', eventController.getById)
router.put('/:id', middlewares.auth, eventController.update)
router.delete('/:id', middlewares.auth, eventController.remove)
router.post('/', middlewares.auth, eventController.create)
router.post('/register', middlewares.auth, eventController.register)
router.post('/update-team', middlewares.auth, eventController.updateTeam)
router.post('/update-shuttlecock', middlewares.auth, eventController.updateShuttlecock)
router.post('/withdraw', middlewares.auth, eventController.withdrawTeam)
router.post('/random-draw', middlewares.auth, eventController.randomDraw)
router.post('/generate-matches', middlewares.auth, eventController.generateMatches)
router.post('/round-up', middlewares.auth, eventController.roundUp)
router.post('/change-event', eventController.changeEvent)


export default router