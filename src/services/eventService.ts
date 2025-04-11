import EventModel from '../schema/event'
import { Event, NewEvent } from '../type'

const create = async(eventObject: NewEvent): Promise<Event> => {
  const newTournament = new EventModel(eventObject)

  try{
    const savedEvent = await newTournament.save()
    return savedEvent.toJSON() as Event
  }catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}
export default { create }