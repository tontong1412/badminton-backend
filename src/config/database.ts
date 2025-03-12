import mongoose from 'mongoose'

// Get MongoDB URI from environment variable or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/badminton'
mongoose.set('strictQuery', false)

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDb')
  })
  .catch((error: unknown) => {
    let errorMessage = 'Somehting went wrong'
    if(error instanceof Error){
      errorMessage += ' Error: ' + error.message
    }
    console.error(errorMessage)
  })

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err instanceof Error ? err.message : String(err))
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected')
})

// Handle application termination
process.on('SIGINT', () => {
  mongoose.connection.close()
    .then(() => {
      console.log('MongoDB connection closed due to app termination')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error during MongoDB connection closure:', err instanceof Error ? err.message : String(err))
      process.exit(1)
    })
})