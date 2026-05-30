import { Team } from '../../type'

const getClubKey = (team: Team): string => {
  const clubs = team.players.map((p) => p.club || '').filter(Boolean).sort()
  return clubs.length > 0 ? clubs.join('+') : '__no_club__'
}

/**
 * Arranges teams so same-club teams are spread as far apart as possible.
 * Uses round-robin interleaving across clubs, with largest clubs first.
 */
const separateByClub = (teams: Team[]): Team[] => {
  const clubMap = new Map<string, Team[]>()
  for (const team of teams) {
    const key = getClubKey(team)
    if (!clubMap.has(key)) clubMap.set(key, [])
    clubMap.get(key)!.push(team)
  }
  const groups = [...clubMap.values()].map((g) => shuffle(g))
  groups.sort((a, b) => b.length - a.length)

  const result: Team[] = []
  while (groups.some((g) => g.length > 0)) {
    for (const g of groups) {
      if (g.length > 0) result.push(g.shift()!)
    }
  }
  return result
}

/**
 * Fills remaining null slots in the bracket draw with club separation.
 * Teams at consecutive positions in the club-spread list (i.e., from different clubs)
 * are paired together in first-round matchups.
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

  // Shuffle the pair order so club placement is randomised across the bracket
  const shuffledPairs = shuffle(fullPairs)
  const separated = separateByClub(teams)

  // Teams for full pairs: pairs of consecutive items from the spread list.
  // Adjacent items in separateByClub output are from different clubs, so
  // index 2i → slot 0 of pair i, index 2i+1 → slot 1 of pair i.
  for (let i = 0; i < shuffledPairs.length; i++) {
    const [pos0, pos1] = shuffledPairs[i]
    if (2 * i < separated.length) draw[pos0] = separated[2 * i]
    if (2 * i + 1 < separated.length) draw[pos1] = separated[2 * i + 1]
  }

  // Fill singleton slots (opposite slot is a bye) with leftover teams
  const singleTeams = separated.slice(fullPairs.length * 2)
  for (let i = 0; i < singleSlots.length && i < singleTeams.length; i++) {
    draw[singleSlots[i]] = singleTeams[i]
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

  // Club-aware assignment: each club's teams are distributed across different groups.
  // Sort clubs by size descending so the largest clubs are spread first.
  const clubMap = new Map<string, Team[]>()
  for (const team of teamList) {
    const key = getClubKey(team)
    if (!clubMap.has(key)) clubMap.set(key, [])
    clubMap.get(key)!.push(team)
  }
  const clubGroups = [...clubMap.values()].map((g) => shuffle(g))
  clubGroups.sort((a, b) => b.length - a.length)

  let nextGroup = 0
  for (const clubTeams of clubGroups) {
    for (const team of clubTeams) {
      const clubKey = getClubKey(team)
      let placed = false
      // Try groups in round-robin order starting from nextGroup, skipping any group
      // that already contains a team from the same club.
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
        // All groups already have a same-club team (unavoidable); use smallest group.
        const gi = groups.reduce(
          (minIdx, g, idx) => g.length < groups[minIdx].length ? idx : minIdx, 0
        )
        groups[gi].push(team)
        nextGroup = (gi + 1) % groupCount
      }
    }
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