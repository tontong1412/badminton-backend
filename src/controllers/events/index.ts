import create from './create'
import register from './register'
import updateTeam from './updateTeam'
import getEventById from './getByID'
import getMyEvents from './getMyEvent'
import withdrawTeam from './withdraw'
import updateShuttlecock from './updateShuttlecockCredit'
import getRandomDraw from './randomDraw'
export default {
  create,
  register,
  updateTeam,
  getById: getEventById,
  getMyEvents,
  withdrawTeam,
  updateShuttlecock,
  randomDraw: getRandomDraw,
}