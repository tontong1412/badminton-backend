import controllerErrorHandler from '../../utils/controllerErrorHandler'
import approvePayment from './approvePayment'
import cancel from './cancel'
import createRecurring from './createRecurring'
import createSingle from './createSingle'
import get from './get'
import getById from './getById'
import getBundle from './getBundle'
import getVenueBookings from './getVenueBookings'
import markAsPaid from './markAsPaid'
import payBooking from './payBooking'
import reschedule from './reschedule'

export default {
  createSingle: controllerErrorHandler(createSingle),
  createRecurring: controllerErrorHandler(createRecurring),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  getBundle: controllerErrorHandler(getBundle),
  getVenueBookings: controllerErrorHandler(getVenueBookings),
  cancel: controllerErrorHandler(cancel),
  payBooking: controllerErrorHandler(payBooking),
  approvePayment: controllerErrorHandler(approvePayment),
  markAsPaid: controllerErrorHandler(markAsPaid),
  reschedule: controllerErrorHandler(reschedule),
}