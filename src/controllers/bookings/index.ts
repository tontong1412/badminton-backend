import controllerErrorHandler from '../../utils/controllerErrorHandler'
import approvePayment from './approvePayment'
import cancel from './cancel'
import createRecurring from './createRecurring'
import createSingle from './createSingle'
import get from './get'
import getById from './getById'
import getVenueBookings from './getVenueBookings'
import payBooking from './payBooking'

export default {
  createSingle: controllerErrorHandler(createSingle),
  createRecurring: controllerErrorHandler(createRecurring),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  getVenueBookings: controllerErrorHandler(getVenueBookings),
  cancel: controllerErrorHandler(cancel),
  payBooking: controllerErrorHandler(payBooking),
  approvePayment: controllerErrorHandler(approvePayment),
}