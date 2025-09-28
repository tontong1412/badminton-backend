import { Request, Response } from 'express'
import { ErrorResponse, Match, NewMatch, ResponseLocals } from '../../type'
import EventModel from '../../schema/event'
import MatchModel from '../../schema/match'

const update =  async(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request<any, unknown, NewMatch, unknown>,
  res: Response<Match | ErrorResponse, ResponseLocals>
) => {

  const { user } = res.locals
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { id } = req.params

  const matchToUpdate = await MatchModel.findById(id).select({ event:1 })

  if(!matchToUpdate){
    res.status(404).json({ message: 'Match not found' })
    return
  }

  const event = await EventModel.findById(matchToUpdate.event.id).select({ tournament: 1 }).lean()

  if(!event){
    res.status(404).json({ message: 'Event not found' })
    return
  }

  if(!event.tournament.managers?.map((m) => m.id.toString()).includes(user.playerID.toString())){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to create event to this tournament' })
    return
  }

  const updatedMatch = await MatchModel.findByIdAndUpdate(id, req.body, { new:true })
  if(!updatedMatch){
    res.status(404).json({ message: 'Match not found' })
    return
  }

  res.send(updatedMatch as Match)
  return
}

export default update