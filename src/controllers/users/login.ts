import argon2 from 'argon2'
import UserModel from '../../schema/user'
import { ErrorResponse, Login, LoginResponse, Player, TokenPayload } from '../../type'
import { NextFunction, Request, Response } from 'express'
import config from '../../config'
import tokenUtils from '../../utils/token'
import constants from '../../constants'
import { Types } from 'mongoose'
import PlayerModel from '../../schema/player'

const login = async(
  req: Request<unknown, unknown, Login, unknown>,
  res: Response<LoginResponse | ErrorResponse>,
  next: NextFunction): Promise<void> => {
  const { email, password } = req.body

  try {
    const user = await UserModel.findOne({ email })
    const passwordCorrect = user === null
      ? false
      : await argon2.verify(user.hash, password)

    if(!(user && passwordCorrect)){
      res.status(401).json({
        message: 'invalid username or password'
      })
      return
    }

    const userPayload: TokenPayload = {
      id: user._id as Types.ObjectId,
      email: user.email,
      playerID: user.playerID
    }
    const accessToken = tokenUtils.create(userPayload, config.ACCESS_SECRET, constants.TOKEN.EXPIRE_TIME.ACCESS)
    const refreshToken = tokenUtils.create(userPayload, config.REFRESH_SECRET, constants.TOKEN.EXPIRE_TIME.REFRESH)
    await tokenUtils.storeRefreshToken(user._id as string, refreshToken)

    res.cookie('access', accessToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.ACCESS : 30 * 60 * 1000, // 30 minute in development,
      sameSite: 'strict'
    })

    res.cookie('refresh', refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.ACCESS : 30 * 60 * 1000, // 30 minute in development,
      sameSite: 'strict'
    })

    const player = await PlayerModel.findById(userPayload.playerID)

    res.json({
      accessToken,
      refreshToken,
      user: userPayload,
      player: player ? player.toJSON() as Player : null,
    })
    return

  } catch(error: unknown){
    return next(error)
  }
}

export default login