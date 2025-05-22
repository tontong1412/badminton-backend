import { Request, Response } from 'express'
import { Event, ResponseLocals } from '../../type'
import TeamModel from '../../schema/team'
import EventModel from '../../schema/event'
import { Types } from 'mongoose'

const getMyEvents =  async(
  req: Request,
  res: Response) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { tournamentID } = req.query

  const teams = await TeamModel.find({ players: user.playerID }).select('_id')

  const teamIDs = teams.map((t) => t._id)

  const myEvents = await EventModel.aggregate([
    {
      $match: {
        'tournament.id': new Types.ObjectId(tournamentID as string),
        $or: [
          { 'teams.id': { $in: teamIDs } },
          { 'teams.contactPerson.id': user.playerID }
        ]
      }
    },
    {
      $addFields: {
        teams: {
          $filter: {
            input: '$teams',
            as: 'team',
            cond: {
              $or: [
                { $in: ['$$team.id', teamIDs] },
                { $eq: ['$$team.contactPerson.id', user.playerID] }
              ]
            }
          }
        }
      }
    }
  ])

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  const myEventsJson: Event[] = myEvents.map((e) => ({ ...e, id: e._id }) as Event)

  res.send(myEventsJson)
  return
}

export default getMyEvents