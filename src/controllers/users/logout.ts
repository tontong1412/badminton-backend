import { Request, Response } from 'express'
import tokenUtils from '../../utils/token'
import config from '../../config'

interface LogoutBody {
  userId: string
}

const logout = async(
  req: Request<null, null, LogoutBody>,
  res: Response) => {
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
  await tokenUtils.deleteRefreshToken(req.body.userId)
  res.json({ message: 'Logged out' })
}
export default logout