import express from 'express'
import cors from 'cors'

import sessionRouter from './routes/sessions'
import playerRouter from './routes/players'
import matchRouter from './routes/matches'
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


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})