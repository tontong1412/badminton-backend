import express from 'express'

const router = express.Router()

router.get('/', (_req, res) => {
  res.send('Fetching all matches')
})

router.post('/', (_req, res) => {
  res.send('Saving a match!')
})

export default router