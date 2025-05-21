import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, Event, PaymentStatus, ResponseLocals } from '../../type'
import mediaUtils from '../../utils/media'
import config from '../../config'

interface UpdateTeamPayload {
  paymentStatus?: PaymentStatus;
  eventID: string;
  teamID: string;
  field: string;
  value: unknown;
}

const updateTeam = async(
  req: Request<unknown, unknown, UpdateTeamPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>,
) => {

  const { body } = req

  if(body.field === 'slip'){
    const slipUrl = await mediaUtils.uploadPhoto(body.value as string, `${config.CLOUDINARY_PREFIX}event/${body.eventID}/team`, body.teamID)
    body.field = 'slip'
    body.value = slipUrl.url
  }

  let updateObj = {
    [`teams.$.${body.field}`]: body.value
  }

  if (body.field === 'slip') {
    updateObj = {
      ...updateObj,
      'teams.$.paymentStatus': body.paymentStatus
    }
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
export default updateTeam