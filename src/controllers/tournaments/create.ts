import { Request, Response } from 'express'
import {  ErrorResponse, NewTournament,  ResponseLocals,  SimplePlayer,  Tournament, TournamentStatus } from '../../type'
import tournamentService from '../../services/tournamentService'
import PlayerModel from '../../schema/player'


const createTournament =  async(
  req: Request<unknown, unknown, NewTournament, unknown>,
  res: Response<Tournament | ErrorResponse, ResponseLocals>) => {
  const { user } = res.locals

  const creator = await PlayerModel.findById(user.playerID).select({ id: 1, officialName: 1, displayName: 1, photo: 1 })
  if(!creator){
    res.status(400).json({
      message: 'Creator does not exist in our database'
    })
    return
  }

  const newTournamentPayload: NewTournament = {
    ...req.body,
    creator: creator.toJSON() as SimplePlayer,
    managers: [creator.toJSON() as SimplePlayer],
    status: TournamentStatus.Preparation,
  }
  const newTournament = await tournamentService.create(newTournamentPayload)
  res.send(newTournament)
}

export default createTournament