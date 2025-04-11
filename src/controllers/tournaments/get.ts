import moment from 'moment'
import { Request, Response } from 'express'
import TournamentModel from '../../schema/tournament'
import { TournamentQuery, TournamentStatus } from '../../type'

const getTournaments = async(
  req: Request,
  res: Response
) => {
  const { tab } = req.query

  let queryOptions = {}
  let sort = {}
  let limit = 0

  if(tab === TournamentQuery.Recent){
    queryOptions = {
      status: TournamentStatus.Finished,
    }
    sort = { endDate: -1 }
    limit = 10
  } else if(tab === TournamentQuery.ThisWeek){
    const startOfWeek = moment().startOf('isoWeek').toDate()
    const endOfWeek = moment().endOf('isoWeek').toDate()
    queryOptions = {
      startDate: {
        $gte: startOfWeek,
        $lte: endOfWeek,
      }
    }
    sort = { startDate: 1 }
  } else { // default return registration open
    queryOptions = {
      status: TournamentStatus.RegistrationOpen
    }
    sort = { startDate: 1 }
  }

  const tournaments = await TournamentModel
    .find(queryOptions, { creator: 0, useHandicap: 0, managers: 0, umpires: 0, createdAt: 0, updatedAt: 0 })
    .sort(sort)
    .limit(limit)
  res.send(tournaments)
  return
}
export default getTournaments