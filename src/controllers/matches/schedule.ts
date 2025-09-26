import { Request, Response } from 'express'
import { ErrorResponse,
  ResponseLocals,
} from '../../type'
import MatchModel from '../../schema/match'
import TournamentModel from '../../schema/tournament'

interface UpdateManyMatchBody {
  tournamentID: string,
  matches: {
    id: string,
    date: string,
  }[]
}

const scheduleMatches =  async(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request<any, unknown, UpdateManyMatchBody, unknown>,
  res: Response<string | ErrorResponse, ResponseLocals>
) => {

  const { user } = res.locals
  const { matches, tournamentID } = req.body

  const tournament = await TournamentModel.findById(tournamentID).select({ creator: 1, managers: 1, name: 1, shuttlecockFee: 1, billingMethod: 1, showParticipantList: 1, payment: 1 }).lean()

  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() || tournament.managers?.map((m) => m.id)?.includes(user.playerID)){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to create event to this tournament' })
    return
  }

  const operations = matches.map((update) => ({
    updateOne: {
      filter: { _id: update.id }, // Filter for the specific document
      update: { $set: { date: update.date } } // Update with the specific value
    }
  }))

  await MatchModel.bulkWrite(operations)

  res.send('success')
  return
}

export default scheduleMatches