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

  const teamCount = teamList.length

  const bracketSlot = Math.pow(2, Math.ceil(Math.log2(teamCount)))
  const draw:(Team | null | string)[]  = Array.from({ length: bracketSlot }, () => null)


  const byePositions = findByePosition(bracketSlot - teamCount, bracketSlot)
  for(let i = 0;i < byePositions.length;i++){
    draw[byePositions[i]] = 'bye'
  }

  if(seed){
    if (Math.log2(seedCount) % 1 != 0) {
      console.error('number should be in the form of 2^n')
      return []
    }
    const seedPositions = findSeededPosition(seedCount, bracketSlot)
    for(let i = 0;i < seedPositions.length;i++){
      if(teamList.length > 0){
        draw[seedPositions[i]] = teamList.shift() ?? 'bye'
      }
    }
  }

  const remainingTeams = teamList.filter((t): t is Team => typeof t !== 'string')

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

const findByePosition = (byeCount: number, totalSlots: number): number[] => {
  const section = Math.ceil(Math.log2(byeCount))
  const byePosition: number[] = []
  const checkCountandPush = (selectedPosition:number) => {
    if (byeCount > 0) {
      byePosition.push(selectedPosition)
      byeCount--
    }
  }
  if (section == 0) {
    checkCountandPush(1)
    checkCountandPush(totalSlots - 2)
  }else{
    for (let i = 0; i < section; i++) {
      if (i == 0) {
        checkCountandPush(i + 1)
        checkCountandPush(totalSlots - 2)
      } else {
        for (let j = 0; j < Math.pow(2, i - 1); j++) {
          const newBottom = (2 * j + 1) * totalSlots / Math.pow(2, i)
          checkCountandPush(newBottom - 2)
        }
        for (let j = 0; j < Math.pow(2, i - 1); j++) {
          const newBottom = (2 * j + 1) * totalSlots / Math.pow(2, i)
          checkCountandPush(newBottom + 1)
        }
      }
    }
  }
  byePosition.sort((a, b) => a - b)
  return byePosition
}

const findSeededPosition = (seededCount: number, totalSlots: number): number[] => {
  // if (Math.log2(seededCount) % 1 != 0) throw 'number should be in the form of 2^n'
  const section = Math.ceil(Math.log2(seededCount))
  let positions: number[] = []
  for (let i = 0; i < section; i++) {
    let tempPosition: number[] = []
    if (i == 0) { // 1st and 2nd seed
      tempPosition.push(0)
      tempPosition.push(totalSlots - 1)
    } else {
      for (let j = 0; j < Math.pow(2, i - 1); j++) {
        const newBottom = (2 * j + 1) * totalSlots / Math.pow(2, i)
        tempPosition.push(newBottom - 1)
      }
      for (let j = 0; j < Math.pow(2, i - 1); j++) {
        const newBottom = (2 * j + 1) * totalSlots / Math.pow(2, i)
        tempPosition.push(newBottom)
      }
      tempPosition = shuffle(tempPosition)
    }
    positions = [...positions, ...tempPosition]
  }
  return positions
}


export default{
  group,
  bracket,
}