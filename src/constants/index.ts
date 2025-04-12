const DATABASE  = {
  COLLECTION: {
    PLAYER: 'player',
    USER: 'user',
    TOURNAMENT: 'tournament',
    VENUE: 'venue',
    TEAM: 'team',
    EVENT: 'event'
  }
}

const TOKEN = {
  EXPIRE_TIME: {
    ACCESS:  15 * 60 * 1000, // 15 minutes
    REFRESH: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}

export default { DATABASE, TOKEN }