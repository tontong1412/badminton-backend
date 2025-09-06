import { Request, Response } from 'express'
import { ErrorResponse,  EventFormat, Match, MatchStatus, NewMatch, NonSensitivePlayer, ResponseLocals, Team, TournamentMatchStep } from '../../type'
import EventModel from '../../schema/event'
import MatchModel from '../../schema/match'
import { Types } from 'mongoose'

interface CreateMatchesPayload {
  eventID: string;
}

const createMatches =  async(
  req: Request<unknown, unknown, CreateMatchesPayload, unknown>,
  res: Response<Match[] | ErrorResponse, ResponseLocals>) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { eventID } = req.body

  const event = await EventModel.findById(eventID)
  if(!event || !event?.tournament.managers?.map((m) => m.id?.toString()).includes(user.playerID.toString())){
    res.status(401).send({ message: 'Unauthorized' })
    return
  }

  await MatchModel.deleteMany({ 'event.id': eventID })

  const matchToCreate: NewMatch[] = []
  let maxRoundOnFirstStage = 0

  event.draw?.group?.forEach((groupObj, groupIndex) => {
    const tempGroupObj: (Team | null)[] = [...groupObj]

    if(tempGroupObj.length % 2 === 1) { // add dummy player
      tempGroupObj.unshift(null)
    }
    const totalRound = tempGroupObj.length - 1
    if(maxRoundOnFirstStage < totalRound){
      maxRoundOnFirstStage = totalRound
    }

    const standTeam = tempGroupObj[0]
    const roundRobinTeam = tempGroupObj.slice(1, tempGroupObj.length)

    for(let round = 0;round < totalRound;round++){
      if(standTeam){
        matchToCreate.push({
          event: {
            id: event.id as Types.ObjectId,
            name: event.name,
            fee: event.fee,
          },
          step: TournamentMatchStep.Group,
          round,
          groupOrder: groupIndex,
          teamA: {
            id: roundRobinTeam[roundRobinTeam.length - 1]?.id as Types.ObjectId,
            players: roundRobinTeam[roundRobinTeam.length - 1]?.players as NonSensitivePlayer[],
            serving: 0,
            receiving: 0,
            isServing: true
          },
          teamB: {
            id: standTeam.id,
            players: standTeam?.players,
            serving: 0,
            receiving: 0,
            isServing: true
          },
          shuttlecockUsed: 0,
          level: event.level,
          status: MatchStatus.Waiting,
          scoreLabel: [],
        })
      }
      for (let j = 0; j < (roundRobinTeam.length - 1) / 2; j++) {
        matchToCreate.push({
          event: {
            id: event.id as Types.ObjectId,
            name: event.name,
            fee: event.fee,
          },
          step: TournamentMatchStep.Group,
          round,
          groupOrder: groupIndex,
          teamA: {
            id: roundRobinTeam[roundRobinTeam.length - 2 - j]?.id as Types.ObjectId,
            players: roundRobinTeam[roundRobinTeam.length - 2 - j]?.players as NonSensitivePlayer[],
            serving: 0,
            receiving: 0,
            isServing: true
          },
          teamB: {
            id: roundRobinTeam[j]?.id as Types.ObjectId,
            players: roundRobinTeam[j]?.players as NonSensitivePlayer[],
            serving: 0,
            receiving: 0,
            isServing: true
          },
          shuttlecockUsed: 0,
          level: event.level,
          status: MatchStatus.Waiting,
          scoreLabel: [],
        })
      }

      const lastRoundRobinTeam: Team|null = roundRobinTeam.pop() ?? null
      roundRobinTeam.unshift(lastRoundRobinTeam)
    }
  })

  if(!event.draw.ko || event.draw.ko?.length < 2){
    console.error('not enough team')
    return
  }
  const totalRound = Math.log2(event.draw.ko?.length)
  const tempKOTeam:(Team | null | string)[] = [...event.draw.ko]

  for (let i = 0; i < totalRound; i++) {
    const knockOutTeam   = [...tempKOTeam]
    tempKOTeam.length = 0
    knockOutTeam.forEach((_team, index, self) => {
      if (index % 2 === 1) {
        matchToCreate.push({
          event: {
            id: event.id as Types.ObjectId,
            name: event.name,
            fee: event.fee,
          },
          step: TournamentMatchStep.Playoff,
          level: event.level,
          teamA: null,
          teamB: null,
          round: Math.pow(2, totalRound - i),
          bracketOrder: (index - 1) / 2,
          skip: self[index] === 'bye' || self[index - 1] === 'bye',
          status: (self[index] === 'bye' || self[index - 1] === 'bye') ? MatchStatus.Finished : MatchStatus.Waiting,
          byePosition: self[index - 1] === 'bye' ? 1 : 0,
          shuttlecockUsed: 0,
          scoreLabel: []
        })
        tempKOTeam.push(null)
      }
    })
  }

  if(event.format === EventFormat.GroupPlayoffConsolation){
    if(!event.draw.consolation || event.draw.consolation?.length < 2){
      console.error('not enough team for consolation')
      return
    }
    const totalRound = Math.log2(event.draw.consolation?.length)
    const tempConsolationTeam:(Team | null | string)[] = [...event.draw.consolation]

    for (let i = 0; i < totalRound; i++) {
      const consolationTeam   = [...tempConsolationTeam]
      tempConsolationTeam.length = 0
      consolationTeam.forEach((_team, index, self) => {
        if (index % 2 === 1) {
          matchToCreate.push({
            event: {
              id: event.id as Types.ObjectId,
              name: event.name,
              fee: event.fee,
            },
            step: TournamentMatchStep.Consolation,
            level: event.level,
            teamA: null,
            teamB: null,
            round: Math.pow(2, totalRound - i),
            bracketOrder: (index - 1) / 2,
            skip: self[index] === 'bye' || self[index - 1] === 'bye',
            status: (self[index] === 'bye' || self[index - 1] === 'bye') ? MatchStatus.Finished : MatchStatus.Waiting,
            byePosition: self[index - 1] === 'bye' ? 1 : 0,
            shuttlecockUsed: 0,
            scoreLabel: []
          })
          tempConsolationTeam.push(null)
        }
      })
    }
  }

  const result = await MatchModel.insertMany(matchToCreate)
  res.send(result as Match[])
  return

}

export default createMatches