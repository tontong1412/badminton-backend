import assignMatchNumber from './assignMatchNumber'
import getMatches from './get'
import scheduleMatches from './schedule'
import update from './update'

export default {
  get: getMatches,
  schedule: scheduleMatches,
  assignMatchNumber: assignMatchNumber,
  update,
}