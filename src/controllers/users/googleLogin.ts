import { Request, Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import UserModel from '../../schema/user'
import PlayerModel from '../../schema/player'
import tokenUtils from '../../utils/token'
import config from '../../config'
import constants from '../../constants'
import { ErrorResponse, LoginResponse, Player, TokenPayload } from '../../type'

interface GoogleLoginBody {
  credential: string;
}

const googleLogin = async(
  req: Request<unknown, unknown, GoogleLoginBody, unknown>,
  res: Response<LoginResponse | ErrorResponse>
): Promise<void> => {
  const { credential } = req.body

  if (!config.GOOGLE_CLIENT_ID) {
    res.status(500).json({ message: 'Google login is not configured.' })
    return
  }

  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID)

  let googlePayload
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID,
    })
    googlePayload = ticket.getPayload()
  } catch {
    res.status(401).json({ message: 'Invalid Google credential.' })
    return
  }

  if (!googlePayload?.email) {
    res.status(401).json({ message: 'Could not retrieve email from Google.' })
    return
  }

  const { sub: googleID, email, name } = googlePayload

  // Find existing user by googleID or email
  let user = await UserModel.findOne({ $or: [{ googleID }, { email }] })

  if (user) {
    // Link googleID if user signed up via email previously
    if (!user.googleID) {
      user.googleID = googleID
      await user.save()
    }
  } else {
    // Create new user + player
    const newUser = new UserModel({ email, googleID })
    const savedUser = await newUser.save()

    const player = new PlayerModel({
      officialName: { en: name ?? email, th: name ?? email },
      displayName: { en: name ?? email, th: name ?? email },
      userID: savedUser._id,
    })
    const savedPlayer = await player.save()

    await UserModel.findByIdAndUpdate(savedUser._id, { playerID: savedPlayer._id })
    user = await UserModel.findById(savedUser._id)
    if (!user) {
      res.status(500).json({ message: 'Failed to create user.' })
      return
    }
  }

  const userPayload: TokenPayload = {
    id: user._id,
    email: user.email,
    playerID: user.playerID,
    role: user.role,
  }

  const accessToken = tokenUtils.create(userPayload, config.ACCESS_SECRET, constants.TOKEN.EXPIRE_TIME.ACCESS)
  const refreshToken = tokenUtils.create(userPayload, config.REFRESH_SECRET, constants.TOKEN.EXPIRE_TIME.REFRESH)
  await tokenUtils.storeRefreshToken(user._id.toString(), refreshToken)

  res.cookie('access', accessToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.ACCESS : 30 * 60 * 1000,
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict',
  })

  res.cookie('refresh', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    maxAge: config.NODE_ENV === 'production' ? constants.TOKEN.EXPIRE_TIME.REFRESH : 30 * 60 * 1000,
    sameSite: config.NODE_ENV === 'production' ? 'none' : 'strict',
  })

  const player = await PlayerModel.findById(userPayload.playerID)

  res.json({
    accessToken,
    refreshToken,
    user: userPayload,
    player: player ? (player.toJSON() as Player) : null,
  })
}

export default googleLogin
