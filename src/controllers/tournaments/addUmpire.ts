import { Request, Response } from 'express'
import {  ErrorResponse, ResponseLocals, Tournament } from '../../type'
import PlayerModel from '../../schema/player'
import TournamentModel from '../../schema/tournament'

interface AddUmpireBody {
  playerID: string
  tournamentID: string
}

const addUmpire =  async(
  req: Request<unknown, unknown, AddUmpireBody, unknown>,
  res: Response<Tournament | ErrorResponse, ResponseLocals>) => {
  const { user } = res.locals

  const tournament = await TournamentModel.findById(req.body.tournamentID).select({ creator: 1, managers: 1 })
  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() && tournament.managers?.map((m) => m.id)?.includes(user.playerID)){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to add manager to this tournament' })
    return
  }

  const newUmpire = await PlayerModel.findById(req.body.playerID).select({ id: 1, officialName: 1, displayName: 1, photo: 1 })
  if(!newUmpire){
    res.status(400).json({
      message: 'User does not exist in our database'
    })
    return
  }

  const updateResponse = await TournamentModel.findByIdAndUpdate(
    req.body.tournamentID,
    {
      $addToSet: { umpires: newUmpire.toJSON() }
    },
    { new: true }
  )
  if(updateResponse){
    res.send(updateResponse.toJSON() as Tournament)
    return
  }
  res.sendStatus(404)
  return
}

export default addUmpire