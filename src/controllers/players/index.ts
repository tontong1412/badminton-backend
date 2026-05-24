import getNonSensitivePlayers from './getNonSensitivePlayers'
import createPlayer from './createPlayer'
import getNonSensitivePlayerById from './getNonSensitivePlayerById'
import claimPlayer from './claimPlayer'
import updatePlayer from './updatePlayer'
import getMyPlayer from './getMyPlayer'
import getPlayerHistory from './getHistory'
import getPlayersWithAccount from './getPlayersWithAccount'
import controllerErrorHandler from '../../utils/controllerErrorHandler'

export default {
  getNonSensitivePlayers: controllerErrorHandler(getNonSensitivePlayers),
  createPlayer: controllerErrorHandler(createPlayer),
  getNonSensitivePlayerById: controllerErrorHandler(getNonSensitivePlayerById),
  claimPlayer: controllerErrorHandler(claimPlayer),
  updatePlayer: controllerErrorHandler(updatePlayer),
  getMyPlayer: controllerErrorHandler(getMyPlayer),
  getPlayerHistory: controllerErrorHandler(getPlayerHistory),
  getPlayersWithAccount: controllerErrorHandler(getPlayersWithAccount),
}