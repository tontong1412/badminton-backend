import { Request, Response } from 'express'
import VenueModel from '../../schema/venue'
import mediaUtils from '../../utils/media'
import config from '../../config'

interface UploadImagePayload {
  type: 'coverImage' | 'logo';
  image: string; // base64 data URI
}

const uploadImage = async(
  req: Request<{ id: string }, unknown, UploadImagePayload>,
  res: Response,
): Promise<void> => {
  const { type, image } = req.body
  const venueId = req.params.id

  if (!type || !['coverImage', 'logo'].includes(type)) {
    res.status(400).json({ message: 'type must be "coverImage" or "logo"' })
    return
  }

  if (!image || !image.startsWith('data:image/')) {
    res.status(400).json({ message: 'image must be a base64 data URI (data:image/*;base64,...)' })
    return
  }

  const venue = await VenueModel.findById(venueId)
  if (!venue) {
    res.status(404).json({ message: 'Venue not found' })
    return
  }

  const folder = `${config.CLOUDINARY_PREFIX}venues/${venueId}`
  const publicId = type // 'coverImage' or 'logo'

  const result = await mediaUtils.uploadPhoto(image, folder, publicId)

  const updated = await VenueModel.findByIdAndUpdate(
    venueId,
    { [type]: result.secure_url },
    { new: true },
  )

  res.json(updated)
}

export default uploadImage
