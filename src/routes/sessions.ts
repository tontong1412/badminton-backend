import express from 'express'

const router = express.Router()

router.get('/', (_req, res) => {
  res.send('Fetching all sessions')
})

router.post('/', (_req, res) => {
  res.send('Saving a session!')
})

export default router