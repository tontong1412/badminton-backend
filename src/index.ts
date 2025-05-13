import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import middlewares from './middlewares'

import sessionRouter from './routes/sessions'
import playerRouter from './routes/players'
import matchRouter from './routes/matches'
import userRouter from './routes/users'
import tournamentRouter from './routes/tournaments'
import eventRouter from './routes/events'
import config from './config'
import './utils/database'

const app = express()

app.use(cors({
  origin: config.CLIENT.URL, // 👈 must be exact origin
  credentials: true                // 👈 this allows cookies
}))
app.use(express.json())
app.use(cookieParser())

app.get('/ping', (_req, res) => {
  console.log('someone pinged here')
  res.send('pong')
})

app.use('/api/sessions', sessionRouter)
app.use('/api/players', playerRouter)
app.use('/api/matches', matchRouter)
app.use('/api/users', userRouter)
app.use('/api/tournaments', tournamentRouter)
app.use('/api/events', eventRouter)



app.use(middlewares.errorHandler)

app.listen(config.NODE_PORT, () => {
  console.log(`Server running on port ${config.NODE_PORT}`)
})