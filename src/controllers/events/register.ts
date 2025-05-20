import { Request, Response } from 'express'
import { ContactPlayer, ErrorResponse, EventTeam, Gender, NonSensitivePlayer, PaymentStatus, ResponseLocals } from '../../type'
import playerService from '../../services/playerService'
import PlayerModel from '../../schema/player'
import TeamModel, { TeamDocument } from '../../schema/team'
import EventModel from '../../schema/event'
import mediaUtils from '../../utils/media'
import config from '../../config'
import moment from 'moment'

interface RegisterPayload {
  eventID: string;
  players: [{
    id?: string;
    officialName: {
      th: string;
      en: string;
      pronunciation: string;
    }
    gender: Gender;
    dob?: string;
    photo?: string;
    level: number;
    club: string;
  }];
  contactPerson: ContactPlayer;
}

const register = async(
  req: Request<unknown, unknown, RegisterPayload, unknown>,
  res: Response<EventTeam | ErrorResponse, ResponseLocals>,
): Promise<void>  => {
  const event = await EventModel.findById(req.body.eventID).select({ _id: 1 })
  if (!event) {
    res.status(404).json({ message:'event not found' })
    return
  }

  const playersObject: NonSensitivePlayer[] = await Promise.all(req.body.players.map(async(player) => {
    if(!player.id){ // player doesn't exist in the system
      const newPlayer = await playerService.createPlayer(player)
      return newPlayer
    }

    if(player.photo){
      const uploadResult = await mediaUtils.uploadPhoto(player.photo, `${config.CLOUDINARY_PREFIX}players`, player.id)
      const url = mediaUtils.getOptimizedUrl(uploadResult.public_id, uploadResult.version)
      player.photo = url
    }

    const existingPlayer = await PlayerModel.findByIdAndUpdate(player.id, player, { new:true })
    if(!existingPlayer){ throw new Error('Player doesn\'t exist') }
    const nonSensitiveExistPlayer = {
      id: existingPlayer._id,
      officialName: existingPlayer.officialName,
      level: existingPlayer.level,
      gender: existingPlayer.gender,
      displayName: existingPlayer.displayName,
      club: existingPlayer.club,
      photo: existingPlayer.photo,
    }
    return nonSensitiveExistPlayer as NonSensitivePlayer
  }))

  if(playersObject.some((p) => p === undefined)){
    throw new Error('Player not found')
  }

  // find if team combination already exist
  let teamObject: TeamDocument | null = await TeamModel.findOne({
    players: {
      $all: playersObject.map((player) => player.id),
      $size: playersObject.length
    }
  })

  // players combination doesnt' exist yet
  if(!teamObject){
    try{
      const newTeam = new TeamModel({ players: playersObject.map((player) => player.id) })
      teamObject = await newTeam.save() as TeamDocument
    } catch(error: unknown){
      let errorMessage = 'Something went wrong.'
      if (error instanceof Error) {
        errorMessage += ' Error: ' + error.message
      }
      throw new Error(errorMessage)
    }
  }

  if(!teamObject){
    res.status(500).json({ message: 'Failed to register' })
    return
  }

  const contactPerson = await PlayerModel.findByIdAndUpdate(req.body.contactPerson.id, req.body.contactPerson, { new:true })
  if(!contactPerson) {
    res.status(404).json({ message: 'Contact person not found' })
    return
  }

  const nonSensitiveContactPerson = {
    id: contactPerson._id,
    officialName: contactPerson.officialName,
    displayName: contactPerson.displayName,
    contact: contactPerson.contact,
    photo: contactPerson.photo,
  }



  try{
    const updatedEvent = await EventModel.findOneAndUpdate(
      {
        _id: req.body.eventID,
        'teams.id': { $ne: teamObject._id }
      },
      {
        $push: {
          teams: {
            id: teamObject._id,
            players: playersObject,
            contactPerson: nonSensitiveContactPerson,
            paymentStatus: PaymentStatus.Unpaid,
            date: moment()
          }
        }
      },
      { new:true }
    )
    if(updatedEvent){

      const teamResponse = updatedEvent.teams.find((team) => team.id.toString() === teamObject.toJSON().id)
      if(!teamResponse){
        res.status(400).json({ message: 'Registration unsuccessful: please try again later' })
        return
      }
      res.send(teamResponse)
      return
    }

    res.status(409).json({ message: 'Already Registered' })
    return
  } catch(error: unknown){
    let errorMessage = 'Something went wrong.'
    if (error instanceof Error) {
      errorMessage += ' Error: ' + error.message
    }
    throw new Error(errorMessage)
  }
}
export default register