import { Request, Response } from 'express'
import { ErrorResponse, MatchStatus, ResponseLocals, TournamentMatch, TournamentMatchStep } from '../../type'
import MatchModel from '../../schema/match'
import EventModel from '../../schema/event'
import { broadcastMatchUpdate } from '../../utils/matchUpdates'

interface SetScorePayload {
  matchID: string;
  score: string[];
  status: MatchStatus;
}

const setScore = async(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: Request<any, unknown, SetScorePayload, unknown>,
  res: Response<TournamentMatch | ErrorResponse, ResponseLocals>
) => {
  try {
    const { matchID, score, status } = req.body

    let scoreSetA = 0
    let scoreSetB = 0
    let scoreDiffA = 0
    let scoreDiffB = 0

    score.forEach((set) => {
      const [scoreA, scoreB] = set.split('-')
      if (Number(scoreA) > Number(scoreB)) scoreSetA++
      if (Number(scoreB) > Number(scoreA)) scoreSetB++
      scoreDiffA += Number(scoreA) - Number(scoreB)
      scoreDiffB += Number(scoreB) - Number(scoreA)
    })

    const currentMatch = await MatchModel.findById(matchID)
    if (!currentMatch) {
      res.status(404).send({ message: 'Match not found' })
      return
    }

    if (
      status === MatchStatus.Finished
      && currentMatch.step !== TournamentMatchStep.Group
      && currentMatch.round
      && currentMatch.round > 2
      && scoreSetA === scoreSetB
    ) {
      res.status(400).send({ message: 'should have winner for knock out round' })
      return
    }

    const updatedMatch = await MatchModel.findByIdAndUpdate(
      matchID,
      {
        'teamA.scoreSet': scoreSetA,
        'teamB.scoreSet': scoreSetB,
        'teamA.scoreDiff': scoreDiffA,
        'teamB.scoreDiff': scoreDiffB,
        status,
        scoreLabel: score,
      },
      { new: true }
    )

    if (!updatedMatch) {
      res.status(404).send({ message: 'Match not found' })
      return
    }

    const event = await EventModel.findById(updatedMatch.event.id).select({ tournament: 1 }).lean()
    if (!event) {
      res.status(404).send({ message: 'Event not found' })
      return
    }

    if (
      status === MatchStatus.Finished
      && updatedMatch.step !== TournamentMatchStep.Group
      && updatedMatch.round
      && updatedMatch.round > 2
      && updatedMatch.bracketOrder !== undefined
    ) {
      const winTeam = scoreSetA > scoreSetB ? 'teamA' : 'teamB'
      const nextMatchTeam = updatedMatch.bracketOrder % 2 === 0 ? 'teamA' : 'teamB'
      await MatchModel.findOneAndUpdate(
        {
          'event.id': updatedMatch.event.id,
          round: updatedMatch.round / 2,
          step: updatedMatch.step,
          bracketOrder: Math.floor(updatedMatch.bracketOrder / 2),
        },
        {
          [nextMatchTeam]: updatedMatch[winTeam],
        }
      )
    }

    const updatedMatchId = String(updatedMatch.id)
    broadcastMatchUpdate({
      tournamentID: event.tournament.id.toString(),
      matchID: updatedMatchId,
    })

    res.send(updatedMatch.toJSON() as TournamentMatch)
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: 'Please check if you have entered score in a correct format. For example, 21-15' })
  }
}
export default setScore