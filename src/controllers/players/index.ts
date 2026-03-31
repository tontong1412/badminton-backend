import getNonSensitivePlayers from './getNonSensitivePlayers'
import createPlayer from './createPlayer'
import getNonSensitivePlayerById from './getNonSensitivePlayerById'
import claimPlayer from './claimPlayer'
import updatePlayer from './updatePlayer'
import getPlayerHistory from './getHistory'
import controllerErrorHandler from '../../utils/controllerErrorHandler'

export default {
  getNonSensitivePlayers: controllerErrorHandler(getNonSensitivePlayers),
  createPlayer: controllerErrorHandler(createPlayer),
  getNonSensitivePlayerById: controllerErrorHandler(getNonSensitivePlayerById),
  claimPlayer: controllerErrorHandler(claimPlayer),
  updatePlayer: controllerErrorHandler(updatePlayer),
  getPlayerHistory: controllerErrorHandler(getPlayerHistory),
}