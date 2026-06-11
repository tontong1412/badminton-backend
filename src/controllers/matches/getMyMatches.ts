import { Request, Response } from 'express'
import { MatchStatus, ResponseLocals } from '../../type'
import TeamModel, { TeamDocument } from '../../schema/team'
import TournamentModel from '../../schema/tournament'
import MatchModel from '../../schema/match'

const getMyMatches =  async(
  req: Request,
  res: Response) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { tournamentID } = req.query

  const teams = await TeamModel.find({ players: user.playerID }).select('_id')

  const teamIDs = teams.map((t:TeamDocument) => t._id.toString())

  const tournament = await TournamentModel.findById(tournamentID).select('events umpires')
  if(!tournament){
    res.status(404).send({ message: 'Tournament not found' })
    return
  }
  const eventIDs = tournament.events.map((event) => event.id.toString())
  const isTournamentUmpire = tournament.umpires?.some((umpire) => umpire.id?.toString() === user.playerID.toString())

  if(isTournamentUmpire){
    const umpireMatches = await MatchModel.find({
      'event.id': { $in: eventIDs },
      'umpire.id': user.playerID,
      status: MatchStatus.Playing
    }).sort({ matchNumber: 1 })

    res.send(umpireMatches.map((m) => m.toJSON()))
    return
  }

  const myMatches = await MatchModel.find({
    'event.id': { $in: eventIDs },
    '$or': [
      { 'teamA.id': { $in: teamIDs } },
      { 'teamB.id': { $in: teamIDs } }
    ]
  }).sort({ matchNumber: 1 })

  res.send(myMatches.map((m) => m.toJSON()))
  return
}

export default getMyMatches
