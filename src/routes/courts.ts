import express from 'express'
import courtController from '../controllers/courts'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', courtController.get)
router.get('/availability/bulk', courtController.getBulkAvailability)
router.get('/:id/availability', courtController.getAvailability)
router.get('/:id', courtController.getById)
router.post('/', middlewares.adminAuth, courtController.create)
router.put('/:id', middlewares.adminAuth, courtController.update)

export default router