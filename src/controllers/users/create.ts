import argon2 from 'argon2'
import { NextFunction, Request, Response } from 'express'
import { Login, LoginResponse, Player, TokenPayload } from '../../type'
import UserModel from '../../schema/user'
import PlayerModel from '../../schema/player'
import { Types } from 'mongoose'
import tokenUtils from '../../utils/token'
import config from '../../config'
import constants from '../../constants'

interface CreateUserPayload extends Login {
  officialName: {
    th?: string;
    en?: string;
  };
  displayName: {
    th?: string;
    en?: string;
  };
  dob: string;
}

const createUser = async(
  req: Request<unknown, unknown, CreateUserPayload, unknown>,
  res: Response<LoginResponse>,
  next: NextFunction) => {
  const { email, password } = req.body

  try {
    const hash = await argon2.hash(password)
    const user = new UserModel({
      email,
      hash,
    })
    const savedUser = await user.save()

    const player = new PlayerModel({
      officialName: req.body.officialName,
      displayName: req.body.displayName,
      dob: req.body.dob,
      userID: savedUser._id,
    })

    const savedPlayer = await player.save()

    await UserModel.findByIdAndUpdate(savedUser._id, { playerID: savedPlayer._id })

    const userPayload: TokenPayload =  {
      id: savedUser._id as Types.ObjectId,
      email: savedUser.email,
      playerID: savedPlayer._id as Types.ObjectId,
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

    res.json({
      accessToken,
      refreshToken,
      user: userPayload,
      player: savedPlayer ? savedPlayer.toJSON() as Player : null,
    })
  } catch(error: unknown){
    next(error)
  }
}

export default createUser