import express from 'express'
import bannerController from '../controllers/banners'
import middlewares from '../middlewares'

const router = express.Router()

// Public: get active banners for home page
router.get('/', bannerController.get)

// Admin: get all banners (including inactive)
router.get('/all', middlewares.adminAuth, bannerController.getAll)

// Admin: create banner
router.post('/', middlewares.adminAuth, bannerController.create)

// Admin: update banner (title, linkUrl, order, isActive)
router.put('/:id', middlewares.adminAuth, bannerController.update)

// Admin: delete banner
router.delete('/:id', middlewares.adminAuth, bannerController.remove)

export default router
