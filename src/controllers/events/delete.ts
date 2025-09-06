import { Request, Response } from 'express'
import { Event } from '../../type'
import EventModel from '../../schema/event'
import TournamentModel from '../../schema/tournament'

const remove = async(req: Request, res: Response<Event>) => {
  const deletedEvent = await EventModel.findByIdAndDelete(req.params.id)
  await TournamentModel.findByIdAndUpdate(
    deletedEvent?.tournament.id,
    {
      $pull: {
        events: {
          id: req.params.id,
        }
      }
    })

  if (deletedEvent) {
    res.send(deletedEvent as Event)
  } else {
    res.sendStatus(404)
  }
}

export default remove