import { Request, Response } from 'express'
import { ErrorResponse,
  // Match,
  MatchStatus,
  ResponseLocals,
} from '../../type'
import MatchModel from '../../schema/match'
import TournamentModel from '../../schema/tournament'

interface UpdateManyMatchBody {
  tournamentID: string,
}

const assignMatchNumber =  async(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request<any, unknown, UpdateManyMatchBody, unknown>,
  res: Response<string | ErrorResponse, ResponseLocals>
) => {

  const { user } = res.locals
  const { tournamentID } = req.body

  const tournament = await TournamentModel.findById(tournamentID).select({ creator: 1, managers: 1, name: 1, shuttlecockFee: 1, billingMethod: 1, showParticipantList: 1, payment: 1, events: 1 }).lean()

  if(!tournament){
    res.status(404).json({ message: 'Tournament not found' })
    return
  }

  if(user.playerID.toString() != tournament.creator.id.toString() || tournament.managers?.map((m) => m.id)?.includes(user.playerID)){
    res.status(401).json({ message: 'Unauthorized: You do not have permission to create event to this tournament' })
    return
  }

  const matches = await MatchModel.find({
    'event.id': { $in: tournament.events.map((e) => e.id) },
    status: MatchStatus.Waiting,
  }).sort({
    date: 1,
    groupOrder: 1,
    'event.id': 1,
    bracketOrder:1,
  }).lean()

  const operations = matches.map((update, i) => ({
    updateOne: {
      filter: { _id: update._id }, // Filter for the specific document
      update: { $set: { matchNumber: i + 1 } } // Update with the specific value
    }
  }))

  await MatchModel.bulkWrite(operations)

  res.send('success')
  return
}

export default assignMatchNumber