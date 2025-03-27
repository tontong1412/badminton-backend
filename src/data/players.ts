import { Gender, Player } from '../type'
import mongoose from 'mongoose'


const mockPlayers: Player[] = [
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //pbs.twimg.com/profile_images/1775209451047596032/qE8DKoAF_400x400.jpg',
    officialName: {
      local: 'Eren Yeager',
      en: 'Eren Yeager'
    },
    displayName: {
      local:'Eren'
    },
    level: 2,
    gender: Gender.Male,
    contact: {
      tg: 'ereny'
    }
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //practicaltyping.com/wp-content/uploads/2022/04/leviacker.jpg',
    officialName: {
      local: 'Levi Ackerman',
      en: 'Levi Ackerman'
    },
    displayName: {
      local:'Levi'
    },
    level: 8,
    gender: Gender.Male
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //wallpapersok.com/images/hd/mikasa-ackerman-short-haired-m5cgaysqztmwgsq6.jpg',
    officialName: {
      local: 'Mikasa Ackerman',
      en: 'Mikasa Ackerman'
    },
    displayName: {
      local:'Mikasa'
    },
    level: 8,
    gender: Gender.Female,
  },
  {
    id: new mongoose.Types.ObjectId(),
    photo: 'https: //i.pinimg.com/736x/ee/4c/d6/ee4cd699956f8dcf3134e120656b6ddd.jpg',
    officialName: {
      local: 'Armin Arlert',
      en: 'Armin Arlert'
    },
    displayName: {
      local:'Armin'
    },
    level: 8,
    gender: Gender.Male
  }
]

export default mockPlayers