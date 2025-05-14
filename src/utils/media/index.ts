import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'

const uploadPhoto = async(photo: string, folder: string, name: string):Promise<UploadApiResponse> => {
  try {
    const result = await cloudinary.uploader.upload(photo, {
      folder,
      public_id: name,
      invalidate: true,
      overwrite: true, // overwrite existing image
      transformation: [
        { width: 1024, crop: 'limit', quality: 'auto', fetch_format: 'auto' }  // limit size and compress
      ]
    })
    return result
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw error as UploadApiErrorResponse
  }
}

const getOptimizedUrl = (path: string, version: number): string => {
  const url = cloudinary.url(path, {
    version,
    transformation: [
      { crop: 'limit', quality: 'auto', fetch_format: 'auto' }  // limit size and compress
    ]
  })
  return url
}

// Delete a single image
const deleteImage = async(public_id: string): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await cloudinary.uploader.destroy(public_id)
    console.log('Delete result:', result)
  } catch (error) {
    console.error('Error deleting image:', error)
  }
}

// Delete multiple images
const deleteImages = async(publicIds: string[]): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await cloudinary.api.delete_resources(publicIds)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log('Deleted images:', result.deleted)
  } catch (error) {
    console.error('Error deleting images:', error)
  }
}


export default {
  uploadPhoto,
  deleteImage,
  deleteImages,
  getOptimizedUrl
}
