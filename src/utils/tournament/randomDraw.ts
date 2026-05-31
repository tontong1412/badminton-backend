import { Team } from '../../type'

const getClubKey = (team: Team): string => {
  const clubs = team.players.map((p) => p.club || '').filter(Boolean).sort()
  return clubs.length > 0 ? clubs.join('+') : '__no_club__'
}

/** Splits a team list into those that need club separation (club has 2+ entries) and free ones. */
const splitByConflict = (teams: Team[]): { conflicting: Map<string, Team[]>; free: Team[] } => {
  const clubMap = new Map<string, Team[]>()
  for (const team of teams) {
    const key = getClubKey(team)
    if (!clubMap.has(key)) clubMap.set(key, [])
    clubMap.get(key)!.push(team)
  }
  const conflicting = new Map<string, Team[]>()
  const free: Team[] = []
  for (const [key, clubTeams] of clubMap) {
    if (key !== '__no_club__' && clubTeams.length >= 2) {
      conflicting.set(key, clubTeams)
    } else {
      free.push(...clubTeams)
    }
  }
  return { conflicting, free }
}

/**
 * Arranges multi-member-club teams so same-club teams are spread as far apart as possible,
 * then appends single-member and no-club teams in random order.
 */
/**
 * Fills remaining null slots in the bracket draw with club separation.
 * Multi-member-club teams are paired so no two from the same club meet in R1.
 * Teams with no club conflict are placed randomly in remaining slots.
 * Best-effort: if one club has more than half the remaining teams, some same-club
 * first-round matchups may still occur.
 */
const fillBracketWithClubSeparation = (
  draw: (Team | null | string)[],
  teams: Team[]
): void => {
  const nullSlots = draw.map((v, i) => v === null ? i : -1).filter((i) => i >= 0)

  // Group slots by their first-round pair index (floor(slot / 2))
  const pairMap = new Map<number, number[]>()
  for (const slot of nullSlots) {
    const pairIdx = Math.floor(slot / 2)
    if (!pairMap.has(pairIdx)) pairMap.set(pairIdx, [])
    pairMap.get(pairIdx)!.push(slot)
  }

  const fullPairs: number[][] = []   // both slots available (no bye)
  const singleSlots: number[] = []   // one slot taken by bye

  for (const slots of pairMap.values()) {
    if (slots.length === 2) fullPairs.push(slots)
    else singleSlots.push(...slots)
  }

  const { conflicting, free } = splitByConflict(teams)

  // Shuffle pairs so club positions are randomised across the bracket
  const shuffledPairs = shuffle(fullPairs)

  // Track what's been assigned to each pair slot
  const pairAssigned: [Team | null, Team | null][] = shuffledPairs.map(() => [null, null])

  // Greedy: assign conflicting teams so no R1 pair contains two same-club teams.
  // Largest clubs are handled first to maximise separation.
  const conflictingClubs = [...conflicting.values()].map((g) => shuffle(g))
  conflictingClubs.sort((a, b) => b.length - a.length)

  let nextPair = 0
  for (const clubTeams of conflictingClubs) {
    for (const team of clubTeams) {
      const clubKey = getClubKey(team)
      let placed = false
      // Find the next pair that has a free slot and no same-club team
      for (let offset = 0; offset < shuffledPairs.length; offset++) {
        const pi = (nextPair + offset) % shuffledPairs.length
        const [a, b] = pairAssigned[pi]
        if ((a !== null && b !== null)) continue  // pair full
        if ((a && getClubKey(a) === clubKey) || (b && getClubKey(b) === clubKey)) continue
        if (a === null) pairAssigned[pi][0] = team
        else pairAssigned[pi][1] = team
        nextPair = (pi + 1) % shuffledPairs.length
        placed = true
        break
      }
      if (!placed) {
        // All pairs either full or have a same-club team — use the least-full pair (unavoidable conflict)
        const pi = pairAssigned.reduce(
          (best, [a, b], idx) =>
            (a === null || b === null) && (pairAssigned[best][0] !== null && pairAssigned[best][1] !== null)
              ? idx : best,
          0
        )
        if (pairAssigned[pi][0] === null) pairAssigned[pi][0] = team
        else if (pairAssigned[pi][1] === null) pairAssigned[pi][1] = team
        // else all fullPairs are full — team will fall through to singleSlots below
      }
    }
  }

  // Write pair assignments to draw
  for (let pi = 0; pi < shuffledPairs.length; pi++) {
    const [pos0, pos1] = shuffledPairs[pi]
    if (pairAssigned[pi][0]) draw[pos0] = pairAssigned[pi][0]!
    if (pairAssigned[pi][1]) draw[pos1] = pairAssigned[pi][1]!
  }

  // Fill all remaining null slots (empty pair slots + singleSlots) with free teams randomly
  const shuffledFree = shuffle(free)
  let freeIdx = 0
  for (let pi = 0; pi < shuffledPairs.length; pi++) {
    const [pos0, pos1] = shuffledPairs[pi]
    if (draw[pos0] === null && freeIdx < shuffledFree.length) draw[pos0] = shuffledFree[freeIdx++]
    if (draw[pos1] === null && freeIdx < shuffledFree.length) draw[pos1] = shuffledFree[freeIdx++]
  }

  // Conflicting-team overflow (more conflicting teams than fullPair slots) + any leftover free
  // go to singleSlots — facing a bye, so no club conflict
  const overflowTeams = [
    ...teams.filter((t) => draw.every((s) => typeof s === 'string' || !s || (s as Team).id?.toString() !== t.id?.toString())),
    ...shuffledFree.slice(freeIdx),
  ]
  let overflowIdx = 0
  for (const slot of singleSlots) {
    if (draw[slot] === null && overflowIdx < overflowTeams.length) {
      draw[slot] = overflowTeams[overflowIdx++]
    }
  }
}

const group = (teamList: Team[], groupCount: number, { separateClub = true } = {}): Team[][] => {
  const groups: Team[][] = Array.from({ length: groupCount }, () => [])

  if (!separateClub) {
    const shuffled = shuffle(teamList)
    for (let i = 0; i < shuffled.length; i++) {
      groups[i % groupCount].push(shuffled[i])
    }
    return groups
  }

  const { conflicting, free } = splitByConflict(teamList)

  // Greedy assignment for multi-member clubs: distribute each club's teams
  // across different groups. Largest clubs are handled first.
  const conflictingClubs = [...conflicting.values()].map((g) => shuffle(g))
  conflictingClubs.sort((a, b) => b.length - a.length)

  let nextGroup = 0
  for (const clubTeams of conflictingClubs) {
    for (const team of clubTeams) {
      const clubKey = getClubKey(team)
      let placed = false
      for (let offset = 0; offset < groupCount; offset++) {
        const gi = (nextGroup + offset) % groupCount
        if (!groups[gi].some((t) => getClubKey(t) === clubKey)) {
          groups[gi].push(team)
          nextGroup = (gi + 1) % groupCount
          placed = true
          break
        }
      }
      if (!placed) {
        // Unavoidable conflict — use smallest group
        const gi = groups.reduce(
          (minIdx, g, idx) => g.length < groups[minIdx].length ? idx : minIdx, 0
        )
        groups[gi].push(team)
        nextGroup = (gi + 1) % groupCount
      }
    }
  }

  // Place remaining teams (no club conflict) randomly into the smallest available groups
  for (const team of shuffle(free)) {
    const gi = groups.reduce(
      (minIdx, g, idx) => g.length < groups[minIdx].length ? idx : minIdx, 0
    )
    groups[gi].push(team)
  }

  return groups
}

const bracket = (teamList: (Team|string)[], { seed = false, seedCount = 2, separateClub = true } = {}): (Team | string)[] => {
  if (teamList.length < 2) {
    console.error('A bracket requires at least two teams.')
    return []
  }

  const inputTeams = [...teamList]
  const teamCount = teamList.length

  const bracketSlot = Math.pow(2, Math.ceil(Math.log2(teamCount)))
  const draw:(Team | null | string)[]  = Array.from({ length: bracketSlot }, () => null)


  const byePositions = findByePosition(bracketSlot - teamCount, bracketSlot)
  for(let i = 0;i < byePositions.length;i++){
    draw[byePositions[i]] = 'bye'
  }

  if(seed){
    if (!Number.isInteger(seedCount) || seedCount < 2 || seedCount > bracketSlot || Math.log2(seedCount) % 1 !== 0) {
      console.error('seedCount must be an integer power of 2 between 2 and bracket size')
      return []
    }
    const seedPositions = findSeededPosition(seedCount, bracketSlot)
    for(let i = 0;i < seedPositions.length;i++){
      if(inputTeams.length > 0){
        draw[seedPositions[i]] = inputTeams.shift() ?? 'bye'
      }
    }
  }

  const remainingTeams = inputTeams.filter((t): t is Team => typeof t !== 'string')

  if (separateClub) {
    fillBracketWithClubSeparation(draw, remainingTeams)
  } else {
    const shuffled = shuffle(remainingTeams)
    for(let i = 0;i < draw.length;i++){
      if(draw[i] === null && shuffled.length > 0){
        draw[i] = shuffled.shift() ?? 'error'
      }
    }
  }

  return draw as (Team | string)[]
}

const shuffle = <T>(array: T[]): T[] => {
  const shuffledArray = [...array]
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]
  }
  return shuffledArray
}

const getByeCandidateOrder = (totalSlots: number): number[] => {
  const candidates: number[] = [1, totalSlots - 2]

  // Mirror bye slots across progressively smaller bracket sections.
  for (let level = 1; level < Math.log2(totalSlots); level++) {
    const sections = Math.pow(2, level)
    const midpointsPerSection = Math.pow(2, level - 1)

    for (let j = 0; j < midpointsPerSection; j++) {
      const sectionMidpoint = (2 * j + 1) * totalSlots / sections
      candidates.push(sectionMidpoint - 2)
    }
    for (let j = 0; j < midpointsPerSection; j++) {
      const sectionMidpoint = (2 * j + 1) * totalSlots / sections
      candidates.push(sectionMidpoint + 1)
    }
  }

  return candidates.filter((pos, idx, arr) =>
    Number.isInteger(pos)
    && pos >= 0
    && pos < totalSlots
    && arr.indexOf(pos) === idx
  )
}

const findByePosition = (byeCount: number, totalSlots: number): number[] => {
  if (!Number.isInteger(byeCount) || byeCount <= 0) {
    return []
  }
  if (!Number.isInteger(totalSlots) || totalSlots < 2 || Math.log2(totalSlots) % 1 !== 0) {
    return []
  }

  const maxByes = Math.min(byeCount, Math.floor(totalSlots / 2))
  const byePositions = getByeCandidateOrder(totalSlots).slice(0, maxByes)
  return byePositions.sort((a, b) => a - b)
}

const getSeedPositionTiers = (totalSlots: number): number[][] => {
  const maxTier = Math.log2(totalSlots)
  const tiers: number[][] = [[0, totalSlots - 1]]

  for (let tier = 1; tier < maxTier; tier++) {
    const sections = Math.pow(2, tier)
    const tierPositions: number[] = []

    for (let j = 0; j < Math.pow(2, tier - 1); j++) {
      const sectionMidpoint = (2 * j + 1) * totalSlots / sections
      tierPositions.push(sectionMidpoint - 1)
    }
    for (let j = 0; j < Math.pow(2, tier - 1); j++) {
      const sectionMidpoint = (2 * j + 1) * totalSlots / sections
      tierPositions.push(sectionMidpoint)
    }

    tiers.push(tierPositions)
  }

  return tiers
}

const findSeededPosition = (seededCount: number, totalSlots: number): number[] => {
  if (!Number.isInteger(seededCount) || seededCount < 2 || Math.log2(seededCount) % 1 !== 0) {
    return []
  }
  if (!Number.isInteger(totalSlots) || totalSlots < 2 || Math.log2(totalSlots) % 1 !== 0) {
    return []
  }
  if (seededCount > totalSlots) {
    return []
  }

  const tiers = getSeedPositionTiers(totalSlots)
  const requiredTierCount = Math.ceil(Math.log2(seededCount))
  const positions: number[] = []

  for (let i = 0; i < requiredTierCount; i++) {
    const tier = tiers[i] ?? []
    positions.push(...(i === 0 ? tier : shuffle(tier)))
  }

  return positions
}

/**
 * Generates a bracket for a group+playoff tournament.
 *
 * - `winners[i]` and `runnersUp[i]` are the 1st and 2nd place from the same
 *   group (indices must correspond).
 * - Winners are placed in seeded positions so no two winners can meet before
 *   the semi-final stage (or equivalent).
 * - Same-group winner and runner-up are guaranteed NOT to share an R1 matchup.
 *   Each winner's R1 partner slot receives a runner-up from a DIFFERENT group.
 * - The assignment of groups to bracket positions is fully randomised.
 * - When byes are present (2 × groups is not a power of 2), the top-seeded
 *   winners receive the byes.  Their runners-up are redistributed to other R1
 *   partner slots (runners-up from bye-receiving groups are "free" and are
 *   preferred for those slots).  If more runners-up remain than available R1
 *   partner slots they go to remaining empty slots and may face another
 *   runner-up in R1 — unavoidable with non-power-of-2 group counts.
 */
const bracketGroupPlayoff = (
  winners: Team[],
  runnersUp: Team[],
  { separateClub = true }: { separateClub?: boolean } = {}
): (Team | string)[] => {
  if (winners.length === 0 || winners.length !== runnersUp.length) {
    console.error('bracketGroupPlayoff: winners and runnersUp must be non-empty arrays of equal length')
    return []
  }

  const teamCount = winners.length + runnersUp.length
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)))
  const draw: (Team | string | null)[] = Array(bracketSize).fill(null)

  // Place byes — always adjacent to the top-seeded positions
  for (const pos of findByePosition(bracketSize - teamCount, bracketSize)) {
    draw[pos] = 'bye'
  }

  // Build seeded-position list deep enough to cover all winners.
  const tierCount = Math.max(1, Math.ceil(Math.log2(Math.max(winners.length, 2))))
  const tiers = getSeedPositionTiers(bracketSize)
  const seedPositions: number[] = []
  for (let i = 0; i < tierCount; i++) {
    const tier = tiers[i] ?? []
    seedPositions.push(...(i === 0 ? tier : shuffle(tier)))
  }

  // Randomise which group occupies which seed position (winner+runnerUp stay paired).
  const shuffledGroupIndices = shuffle(Array.from({ length: winners.length }, (_, i) => i))

  // Assign winners to seed positions.
  for (let i = 0; i < shuffledGroupIndices.length; i++) {
    draw[seedPositions[i]] = winners[shuffledGroupIndices[i]]
  }

  // Classify each seed position: does its R1 partner slot hold a 'bye' or is it open?
  const byeGroupIndices: number[] = []   // original group indices whose winner got a bye partner
  const openPartnerSlots: { partnerPos: number; forbidGroupIdx: number }[] = []

  for (let i = 0; i < shuffledGroupIndices.length; i++) {
    const seedPos = seedPositions[i]
    const partnerPos = seedPos % 2 === 0 ? seedPos + 1 : seedPos - 1
    const groupIdx = shuffledGroupIndices[i]
    if (draw[partnerPos] === 'bye') {
      byeGroupIndices.push(groupIdx)
    } else {
      openPartnerSlots.push({ partnerPos, forbidGroupIdx: groupIdx })
    }
  }

  // Fill each open R1 partner slot with a runner-up from a DIFFERENT group.
  // Runners-up from bye-receiving groups are "free" (no forbidden-slot constraint
  // for them); prefer them first to keep the constraint set as small as possible.
  const assigned = new Set<number>()

  for (const { partnerPos, forbidGroupIdx } of openPartnerSlots) {
    // Try "free" runners-up (bye groups) that are not the forbidden group
    const freeEligible = byeGroupIndices.filter(
      (gi) => !assigned.has(gi) && gi !== forbidGroupIdx
    )
    // Fall back to any unassigned runner-up not from the forbidden group
    const anyEligible = shuffledGroupIndices.filter(
      (gi) => !assigned.has(gi) && gi !== forbidGroupIdx
    )
    // Last resort: any unassigned runner-up (unavoidable same-group conflict)
    const lastResort = shuffledGroupIndices.filter((gi) => !assigned.has(gi))

    const pool = freeEligible.length > 0
      ? freeEligible
      : anyEligible.length > 0
        ? anyEligible
        : lastResort

    if (pool.length === 0) continue
    const picked = pool[Math.floor(Math.random() * pool.length)]
    draw[partnerPos] = runnersUp[picked]
    assigned.add(picked)
  }

  // Remaining runners-up fill any leftover null slots (overflow).
  const overflowRunnersUp = shuffledGroupIndices
    .filter((gi) => !assigned.has(gi))
    .map((gi) => runnersUp[gi])

  if (separateClub && overflowRunnersUp.length > 0) {
    fillBracketWithClubSeparation(draw, overflowRunnersUp)
  } else {
    const shuffledOverflow = shuffle(overflowRunnersUp)
    for (let pos = 0; pos < bracketSize; pos++) {
      if (draw[pos] === null && shuffledOverflow.length > 0) {
        draw[pos] = shuffledOverflow.shift()!
      }
    }
  }

  return draw as (Team | string)[]
}


export default{
  group,
  bracket,
  bracketGroupPlayoff,
}