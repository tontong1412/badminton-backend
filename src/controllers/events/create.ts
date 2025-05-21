import { Request, Response } from 'express'
import { ErrorResponse, Event, NewEvent, ResponseLocals } from '../../type'
import eventService from '../../services/eventService'
import TournamentModel from '../../schema/tournament'
import { Types } from 'mongoose'


const create =  async(
  req: Request<unknown, unknown, NewEvent, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>
) => {

  const { user } = res.locals

  const tournament = await TournamentModel.findById(req.body.tournament.id).select({ creator: 1, managers: 1, name: 1, shuttlecockFee: 1, billingMethod: 1, showParticipantList: 1, payment: 1 })
  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() || tournament.managers?.map((m) => m.id)?.includes(user.playerID)){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to create event to this tournament' })
    return
  }

  const eventPayload = {
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


  const newEvent = await eventService.create(eventPayload)
  await TournamentModel.findByIdAndUpdate(
    req.body.tournament.id,
    {
      $push: {
        events: {
          id: newEvent.id,
          fee: newEvent.fee,
          prize: newEvent.prize,
          name: newEvent.name,
          description: newEvent.description,
          type: newEvent.type,
        }
      }
    }
  )
  res.send(newEvent)
}

export default create