import { Request, Response } from 'express'
import { ErrorResponse, Event, NewEvent, ResponseLocals } from '../../type'
import TournamentModel from '../../schema/tournament'
import { Types } from 'mongoose'
import EventModel from '../../schema/event'

const update =  async(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request<any, unknown, NewEvent, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>
) => {

  const { user } = res.locals
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { id } = req.params

  const eventToUpdate = await EventModel.findById(id).select({ tournament:1 })

  if(!eventToUpdate){
    res.status(404).json({ message: 'Event not found' })
    return
  }

  const tournament = await TournamentModel.findById(eventToUpdate.tournament.id).select({ creator: 1, managers: 1, name: 1, shuttlecockFee: 1, billingMethod: 1, showParticipantList: 1, payment: 1 }).lean()

  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() || tournament.managers?.map((m) => m.id.toString())?.includes(user.playerID.toString())){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to update event' })
    return
  }

  const updateParam = {
    ...req.body,
    tournament: {
      id: tournament._id as Types.ObjectId,
      name: tournament.name,
      shuttlecockFee: tournament.shuttlecockFee,
      billingMethod: tournament.billingMethod,
      showParticipantList: tournament.showParticipantList,
      language: tournament.language,
      managers: tournament.managers,
      payment: tournament.payment
    }
  }

  const updatedEvent = await EventModel.findByIdAndUpdate(id, updateParam, { new:true }).select({ teams: 0 })
  if(!updatedEvent){
    res.status(404).json({ message: 'Event not found' })
    return
  }

  await TournamentModel.findByIdAndUpdate(
    tournament._id,
    {
      $set: {
        'events.$[elem].fee': updatedEvent.fee,
        'events.$[elem].prize': updatedEvent.prize,
        'events.$[elem].name': updatedEvent.name,
        'events.$[elem].description': updatedEvent.description,
        'events.$[elem].type': updatedEvent.type,
        'events.$[elem].limit': updatedEvent.limit,
        'events.$[elem].format': updatedEvent.format
      }
    }, {
      arrayFilters: [{
        'elem.id': updatedEvent._id // Match the element by its 'id'
      }]
    }
  )
  if(!updatedEvent){
    res.status(404).send({ message: 'event not found' })
    return
  }
  res.send(updatedEvent as Event)
  return
}

export default update