import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import UserModel from '../schema/user'
import { ErrorResponse, Login, LoginResponse, NonSensitiveUser } from '../type'
import { NextFunction, Request, Response } from 'express'
import CONFIG from '../config'


const createUser = async(
  req: Request<unknown, unknown, Login, unknown>,
  res: Response<NonSensitiveUser>,
  next: NextFunction) => {
  const { email, password } = req.body

  try {
    const hash = await argon2.hash(password)
    const user = new UserModel({
      email,
      hash,
    })
    const savedUser = await user.save()
    res.status(201).json(savedUser.toJSON() as NonSensitiveUser)
  } catch(error: unknown){
    next(error)
  }
}

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
        error: 'invalid username or password'
      })
      return
    }

    if(!CONFIG.JWT_SECRET){
      console.error('SECRET environment variable is not defined')
      res.status(500).json({
        error: 'Internal server error'
      })
      return
    }

    const userForToken = {
      id: user._id,
      playerID: user.playerID,
      email: user.email
    }

    const token = jwt.sign(userForToken, CONFIG.JWT_SECRET, { expiresIn: '15m' })

    res
      .status(200)
      .send({ token, email: user.email })
    return

  } catch(error: unknown){
    return next(error)
  }
}

export default {
  createUser,
  login
}