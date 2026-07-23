import { Request } from 'express'
import { Types } from 'mongoose'

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export enum FavoriteItemType {
  Venue = 'venue',
  Tournament = 'tournament',
}

export interface FavoriteItem {
  itemType: FavoriteItemType;
  itemID: string;
  addedAt: Date;
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
  paymentInfo?: {
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    promptPayID?: string;
  }
  favorites?: FavoriteItem[];
}

export type NewPlayer = Omit<Player, 'id'>;
export type NonSensitivePlayer = Omit<Player, 'contact' | 'dob' | 'userID'>;

export interface User {
  id: Types.ObjectId;
  email: string;
  hash: string;
  playerID: Types.ObjectId;
  role: UserRole;
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

export interface RequestWithCookies<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown> extends Request<P, ResBody, ReqBody> {
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
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;    // base64
    encoding: 'base64';
    contentType: string;
  }>;
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

export interface DailySchedule {
  open: string;
  close: string;
}

export interface HolidaySchedule {
  date: Date;
  isClosed: boolean;
  openTime?: string;
  closeTime?: string;
}

export interface BookingVenue extends Venue {
  weeklySchedule: Record<string, DailySchedule | null>;
  holidays: HolidaySchedule[];
  slotDurationMinutes: number;
  ownerUserID: Types.ObjectId;
}

export interface Court {
  id: Types.ObjectId;
  venueID: Types.ObjectId;
  name: string;
  description?: string;
  pricePerHour: number;
  currency: string;
  status: 'active' | 'inactive';
}

export type NewCourt = Omit<Court, 'id'>;

export enum BookingType {
  Single = 'single',
  Recurring = 'recurring',
}

export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export enum RecurringPattern {
  Daily = 'daily',
  Weekly = 'weekly',
}

export enum ResaleStatus {
  Active = 'active',
  Pending = 'pending',
  Sold = 'sold',
  Cancelled = 'cancelled',
}

export enum SellerPayoutStatus {
  Pending = 'pending',
  Paid = 'paid',
}

export enum ResaleOutcome {
  None = 'none',
  Listed = 'listed',
  Resold = 'resold',
}

export interface GuestIdentity {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
}

export interface Booking {
  id: Types.ObjectId;
  bookingBundleID?: Types.ObjectId;
  courtID: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalPrice: number;
  currency: string;
  bookerType: 'guest' | 'user' | 'admin';
  createdByUserID?: Types.ObjectId;
  userID?: Types.ObjectId;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  bookingType: BookingType;
  recurringGroupID?: Types.ObjectId;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  slip?: string;
  slipTimestamp?: Date;
  resaleListingID?: Types.ObjectId;
  resaleSourceListingID?: Types.ObjectId;
  resaleOutcome: ResaleOutcome;
  note?: string;
}

export type NewBooking = Omit<Booking, 'id'>;

export interface RecurringGroup {
  id: Types.ObjectId;
  courtID: Types.ObjectId;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pattern: RecurringPattern;
  daysOfWeek?: number[];
  rangeStart: Date;
  rangeEnd: Date;
  userID: Types.ObjectId;
  bookingIDs: Types.ObjectId[];
}

export type NewRecurringGroup = Omit<RecurringGroup, 'id'>;

export interface ResaleListing {
  id: Types.ObjectId;
  bookingID: Types.ObjectId;
  sellerID: Types.ObjectId;
  venueID: Types.ObjectId;
  venueOwnerID: Types.ObjectId;
  askingPrice: number;
  currency: string;
  status: ResaleStatus;
  buyerType?: 'guest' | 'user';
  buyerID?: Types.ObjectId;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  venuePaymentSlip?: string;
  venuePaymentSlipTimestamp?: Date;
  sellerPayoutStatus: SellerPayoutStatus;
  sellerPayoutAt?: Date;
  soldAt?: Date;
}

export type NewResaleListing = Omit<ResaleListing, 'id'>;

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
  UpComing = 'upComing',
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
  score: number;
  scoreDiff: number;
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

export enum SessionType {
  OpenPlay = 'openPlay',
  Training = 'training',
}

export enum SessionStatus {
  Upcoming = 'upcoming',
  Full = 'full',
  Ongoing = 'ongoing',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum SessionPricingType {
  Fixed = 'fixed',
  Shared = 'shared',
}

export enum SessionRegistrationStatus {
  Pending = 'pending',
  Approved = 'approved',
  WaitingList = 'waitingList',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
  Removed = 'removed',
}

export enum SessionRegistrationPaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  PartiallyPaid = 'partiallyPaid',
  Refunded = 'refunded',
}

export enum SessionAttendanceStatus {
  Registered = 'registered',
  CheckedIn = 'checkedIn',
  NoShow = 'noShow',
  Cancelled = 'cancelled',
}

export interface SessionVenueSnapshot {
  id: Types.ObjectId;
  name: {
    th: string;
    en: string;
  };
  address: string;
}

export interface SessionOrganizerContact {
  name: string;
  phone: string;
  email?: string;
}

export interface SessionPricing {
  type: SessionPricingType;
  fixedPrice?: number;
  courtRentalCost?: number;
  shuttlecockCost?: number;
  totalCost?: number;
  perPlayerCost?: number;
  currency: string;
}

export interface Session {
  id: Types.ObjectId;
  type: SessionType;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  venueID: Types.ObjectId;
  venueSnapshot: SessionVenueSnapshot;
  organizerUserIDs: Types.ObjectId[];
  maxParticipants: number;
  currentParticipants: number;
  waitingCount: number;
  status: SessionStatus;
  registrationOpen: boolean;
  organizerContact: SessionOrganizerContact;
  notes?: string;
}

export interface OpenPlaySession extends Session {
  type: SessionType.OpenPlay;
  requiresApproval: boolean;
  pricing: SessionPricing;
}

export type NewSession = Omit<Session, 'id' | 'currentParticipants' | 'waitingCount' | 'status'>;
export type NewOpenPlaySession = Omit<OpenPlaySession, 'id' | 'currentParticipants' | 'waitingCount' | 'status'>;

export interface SessionRegistration {
  id: Types.ObjectId;
  sessionID: Types.ObjectId;
  playerID: Types.ObjectId;
  player?: SessionRegistrationPlayerSnapshot;
  registeredAt: Date;
  registrationStatus: SessionRegistrationStatus;
  paymentStatus: SessionRegistrationPaymentStatus;
  attendanceStatus: SessionAttendanceStatus;
  waitingPosition?: number;
  approvedByUserID?: Types.ObjectId;
  approvedAt?: Date;
  manuallyAddedByUserID?: Types.ObjectId;
  note?: string;
}

export type NewSessionRegistration = Omit<SessionRegistration, 'id'>;

export interface SessionRegistrationPlayerSnapshot {
  id: Types.ObjectId;
  officialName?: {
    th?: string;
    en?: string;
    pronunciation?: string;
  };
  displayName?: {
    th?: string;
    en?: string;
    pronunciation?: string;
  };
  photo?: string;
  level?: number;
  club?: string;
  contact?: {
    line?: string;
    tel?: string;
    tg?: string;
    whatsapp?: string;
    email?: string;
  };
}

export interface SessionRegistrationDetail extends SessionRegistration {
  player?: SessionRegistrationPlayerSnapshot;
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

// ── Session Matches ───────────────────────────────────────────────────────────

export enum SessionMatchStatus {
  Pending = 'pending',
  Playing = 'playing',
  Completed = 'completed',
  Skipped = 'skipped',
}

export interface SessionMatchTeam {
  playerIDs: Types.ObjectId[];
  playerSnapshots: SessionRegistrationPlayerSnapshot[];
}

export interface SessionOpenPlayMatch {
  id: Types.ObjectId;
  sessionID: Types.ObjectId;
  court: string;
  teams: [SessionMatchTeam, SessionMatchTeam];
  status: SessionMatchStatus;
  startedAt?: Date;
  endedAt?: Date;
  winnerTeamIndex?: 0 | 1;
  createdAt: Date;
}

export type NewSessionOpenPlayMatch = Omit<SessionOpenPlayMatch, 'id' | 'createdAt'>

export interface SessionHeadToHeadCount {
  playerID: Types.ObjectId;
  count: number;
}

export interface SessionPlayerStats {
  playerID: Types.ObjectId;
  player?: SessionRegistrationPlayerSnapshot;
  gamesPlayed: number;
  wins: number;
  losses: number;
  waitingRounds: number;
  playTimeMs: number;
  totalWaitingTimeMs: number;
  currentWaitTimeMs: number;
  waitSinceLastMatchMs?: number;
  currentlyPlaying: boolean;
  lastMatchStartedAt?: Date;
  lastMatchEndedAt?: Date;
  teammateHistory: SessionHeadToHeadCount[];
  opponentHistory: SessionHeadToHeadCount[];
}

export interface SessionStatsResponse {
  sessionID: Types.ObjectId;
  generatedAt: Date;
  players: SessionPlayerStats[];
}

