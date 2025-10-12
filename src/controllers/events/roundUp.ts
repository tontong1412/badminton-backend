import { Request, Response } from 'express'
import { ErrorResponse, EventStatus, EventTeam, Match, MatchStatus, ResponseLocals, TournamentMatch, TournamentMatchStep } from '../../type'
import MatchModel from '../../schema/match'
import EventModel from '../../schema/event'

interface RoundUpPayload {
  eventID: string;
  bracketOrder: EventTeam[]
}

const roundUp = async(
  req: Request<unknown, unknown, RoundUpPayload, unknown>,
  res: Response<Match[] | ErrorResponse, ResponseLocals>) => {
  const { eventID, bracketOrder  } = req.body
  try {
    for (let i = 0; i < bracketOrder.length; i++) {
      const teamOrder = i % 2 === 0 ? 'teamA' : 'teamB'
      const currentMatch = await MatchModel.findOneAndUpdate(
        {
          'event.id': eventID,
          step: TournamentMatchStep.Playoff,
          round: bracketOrder.length,
          bracketOrder: Math.floor(i / 2)
        },
        {
          [`${teamOrder}`]: typeof bracketOrder[i] === 'string' ? null : {
            ...bracketOrder[i], serving: 0,
            receiving: 0,
            isServing: true,
            scoreSet: 0,
            score: 0,
            scoreDiff: 0 }
        },
        { new: true }
      )

      if(!currentMatch){
        continue
      }

      if (currentMatch.status === MatchStatus.Finished
        && currentMatch.event.id
        && currentMatch.round
        && currentMatch.round > 2 // not final round
        && (currentMatch.step === TournamentMatchStep.Playoff
          || currentMatch.step === TournamentMatchStep.Consolation
          // || currentMatch.step === EVENT.FORMAT.SINGLE_ELIMINATION
        )) {
        if(currentMatch.bracketOrder === undefined){
          res.status(400).send({ message: 'Match detail missing' })
          return
        }
        const winTeam = currentMatch.byePosition === 0 ? 'teamA' : 'teamB'
        const nextMatchTeam = currentMatch.bracketOrder % 2 === 0 ? 'teamA' : 'teamB'

        try {
          await MatchModel.findOneAndUpdate(
            {
              'event.id': currentMatch.event.id,
              round: currentMatch.round / 2,
              step: currentMatch.step,
              bracketOrder: Math.floor(currentMatch.bracketOrder / 2)
            },
            {
              [`${nextMatchTeam}`]: typeof currentMatch[winTeam] === 'string' ? null : {
                ...currentMatch[winTeam],
                serving: 0,
                receiving: 0,
                isServing: true,
                scoreSet: 0,
                score: 0,
                scoreDiff: 0 }
            }
          )
        } catch (error) {
          console.error('Error: Failed to update next match')
          throw error
        }

      }
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
      eventID,
      step: TournamentMatchStep.Playoff
    })
    res.status(200).send(response.map((m) => m.toJSON() as TournamentMatch))
    return
  } catch (error) {
    console.error('Error: Failed to get match for response')
    throw error
  }



}
export default roundUp