import { NextFunction, Request, Response } from 'express'
import argon2  from 'argon2'
import UserModel from '../../schema/user'
import { ErrorResponse } from '../../type'
import tokenUtils from '../../utils/token'
import config from '../../config'

const resetPassword = async(
  req: Request<{token: string}, unknown, {password: string}, unknown>,
  res: Response<ErrorResponse>,
  next: NextFunction): Promise<void> => {
  const { token } = req.params
  const { password } = req.body

  try{
    const decodedToken = Buffer.from(token, 'base64url').toString('utf8')
    const decodedJWT = tokenUtils.decode(decodedToken, config.ACCESS_SECRET)

    if(!decodedJWT.id){
      res.status(401).json({ message: 'token invalid' })
      return
    }

    const hash = await argon2.hash(password)
    await UserModel.findByIdAndUpdate(decodedJWT.id, { hash })
    res.status(200).json({ message: 'Reset password succeesfully' })
    return
  }catch(error){
    console.error(error)
    next(error)
    return
  }
}
export default resetPassword