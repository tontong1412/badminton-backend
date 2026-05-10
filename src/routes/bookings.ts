import express from 'express'
import bookingController from '../controllers/bookings'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', middlewares.auth, bookingController.get)
router.get('/venue-admin', middlewares.auth, bookingController.getVenueBookings)
router.get('/:id', bookingController.getById)
router.post('/', bookingController.createSingle)
router.post('/recurring', middlewares.auth, bookingController.createRecurring)
router.put('/bundles/:bookingBundleID/pay', bookingController.payBooking)
router.put('/bundles/:bookingBundleID/approve-payment', middlewares.auth, bookingController.approvePayment)
router.delete('/:id', middlewares.auth, bookingController.cancel)

export default router