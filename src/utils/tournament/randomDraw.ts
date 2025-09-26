import { Team } from '../../type'

const group = (teamList: Team[], groupCount: number): Team[][] => {
  const playerCount = teamList.length
  const shuffledTeam = shuffle(teamList)
  const groups: Team[][] = Array.from({ length: groupCount }, () => [])
  for (let i = 0; i < playerCount; i++) {
    const groupIndex = i % groupCount
    groups[groupIndex].push(shuffledTeam[i])
  }
  return groups
}

const bracket = (teamList: (Team|string)[], { seed = false, seedCount = 2 } = {}): (Team | string)[] => {
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


  const remainingTeams: Team[]  = shuffle(teamList) as Team[]
  for(let i = 0;i < draw.length;i++){
    if(draw[i] === null && remainingTeams.length > 0){
      draw[i] = remainingTeams.shift() ?? 'error'
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