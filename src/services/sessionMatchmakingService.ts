import { Types } from 'mongoose'
import SessionMatchModel from '../schema/sessionMatch'
import SessionRegistrationModel from '../schema/sessionRegistration'
import {
  SessionHeadToHeadCount,
  SessionMatchStatus,
  SessionPlayerStats,
  SessionRegistrationPlayerSnapshot,
  SessionRegistrationStatus,
  SessionStatsResponse,
} from '../type'

type HttpError = Error & { status?: number }

type InternalPlayerStats = {
  playerID: Types.ObjectId;
  player?: SessionRegistrationPlayerSnapshot;
  registeredAt: Date;
  gamesPlayed: number;
  wins: number;
  losses: number;
  waitingRounds: number;
  playTimeMs: number;
  totalWaitingTimeMs: number;
  currentWaitTimeMs: number;
  waitSinceLastMatchMs?: number;
  currentlyPlaying: boolean;
  lastMatchStartedAt?: Date;
  lastMatchEndedAt?: Date;
  teammateCounts: Map<string, number>;
  opponentCounts: Map<string, number>;
}

type SessionStatsBuildResult = {
  stats: SessionStatsResponse;
  indexByPlayerID: Map<string, InternalPlayerStats>;
}

type MatchParticipant = {
  playerID: Types.ObjectId;
  level: number;
  waitTimeMs: number;
  playTimeMs: number;
  gamesPlayed: number;
  snapshot?: SessionRegistrationPlayerSnapshot;
}

const createHttpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError
  error.status = status
  return error
}

const toObjectId = (value: string, label: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) {
    throw createHttpError(400, `Invalid ${label}`)
  }

  return new Types.ObjectId(value)
}

const toDate = (value: unknown): Date | undefined => {
  if (!(value instanceof Date)) {
    return undefined
  }

  return Number.isNaN(value.getTime()) ? undefined : value
}

const incrementPairCount = (target: Map<string, number>, playerID: string, by = 1): void => {
  target.set(playerID, (target.get(playerID) ?? 0) + by)
}

const mapToSortedCounts = (counts: Map<string, number>): SessionHeadToHeadCount[] => {
  return [...counts.entries()]
    .map(([playerID, count]) => ({ playerID: new Types.ObjectId(playerID), count }))
    .sort((a, b) => b.count - a.count)
}

const normalizeDurationMs = (start?: Date, end?: Date): number => {
  if (!start || !end) return 0
  const duration = end.getTime() - start.getTime()
  return duration > 0 ? duration : 0
}

type PairingPlan = {
  team1: [MatchParticipant, MatchParticipant];
  team2: [MatchParticipant, MatchParticipant];
  score: number;
}

const MAX_MATCH_SKILL_SPREAD = 3

const getSkillSpread = (participants: MatchParticipant[]): number => {
  const levels = participants.map((participant) => participant.level)
  return Math.max(...levels) - Math.min(...levels)
}

const buildBestPairingPlan = (
  p1: MatchParticipant,
  p2: MatchParticipant,
  p3: MatchParticipant,
  p4: MatchParticipant,
  indexByPlayerID: Map<string, InternalPlayerStats>,
): PairingPlan | null => {
  const selectedPlayers = [p1, p2, p3, p4]
  const skillSpread = getSkillSpread(selectedPlayers)
  if (skillSpread > MAX_MATCH_SKILL_SPREAD) {
    return null
  }

  const candidates: Array<[[MatchParticipant, MatchParticipant], [MatchParticipant, MatchParticipant]]> = [
    [[p1, p2], [p3, p4]],
    [[p1, p3], [p2, p4]],
    [[p1, p4], [p2, p3]],
  ]

  let bestPlan: PairingPlan | null = null

  for (const [team1, team2] of candidates) {
    const teamBalance = Math.abs((team1[0].level + team1[1].level) - (team2[0].level + team2[1].level))
    const playTimeSpreadMinutes = (
      Math.max(p1.playTimeMs, p2.playTimeMs, p3.playTimeMs, p4.playTimeMs)
      - Math.min(p1.playTimeMs, p2.playTimeMs, p3.playTimeMs, p4.playTimeMs)
    ) / 60000

    const t1a = indexByPlayerID.get(team1[0].playerID.toString())
    const t1b = indexByPlayerID.get(team1[1].playerID.toString())
    const t2a = indexByPlayerID.get(team2[0].playerID.toString())

    const teammatePenalty = (t1a?.teammateCounts.get(team1[1].playerID.toString()) ?? 0)
      + (t2a?.teammateCounts.get(team2[1].playerID.toString()) ?? 0)

    const opponentPenalty =
      (t1a?.opponentCounts.get(team2[0].playerID.toString()) ?? 0)
      + (t1a?.opponentCounts.get(team2[1].playerID.toString()) ?? 0)
      + (t1b?.opponentCounts.get(team2[0].playerID.toString()) ?? 0)
      + (t1b?.opponentCounts.get(team2[1].playerID.toString()) ?? 0)

    // Weighted score priorities:
    // 1) Fewer repeated teammates
    // 2) Fewer repeated opponents
    // 3) Similar skill (within allowed spread)
    // 4) Balanced play time
    const score =
      teammatePenalty * 120
      + opponentPenalty * 90
      + skillSpread * 10
      + teamBalance * 4
      + playTimeSpreadMinutes * 0.2

    if (!bestPlan || score < bestPlan.score) {
      bestPlan = {
        team1: [team1[0], team1[1]],
        team2: [team2[0], team2[1]],
        score,
      }
    }
  }

  return bestPlan
}

const buildStats = async(sessionID: string): Promise<SessionStatsBuildResult> => {
  const sessionObjectID = toObjectId(sessionID, 'session ID')

  const [approvedRegistrations, matches] = await Promise.all([
    SessionRegistrationModel.find({
      sessionID: sessionObjectID,
      registrationStatus: SessionRegistrationStatus.Approved,
    })
      .select('playerID player registeredAt')
      .sort({ registeredAt: 1 }),
    SessionMatchModel.find({ sessionID: sessionObjectID }).sort({ createdAt: 1 }),
  ])

  const indexByPlayerID = new Map<string, InternalPlayerStats>()

  for (const registration of approvedRegistrations) {
    const playerID = registration.playerID
    indexByPlayerID.set(playerID.toString(), {
      playerID,
      player: registration.player,
      registeredAt: registration.registeredAt,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      waitingRounds: 0,
      playTimeMs: 0,
      totalWaitingTimeMs: 0,
      currentWaitTimeMs: 0,
      currentlyPlaying: false,
      teammateCounts: new Map<string, number>(),
      opponentCounts: new Map<string, number>(),
    })
  }

  const completedMatches = matches.filter((match) => match.status === SessionMatchStatus.Completed)

  for (const match of matches) {
    if (match.status === SessionMatchStatus.Playing) {
      for (const team of match.teams) {
        for (const playerID of team.playerIDs) {
          const stats = indexByPlayerID.get(playerID.toString())
          if (stats) {
            stats.currentlyPlaying = true
          }
        }
      }
    }
  }

  for (const match of completedMatches) {
    const team1IDs = match.teams[0]?.playerIDs ?? []
    const team2IDs = match.teams[1]?.playerIDs ?? []
    const playingSet = new Set<string>([...team1IDs, ...team2IDs].map((playerID) => playerID.toString()))
    const startedAt = toDate(match.startedAt) ?? toDate(match.createdAt)
    const endedAt = toDate(match.endedAt) ?? toDate((match as unknown as { updatedAt?: Date }).updatedAt) ?? startedAt
    const durationMs = normalizeDurationMs(startedAt, endedAt)

    for (const stats of indexByPlayerID.values()) {
      if (!playingSet.has(stats.playerID.toString())) {
        stats.waitingRounds += 1
      }
    }

    const applyForParticipant = (participantID: Types.ObjectId, isWinner: boolean) => {
      const stats = indexByPlayerID.get(participantID.toString())
      if (!stats) return

      stats.gamesPlayed += 1
      stats.playTimeMs += durationMs
      if (isWinner) {
        stats.wins += 1
      } else if (match.winnerTeamIndex !== undefined) {
        stats.losses += 1
      }

      if (startedAt && stats.lastMatchEndedAt) {
        const waitGap = startedAt.getTime() - stats.lastMatchEndedAt.getTime()
        if (waitGap > 0) {
          stats.totalWaitingTimeMs += waitGap
        }
      }

      if (startedAt) {
        stats.lastMatchStartedAt = startedAt
      }
      if (endedAt) {
        stats.lastMatchEndedAt = endedAt
      }
    }

    for (const playerID of team1IDs) {
      applyForParticipant(playerID, match.winnerTeamIndex === 0)
    }
    for (const playerID of team2IDs) {
      applyForParticipant(playerID, match.winnerTeamIndex === 1)
    }

    const setPairCounts = (a: Types.ObjectId, b: Types.ObjectId) => {
      const aStats = indexByPlayerID.get(a.toString())
      const bStats = indexByPlayerID.get(b.toString())
      if (aStats && bStats) {
        incrementPairCount(aStats.teammateCounts, b.toString())
        incrementPairCount(bStats.teammateCounts, a.toString())
      }
    }

    const setOpponentCounts = (a: Types.ObjectId, b: Types.ObjectId) => {
      const aStats = indexByPlayerID.get(a.toString())
      const bStats = indexByPlayerID.get(b.toString())
      if (aStats && bStats) {
        incrementPairCount(aStats.opponentCounts, b.toString())
        incrementPairCount(bStats.opponentCounts, a.toString())
      }
    }

    if (team1IDs.length >= 2) {
      setPairCounts(team1IDs[0], team1IDs[1])
    }
    if (team2IDs.length >= 2) {
      setPairCounts(team2IDs[0], team2IDs[1])
    }

    for (const t1 of team1IDs) {
      for (const t2 of team2IDs) {
        setOpponentCounts(t1, t2)
      }
    }
  }

  const now = Date.now()
  for (const stats of indexByPlayerID.values()) {
    if (stats.currentlyPlaying) {
      stats.currentWaitTimeMs = 0
      stats.waitSinceLastMatchMs = 0
      continue
    }

    if (stats.lastMatchEndedAt) {
      const waitMs = now - stats.lastMatchEndedAt.getTime()
      const normalizedWaitMs = waitMs > 0 ? waitMs : 0
      stats.currentWaitTimeMs = normalizedWaitMs
      stats.waitSinceLastMatchMs = normalizedWaitMs
      continue
    }

    const waitSinceRegistration = now - stats.registeredAt.getTime()
    stats.currentWaitTimeMs = waitSinceRegistration > 0 ? waitSinceRegistration : 0
    stats.waitSinceLastMatchMs = undefined
  }

  const players: SessionPlayerStats[] = [...indexByPlayerID.values()].map((stats) => ({
    playerID: stats.playerID,
    player: stats.player,
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    waitingRounds: stats.waitingRounds,
    playTimeMs: stats.playTimeMs,
    totalWaitingTimeMs: stats.totalWaitingTimeMs,
    currentWaitTimeMs: stats.currentWaitTimeMs,
    waitSinceLastMatchMs: stats.waitSinceLastMatchMs,
    currentlyPlaying: stats.currentlyPlaying,
    lastMatchStartedAt: stats.lastMatchStartedAt,
    lastMatchEndedAt: stats.lastMatchEndedAt,
    teammateHistory: mapToSortedCounts(stats.teammateCounts),
    opponentHistory: mapToSortedCounts(stats.opponentCounts),
  }))

  return {
    stats: {
      sessionID: sessionObjectID,
      generatedAt: new Date(),
      players,
    },
    indexByPlayerID,
  }
}

const autoGenerateMatches = async(sessionID: string) => {
  const sessionObjectID = toObjectId(sessionID, 'session ID')
  const { stats, indexByPlayerID } = await buildStats(sessionID)

  const pendingMatches = await SessionMatchModel.find({
    sessionID: sessionObjectID,
    status: SessionMatchStatus.Pending,
  }).select('teams.playerIDs')

  const pendingPlayerIDs = new Set<string>()
  for (const pendingMatch of pendingMatches) {
    for (const team of pendingMatch.teams) {
      for (const playerID of team.playerIDs) {
        pendingPlayerIDs.add(playerID.toString())
      }
    }
  }

  const approvedParticipants = stats.players
    .filter((player) => !player.currentlyPlaying && !pendingPlayerIDs.has(player.playerID.toString()))
    .map((player): MatchParticipant => ({
      playerID: player.playerID,
      level: player.player?.level ?? 0,
      waitTimeMs: player.currentWaitTimeMs,
      playTimeMs: player.playTimeMs,
      gamesPlayed: player.gamesPlayed,
      snapshot: player.player,
    }))

  if (approvedParticipants.length < 4) {
    throw createHttpError(400, 'At least 4 available approved participants are required to auto-generate matches')
  }

  approvedParticipants.sort((a, b) => {
    if (b.waitTimeMs !== a.waitTimeMs) return b.waitTimeMs - a.waitTimeMs
    if (a.playTimeMs !== b.playTimeMs) return a.playTimeMs - b.playTimeMs
    if (a.gamesPlayed !== b.gamesPlayed) return a.gamesPlayed - b.gamesPlayed
    if (a.level !== b.level) return a.level - b.level
    return a.playerID.toString().localeCompare(b.playerID.toString())
  })

  if (approvedParticipants.length < 4) {
    throw createHttpError(400, 'Not enough participants to fill a court (need at least 4)')
  }

  const searchWindow = approvedParticipants.slice(0, Math.min(approvedParticipants.length, 12))

  let bestSelection: {
    ids: string[];
    plan: PairingPlan;
  } | null = null

  for (let i = 0; i < searchWindow.length; i += 1) {
    for (let j = i + 1; j < searchWindow.length; j += 1) {
      for (let k = j + 1; k < searchWindow.length; k += 1) {
        for (let l = k + 1; l < searchWindow.length; l += 1) {
          const p1 = searchWindow[i]
          const p2 = searchWindow[j]
          const p3 = searchWindow[k]
          const p4 = searchWindow[l]

          const plan = buildBestPairingPlan(p1, p2, p3, p4, indexByPlayerID)
          if (!plan) {
            continue
          }

          const ids = [p1.playerID, p2.playerID, p3.playerID, p4.playerID].map((id) => id.toString())

          if (!bestSelection || plan.score < bestSelection.plan.score) {
            bestSelection = { ids, plan }
          }
        }
      }
    }
  }

  if (!bestSelection) {
    throw createHttpError(400, 'Unable to build a valid match with the current participants and level constraints')
  }

  const [team1a, team1b] = bestSelection.plan.team1
  const [team2a, team2b] = bestSelection.plan.team2

  const existingMatchCount = await SessionMatchModel.countDocuments({ sessionID: sessionObjectID })

  const createdMatch = await new SessionMatchModel({
    sessionID: sessionObjectID,
    court: `Court ${existingMatchCount + 1}`,
    teams: [
      {
        playerIDs: [team1a.playerID, team1b.playerID],
        playerSnapshots: [team1a.snapshot, team1b.snapshot].filter((item): item is SessionRegistrationPlayerSnapshot => Boolean(item)),
      },
      {
        playerIDs: [team2a.playerID, team2b.playerID],
        playerSnapshots: [team2a.snapshot, team2b.snapshot].filter((item): item is SessionRegistrationPlayerSnapshot => Boolean(item)),
      },
    ],
    status: SessionMatchStatus.Pending,
  }).save()

  return [createdMatch]
}

const getSessionStats = async(sessionID: string): Promise<SessionStatsResponse> => {
  const { stats } = await buildStats(sessionID)
  return stats
}

export default {
  autoGenerateMatches,
  getSessionStats,
}
