import { Request, Response } from 'express'
import {  ResponseLocals } from '../../type'
import TeamModel, { TeamDocument } from '../../schema/team'
import TournamentModel from '../../schema/tournament'
import MatchModel from '../../schema/match'

const getMyMatches =  async(
  req: Request,
  res: Response) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { tournamentID } = req.query

  const teams = await TeamModel.find({ players: user.playerID }).select('_id')

  const teamIDs = teams.map((t:TeamDocument) => (t._id as string).toString())

  const tournament = await TournamentModel.findById(tournamentID).select('events')
  if(!tournament){
    res.status(404).send({ message: 'Tournament not found' })
  }
  const eventIDs = tournament?.events.map((event) => event.id.toString())

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