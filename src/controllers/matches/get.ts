import { Request, Response } from 'express'
import MatchModel from '../../schema/match'
import TournamentModel from '../../schema/tournament'

const getMatches = async(
  req: Request,
  res: Response
) => {
  const { eventID, tournamentID } = req.query
  let queryParams = {
    ...req.query,
  }
  if(eventID){
    queryParams = {
      ...queryParams,
      'event.id': eventID
    }
    delete queryParams.eventID
  }

  if(tournamentID){
    const tournament = await TournamentModel.findById(tournamentID).select({ events: 1 }).lean()
    const eventIDs = tournament?.events.map((e) => e.id.toString()) || []
    queryParams = {
      ...queryParams,
      'event.id': { $in: eventIDs }
    }
    delete queryParams.tournamentID
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