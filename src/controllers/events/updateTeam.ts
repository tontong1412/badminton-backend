import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, Event, PaymentStatus, ResponseLocals } from '../../type'
import mediaUtils from '../../utils/media'
import config from '../../config'
import moment from 'moment'

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
    const event = await EventModel.findById(body.eventID).select('limit teams')
    if(!event) {
      res.status(404).send({ message: 'Event not found' })
      return
    }
    const paidTeams = event.teams.filter((t) => t.paymentStatus === PaymentStatus.Paid || t.paymentStatus === PaymentStatus.Pending)
    const currentTeam = event.teams.find((t) => t.id.toString() == body.teamID)
    if(!currentTeam) {
      res.status(404).send({ message: 'Team not found' })
      return
    }
    if(paidTeams.length >= event.limit){
      const previousNote = currentTeam.note || ''
      const isSubstitute = previousNote.includes('สำรอง')
      updateObj = {
        ...updateObj,
        'teams.$.note': isSubstitute ? previousNote : 'สำรอง' + (previousNote && ', ') + previousNote
      }
    }
    updateObj = {
      ...updateObj,
      'teams.$.paymentStatus': body.paymentStatus,
      'teams.$.slipTimestamp': moment()
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
  res.status(404).send({ message: 'Event not found' })
  return
}
export default updateTeam