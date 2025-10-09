import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, Event, ResponseLocals } from '../../type'

interface ChangeEventPayload {
  eventID: string;
  teamID: string;
  changeToID: string;
}

const changeEvent = async(
  req: Request<unknown, unknown, ChangeEventPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>,
) => {

  const { body } = req

  const originalEvent = await EventModel.findById(body.eventID).select({ teams: 1 })

  if(!originalEvent){
    res.status(404).send({ message: 'Event not found' })
    return
  }

  const teamToMove = originalEvent.teams.find((team) => team.id.toString() === body.teamID)

  if(!teamToMove){
    res.status(404).send({ message: 'Team not found' })
    return
  }

  await EventModel.findByIdAndUpdate(body.changeToID,
    {
      $push: {
        teams: teamToMove
      }
    },
    { new:true }
  )

  const updateResponse = await EventModel.findByIdAndUpdate(body.eventID,
    {
      $pull: {
        teams: { id: body.teamID }
      }
    },
    { new: true }
  )

  if(updateResponse){

    // const teamResponse = updateResponse.teams.find((team) => team.id.toString() === body.teamID)
    // if(!teamResponse){
    //   res.status(400).json({ message: 'Update unsuccessful: please try again later' })
    //   return
    // }
    // res.send(teamResponse)

    res.send(updateResponse as Event)
    return
  }
}
export default changeEvent