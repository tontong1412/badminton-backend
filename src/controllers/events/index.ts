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
import changeEvent from './changeEvent'
import controllerErrorHandler from '../../utils/controllerErrorHandler'
export default {
  create: controllerErrorHandler(create),
  update: controllerErrorHandler(update),
  register: controllerErrorHandler(register),
  updateTeam: controllerErrorHandler(updateTeam),
  getMyEvents: controllerErrorHandler(getMyEvents),
  withdrawTeam: controllerErrorHandler(withdrawTeam),
  updateShuttlecock: controllerErrorHandler(updateShuttlecock),
  remove: controllerErrorHandler(remove),
  roundUp: controllerErrorHandler(roundUp),
  changeEvent: controllerErrorHandler(changeEvent),
  randomDraw: controllerErrorHandler(getRandomDraw),
  generateMatches: controllerErrorHandler(createMatches),
  getById: controllerErrorHandler(getEventById),
}