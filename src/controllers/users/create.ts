import argon2 from 'argon2'
import { NextFunction, Request, Response } from 'express'
import { Login, NonSensitiveUser } from '../../type'
import UserModel from '../../schema/user'

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

export default createUser