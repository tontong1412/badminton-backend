import * as dotenv from 'dotenv'
dotenv.config()

const DATABASE = {
  URI: process.env.DB_URI || 'mongodb://localhost:27017/badminton'
}

const JWT_SECRET = process.env.JWT_SECRET || null

export default {
  DATABASE,
  JWT_SECRET
}