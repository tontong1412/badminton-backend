import { Request, Response } from 'express'
import { ErrorResponse, Event, EventFormat, ResponseLocals } from '../../type'
import EventModel from '../../schema/event'
import TournamentModel from '../../schema/tournament'
import randomDraw from '../../utils/tournament/randomDraw'
import constants from '../../constants'

type DrawStage = 'group' | 'ko' | 'consolation' | 'all'

interface RandomDrawPayload {
  eventID: string;
  stage?: DrawStage;
  groupCount?: number;
  qualifiedCount?: number;
  qualifiedConsolationCount?: number;
}

const buildKoDraw = (groupCount: number, qualifiedCount: number, startRank = 1) => {
  const qualifiedRanks = Math.floor(qualifiedCount / groupCount)
  const positions: string[] = []
  let maindrawRank = startRank

  const shuffle = <T>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  for (let rank = 0; rank < qualifiedRanks; rank++) {
    const shuffledGroups = shuffle(Array.from({ length: groupCount }, (_, idx) => idx))
    for (const groupIndex of shuffledGroups) {
      positions.push(`ที่ ${rank + startRank} กลุ่ม ${constants.EVENT.GROUP_NAME[groupIndex].NAME}`)
    }
    maindrawRank++
  }
  while (positions.length < qualifiedCount) {
    positions.push('ที่ X กลุ่ม X')
  }
  return { positions, maindrawRank }
}

const getRandomDraw = async(
  req: Request<unknown, unknown, RandomDrawPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { eventID, stage = 'all', groupCount, qualifiedCount, qualifiedConsolationCount } = req.body

  const tournament = await TournamentModel.findOne({ 'events.id': eventID }).select('managers')
  if(!tournament?.managers?.map((m) => m.id?.toString()).includes(user.playerID.toString())){
    res.status(401).send({ message: 'Unauthorized' })
    return
  }

  const event = await EventModel.findById(eventID).select('format teams draw')
  if(!event){
    res.status(404).send({ message: 'Event not found' })
    return
  }

  const normalizedFormat = (event.format as string)?.toLowerCase()

  if(normalizedFormat === EventFormat.GroupPlayoff.toLowerCase() || normalizedFormat === EventFormat.GroupPlayoffConsolation.toLowerCase()){
    if(!groupCount || !qualifiedCount){
      res.status(400).send({ message: 'missing number of group' })
      return
    }
    if(groupCount > constants.EVENT.GROUP_NAME.length){
      res.status(400).send({ message: `maximum group count is ${constants.EVENT.GROUP_NAME.length}` })
      return
    }

    const updateFields: Record<string, unknown> = {}

    if(stage === 'group' || stage === 'all'){
      if(event.teams.length < 3 * groupCount){
        res.status(400).send({ message: 'should have at least 3 teams in 1 group' })
        return
      }
      updateFields['draw.group'] = randomDraw.group(event.teams, groupCount)
    }

    if(stage === 'ko' || stage === 'all'){
      const { positions, maindrawRank } = buildKoDraw(groupCount, qualifiedCount)
      updateFields['draw.ko'] = randomDraw.bracket(positions, {
        seed: true,
        seedCount: Math.pow(2, Math.floor(Math.log2(positions.length))),
      })

      if(normalizedFormat === EventFormat.GroupPlayoffConsolation.toLowerCase() && qualifiedConsolationCount && (stage === 'all')){
        const { positions: consolationPositions } = buildKoDraw(groupCount, qualifiedConsolationCount, maindrawRank)
        updateFields['draw.consolation'] = randomDraw.bracket(consolationPositions, {
          seed: true,
          seedCount: Math.pow(2, Math.floor(Math.log2(consolationPositions.length))),
        })
      }
    }

    if(stage === 'consolation'){
      if(normalizedFormat !== EventFormat.GroupPlayoffConsolation.toLowerCase() || !qualifiedConsolationCount){
        res.status(400).send({ message: 'consolation draw requires GroupPlayoffConsolation format and qualifiedConsolationCount' })
        return
      }
      const existingKo = event.draw?.ko ?? []
      const koLength = existingKo.filter((s: unknown) => s !== 'bye').length
      const maindrawRank = koLength > 0 ? Math.floor(koLength / groupCount) + 1 : 1
      const { positions } = buildKoDraw(groupCount, qualifiedConsolationCount, maindrawRank)
      updateFields['draw.consolation'] = randomDraw.bracket(positions, {
        seed: true,
        seedCount: Math.pow(2, Math.floor(Math.log2(positions.length))),
      })
    }

    const result = await EventModel.findByIdAndUpdate(eventID, { $set: updateFields }, { new: true })
    res.send(result as Event)
    return
  }

  if(normalizedFormat === EventFormat.SingleElimination.toLowerCase()){
    const result = await EventModel.findByIdAndUpdate(
      eventID,
      { $set: { 'draw.elimination': randomDraw.bracket(event.teams) } },
      { new: true }
    )
    res.send(result as Event)
    return
  }

  res.status(400).send({ message: 'Unsupported event format' })
}

export default getRandomDraw