import express from 'express'
import couponController from '../controllers/coupons'
import middlewares from '../middlewares'

const router = express.Router()

// Public: validate a coupon code before booking
router.post('/validate', couponController.validate)

// Venue-manager-scoped coupon management
router.get('/venue/:id', middlewares.venueManagerAuth, couponController.list)
router.post('/venue/:id', middlewares.venueManagerAuth, couponController.create)
router.delete('/venue/:id/:couponID', middlewares.venueManagerAuth, couponController.remove)

export default router
