// Suppress DEP0169: url.parse() is called internally by 'parseurl' (used by Express)
// and 'cloudinary' — both are unmaintained dependencies with no available fix.
process.on('warning', (warning) => {
  if ((warning as NodeJS.ErrnoException).code !== 'DEP0169') console.warn(warning)
})

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import middlewares from './middlewares'

import sessionRouter from './routes/sessions'
import bookingRouter from './routes/bookings'
import courtRouter from './routes/courts'
import playerRouter from './routes/players'
import matchRouter from './routes/matches'
import resaleRouter from './routes/resale'
import userRouter from './routes/users'
import tournamentRouter from './routes/tournaments'
import eventRouter from './routes/events'
import venueRouter from './routes/venues'
import couponRouter from './routes/coupons'
import config from './config'
import './utils/database'
import { startBookingExpiryJob } from './utils/bookingExpiry'

const app = express()

app.use(cors({
  origin: config.CLIENT.URL, // 👈 must be exact origin
  credentials: true                // 👈 this allows cookies
}))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))
app.use(cookieParser())

// ── Request timing (dev) ──────────────────────────────────────────────────────
if (config.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    const start = performance.now()
    _res.on('finish', () => {
      const ms = (performance.now() - start).toFixed(1)
      console.log(`[${ms}ms] ${req.method} ${req.path}`)
    })
    next()
  })
}

app.get('/ping', (_req, res) => {
  console.log('someone pinged here')
  res.send('pong')
})

app.use('/sessions', sessionRouter)
app.use('/venues', venueRouter)
app.use('/coupons', couponRouter)
app.use('/courts', courtRouter)
app.use('/bookings', bookingRouter)
app.use('/resale', resaleRouter)
app.use('/players', playerRouter)
app.use('/matches', matchRouter)
app.use('/users', userRouter)
app.use('/tournaments', tournamentRouter)
app.use('/events', eventRouter)



app.use(middlewares.errorHandler)

app.listen(config.NODE_PORT, () => {
  console.log(`Server running on port ${config.NODE_PORT}`)
  startBookingExpiryJob()
})