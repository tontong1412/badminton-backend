import { Request, Response } from 'express'
import MatchModel from '../../schema/match'

const getMatches = async(
  req: Request,
  res: Response
) => {
  const { eventID } = req.query
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


  const matches = await MatchModel.find(queryParams).sort({
    step:1,
    round: 1,
    groupOrder:1
  })
  res.send(matches)
  return
}
export default getMatches