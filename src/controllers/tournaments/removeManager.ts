import { Request, Response } from 'express'
import {  ErrorResponse, ResponseLocals, Tournament } from '../../type'
import PlayerModel from '../../schema/player'
import TournamentModel from '../../schema/tournament'

interface RemoveManagerBody {
  playerID: string
  tournamentID: string
}

const removeManager =  async(
  req: Request<unknown, unknown, RemoveManagerBody, unknown>,
  res: Response<Tournament | ErrorResponse, ResponseLocals>) => {
  const { user } = res.locals

  const tournament = await TournamentModel.findById(req.body.tournamentID).select({ creator: 1, managers: 1 })
  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() && !tournament.managers.map((m) => m.id.toString()).includes(user.playerID.toString())){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to add manager to this tournament' })
    return
  }

  const managerToRemove = await PlayerModel.findById(req.body.playerID).select({ id: 1 }).lean()
  if(!managerToRemove){
    res.status(400).json({
      message: 'User does not exist in our database'
    })
    return
  }

  const updateResponse = await TournamentModel.findByIdAndUpdate(
    req.body.tournamentID,
    {
      $pull: {
        managers: { id: managerToRemove._id }
      }
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

export default removeManager