import { createClient, RedisClientType } from 'redis'
import config from '../config'

let client: RedisClientType | null = null

const connectRedis = async(): Promise<RedisClientType> => {
  if (!client) {  // Only connect if the client is not already initialized
    client = createClient({
      url: config.DATABASE.REDIS_URL,
    })

    client.on('error', (err: Error) => console.error('Redis error:', err))
    await client.connect()
  }

  return client
}


export default connectRedis
