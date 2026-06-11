import { Types } from 'mongoose'
import { NewPlayer, NonSensitivePlayer, TournamentStatus, MatchStatus } from '../type'
import PlayerModel, { PlayerDocument } from '../schema/player'
import TournamentModel from '../schema/tournament'
import EventModel from '../schema/event'
import MatchModel from '../schema/match'
import mediaUtils from '../utils/media'
import config from '../config'

const getNonSensitivePlayers = async(): Promise<NonSensitivePlayer[]> => {
  try{
    const players = await PlayerModel.find({ userID:{ $ne:null } }).select({ dob: 0, contact: 0, userID: 0, createdAt: 0, updatedAt: 0, __v: 0 })
    const playersJSON: NonSensitivePlayer[] = players.map((player) => player.toJSON() as NonSensitivePlayer)
    return playersJSON
  }
  catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}

const createPlayer = async(playerObject: NewPlayer): Promise<NonSensitivePlayer> => {
  const photo = playerObject.photo

  delete playerObject.photo
  const newPlayer = new PlayerModel(playerObject)


  try{
    const savedPlayer = await newPlayer.save()

    if(photo){
      const uploadResult = await mediaUtils.uploadPhoto(photo, `${config.CLOUDINARY_PREFIX}players`, savedPlayer._id.toString())
      const url = mediaUtils.getOptimizedUrl(uploadResult.public_id, uploadResult.version)
      const updatedPlayer = await PlayerModel.findByIdAndUpdate(savedPlayer._id, { photo: url }, { new:true })
      savedPlayer.photo = updatedPlayer?.photo
    }
    const nonSensitiveSavedPlayer = {
      id: savedPlayer._id,
      officialName: savedPlayer.officialName,
      level: savedPlayer.level,
      gender: savedPlayer.gender,
      displayName: savedPlayer.displayName,
      club: savedPlayer.club,
      photo: savedPlayer.photo,
    }
    return nonSensitiveSavedPlayer as NonSensitivePlayer
  }catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}

const findById = async(id: string): Promise<NonSensitivePlayer | null> => {
  try{
    const player = await PlayerModel.findById(id).select({ dob: 0, contact: 0, userID: 0 })
    if(!player){
      return null
    }
    const playerJSON = player.toJSON() as NonSensitivePlayer

    return playerJSON
  }catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}

const update = async(id: string, params: unknown): Promise<NonSensitivePlayer | null> => {
  try{
    const player = await PlayerModel.findByIdAndUpdate(id, params as PlayerDocument, { new:true })
    if(!player){
      return null
    }
    const playerJSON = player.toJSON() as NonSensitivePlayer

    return playerJSON
  }catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}

const propagatePlayerUpdate = async(id: string, player: NonSensitivePlayer): Promise<void> => {
  const playerObjectId = new Types.ObjectId(id)

  const activeTournamentIds = await TournamentModel.find(
    { status: { $ne: TournamentStatus.Finished } }
  ).distinct('_id')

  // Update players embedded in event team registrations
  await EventModel.updateMany(
    {
      'tournament.id': { $in: activeTournamentIds },
      'teams.players.id': playerObjectId
    },
    {
      $set: {
        'teams.$[team].players.$[pl].officialName': player.officialName,
        'teams.$[team].players.$[pl].displayName': player.displayName,
        'teams.$[team].players.$[pl].club': player.club,
        'teams.$[team].players.$[pl].photo': player.photo,
      }
    },
    {
      arrayFilters: [
        { 'team.players.id': playerObjectId },
        { 'pl.id': playerObjectId }
      ]
    }
  )

  // Update contact person embedded in event teams
  await EventModel.updateMany(
    {
      'tournament.id': { $in: activeTournamentIds },
      'teams.contactPerson.id': playerObjectId
    },
    {
      $set: {
        'teams.$[team].contactPerson.officialName': player.officialName,
        'teams.$[team].contactPerson.displayName': player.displayName,
        'teams.$[team].contactPerson.photo': player.photo,
      }
    },
    { arrayFilters: [{ 'team.contactPerson.id': playerObjectId }] }
  )

  // Update player embedded in non-finished match teamA
  await MatchModel.updateMany(
    {
      status: { $ne: MatchStatus.Finished },
      'teamA.players.id': playerObjectId
    },
    {
      $set: {
        'teamA.players.$[pl].officialName': player.officialName,
        'teamA.players.$[pl].displayName': player.displayName,
        'teamA.players.$[pl].club': player.club,
        'teamA.players.$[pl].photo': player.photo,
      }
    },
    { arrayFilters: [{ 'pl.id': playerObjectId }] }
  )

  // Update player embedded in non-finished match teamB
  await MatchModel.updateMany(
    {
      status: { $ne: MatchStatus.Finished },
      'teamB.players.id': playerObjectId
    },
    {
      $set: {
        'teamB.players.$[pl].officialName': player.officialName,
        'teamB.players.$[pl].displayName': player.displayName,
        'teamB.players.$[pl].club': player.club,
        'teamB.players.$[pl].photo': player.photo,
      }
    },
    { arrayFilters: [{ 'pl.id': playerObjectId }] }
  )

  // Update player embedded in event draws (group, ko, consolation, elimination)
  // These use Mixed/nested-array schema types so we update in-memory and markModified
  const eventsWithDraw = await EventModel.find({
    'tournament.id': { $in: activeTournamentIds },
    $or: [
      { 'draw.group': { $exists: true, $not: { $size: 0 } } },
      { 'draw.ko': { $exists: true, $not: { $size: 0 } } },
      { 'draw.consolation': { $exists: true, $not: { $size: 0 } } },
      { 'draw.elimination': { $exists: true, $not: { $size: 0 } } },
    ]
  }).select('draw')

  const updatePlayerInTeam = (team: unknown): boolean => {
    if (!team || typeof team !== 'object') return false
    const t = team as { players?: Array<Record<string, unknown> & { id?: unknown }> }
    if (!Array.isArray(t.players)) return false
    let changed = false
    for (const p of t.players) {
      if (p.id?.toString() === id) {
        p.officialName = player.officialName
        p.displayName = player.displayName
        p.club = player.club
        p.photo = player.photo
        changed = true
      }
    }
    return changed
  }

  for (const event of eventsWithDraw) {
    let modified = false

    // draw.group is [[Team]] — array of arrays of teams
    if (Array.isArray(event.draw?.group)) {
      for (const group of event.draw.group) {
        for (const team of group) {
          if (updatePlayerInTeam(team)) modified = true
        }
      }
    }

    // draw.ko / consolation / elimination are (Team | string)[]
    for (const drawKey of ['ko', 'consolation', 'elimination'] as const) {
      const drawArray = event.draw?.[drawKey]
      if (!Array.isArray(drawArray)) continue
      for (const entry of drawArray) {
        if (updatePlayerInTeam(entry)) modified = true
      }
    }

    if (modified) {
      event.markModified('draw')
      await event.save()
    }
  }
}

export default {
  getNonSensitivePlayers,
  createPlayer,
  findById,
  update,
  propagatePlayerUpdate
}
