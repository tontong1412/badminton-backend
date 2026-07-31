import express from 'express'
import sessionController from '../controllers/sessions'
import middlewares from '../middlewares'

const router = express.Router()

router.get('/', sessionController.get)
router.get('/mine', middlewares.auth, sessionController.getMine)
router.get('/:id/my-registration', middlewares.auth, sessionController.getMyRegistration)
router.get('/:id/registrations', middlewares.sessionOrganizerAuth, sessionController.getRegistrations)
router.get('/:id/stats', middlewares.sessionOrganizerAuth, sessionController.getStats)
router.get('/:id', sessionController.getById)
router.post('/', middlewares.auth, sessionController.create)
router.post('/:id/register', middlewares.auth, sessionController.register)
router.post('/:id/registrations', middlewares.sessionOrganizerAuth, sessionController.addRegistration)
router.put('/:id/registrations/:registrationID/approve', middlewares.sessionOrganizerAuth, sessionController.approveRegistration)
router.put('/:id/registrations/:registrationID/reject', middlewares.sessionOrganizerAuth, sessionController.rejectRegistration)
router.put('/:id/registrations/:registrationID/payment', middlewares.sessionOrganizerAuth, sessionController.updatePaymentStatus)
router.put('/:id/registrations/:registrationID/attendance', middlewares.sessionOrganizerAuth, sessionController.updateAttendanceStatus)
router.put('/:id', middlewares.sessionOrganizerAuth, sessionController.update)
router.put('/:id/close-registration', middlewares.sessionOrganizerAuth, sessionController.closeRegistration)
router.put('/:id/start', middlewares.sessionOrganizerAuth, sessionController.start)
router.put('/:id/end', middlewares.sessionOrganizerAuth, sessionController.end)
router.put('/:id/cancel', middlewares.sessionOrganizerAuth, sessionController.cancel)
router.delete('/:id/register', middlewares.auth, sessionController.cancelMyRegistration)
router.delete('/:id/registrations/:registrationID', middlewares.sessionOrganizerAuth, sessionController.removeRegistration)
router.get('/:id/matches', middlewares.sessionOrganizerAuth, sessionController.getMatches)
router.post('/:id/matches/auto', middlewares.sessionOrganizerAuth, sessionController.autoGenerateMatches)
router.post('/:id/matches', middlewares.sessionOrganizerAuth, sessionController.createMatch)
router.put('/:id/matches/:matchID', middlewares.sessionOrganizerAuth, sessionController.updateMatch)
router.delete('/:id/matches/:matchID', middlewares.sessionOrganizerAuth, sessionController.deleteMatch)

export default router