import { Request, Response } from 'express'
import { Event, ResponseLocals } from '../../type'
import TeamModel, { TeamDocument } from '../../schema/team'
import EventModel from '../../schema/event'
import { Types } from 'mongoose'

const getMyEvents =  async(
  req: Request,
  res: Response) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { tournamentID } = req.query

  const teams = await TeamModel.find({ players: user.playerID }).select('_id')

  const teamIDs = teams.map((t:TeamDocument) => (t._id as string).toString())

  const myEventsTest = await EventModel.find({
    'tournament.id': new Types.ObjectId(tournamentID as string),
    '$or': [
      { 'teams.id': { $in: teamIDs } },
      { 'teams.contactPerson.id': user.playerID }
    ]
  }).lean()

  const myEventTyped: Event[] = myEventsTest.map((e) => ({ ...e, id: e._id }) as unknown as Event)

  const myEventAggregated = myEventTyped.reduce((events: Event[], currentEvent: Event) : Event[] => {
    const filteredTeams = currentEvent.teams.filter(((t) => teamIDs.includes(t.id.toString()) || t.contactPerson.id.toString() === user.playerID.toString()))
    const modifiedEvent: Event = {
      ...currentEvent,
      teams: filteredTeams
    }
    events.push(modifiedEvent)
    return events
  }, [])

  res.send(myEventAggregated)
  return
}

export default getMyEvents