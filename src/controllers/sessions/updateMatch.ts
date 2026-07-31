import { Request, Response } from 'express'
import { Types } from 'mongoose'
import SessionMatchModel from '../../schema/sessionMatch'
import { SessionMatchStatus } from '../../type'

interface UpdateMatchTeam {
  playerIDs: string[];
}

interface UpdateMatchBody {
  court?: string;
  teams?: [UpdateMatchTeam, UpdateMatchTeam];
  status?: SessionMatchStatus;
  winnerTeamIndex?: 0 | 1 | null;
}

const updateMatch = async(
  req: Request<{ id: string; matchID: string }, unknown, UpdateMatchBody>,
  res: Response,
): Promise<void> => {
  const match = await SessionMatchModel.findOne({ _id: req.params.matchID, sessionID: req.params.id })
  if (!match) {
    res.status(404).json({ message: 'Match not found' })
    return
  }

  if (req.body.court !== undefined) {
    match.court = req.body.court.trim()
  }

  if (req.body.teams !== undefined) {
    if (!Array.isArray(req.body.teams) || req.body.teams.length !== 2) {
      res.status(400).json({ message: 'Exactly 2 teams are required' })
      return
    }
    match.teams = req.body.teams.map((team) => ({
      playerIDs: (team.playerIDs ?? []).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)),
      playerSnapshots: [],
    })) as unknown as typeof match.teams
  }

  if (req.body.status !== undefined) {
    const previousStatus = match.status
    match.status = req.body.status

    if (req.body.status === SessionMatchStatus.Playing && !match.startedAt) {
      match.startedAt = new Date()
    }

    if (req.body.status === SessionMatchStatus.Completed) {
      if (!match.startedAt) {
        match.startedAt = new Date()
      }
      match.endedAt = new Date()
    }

    if (req.body.status !== SessionMatchStatus.Completed && previousStatus === SessionMatchStatus.Completed) {
      match.endedAt = undefined
      match.winnerTeamIndex = undefined
    }
  }

  if (req.body.winnerTeamIndex !== undefined) {
    if (req.body.winnerTeamIndex === null) {
      match.winnerTeamIndex = undefined
    } else {
      match.winnerTeamIndex = req.body.winnerTeamIndex
    }
  }

  await match.save()
  res.json(match)
}

export default updateMatch
