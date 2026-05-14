import express from 'express'
import venueController from '../controllers/venues'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', venueController.get)
router.get('/:id', venueController.getById)
router.post('/', middlewares.adminAuth, venueController.create)
router.put('/:id', middlewares.venueManagerAuth, venueController.update)
router.put('/:id/schedule', middlewares.venueManagerAuth, venueController.setSchedule)
router.post('/:id/holidays', middlewares.venueManagerAuth, venueController.addHoliday)
router.delete('/:id/holidays/:date', middlewares.venueManagerAuth, venueController.removeHoliday)
router.post('/:id/upload', middlewares.venueManagerAuth, venueController.uploadImage)
router.post('/:id/managers', middlewares.venueManagerAuth, venueController.addManager)
router.delete('/:id/managers/:userID', middlewares.venueManagerAuth, venueController.removeManager)

export default router