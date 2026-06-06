import { Request, Response } from 'express'
import MatchModel from '../../schema/match'
import TournamentModel from '../../schema/tournament'
import { Types } from 'mongoose'

const getMatches = async(
  req: Request,
  res: Response
) => {
  const { eventID, tournamentID, status } = req.query
  const queryParams: Record<string, any> = {}

  if(eventID){
    queryParams['event.id'] = new Types.ObjectId(eventID as string)
  }

  if(tournamentID){
    const tournament = await TournamentModel.findById(tournamentID).select({ events: 1 }).lean()
    const eventIDs = tournament?.events.map((e) => e.id) || []
    queryParams['event.id'] = { $in: eventIDs }
  }

  if(status){
    queryParams['status'] = status
  }

  const matches = await MatchModel.find(queryParams).sort({
    step:1,
    round: 1,
    groupOrder:1
  })
  res.send(matches)
  return
}
export default getMatches