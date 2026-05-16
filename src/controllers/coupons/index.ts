import controllerErrorHandler from '../../utils/controllerErrorHandler'
import create from './create'
import list from './list'
import remove from './remove'
import validate from './validate'

export default {
  create: controllerErrorHandler(create),
  list: controllerErrorHandler(list),
  remove: controllerErrorHandler(remove),
  validate: controllerErrorHandler(validate),
}
