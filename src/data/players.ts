import { Gender, Player } from '../type'
import mongoose from 'mongoose'


const mockPlayers: Player[] = [
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //pbs.twimg.com/profile_images/1775209451047596032/qE8DKoAF_400x400.jpg',
    officialName: 'Eren Yeager',
    displayName: 'Eren',
    level: 2,
    gender: Gender.Male,
    contact: {
      tg: 'ereny'
    }
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //practicaltyping.com/wp-content/uploads/2022/04/leviacker.jpg',
    officialName: 'Levi Ackerman',
    displayName: 'Levi',
    level: 8,
    gender: Gender.Male
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //wallpapersok.com/images/hd/mikasa-ackerman-short-haired-m5cgaysqztmwgsq6.jpg',
    officialName: 'Mikasa Ackerman',
    displayName: 'Mikasa',
    level: 8,
    gender: Gender.Female,
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //i.pinimg.com/736x/ee/4c/d6/ee4cd699956f8dcf3134e120656b6ddd.jpg',
    officialName: 'Armin Arlert',
    displayName: 'Armin',
    level: 8,
    gender: Gender.Male
  }
]

export default mockPlayers