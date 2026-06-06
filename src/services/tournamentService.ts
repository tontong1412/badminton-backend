import TournamentModel from '../schema/tournament'
import { NewTournament, Tournament } from '../type'
import { Types } from 'mongoose'

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

const update = async(id: string | Types.ObjectId, updateData: Partial<NewTournament>): Promise<Tournament> => {
  try {
    const tournament = await TournamentModel.findByIdAndUpdate(id, updateData, { new: true })
    if (!tournament) {
      throw new Error('Tournament not found')
    }
    return tournament.toJSON() as Tournament
  } catch (error: unknown) {
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}

export default { create, update }