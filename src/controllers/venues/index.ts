import controllerErrorHandler from '../../utils/controllerErrorHandler'
import addHoliday from './addHoliday'
import addManager from './addManager'
import create from './create'
import get from './get'
import getById from './getById'
import removeHoliday from './removeHoliday'
import removeManager from './removeManager'
import setSchedule from './setSchedule'
import update from './update'
import uploadImage from './uploadImage'

export default {
  create: controllerErrorHandler(create),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  update: controllerErrorHandler(update),
  setSchedule: controllerErrorHandler(setSchedule),
  addHoliday: controllerErrorHandler(addHoliday),
  removeHoliday: controllerErrorHandler(removeHoliday),
  uploadImage: controllerErrorHandler(uploadImage),
  addManager: controllerErrorHandler(addManager),
  removeManager: controllerErrorHandler(removeManager),
}