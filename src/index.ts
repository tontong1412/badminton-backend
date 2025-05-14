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
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))
app.use(cookieParser())

app.get('/ping', (_req, res) => {
  console.log('someone pinged here')
  res.send('pong')
})

app.use('/sessions', sessionRouter)
app.use('/players', playerRouter)
app.use('/matches', matchRouter)
app.use('/users', userRouter)
app.use('/tournaments', tournamentRouter)
app.use('/events', eventRouter)



app.use(middlewares.errorHandler)

app.listen(config.NODE_PORT, () => {
  console.log(`Server running on port ${config.NODE_PORT}`)
})