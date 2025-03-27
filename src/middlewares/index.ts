import { NextFunction, Request, Response } from 'express'
import { RequestWithCookies } from '../type'
import tokenUtils from '../utils/token'
import config from '../config'

const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction): void => {
  if(error instanceof Error){
    console.error(error.message)
    if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
      res.status(400).json({ error: 'This email has already been used.' })
      return
    } else if (error.name ===  'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' })
      return
    }else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'token expired' })
      return
    }
  }
  next(error)
}

const auth = (req: RequestWithCookies, res: Response, next: NextFunction) => {
  const token = req.cookies.access
  if (!token) return res.status(401).send('Unauthorized')

  const decodedToken = tokenUtils.decode(token, config.ACCESS_SECRET)
  if(!decodedToken.id) return res.status(401).send('Token Invalid')

  next()
  return
}

export default {
  errorHandler,
  auth
}