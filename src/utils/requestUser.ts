import config from '../config'
import { TokenPayload } from '../type'
import tokenUtils from './token'

const getOptionalUser = (req: { cookies: { access?: string } }): TokenPayload | null => {
  const token = req.cookies.access

  if (!token) {
    return null
  }

  try {
    return tokenUtils.decode(token, config.ACCESS_SECRET)
  } catch (_error) {
    return null
  }
}

export default {
  getOptionalUser,
}