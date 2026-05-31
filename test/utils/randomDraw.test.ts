import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { Gender, Team } from '../../src/type'
import randomDraw from '../../src/utils/tournament/randomDraw'

// ── helpers ─────────────────────────────────────────────────────────────────

const makeTeam = (id: string, club?: string): Team => ({
  id: new Types.ObjectId(id),
  players: [{
    id: new Types.ObjectId(),
    officialName: { en: `Player ${id}` },
    level: 1,
    gender: Gender.Male,
    ...(club ? { club } : {}),
  }],
})

/** Returns the club of the first player in a team ('' if none). */
const clubOf = (team: Team | string): string => {
  if (typeof team === 'string') return ''
  return team.players[0].club ?? ''
}

/** True when two adjacent bracket slots share a club (i.e. would play each other in R1). */
const hasClubConflictInR1 = (draw: (Team | string)[]): boolean => {
  for (let i = 0; i < draw.length - 1; i += 2) {
    const a = draw[i]
    const b = draw[i + 1]
    if (typeof a === 'string' || typeof b === 'string') continue // one is 'bye'
    const ca = clubOf(a)
    const cb = clubOf(b)
    if (ca && cb && ca === cb) return true
  }
  return false
}

// Fixed ObjectId strings (24-char hex)
const IDS = Array.from({ length: 20 }, (_, i) =>
  i.toString(16).padStart(24, '0')
)

// ── group draw ───────────────────────────────────────────────────────────────

describe('randomDraw.group – separateClub option', () => {
  it('places all teams into groups', () => {
    const teams = [
      makeTeam(IDS[0], 'Alpha'),
      makeTeam(IDS[1], 'Beta'),
      makeTeam(IDS[2], 'Alpha'),
      makeTeam(IDS[3], 'Beta'),
      makeTeam(IDS[4], 'Gamma'),
      makeTeam(IDS[5], 'Gamma'),
    ]
    const result = randomDraw.group(teams, 3, { separateClub: true })
    const flat = result.flat()
    expect(flat).toHaveLength(teams.length)
    expect(flat.map(t => t.id.toString()).sort()).toEqual(
      teams.map(t => t.id.toString()).sort()
    )
  })

  it('creates the correct number of groups', () => {
    const teams = IDS.slice(0, 8).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.group(teams, 4, { separateClub: true })
    expect(result).toHaveLength(4)
  })

  it('does not place same-club teams in the same group when avoidable', () => {
    // 2 clubs, 4 teams each, 4 groups → each group should have 1 A and 1 B
    const teams = [
      makeTeam(IDS[0], 'A'), makeTeam(IDS[1], 'A'),
      makeTeam(IDS[2], 'A'), makeTeam(IDS[3], 'A'),
      makeTeam(IDS[4], 'B'), makeTeam(IDS[5], 'B'),
      makeTeam(IDS[6], 'B'), makeTeam(IDS[7], 'B'),
    ]
    const result = randomDraw.group(teams, 4, { separateClub: true })
    for (const grp of result) {
      const clubs = grp.map(t => clubOf(t))
      const uniqueClubs = new Set(clubs)
      // No group should have two teams from the same club
      expect(clubs.length).toBe(uniqueClubs.size)
    }
  })

  it('handles teams with no club without throwing', () => {
    const teams = IDS.slice(0, 6).map(id => makeTeam(id))
    expect(() => randomDraw.group(teams, 2, { separateClub: true })).not.toThrow()
  })

  it('behaves the same as before when separateClub is true (default)', () => {
    const teams = IDS.slice(0, 6).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.group(teams, 3)
    expect(result.flat()).toHaveLength(6)
  })
})

// ── bracket draw ─────────────────────────────────────────────────────────────

describe('randomDraw.bracket – separateClub option', () => {
  it('produces a draw with the correct number of slots', () => {
    const teams = IDS.slice(0, 8).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.bracket(teams, { separateClub: true })
    expect(result).toHaveLength(8)
  })

  it('contains all teams plus byes', () => {
    const teams = IDS.slice(0, 6).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.bracket(teams, { separateClub: true })
    const teamSlots = result.filter(s => typeof s !== 'string') as Team[]
    expect(teamSlots).toHaveLength(6)
    expect(teamSlots.map(t => t.id.toString()).sort()).toEqual(
      teams.map(t => t.id.toString()).sort()
    )
  })

  it('avoids same-club R1 matchups when avoidable (2 clubs, equal split)', () => {
    const teams = [
      makeTeam(IDS[0], 'A'), makeTeam(IDS[1], 'A'),
      makeTeam(IDS[2], 'A'), makeTeam(IDS[3], 'A'),
      makeTeam(IDS[4], 'B'), makeTeam(IDS[5], 'B'),
      makeTeam(IDS[6], 'B'), makeTeam(IDS[7], 'B'),
    ]
    const result = randomDraw.bracket(teams, { separateClub: true })
    expect(hasClubConflictInR1(result)).toBe(false)
  })

  it('avoids same-club R1 matchups with multiple clubs (8 teams, 4 clubs)', () => {
    const teams = IDS.slice(0, 8).map((id, i) =>
      makeTeam(id, ['A', 'B', 'C', 'D'][i % 4])
    )
    const result = randomDraw.bracket(teams, { separateClub: true })
    expect(hasClubConflictInR1(result)).toBe(false)
  })

  it('handles teams with no club info without throwing', () => {
    const teams = IDS.slice(0, 8).map(id => makeTeam(id))
    expect(() => randomDraw.bracket(teams, { separateClub: true })).not.toThrow()
  })

  it('works with non-power-of-2 team counts (byes present)', () => {
    const teams = [
      makeTeam(IDS[0], 'A'), makeTeam(IDS[1], 'B'),
      makeTeam(IDS[2], 'A'), makeTeam(IDS[3], 'B'),
      makeTeam(IDS[4], 'C'), makeTeam(IDS[5], 'D'),
    ]
    const result = randomDraw.bracket(teams, { separateClub: true })
    expect(result).toHaveLength(8) // next power of 2
    expect(hasClubConflictInR1(result)).toBe(false)
  })

  it('preserves seeded positions when combined with separateClub', () => {
    const seed1 = makeTeam(IDS[0], 'Alpha')
    const seed2 = makeTeam(IDS[1], 'Beta')
    const rest = IDS.slice(2, 8).map((id, i) =>
      makeTeam(id, i % 2 === 0 ? 'Gamma' : 'Delta')
    )
    const result = randomDraw.bracket([seed1, seed2, ...rest], {
      seed: true,
      seedCount: 2,
      separateClub: true,
    })
    // Seeds go to position 0 and last position by convention
    expect((result[0] as Team).id.toString()).toBe(seed1.id.toString())
    expect((result[result.length - 1] as Team).id.toString()).toBe(seed2.id.toString())
  })

  it('places seeds 3 and 4 into the middle pair in an 8-slot bracket', () => {
    const seeds = IDS.slice(0, 4).map((id, i) => makeTeam(id, `SeedClub${i + 1}`))
    const rest = IDS.slice(4, 8).map((id, i) => makeTeam(id, `RestClub${i + 1}`))

    const result = randomDraw.bracket([...seeds, ...rest], {
      seed: true,
      seedCount: 4,
      separateClub: true,
    })

    expect((result[0] as Team).id.toString()).toBe(seeds[0].id.toString())
    expect((result[7] as Team).id.toString()).toBe(seeds[1].id.toString())

    const middlePairIds = [result[3], result[4]]
      .filter((slot): slot is Team => typeof slot !== 'string')
      .map((team) => team.id.toString())

    expect(middlePairIds).toHaveLength(2)
    expect(middlePairIds.sort()).toEqual([
      seeds[2].id.toString(),
      seeds[3].id.toString(),
    ].sort())
  })

  it('returns empty draw when seedCount is not a power of 2', () => {
    const teams = IDS.slice(0, 8).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.bracket(teams, {
      seed: true,
      seedCount: 3,
      separateClub: true,
    })

    expect(result).toEqual([])
  })

  it('keeps all teams and no byes when seedCount equals bracket size', () => {
    const teams = IDS.slice(0, 8).map((id, i) =>
      makeTeam(id, ['A', 'B', 'C', 'D'][i % 4])
    )

    const result = randomDraw.bracket(teams, {
      seed: true,
      seedCount: 8,
      separateClub: true,
    })

    expect(result).toHaveLength(8)
    expect(result.filter((slot) => slot === 'bye')).toHaveLength(0)

    const drawnTeamIds = result
      .filter((slot): slot is Team => typeof slot !== 'string')
      .map((team) => team.id.toString())
      .sort()

    expect(drawnTeamIds).toEqual(teams.map((team) => team.id.toString()).sort())
  })

  it('places byes next to top 2 seeds in a 16-slot bracket', () => {
    const seed1 = makeTeam(IDS[0], 'Alpha')
    const seed2 = makeTeam(IDS[1], 'Beta')
    const rest = IDS.slice(2, 14).map((id, i) =>
      makeTeam(id, ['A', 'B', 'C', 'D'][i % 4])
    )

    const result = randomDraw.bracket([seed1, seed2, ...rest], {
      seed: true,
      seedCount: 2,
      separateClub: true,
    })

    expect(result).toHaveLength(16)
    expect(result[1]).toBe('bye')
    expect(result[14]).toBe('bye')
  })

  it('behaves correctly when separateClub is true (default, no regression)', () => {
    const teams = IDS.slice(0, 8).map((id, i) => makeTeam(id, i % 2 === 0 ? 'A' : 'B'))
    const result = randomDraw.bracket(teams)
    expect(result).toHaveLength(8)
    const teamSlots = result.filter(s => typeof s !== 'string') as Team[]
    expect(teamSlots).toHaveLength(8)
  })
})

// ── group+playoff bracket draw ────────────────────────────────────────────────

describe('randomDraw.bracketGroupPlayoff', () => {
  /** Returns the R1 partner index for a given bracket slot. */
  const partnerOf = (pos: number) => pos % 2 === 0 ? pos + 1 : pos - 1

  it('returns empty array when winners and runnersUp lengths differ', () => {
    const winners = [makeTeam(IDS[0])]
    const runnersUp = [makeTeam(IDS[1]), makeTeam(IDS[2])]
    expect(randomDraw.bracketGroupPlayoff(winners, runnersUp)).toEqual([])
  })

  it('returns empty array when winners array is empty', () => {
    expect(randomDraw.bracketGroupPlayoff([], [])).toEqual([])
  })

  it('produces the next power-of-2 bracket size', () => {
    const n = 4 // 4 groups → 8 slots (exact)
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    expect(result).toHaveLength(8)
  })

  it('contains all teams with no duplicates or missing entries', () => {
    const n = 4
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    const teamIds = result.filter((s): s is Team => typeof s !== 'string').map(t => t.id.toString()).sort()
    const expected = [...winners, ...runnersUp].map(t => t.id.toString()).sort()
    expect(teamIds).toEqual(expected)
  })

  it('places all winners in seeded (non-adjacent-to-each-other) positions', () => {
    const n = 4
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    const winnerIds = new Set(winners.map(t => t.id.toString()))

    // No two winners should share an R1 matchup pair
    for (let i = 0; i < result.length - 1; i += 2) {
      const a = result[i]
      const b = result[i + 1]
      const aIsWinner = typeof a !== 'string' && winnerIds.has(a.id.toString())
      const bIsWinner = typeof b !== 'string' && winnerIds.has(b.id.toString())
      expect(aIsWinner && bIsWinner).toBe(false)
    }
  })

  it('never places the same-group winner and runner-up in the same R1 match', () => {
    const n = 4
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)

    const winnerIdx = new Map(winners.map((t, i) => [t.id.toString(), i]))

    for (let pos = 0; pos < result.length; pos++) {
      const slot = result[pos]
      if (typeof slot === 'string' || !winnerIdx.has(slot.id.toString())) continue
      const groupIndex = winnerIdx.get(slot.id.toString())!
      const partner = result[partnerOf(pos)]
      if (typeof partner === 'string') continue
      expect(partner.id.toString()).not.toBe(runnersUp[groupIndex].id.toString())
    }
  })

  it('has no byes when group count gives a power-of-2 total (4 groups)', () => {
    const n = 4
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    expect(result.filter(s => s === 'bye')).toHaveLength(0)
  })

  it('inserts the correct number of byes for non-power-of-2 group counts (3 groups)', () => {
    const n = 3  // 6 teams → 8-slot bracket → 2 byes
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    expect(result).toHaveLength(8)
    expect(result.filter(s => s === 'bye')).toHaveLength(2)
    const teamIds = result.filter((s): s is Team => typeof s !== 'string').map(t => t.id.toString()).sort()
    expect(teamIds).toEqual([...winners, ...runnersUp].map(t => t.id.toString()).sort())
  })

  it('still satisfies no-same-group-R1 when byes are present (3 groups)', () => {
    const n = 3
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    const winnerIdx = new Map(winners.map((t, i) => [t.id.toString(), i]))

    for (let pos = 0; pos < result.length; pos++) {
      const slot = result[pos]
      if (typeof slot === 'string' || !winnerIdx.has(slot.id.toString())) continue
      const groupIndex = winnerIdx.get(slot.id.toString())!
      const partner = result[partnerOf(pos)]
      if (typeof partner === 'string') continue
      expect(partner.id.toString()).not.toBe(runnersUp[groupIndex].id.toString())
    }
  })

  it('works for a larger bracket (8 groups, 16 slots, no byes)', () => {
    const n = 8
    const winners   = IDS.slice(0, n).map(id => makeTeam(id))
    const runnersUp = IDS.slice(n, 2 * n).map(id => makeTeam(id))
    const result = randomDraw.bracketGroupPlayoff(winners, runnersUp)
    expect(result).toHaveLength(16)
    expect(result.filter(s => s === 'bye')).toHaveLength(0)
    const winnerIds = new Set(winners.map(t => t.id.toString()))
    for (let i = 0; i < result.length - 1; i += 2) {
      const a = result[i]
      const b = result[i + 1]
      const aIsWinner = typeof a !== 'string' && winnerIds.has(a.id.toString())
      const bIsWinner = typeof b !== 'string' && winnerIds.has(b.id.toString())
      expect(aIsWinner && bIsWinner).toBe(false)
    }
  })
})
