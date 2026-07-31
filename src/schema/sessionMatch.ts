import mongoose, { Document, Schema, Types } from 'mongoose'
import constants from '../constants'
import {
  SessionMatchStatus,
  SessionOpenPlayMatch,
} from '../type'

type MatchTeamDoc = {
  playerIDs: Types.ObjectId[];
  playerSnapshots: Array<{
    id: Types.ObjectId;
    officialName?: { th?: string; en?: string; pronunciation?: string };
    displayName?: { th?: string; en?: string; pronunciation?: string };
    level?: number;
    club?: string;
  }>;
}

export interface SessionMatchDocument extends Omit<SessionOpenPlayMatch, 'id' | 'teams'>, Document {
  sessionID: Types.ObjectId;
  teams: [MatchTeamDoc, MatchTeamDoc];
}

const playerSnapshotSchema = new Schema(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    officialName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String, trim: true },
    },
    displayName: {
      th: { type: String, trim: true },
      en: { type: String, trim: true },
      pronunciation: { type: String, trim: true },
    },
    level: { type: Number, min: 0 },
    club: { type: String, trim: true },
  },
  { _id: false },
)

const matchTeamSchema = new Schema(
  {
    playerIDs: { type: [Schema.Types.ObjectId], default: [] },
    playerSnapshots: { type: [playerSnapshotSchema], default: [] },
  },
  { _id: false },
)

const sessionMatchSchema = new Schema<SessionMatchDocument>(
  {
    sessionID: {
      type: Schema.Types.ObjectId,
      ref: constants.DATABASE.COLLECTION.SESSION,
      required: true,
    },
    court: { type: String, required: true, trim: true },
    teams: {
      type: [matchTeamSchema],
      required: true,
      validate: {
        validator: (teams: unknown[]) => teams.length === 2,
        message: 'Each match must have exactly 2 teams',
      },
    },
    status: {
      type: String,
      enum: Object.values(SessionMatchStatus),
      required: true,
      default: SessionMatchStatus.Pending,
    },
    startedAt: { type: Date },
    endedAt: { type: Date },
    winnerTeamIndex: {
      type: Number,
      enum: [0, 1],
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
)

sessionMatchSchema.virtual('id').get(function(this: SessionMatchDocument): string {
  return this._id instanceof mongoose.Types.ObjectId
    ? this._id.toHexString()
    : String(this._id)
})

sessionMatchSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const record = ret as unknown as Record<string, unknown>
    delete record._id
    delete record.__v
    return record
  },
})

const SessionMatchModel = mongoose.model<SessionMatchDocument>(
  constants.DATABASE.COLLECTION.SESSION_MATCH,
  sessionMatchSchema,
)

export default SessionMatchModel
