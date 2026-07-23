import controllerErrorHandler from '../../utils/controllerErrorHandler'
import addRegistration from './addRegistration'
import approveRegistration from './approveRegistration'
import cancel from './cancel'
import cancelMyRegistration from './cancelMyRegistration'
import closeRegistration from './closeRegistration'
import create from './create'
import end from './end'
import get from './get'
import getById from './getById'
import getMine from './getMine'
import getMyRegistration from './getMyRegistration'
import getRegistrations from './getRegistrations'
import register from './register'
import rejectRegistration from './rejectRegistration'
import removeRegistration from './removeRegistration'
import start from './start'
import update from './update'
import updateAttendanceStatus from './updateAttendanceStatus'
import updatePaymentStatus from './updatePaymentStatus'

export default {
  addRegistration: controllerErrorHandler(addRegistration),
  approveRegistration: controllerErrorHandler(approveRegistration),
  create: controllerErrorHandler(create),
  get: controllerErrorHandler(get),
  getById: controllerErrorHandler(getById),
  getMine: controllerErrorHandler(getMine),
  getMyRegistration: controllerErrorHandler(getMyRegistration),
  getRegistrations: controllerErrorHandler(getRegistrations),
  register: controllerErrorHandler(register),
  rejectRegistration: controllerErrorHandler(rejectRegistration),
  removeRegistration: controllerErrorHandler(removeRegistration),
  update: controllerErrorHandler(update),
  cancel: controllerErrorHandler(cancel),
  cancelMyRegistration: controllerErrorHandler(cancelMyRegistration),
  closeRegistration: controllerErrorHandler(closeRegistration),
  start: controllerErrorHandler(start),
  end: controllerErrorHandler(end),
  updateAttendanceStatus: controllerErrorHandler(updateAttendanceStatus),
  updatePaymentStatus: controllerErrorHandler(updatePaymentStatus),
}