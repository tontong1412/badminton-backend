import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, Event, ResponseLocals } from '../../type'

interface WithdrawTeamPayload {
  eventID: string;
  teamID: string;
}

const withdrawTeam = async(
  req: Request<unknown, unknown, WithdrawTeamPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>,
) => {

  const { body } = req

  const updateResponse = await EventModel.findOneAndUpdate(
    {
      _id: body.eventID,
      'teams.id': body.teamID,
    }, {
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



  console.log(updateResponse)
}
export default withdrawTeam