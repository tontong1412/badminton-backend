import express from 'express'
import eventController from '../controllers/events'
import middlewares from '../middlewares'

const router = express.Router()

router.post('/', middlewares.auth, eventController.create)

export default router