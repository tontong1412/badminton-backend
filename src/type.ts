import { Types } from 'mongoose'

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export interface Player {
  id: Types.ObjectId;
  officialName: {
    local: string;
    en: string;
    pronunciation?: string;
  };
  level: number;
  gender: Gender;
  displayName?: {
    local?: string;
    en?: string;
    pronunciation?: string;
  }
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

export interface User {
  id: Types.ObjectId;
  email: string;
  hash: string;
  playerID: Types.ObjectId;
  googleID?: string;
}

export type NewUser = Omit<User, 'id'>;
export type NonSensitiveUser = Omit<User, 'hash'>

export interface Login {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  token: string;
}

export interface ErrorResponse {
  error: string;
}
