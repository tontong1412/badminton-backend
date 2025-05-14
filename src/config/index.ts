import * as dotenv from 'dotenv'
dotenv.config()

const NODE_PORT = process.env.PORT || 8080

const DATABASE = {
  URI: process.env.DB_URI || 'mongodb://localhost:27017/badminton',
  REDIS_URL: process.env.REDIS_URL
}

const ACCESS_SECRET = process.env.ACCESS_SECRET || null
const REFRESH_SECRET = process.env.REFRESH_SECRET || null
const NODE_ENV = process.env.NODE_ENV || 'development'

const CLOUDINARY_URL = process.env.CLOUDINARY_URL || null
const CLOUDINARY_PREFIX = process.env.CLOUDINARY_PREFIX || 'local-new'

const EMAIL = {
  USER: process.env.EMAIL,
  PASSWORD: process.env.EMAIL_PASSWORD
}

const CLIENT = {
  URL: process.env.CLIENT_URL
}

export default {
  NODE_PORT,
  NODE_ENV,
  DATABASE,
  ACCESS_SECRET,
  REFRESH_SECRET,
  EMAIL,
  CLIENT,
  CLOUDINARY_PREFIX,
  CLOUDINARY_URL
}