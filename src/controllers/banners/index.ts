import controllerErrorHandler from '../../utils/controllerErrorHandler'
import get from './get'
import getAll from './getAll'
import create from './create'
import update from './update'
import remove from './remove'

export default {
  get: controllerErrorHandler(get),
  getAll: controllerErrorHandler(getAll),
  create: controllerErrorHandler(create),
  update: controllerErrorHandler(update),
  remove: controllerErrorHandler(remove),
}
