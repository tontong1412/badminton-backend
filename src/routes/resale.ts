import express from 'express'
import middlewares from '../middlewares'
import resaleController from '../controllers/resale'

const router = express.Router()

router.get('/', resaleController.getListings)
router.get('/admin/payouts', middlewares.auth, resaleController.getAdminPayouts)
router.post('/admin/payout-with-slip', middlewares.auth, resaleController.payoutWithSlip)
router.get('/:id', resaleController.getListingById)
router.post('/', middlewares.auth, resaleController.createListing)
router.put('/:id/buy', resaleController.purchaseListing)
router.put('/:id/mark-seller-paid', middlewares.auth, resaleController.markSellerPaid)
router.put('/:id/cancel', middlewares.auth, resaleController.cancelListing)

export default router