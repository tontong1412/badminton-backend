import { Request, Response } from 'express'
import EventModel from '../../schema/event'
import { ErrorResponse, Event, ResponseLocals } from '../../type'

interface UpdateShuttlecockCreditPayload {
  eventID: string;
  teamID: string;
  action: string;
  amount: number;
}

const updateShuttlecock = async(
  req: Request<unknown, unknown, UpdateShuttlecockCreditPayload, unknown>,
  res: Response<Event | ErrorResponse, ResponseLocals>,
) => {

  const { body } = req

  const updateResponse = await EventModel.findOneAndUpdate(
    {
      _id: body.eventID,
      'teams.id': body.teamID,
    }, {
      $inc: { 'teams.$.shuttlecockCredit': body.action === 'increment' ? body.amount : 0 - body.amount }
    },
    { new: true }
  )

  if(updateResponse){
    res.send(updateResponse as Event)
    return

  }
  res.status(404).send({ message: 'Event not found' })
  return
}
export default updateShuttlecock