import { Types } from 'mongoose'
import { Gender, Team } from '../../src/type'
import randomDraw from '../../src/utils/tournament/randomDraw'
// A sample list of teams to use in the tests
const teams: Team[] = [
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da7b'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b7a'),
      officialName: {
        th: 'ไคโตะ คุโรบะ',
        en: 'Kaito Kuroba'
      },
      level: 2,
      gender: Gender.Male,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da83'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b75'),
      officialName: {
        th: 'คุโด้ ชินอิจิ',
        en: 'Kudo Shinichi'
      },
      level: 2,
      gender: Gender.Male,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da79'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b79'),
      officialName: {
        th: 'ฮัตโตริ เฮย์จิ',
        en: 'Hattori Heiji'
      },
      level: 2,
      gender: Gender.Male,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da7f'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b76'),
      officialName: {
        th: 'อากาอิ ชูอิจิ',
        en: 'Akai Shuichi'
      },
      level: 2,
      gender: Gender.Male,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da77'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b78'),
      officialName: {
        th: 'โมริ รัน',
        en: 'Mori Ran'
      },
      level: 2,
      gender: Gender.Male,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da7d'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b77'),
      officialName: {
        th: 'โทยามะ คาซึฮะ',
        en: 'Toyama Kazuha'
      },
      level: 2,
      gender: Gender.Female,
    }]
  },
  {
    id: new Types.ObjectId('68bbf561b4062cc96b86da81'),
    players: [{
      id: new Types.ObjectId('68bbf693a35c90157a526b74'),
      officialName: {
        th: 'โมริ โคโกโร่',
        en: 'Mori Kogoro'
      },
      level: 2,
      gender: Gender.Male,
    }]
  }
]

// const result = randomDraw.group(teams, 2)
// console.log(JSON.stringify(result, null, 1))

const result = randomDraw.bracket(teams, { seed:true, seedCount:7 })
console.log(result)



