import { Request, Response } from 'express'
import { ErrorResponse, ResponseLocals, Tournament, NewTournament } from '../../type'
import tournamentService from '../../services/tournamentService'

const updateTournament = async(
  req: Request<{ id: string }, unknown, Partial<NewTournament>, unknown>,
  res: Response<Tournament | ErrorResponse, ResponseLocals>) => {
  try {
    const { id } = req.params
    const updatedTournament = await tournamentService.update(id, req.body)
    res.send(updatedTournament)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update tournament'
    res.status(400).json({ message })
  }
}

export default updateTournament
