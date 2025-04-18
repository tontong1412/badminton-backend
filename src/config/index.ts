import * as dotenv from 'dotenv'
dotenv.config()

const DATABASE = {
  URI: process.env.DB_URI || 'mongodb://localhost:27017/badminton',
  REDIS_URL: process.env.REDIS_URL
}

const ACCESS_SECRET = process.env.ACCESS_SECRET || null
const REFRESH_SECRET = process.env.REFRESH_SECRET || null
const NODE_ENV = process.env.NODE_ENV || 'development'

const EMAIL = {
  USER: process.env.EMAIL,
  PASSWORD: process.env.EMAIL_PASSWORD
}

const CLIENT = {
  URL: process.env.CLIENT_URL
}

export default {
  NODE_ENV,
  DATABASE,
  ACCESS_SECRET,
  REFRESH_SECRET,
  EMAIL,
  CLIENT
}