import create from './create'
import register from './register'
import updateTeam from './updateTeam'
import getEventById from './getByID'
import getMyEvents from './getMyEvent'
import withdrawTeam from './withdraw'
import updateShuttlecock from './updateShuttlecockCredit'
import getRandomDraw from './randomDraw'
import createMatches from './createMatch'
import update from './update'
import remove from './delete'
import roundUp from './roundUp'
export default {
  create,
  update,
  register,
  updateTeam,
  getById: getEventById,
  getMyEvents,
  withdrawTeam,
  updateShuttlecock,
  randomDraw: getRandomDraw,
  generateMatches: createMatches,
  remove,
  roundUp,
}