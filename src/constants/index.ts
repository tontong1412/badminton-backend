import EVENT from './event'

const DATABASE  = {
  COLLECTION: {
    SESSION: 'session',
    SESSION_REGISTRATION: 'sessionRegistration',
    PLAYER: 'player',
    USER: 'user',
    TOURNAMENT: 'tournament',
    VENUE: 'venue',
    COURT: 'court',
    TEAM: 'team',
    EVENT: 'event',
    BOOKING: 'booking',
    RECURRING_GROUP: 'recurringGroup',
    RESALE_LISTING: 'resaleListing',
    COUPON: 'coupon',
  }
}

const TOKEN = {
  EXPIRE_TIME: {
    ACCESS:  15 * 60 * 1000, // 15 minutes
    REFRESH: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
}

export default { DATABASE, TOKEN, EVENT }