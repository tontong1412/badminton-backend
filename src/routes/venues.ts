import express from 'express'
import venueController from '../controllers/venues'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', venueController.get)
router.get('/:id', venueController.getById)
router.post('/', middlewares.adminAuth, venueController.create)
router.put('/:id', middlewares.adminAuth, venueController.update)
router.put('/:id/schedule', middlewares.adminAuth, venueController.setSchedule)
router.post('/:id/holidays', middlewares.adminAuth, venueController.addHoliday)
router.delete('/:id/holidays/:date', middlewares.adminAuth, venueController.removeHoliday)

export default router