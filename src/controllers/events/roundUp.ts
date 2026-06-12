import { Request, Response } from 'express'
import { ErrorResponse, EventStatus, Match, MatchStatus, ResponseLocals, Team, TournamentMatch, TournamentMatchStep } from '../../type'
import MatchModel from '../../schema/match'
import EventModel from '../../schema/event'

interface RoundUpPayload {
  eventID: string;
  bracketOrder?: (Team | string)[];
  consolationBracketOrder?: (Team | string)[];
}

const toMatchTeam = (team: Team | string | null | undefined) => {
  if(!team || typeof team === 'string'){
    return null
  }

  return {
    ...team,
    serving: 0,
    receiving: 0,
    isServing: true,
    scoreSet: 0,
    score: 0,
    scoreDiff: 0
  }
}

const roundUpStep = async(eventID: string, bracketOrder: (Team | string)[], step: TournamentMatchStep) => {
  for (let i = 0; i < bracketOrder.length; i++) {
    const teamOrder = i % 2 === 0 ? 'teamA' : 'teamB'
    const currentMatch = await MatchModel.findOneAndUpdate(
      {
        'event.id': eventID,
        step,
        round: bracketOrder.length,
        bracketOrder: Math.floor(i / 2)
      },
      {
        [`${teamOrder}`]: toMatchTeam(bracketOrder[i])
      },
      { new: true }
    )

    if(!currentMatch){
      continue
    }

    if (currentMatch.status === MatchStatus.Finished
      && currentMatch.event.id
      && currentMatch.round
      && currentMatch.round > 2
      && (currentMatch.step === TournamentMatchStep.Playoff
        || currentMatch.step === TournamentMatchStep.Consolation
      )) {
      if(currentMatch.bracketOrder === undefined){
        throw new Error('Match detail missing')
      }

      const winTeam = currentMatch.byePosition === 0 ? 'teamA' : 'teamB'
      const nextMatchTeam = currentMatch.bracketOrder % 2 === 0 ? 'teamA' : 'teamB'

      await MatchModel.findOneAndUpdate(
        {
          'event.id': currentMatch.event.id,
          round: currentMatch.round / 2,
          step: currentMatch.step,
          bracketOrder: Math.floor(currentMatch.bracketOrder / 2)
        },
        {
          [`${nextMatchTeam}`]: toMatchTeam(currentMatch[winTeam])
        }
      )
    }
  }
}

const roundUp = async(
  req: Request<unknown, unknown, RoundUpPayload, unknown>,
  res: Response<Match[] | ErrorResponse, ResponseLocals>) => {
  const { eventID, bracketOrder, consolationBracketOrder } = req.body

  if((!bracketOrder || bracketOrder.length < 1) && (!consolationBracketOrder || consolationBracketOrder.length < 1)){
    res.status(400).send({ message: 'bracketOrder or consolationBracketOrder is required' })
    return
  }

  try {
    if(bracketOrder && bracketOrder.length > 0){
      await roundUpStep(eventID, bracketOrder, TournamentMatchStep.Playoff)
    }

    if(consolationBracketOrder && consolationBracketOrder.length > 0){
      await roundUpStep(eventID, consolationBracketOrder, TournamentMatchStep.Consolation)
    }
  } catch (error) {
    console.error('Error: Failed to update match')
    throw error
  }




  try {
    await EventModel.findByIdAndUpdate(eventID, { status: EventStatus.Playoff })
  } catch (error) {
    console.log('Error: Failed to update event')
    throw error
  }

  try {
    const response = await MatchModel.find({
      'event.id': eventID,
      step: {
        $in: [TournamentMatchStep.Playoff, TournamentMatchStep.Consolation]
      }
    })
    res.status(200).send(response.map((m) => m.toJSON() as TournamentMatch))
    return
  } catch (error) {
    console.error('Error: Failed to get match for response')
    throw error
  }



}
export default roundUp