import { NewPlayer, NonSensitivePlayer } from '../type'
import PlayerModel, { PlayerDocument } from '../schema/player'
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
      const uploadResult = await mediaUtils.uploadPhoto(photo, `${config.CLOUDINARY_PREFIX}players`, savedPlayer._id as string)
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

export default {
  getNonSensitivePlayers,
  createPlayer,
  findById,
  update
}