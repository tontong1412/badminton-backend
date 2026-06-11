import { Response } from 'express'
import tokenUtils from '../../utils/token'
import config from '../../config'
import { RequestWithCookies, TokenPayload } from '../../type'

const logout = async(
  _req: RequestWithCookies,
  res: Response) => {
  const user = res.locals.user as TokenPayload
  res.clearCookie('refresh', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict'
  })
  res.clearCookie('access', {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict'
  })
  await tokenUtils.deleteRefreshToken(user.id.toString())
  res.json({ message: 'Logged out' })
}
export default logout