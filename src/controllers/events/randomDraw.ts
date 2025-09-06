import { Request, Response } from 'express'
import { ErrorResponse, Event, EventFormat, ResponseLocals } from '../../type'
import EventModel from '../../schema/event'
import TournamentModel from '../../schema/tournament'
import randomDraw from '../../utils/tournament/randomDraw'
import constants from '../../constants'

interface RandomDrawPayload {
  eventID: string;
  groupCount?: number;
  qualifiedCount?: number;
  qualifiedConsolationCount?: number;
}

const getRandomDraw =  async(
  req: Request<unknown, unknown, RandomDrawPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>) => {
  const { user }: ResponseLocals = res.locals as ResponseLocals
  const { eventID, groupCount, qualifiedCount, qualifiedConsolationCount } = req.body

  const tournament = await TournamentModel.findOne({ 'events.id': eventID }).select('managers')
  if(!tournament?.managers?.map((m) => m.id?.toString()).includes(user.playerID.toString())){
    res.status(401).send({ message: 'Unauthorized' })
    return
  }

  const event = await EventModel.findById(eventID).select('format teams')
  if(!event){
    res.status(404).send({ message: 'Event not found' })
    return
  }
  const draw :Event['draw'] = {}
  if(event.format === EventFormat.GroupPlayoff || event.format === EventFormat.GroupPlayoffConsolation){
    if(!groupCount || !qualifiedCount){
      res.status(400).send({ message:'mising number of group' })
      return
    }
    if(event.teams.length < 3 * groupCount){
      res.status(400).send({ message:'should have at least 3 teams in 1 group' })
      return
    }
    draw.group = randomDraw.group(event.teams, groupCount)

    const qualifiedRanks = Math.floor(qualifiedCount / groupCount)
    const qualifiedPositions = []
    let maindrawRank = 1
    for (let rank = 0; rank < qualifiedRanks; rank++) {
    // Iterate through each group
      for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
      // Create the string and push it to the array
        qualifiedPositions.push(`ที่ ${rank + 1} กลุ่ม ${constants.EVENT.GROUP_NAME[groupIndex].NAME}`)
      }
      maindrawRank++
    }
    while (qualifiedPositions.length < qualifiedCount) {
      qualifiedPositions.push('ที่ X กลุ่ม X')
    }
    draw.ko = randomDraw.bracket(qualifiedPositions, { seed:true, seedCount:Math.pow(2, Math.floor(Math.log2(qualifiedPositions.length))) })

    if(event.format === EventFormat.GroupPlayoffConsolation  && qualifiedConsolationCount){
      const qualifiedConsolationRanks = Math.floor(qualifiedConsolationCount / groupCount)
      const qualifiedConsolationPositions = []
      for (let rank = 0; rank < qualifiedConsolationRanks; rank++) {
        // Iterate through each group
        for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
          // Create the string and push it to the array
          qualifiedConsolationPositions.push(`ที่ ${rank + maindrawRank} กลุ่ม ${constants.EVENT.GROUP_NAME[groupIndex].NAME}`)
        }
      }
      while (qualifiedConsolationPositions.length < qualifiedConsolationCount) {
        qualifiedConsolationPositions.push('ที่ X กลุ่ม X')
      }
      draw.consolation = randomDraw.bracket(qualifiedConsolationPositions, { seed:true, seedCount:Math.pow(2, Math.floor(Math.log2(qualifiedConsolationPositions.length))) })
    }
  } else if(event.format === EventFormat.SingleElimination){
    draw.elimination = randomDraw.bracket(event.teams)
  }

  const result = await EventModel.findByIdAndUpdate(eventID, { draw }, { new:true })

  res.send(result as Event)
  return
}

export default getRandomDraw