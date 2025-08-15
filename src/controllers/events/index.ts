import create from './create'
import register from './register'
import updateTeam from './updateTeam'
import getEventById from './getByID'
import getMyEvents from './getMyEvent'
import withdrawTeam from './withdraw'
export default {
  create,
  register,
  updateTeam,
  getById: getEventById,
  getMyEvents,
  withdrawTeam,
}