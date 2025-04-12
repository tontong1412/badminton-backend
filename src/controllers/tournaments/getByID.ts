import { Request, Response } from 'express'
import { Tournament } from '../../type'
import TournamentModel from '../../schema/tournament'

const getTournamentById = async(req: Request, res: Response<Tournament>) => {
  const tournament = await TournamentModel.findById(req.params.id)
  if (tournament) {
    res.send(tournament as Tournament)
  } else {
    res.sendStatus(404)
  }
}

export default getTournamentById