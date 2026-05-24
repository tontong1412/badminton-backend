/**
 * Simple in-memory TTL cache for venue and court documents.
 * Both change rarely, so caching them avoids DB round trips on every
 * availability request without needing Redis.
 */
import { Types } from 'mongoose'
import { VenueDocument } from '../schema/venue'

// Minimal plain-object shape for a court lean result (no Mongoose Document methods)
export type CourtLean = {
  _id: Types.ObjectId
  [key: string]: unknown
}

const TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// ── Venue cache (keyed by venueId) ────────────────────────────────────────────

const venueCache = new Map<string, CacheEntry<VenueDocument>>()

export function getCachedVenue(venueId: string): VenueDocument | null {
  const entry = venueCache.get(venueId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { venueCache.delete(venueId); return null }
  return entry.value
}

export function setCachedVenue(venueId: string, value: VenueDocument): void {
  venueCache.set(venueId, { value, expiresAt: Date.now() + TTL_MS })
}

export function invalidateCachedVenue(venueId: string): void {
  venueCache.delete(venueId)
}

// ── Court cache (keyed by venueId → Map<courtId string, lean court object>) ───
// Using Map<string, Record<string, unknown>> avoids fighting Mongoose's lean types.

const courtCache = new Map<string, CacheEntry<Map<string, Record<string, unknown>>>>()

export function getCachedCourts(venueId: string): Map<string, Record<string, unknown>> | null {
  const entry = courtCache.get(venueId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { courtCache.delete(venueId); return null }
  return entry.value
}

export function setCachedCourts(venueId: string, courts: CourtLean[]): void {
  const byId = new Map(courts.map((c) => [c._id.toHexString(), c as Record<string, unknown>]))
  courtCache.set(venueId, { value: byId, expiresAt: Date.now() + TTL_MS })
}

export function invalidateCachedCourts(venueId: string): void {
  courtCache.delete(venueId)
}
