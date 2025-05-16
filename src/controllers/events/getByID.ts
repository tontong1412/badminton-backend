import { Request, Response } from 'express'
import { Event } from '../../type'
import EventModel from '../../schema/event'

const getEventById = async(req: Request, res: Response<Event>) => {
  const event = await EventModel.findById(req.params.id)
  if (event) {
    res.send(event as Event)
  } else {
    res.sendStatus(404)
  }
}

export default getEventById