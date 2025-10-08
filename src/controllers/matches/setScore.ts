import { Request, Response } from 'express'
import { ErrorResponse, MatchStatus, ResponseLocals, TournamentMatch, TournamentMatchStep } from '../../type'
import MatchModel from '../../schema/match'

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
  const { matchID, score, status } = req.body

  let scoreSetA = 0
  let scoreSetB = 0
  let scoreDiffA = 0
  let scoreDiffB = 0

  score.forEach((set) => {
    const [scoreA, scoreB] = set.split('-')
    if (Number(scoreA) > Number(scoreB)) scoreSetA++
    if (Number(scoreB) > Number(scoreA)) scoreSetB++
    scoreDiffA = scoreDiffA + Number(scoreA) - Number(scoreB)
    scoreDiffB = scoreDiffB + Number(scoreB) - Number(scoreA)
  })

  const currentMatch = await MatchModel.findByIdAndUpdate(
    matchID,
    {
      'teamA.scoreSet': scoreSetA,
      'teamB.scoreSet': scoreSetB,
      'teamA.scoreDiff': scoreDiffA,
      'teamB.scoreDiff': scoreDiffB,
      status,
      scoreLabel: score
    },
    { new:true }
  )

  if(!currentMatch){
    res.status(404).send({ message: 'Match not found' })
    return
  }

  if(status === MatchStatus.Finished
    && currentMatch.step !== TournamentMatchStep.Group
    && currentMatch.round
    && currentMatch.round > 2 // not final round
    && (currentMatch.bracketOrder !== undefined)
  ){
    if (scoreSetA === scoreSetB) {
      res.status(400).send({ message:'should have winner for knock out round' })
      return
    }
    const winTeam = scoreSetA > scoreSetB ? 'teamA' : 'teamB'
    const nextMatchTeam = currentMatch.bracketOrder % 2 === 0 ? 'teamA' : 'teamB'
    await MatchModel.findOneAndUpdate(
      {
        'event.id': currentMatch.event.id,
        round: currentMatch.round / 2,
        step: currentMatch.step,
        bracketOrder: Math.floor(currentMatch.bracketOrder / 2)
      },
      {
        [`${nextMatchTeam}`]: currentMatch[winTeam]
      }
    )
  }
  res.send(currentMatch.toJSON() as TournamentMatch)
  return
}
export default setScore