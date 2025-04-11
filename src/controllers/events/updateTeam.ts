import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, EventTeam,  ResponseLocals } from '../../type'

interface UpdateTeamPayload {
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}

const updateTeam = async(
  req: Request<unknown, unknown, UpdateTeamPayload, unknown>,
  res: Response<EventTeam | ErrorResponse, ResponseLocals>,
) => {

  const { body } = req

  const updateObj = {
    [`teams.$.${body.field}`]: body.value
  }

  const updateResponse = await EventModel.findOneAndUpdate(
    {
      _id: body.eventID,
      'teams.id': body.teamID,
    }, {
      $set: updateObj
    },
    { new: true }
  )

  if(updateResponse){

    const teamResponse = updateResponse.teams.find((team) => team.id.toString() === body.teamID)
    if(!teamResponse){
      res.status(400).json({ message: 'Registration unsuccessful: please try again later' })
      return
    }
    res.send(teamResponse)
    return
  }

  console.log(updateResponse)
}
export default updateTeam