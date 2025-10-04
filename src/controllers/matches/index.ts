import assignMatchNumber from './assignMatchNumber'
import getMatches from './get'
import scheduleMatches from './schedule'
import update from './update'
import setScore from './setScore'
import getMatchByID from './getByID'

export default {
  get: getMatches,
  schedule: scheduleMatches,
  assignMatchNumber: assignMatchNumber,
  update,
  setScore,
  getByID: getMatchByID
}