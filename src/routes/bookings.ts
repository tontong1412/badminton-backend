import express from 'express'
import bookingController from '../controllers/bookings'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', middlewares.auth, bookingController.get)
router.get('/:id', bookingController.getById)
router.post('/', bookingController.createSingle)
router.post('/recurring', middlewares.auth, bookingController.createRecurring)
router.put('/bundles/:bookingBundleID/pay', bookingController.payBooking)
router.delete('/:id', middlewares.auth, bookingController.cancel)

export default router