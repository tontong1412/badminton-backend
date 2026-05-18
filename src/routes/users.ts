import express from 'express'
import userController from '../controllers/users'

const router = express.Router()

router.post('/', userController.create)
router.post('/login', userController.login)
router.post('/forgot-password', userController.forgotPassword)
router.post('/reset-password/:token', userController.resetPassword)
router.post('/refresh-token', userController.refresh)
router.post('/logout', userController.logout)
router.post('/google-login', userController.googleLogin)

export default router