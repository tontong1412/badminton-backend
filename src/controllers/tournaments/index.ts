import get from './get'
import create from './create'
import getById from './getByID'
import addManager from './addManager'
import addUmpire from './addUmpire'
import removeManager from './removeManager'
import removeUmpire from './removeUmpire'
import controllerErrorHandler from '../../utils/controllerErrorHandler'

export default {
  get: controllerErrorHandler(get),
  create: controllerErrorHandler(create),
  getById: controllerErrorHandler(getById),
  addManager: controllerErrorHandler(addManager),
  addUmpire: controllerErrorHandler(addUmpire),
  removeManager: controllerErrorHandler(removeManager),
  removeUmpire: controllerErrorHandler(removeUmpire)
}