import jwt, { SignOptions } from 'jsonwebtoken'
import connectRedis from './redis'
import constants from '../constants'
import { TokenPayload } from '../type'

const create = (userPayload: TokenPayload, secret: string | null, expiresIn: SignOptions['expiresIn']) => {
  if(!secret){
    console.error('SECRET environment variable is not defined')
    throw new Error('Internal server error')
  }

  const token = jwt.sign(userPayload, secret, { expiresIn })
  return token
}

const decode = (token: string, secret: string | null): TokenPayload => {
  if(!secret){
    console.error('SECRET environment variable is not defined')
    throw new Error('Internal server error')
  }
  return jwt.verify(token, secret) as TokenPayload
}

const storeRefreshToken = async(userId: string, refreshToken: string, ttl: number = constants.TOKEN.EXPIRE_TIME.REFRESH): Promise<void> => {
  const redis = await connectRedis()
  const redisKey = `refresh_token:${userId}`

  await redis.set(redisKey, refreshToken, { EX: ttl })
}

const getRefreshToken = async(userId: string): Promise<string | null> => {
  const redis = await connectRedis()
  const redisKey = `refresh_token:${userId}`

  const storedToken = await redis.get(redisKey)

  if (!storedToken) {
    return null
  }

  return storedToken
}

const deleteRefreshToken = async(userId: string): Promise<void> => {
  const redis = await connectRedis()
  const redisKey = `refresh_token:${userId}`

  await redis.del(redisKey)
}

export default {
  create,
  decode,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
}