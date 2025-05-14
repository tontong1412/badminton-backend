import { NextFunction, Response } from 'express'
import { ErrorResponse, LoginResponse, Player, RequestWithCookies } from '../../type'
import tokenUtils from '../../utils/token'
import config from '../../config'
import constants from '../../constants'
import PlayerModel from '../../schema/player'

const refresh = async(
  req: RequestWithCookies,
  res: Response<LoginResponse | ErrorResponse>,
  next: NextFunction): Promise<void> => {
  const refreshToken = req.cookies.refresh
  if (!refreshToken) {
    res.sendStatus(401)
    return
  }

  try {
    const decoded = tokenUtils.decode(refreshToken, config.REFRESH_SECRET)
    if(!decoded.id){
      res.status(401).json({
        message: 'Refresh token is invalid'
      })
      return
    }

    const storedRefreshToken = await tokenUtils.getRefreshToken(decoded.id.toString())

    if(refreshToken !== storedRefreshToken){
      res.status(401).json({
        message: 'Refresh token is invalid or expired'
      })
      return
    }

    const userPayload = {
      id: decoded.id,
      email: decoded.email,
      playerID: decoded.playerID
    }

    const newAccessToken = tokenUtils.create(userPayload, config.ACCESS_SECRET, constants.TOKEN.EXPIRE_TIME.ACCESS)
    const newRefreshToken = tokenUtils.create(userPayload, config.REFRESH_SECRET, constants.TOKEN.EXPIRE_TIME.REFRESH)

    await tokenUtils.storeRefreshToken(decoded.id.toString(), newRefreshToken, constants.TOKEN.EXPIRE_TIME.REFRESH)

    res.cookie('access', newAccessToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.ACCESS : 60 * 1000, // 1 minute in development,
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict'
    })

    res.cookie('refresh', newRefreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.REFRESH : 60 * 1000, // 1 minute in development,
      sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict'
    })

    const player = await PlayerModel.findById(userPayload.playerID)

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userPayload,
      player: player ? player.toJSON() as Player : null,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
}
export default refresh