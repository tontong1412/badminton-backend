import { Request, Response } from 'express'
import { ErrorResponse, NonSensitivePlayer, TournamentMatch  } from '../../type'
import MatchModel from '../../schema/match'
import PlayerModel from '../../schema/player'
import EventModel from '../../schema/event'
import { FilterQuery } from 'mongoose'
import { MatchDocument } from '../../schema/match'

interface PlayerHistoryEvent {
  event: TournamentMatch['event'] & {
    tournamentName?: {
      th?: string
      en?: string
    }
  }
  matches: TournamentMatch[]
}

interface PlayerHistoryResponse {
  info: NonSensitivePlayer
  history: PlayerHistoryEvent[]
}



const getHistory = async(
  req: Request<{ id: string }>,
  res: Response<PlayerHistoryResponse | ErrorResponse>) => {
  console.log('Received request to get player history with id:', req.params.id)
  try{
    const { id } = req.params
    if (!id) {
      res.status(400).json({ message: 'Missing player id' })
      return
    }

    const playerInfo = await PlayerModel.findById(id)
      .select({ id: 1, officialName: 1, level: 1, gender: 1, displayName: 1, club: 1, photo: 1 })

    if (!playerInfo) {
      res.status(404).json({ message: 'Player not found' })
      return
    }

    const { th, en } = playerInfo.officialName ?? {}
    const nameConditions: FilterQuery<MatchDocument>[] = []
    if (th) {
      nameConditions.push({ 'teamA.players.officialName.th': th })
      nameConditions.push({ 'teamB.players.officialName.th': th })
    }
    if (en) {
      nameConditions.push({ 'teamA.players.officialName.en': en })
      nameConditions.push({ 'teamB.players.officialName.en': en })
    }

    const matchFilter: FilterQuery<MatchDocument> =
      nameConditions.length > 0 ? { $or: nameConditions } : {}

    const latestEventIDs = await MatchModel.aggregate<{ _id: MatchDocument['event']['id'] }>([
      { $match: matchFilter },
      { $sort: { date: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$event.id',
          latestMatchDate: { $max: '$date' },
        },
      },
      { $sort: { latestMatchDate: -1 } },
      { $limit: 5 },
    ])

    const eventIDs = latestEventIDs.map((event) => event._id).filter(Boolean)

    const matchesPlayed = eventIDs.length > 0
      ? await MatchModel.find({
        ...matchFilter,
        'event.id': { $in: eventIDs },
      }).sort({ date: -1, createdAt: -1 })
      : []

    const events = eventIDs.length > 0
      ? await EventModel.find({ _id: { $in: eventIDs } })
        .select({ id: 1, tournament: 1 })
      : []

    const tournamentNameByEventID = new Map<string, { th?: string; en?: string }>()
    for (const event of events) {
      const eventJSON = event.toJSON() as {
        id: string
        tournament?: {
          name?: {
            th?: string
            en?: string
          }
        }
      }
      tournamentNameByEventID.set(String(eventJSON.id), eventJSON.tournament?.name ?? {})
    }

    const normalizedMatches = matchesPlayed.map((match) => match.toJSON() as TournamentMatch)
    const groupedHistoryMap = new Map<string, PlayerHistoryEvent>()

    for (const match of normalizedMatches) {
      const eventKey = String(match.event.id)
      const tournamentName = tournamentNameByEventID.get(eventKey)
      if (tournamentName?.th === 'เทรนกรรมการ') continue
      const existingGroup = groupedHistoryMap.get(eventKey)
      if (existingGroup) {
        existingGroup.matches.push(match)
      } else {
        groupedHistoryMap.set(eventKey, {
          event: {
            ...match.event,
            tournamentName: tournamentNameByEventID.get(eventKey),
          },
          matches: [match],
        })
      }
    }

    const history = eventIDs
      .map((eventID) => groupedHistoryMap.get(String(eventID)))
      .filter((group): group is PlayerHistoryEvent => Boolean(group))

    res.status(200).json({
      info: playerInfo.toJSON() as NonSensitivePlayer,
      history,
    })
    return
  }catch(error: unknown){
    console.error('Error getting player history:', error)
    throw error
  }

}

export default getHistory