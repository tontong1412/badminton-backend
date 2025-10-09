import create from './create'
import login from './login'
import forgotPassword from './forgotPassword'
import resetPassword from './resetPassword'
import refresh from './refresh'
import logout from './logout'
import controllerErrorHandler from '../../utils/controllerErrorHandler'

export default {
  create: controllerErrorHandler(create),
  login: controllerErrorHandler(login),
  forgotPassword: controllerErrorHandler(forgotPassword),
  resetPassword: controllerErrorHandler(resetPassword),
  refresh: controllerErrorHandler(refresh),
  logout: controllerErrorHandler(logout),
}