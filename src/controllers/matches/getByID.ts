import { Request, Response } from 'express'
import { Match } from '../../type'
import MatchModel from '../../schema/match'

const getMatchByID = async(req: Request, res: Response<Match>) => {
  const match = await MatchModel.findById(req.params.id)
  if (match) {
    res.send(match as Match)
  } else {
    res.sendStatus(404)
  }
}

export default getMatchByID