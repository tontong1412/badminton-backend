import TournamentModel from '../schema/tournament'
import { NewTournament, Tournament } from '../type'

const create = async(playerObject: NewTournament): Promise<Tournament> => {
  const newTournament = new TournamentModel(playerObject)

  try{
    const savedTournament = await newTournament.save()
    return savedTournament.toJSON() as Tournament
  }catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}
export default { create }