import { Request, Response } from 'express'
import { Types } from 'mongoose'
import SessionModel from '../../schema/session'
import SessionMatchModel from '../../schema/sessionMatch'
import { SessionMatchStatus } from '../../type'

interface CreateMatchTeam {
  playerIDs: string[];
}

interface CreateMatchBody {
  court: string;
  teams: [CreateMatchTeam, CreateMatchTeam];
}

const createMatch = async(req: Request<{ id: string }, unknown, CreateMatchBody>, res: Response): Promise<void> => {
  const session = await SessionModel.findById(req.params.id)
  if (!session) {
    res.status(404).json({ message: 'Session not found' })
    return
  }

  const { court, teams } = req.body
  if (!court?.trim()) {
    res.status(400).json({ message: 'Court name is required' })
    return
  }
  if (!Array.isArray(teams) || teams.length !== 2) {
    res.status(400).json({ message: 'Exactly 2 teams are required' })
    return
  }

  const match = new SessionMatchModel({
    sessionID: req.params.id,
    court: court.trim(),
    teams: teams.map((team) => ({
      playerIDs: (team.playerIDs ?? []).filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id)),
      playerSnapshots: [],
    })),
    status: SessionMatchStatus.Pending,
  })

  await match.save()
  res.status(201).json(match)
}

export default createMatch
