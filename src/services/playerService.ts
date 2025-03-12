import { NewPlayer, NonSensitivePlayer } from '../type'
import PlayerModel from '../schema/player'

const getNonSensitivePlayers = async(): Promise<NonSensitivePlayer[]> => {
  try{
    const players = await PlayerModel.find({})
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
  const newPlayer = new PlayerModel(playerObject)

  try{
    const savedPlayer = await newPlayer.save()
    return savedPlayer.toJSON() as NonSensitivePlayer
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
    const player = await PlayerModel.findById(id)
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
  findById
}