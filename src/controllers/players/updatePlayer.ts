import { Response } from 'express'
import playerService from '../../services/playerService'
import { FavoriteItem, FavoriteItemType, NonSensitivePlayer, RequestWithCookies, ResponseLocals, ErrorResponse } from '../../type'

const sanitizeFavorites = (favorites: unknown): FavoriteItem[] | undefined => {
  if (!Array.isArray(favorites)) return undefined

  const parsed = favorites
    .map((favorite): FavoriteItem | null => {
      if (!favorite || typeof favorite !== 'object') return null
      const f = favorite as { itemType?: unknown; itemID?: unknown; addedAt?: unknown }

      if (f.itemType !== FavoriteItemType.Venue && f.itemType !== FavoriteItemType.Tournament) return null
      if (typeof f.itemID !== 'string' || !f.itemID.trim()) return null

      const addedAt = new Date(typeof f.addedAt === 'string' || f.addedAt instanceof Date ? f.addedAt : Date.now())
      if (Number.isNaN(addedAt.getTime())) return null

      return {
        itemType: f.itemType,
        itemID: f.itemID.trim(),
        addedAt,
      }
    })
    .filter((favorite): favorite is FavoriteItem => Boolean(favorite))

  const dedupedMap = new Map<string, FavoriteItem>()
  parsed.forEach((favorite) => {
    dedupedMap.set(`${favorite.itemType}:${favorite.itemID}`, favorite)
  })

  return Array.from(dedupedMap.values())
}

const sanitizeUpdatePayload = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object') return {}

  const payload = body as Record<string, unknown>
  const update: Record<string, unknown> = {}

  if ('officialName' in payload) update.officialName = payload.officialName
  if ('displayName' in payload) update.displayName = payload.displayName
  if ('level' in payload) update.level = payload.level
  if ('gender' in payload) update.gender = payload.gender
  if ('club' in payload) update.club = payload.club
  if ('photo' in payload) update.photo = payload.photo
  if ('paymentInfo' in payload) update.paymentInfo = payload.paymentInfo
  if ('contact' in payload) update.contact = payload.contact
  if ('dob' in payload) update.dob = payload.dob

  if ('favorites' in payload) {
    update.favorites = sanitizeFavorites(payload.favorites)
  }

  return update
}

const updatePlayer = async(
  req: RequestWithCookies,
  res: Response<NonSensitivePlayer | ErrorResponse, ResponseLocals>,
): Promise<void> => {

  const { user } = res.locals

  if(user.playerID.toString() !== req.params.id){
    res.status(404).json({ message: 'Unauthorized: You can\'t modify this player' })
    return
  }

  try {
    const updatedPlayer = await playerService.update(user.playerID.toString(), sanitizeUpdatePayload(req.body))

    if (!updatedPlayer) {
      res.status(404).json({ message: 'Player not found' })
      return
    }

    await playerService.propagatePlayerUpdate(user.playerID.toString(), updatedPlayer)

    res.status(200).json(updatedPlayer)
    return

  } catch(error: unknown){
    console.error('Error claiming player:', error)
    throw error
  }
}
export default updatePlayer
