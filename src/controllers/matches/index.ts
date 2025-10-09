import assignMatchNumber from './assignMatchNumber'
import getMatches from './get'
import scheduleMatches from './schedule'
import update from './update'
import setScore from './setScore'
import getMatchByID from './getByID'
import getMyMatches from './getMyMatches'
import controllerErrorHandler from '../../utils/controllerErrorHandler'

export default {
  get: controllerErrorHandler(getMatches),
  schedule: controllerErrorHandler(scheduleMatches),
  assignMatchNumber: controllerErrorHandler(assignMatchNumber),
  getByID: controllerErrorHandler(getMatchByID),
  update: controllerErrorHandler(update),
  setScore: controllerErrorHandler(setScore),
  getMyMatches: controllerErrorHandler(getMyMatches),
}