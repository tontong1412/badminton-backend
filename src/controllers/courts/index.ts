import controllerErrorHandler from '../../utils/controllerErrorHandler'
import create from './create'
import get from './get'
import getAvailability from './getAvailability'
import getBulkAvailability from './getBulkAvailability'
import getById from './getById'
import update from './update'

export default {
  create: controllerErrorHandler(create),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  update: controllerErrorHandler(update),
  getAvailability: controllerErrorHandler(getAvailability),
  getBulkAvailability: controllerErrorHandler(getBulkAvailability),
}