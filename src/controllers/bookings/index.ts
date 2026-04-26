import controllerErrorHandler from '../../utils/controllerErrorHandler'
import cancel from './cancel'
import createRecurring from './createRecurring'
import createSingle from './createSingle'
import get from './get'
import getById from './getById'
import payBooking from './payBooking'

export default {
  createSingle: controllerErrorHandler(createSingle),
  createRecurring: controllerErrorHandler(createRecurring),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  cancel: controllerErrorHandler(cancel),
  payBooking: controllerErrorHandler(payBooking),
}