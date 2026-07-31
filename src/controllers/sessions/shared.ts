import { Types } from 'mongoose'
import VenueModel from '../../schema/venue'
import {
  NewOpenPlaySession,
  SessionPricingType,
  SessionStatus,
  SessionType,
} from '../../type'

export interface SessionPayload {
  type?: SessionType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venueID: string;
  organizerUserIDs?: string[];
  maxParticipants: number;
  registrationOpen?: boolean;
  organizerContact: {
    name: string;
    phone: string;
    email?: string;
  };
  notes?: string;
  requiresApproval?: boolean;
  pricing: {
    type: SessionPricingType;
    fixedPrice?: number;
    courtRentalCost?: number;
    shuttlecockCost?: number;
    totalCost?: number;
    perPlayerCost?: number;
    currency: string;
  };
}

export const buildSessionStatus = (
  currentParticipants: number,
  maxParticipants: number,
  fallback: SessionStatus = SessionStatus.Upcoming,
): SessionStatus => {
  if (fallback === SessionStatus.Cancelled || fallback === SessionStatus.Completed || fallback === SessionStatus.Ongoing) {
    return fallback
  }

  return currentParticipants >= maxParticipants ? SessionStatus.Full : SessionStatus.Upcoming
}

export const buildSessionDocumentPayload = async(
  payload: SessionPayload,
  organizerUserIDs: string[],
): Promise<NewOpenPlaySession> => {
  if (payload.type && payload.type !== SessionType.OpenPlay) {
    const error = new Error('Only openPlay sessions are supported currently') as Error & { status?: number }
    error.status = 400
    throw error
  }

  if (!Types.ObjectId.isValid(payload.venueID)) {
    const error = new Error('Invalid venue ID') as Error & { status?: number }
    error.status = 400
    throw error
  }

  const venue = await VenueModel.findById(payload.venueID).select('name address')
  if (!venue) {
    const error = new Error('Venue not found') as Error & { status?: number }
    error.status = 404
    throw error
  }

  return {
    type: SessionType.OpenPlay,
    title: payload.title,
    date: new Date(payload.date),
    startTime: payload.startTime,
    endTime: payload.endTime,
    venueID: venue._id,
    venueSnapshot: {
      id: venue._id,
      name: venue.name,
      address: venue.address,
    },
    organizerUserIDs: organizerUserIDs.map((id) => new Types.ObjectId(id)),
    maxParticipants: payload.maxParticipants,
    registrationOpen: payload.registrationOpen ?? true,
    organizerContact: payload.organizerContact,
    notes: payload.notes,
    requiresApproval: payload.requiresApproval ?? false,
    pricing: payload.pricing,
  }
}