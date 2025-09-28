import { Request } from 'express'
import { Types } from 'mongoose'

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export interface Player {
  id: Types.ObjectId;
  userID?: Types.ObjectId;
  officialName: {
    th?: string;
    en?: string;
    pronunciation?: string;
  };
  level: number;
  gender?: Gender;
  displayName?: {
    th?: string;
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
export type NonSensitivePlayer = Omit<Player, 'contact' | 'dob' | 'userID'>;

export interface User {
  id: Types.ObjectId;
  email: string;
  hash: string;
  playerID: Types.ObjectId;
  googleID?: string;
}


export type NewUser = Omit<User, 'id'>;
export type NonSensitiveUser = Omit<User, 'hash'>
export type TokenPayload = Omit<NonSensitiveUser, 'googleID'>

export interface Login {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: TokenPayload;
  player: Player | null
}

export interface ErrorResponse {
  message: string;
}

export interface RequestWithCookies extends Request {
  cookies: {
    access?: string;
    refresh?: string;
  }
}

export interface ResponseLocals {
  user: TokenPayload;
}


export interface MailContent {
  to: string;
  subject: string;
  text: string;
}

export interface MailOptions extends MailContent {
  from :{
    name: string;
    address: string;
  }
}

export interface Venue {
  id: Types.ObjectId;
  name: {
    th: string;
    en: string;
  },
  address: string;
  location: {
    type: string; // Point
    coordinates: [number, number];  // [longitude, latitude]
  },
}

export enum TournamentStatus {
  Preparation = 'preparation',
  RegistrationOpen = 'registrationOpen',
  RegistrationClose = 'registrationClose',
  SchedulePublished = 'schedulePublished',
  Ongoing = 'ongoing',
  Finished = 'finished'
}

export enum TournamentQuery {
  Recent = 'recent',
  ThisWeek = 'thisWeek',
  RegistrationOpen = 'registrationOpen'
}

export type SimplePlayer = Pick<Player, 'id' | 'officialName' | 'displayName' | 'photo'>;
export type ContactPlayer = Pick<Player, 'id' | 'officialName' | 'displayName' | 'contact' | 'photo'>;

export type SimpleEvent = Pick<Event, 'id' | 'name' | 'fee' >
export interface TournamentParticipant extends SimplePlayer {
  events: [SimpleEvent];
  contactPerson: ContactPlayer;
  matches: [TournamentMatch]
}

export enum BillingMethod {
  Pair = 'pair',
  Individual = 'individual'
}

export type TournamentEvent = Pick<Event, 'id' | 'name' | 'fee' | 'prize' | 'description' | 'type' | 'limit' | 'format'>

export interface Tournament {
  language: string;
  id: Types.ObjectId;
  name: {
    th?: string;
    en?: string;
  };
  events: [TournamentEvent]
  venue: Venue;
  startDate: Date;
  endDate: Date;
  deadlineDate: Date;
  image?: string;
  logo?: string;
  poster?: string;
  shuttlecockFee?: number;
  useHandicap?: boolean;
  status?: TournamentStatus;
  showParticipantList: boolean;
  managers: [SimplePlayer];
  umpires: [SimplePlayer];
  creator: SimplePlayer;
  contact: ContactPlayer;
  participants: [TournamentParticipant];
  billingMethod: BillingMethod;
  payment: {
    code: string,
    name: string,
    bank: string
  },
}

export type NewTournament = Omit<Tournament, 'id'>;

export enum EventFormat {
  Group = 'group',
  GroupPlayoff = 'groupPlayoff',
  GroupPlayoffConsolation = 'groupPlayoffConsolation',
  SingleElimination = 'singleElim'
}

export enum EventType {
  Single = 'single',
  Double = 'double'
}

export enum EventStatus {
  Group = 'group',
  Playoff = 'playoff',
  Finished = 'finished'
}


export enum TeamStatus {
  Idle = 'idle',
  Reject = 'reject',
  approved = 'approved',
  withdraw = 'withdraw',
}
export type SimpleTournament = Pick<Tournament, 'id' | 'name' | 'shuttlecockFee' | 'billingMethod' | 'showParticipantList' | 'language' | 'managers' | 'payment'>;

export interface Event {
  id: Types.ObjectId;
  description: string;
  tournament: SimpleTournament;
  name: {
    th?: string;
    en?: string;
  };
  level?: number;
  fee: {
    amount: number;
    currency: string;
  };
  prize: string;
  format: EventFormat;
  limit: number;
  type: EventType;
  status: EventStatus;
  teams: EventTeam[];
  draw: {
    group?: Team[][];
    ko?: (Team | string)[];
    consolation?: (Team | string)[];
    elimination?: (Team |  string)[];
  }
}
export type NewEvent = Omit<Event, 'id'>;
export interface Team {
  id: Types.ObjectId;
  players: NonSensitivePlayer[]
}

export type NewTeam = Omit<Team, 'id'>

export enum MatchStatus {
  Waiting = 'waiting',
  Playing = 'playing',
  Finished = 'finished'
}

export interface MatchTeam {
  id: Types.ObjectId;
  players: NonSensitivePlayer[];
  serving: number;
  receiving: number;
  isServing: boolean;
  scoreSet: number;
}
export interface BaseMatch {
  id: Types.ObjectId;
  shuttlecockUsed: number;
  level?: number;
  scoreLabel: string[];
  status: MatchStatus;
  court?: string;
  note?: string;
  date?: Date;
  teamA: MatchTeam | null;
  teamB: MatchTeam | null;
}
export enum TournamentMatchStep {
  Group = 'group',
  Playoff = 'playoff',
  Consolation = 'consolation'
}
export interface TournamentMatch extends BaseMatch {
  event: SimpleEvent;
  matchNumber?: number;
  umpire?: SimplePlayer;
  step: TournamentMatchStep;
  skip?: boolean;
  byePosition?: number;
  round: number; // power of 2
  groupOrder?: number;
  eventOrder?: number;
  bracketOrder?: number;
}

export interface SessionMatch extends BaseMatch {
  session: {
    id: Types.ObjectId;
    name: string;
  }
}

export type Match = TournamentMatch

export type NewMatch = Omit<Match, 'id'>

export enum PaymentStatus {
  Unpaid = 'unpaid',
  Paid = 'paid',
  Pending = 'pending',
  Refunded = 'refunded',
}

export interface EventTeam {
  id: Types.ObjectId;
  players: NonSensitivePlayer[];
  contactPerson: ContactPlayer;
  status: TeamStatus;
  paymentStatus: PaymentStatus;
  slip?: string;
  slipTimestamp?: Date;
  date: Date;
  shuttlecockCredit: number;
  note?: string;
}

