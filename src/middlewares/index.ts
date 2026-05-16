import { NextFunction, Request, Response } from 'express'
import { RequestWithCookies, TokenPayload, UserRole } from '../type'
import tokenUtils from '../utils/token'
import config from '../config'
import VenueModel from '../schema/venue'

const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction): void => {
  if(error instanceof Error){
    console.error(error.message)
    if (error.name === 'MongoServerError' && error.message.includes('E11000 duplicate key error')) {
      res.status(400).json({ error: 'This email has already been used.' })
      return
    } else if (error.name ===  'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' })
      return
    }else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'token expired' })
      return
    }else {
      res.status(500).json({ error: 'Internal server error. Please wait a moment and try again' })
      return
    }
  }
  next(error)
}

const auth = (req: RequestWithCookies, res: Response, next: NextFunction) => {
  const token = req.cookies.access
  if (!token) {
    res.status(401).send('Unauthorized')
    return
  }

  const decodedToken = tokenUtils.decode(token, config.ACCESS_SECRET)
  if(!decodedToken.id) {
    res.status(401).send('Token Invalid')
    return
  }

  res.locals.user = decodedToken

  next()
  return
}

const adminAuth = (req: RequestWithCookies, res: Response, next: NextFunction) => {
  auth(req, res, () => {
    if ((res.locals.user as TokenPayload).role !== UserRole.Admin) {
      res.status(403).send('Forbidden')
      return
    }

    next()
  })
}

/**
 * Allows system admins, venue owners, and venue managers.
 * Requires :id param to be the venue ID.
 */
const venueManagerAuth = (req: RequestWithCookies & Request<{ id: string }>, res: Response, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  auth(req, res, async() => {
    try {
      const user = res.locals.user as { id: string; role: UserRole }

      // System admins always pass
      if (user.role === UserRole.Admin) {
        next()
        return
      }

      const venue = await VenueModel.findById(req.params.id).select('ownerUserID managerUserIDs')
      if (!venue) {
        res.status(404).json({ message: 'Venue not found' })
        return
      }

      const isOwner = venue.ownerUserID.toString() === user.id.toString()
      const isManager = venue.managerUserIDs.some((id) => id.toString() === user.id.toString())

      if (!isOwner && !isManager) {
        res.status(403).send('Forbidden')
        return
      }

      next()
    } catch (err) {
      next(err)
    }
  })
}

export default {
  errorHandler,
  auth,
  adminAuth,
  venueManagerAuth,
}