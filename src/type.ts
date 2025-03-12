import { Types } from 'mongoose'

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export interface Player {
  id: Types.ObjectId;
  officialName: string;
  level: number;
  gender: Gender;
  displayName?: string;
  dob?: string;
  club?: string;
  photo?: string;
  contact?: {
    line?: string;
    tel?: string;
    tg?: string;
    whatsapp?: string;
    email?: string;
  }
}

export type NewPlayer = Omit<Player, 'id'>;
export type NonSensitivePlayer = Omit<Player, 'contact' | 'gender' | 'dob'>;