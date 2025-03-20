import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'

import sessionRouter from './routes/sessions'
import playerRouter from './routes/players'
import matchRouter from './routes/matches'
import userRouter from './routes/users'
import './config/database'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = 8080

app.get('/ping', (_req, res) => {
  console.log('someone pinged here')
  res.send('pong')
})

app.use('/api/sessions', sessionRouter)
app.use('/api/players', playerRouter)
app.use('/api/matches', matchRouter)
app.use('/api/users', userRouter)

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

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})