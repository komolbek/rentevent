import { createUploadthing, type FileRouter } from 'uploadthing/next-legacy'
import { UTApi } from 'uploadthing/server'
import sharp from 'sharp'

const f = createUploadthing()

// Image settings for mobile-optimized quality
// Standard size: 800x600 (4:3 aspect ratio) - good for product images
const IMAGE_WIDTH = 800
const IMAGE_HEIGHT = 600
const IMAGE_QUALITY = 80

// FileRouter for uploadthing
export const uploadthingRouter = {
  productImage: f({ image: { maxFileSize: '4MB', maxFileCount: 3 } })
    .onUploadComplete(async ({ file }) => {
      console.log('Upload complete:', file.ufsUrl)
      return { url: file.ufsUrl }
    }),

  categoryImage: f({ image: { maxFileSize: '2MB', maxFileCount: 1 } })
    .onUploadComplete(async ({ file }) => {
      console.log('Upload complete:', file.ufsUrl)
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type UploadthingRouter = typeof uploadthingRouter

// Server-side upload utility
export const utapi = new UTApi()

// Crop and compress image before upload for consistent sizes
// Uses center crop to 4:3 aspect ratio (800x600)
async function compressImage(filePath: string): Promise<Buffer> {
  const fs = await import('fs')
  const inputBuffer = fs.readFileSync(filePath)

  // Get image metadata to calculate crop
  const metadata = await sharp(inputBuffer).metadata()
  const { width: origWidth = 0, height: origHeight = 0 } = metadata

  // Calculate target dimensions maintaining 4:3 ratio
  // First, determine which dimension is limiting
  const targetRatio = IMAGE_WIDTH / IMAGE_HEIGHT // 4:3 = 1.333
  const origRatio = origWidth / origHeight

  let cropWidth: number
  let cropHeight: number

  if (origRatio > targetRatio) {
    // Image is wider than target ratio - crop width
    cropHeight = origHeight
    cropWidth = Math.round(origHeight * targetRatio)
  } else {
    // Image is taller than target ratio - crop height
    cropWidth = origWidth
    cropHeight = Math.round(origWidth / targetRatio)
  }

  // Center crop coordinates
  const left = Math.round((origWidth - cropWidth) / 2)
  const top = Math.round((origHeight - cropHeight) / 2)

  // Crop to 4:3 ratio (center crop), then resize to standard size
  const compressedBuffer = await sharp(inputBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
      fit: 'fill', // Fill exact dimensions after crop
    })
    .jpeg({
      quality: IMAGE_QUALITY,
      progressive: true, // Progressive loading for better UX
    })
    .toBuffer()

  console.log(
    `Image cropped & compressed: ${origWidth}x${origHeight} -> ${IMAGE_WIDTH}x${IMAGE_HEIGHT}, ${(inputBuffer.length / 1024).toFixed(1)}KB -> ${(compressedBuffer.length / 1024).toFixed(1)}KB`
  )

  return compressedBuffer
}

export async function uploadFileToUploadthing(
  filePath: string,
  _folder?: string
): Promise<{ url: string }> {
  const path = await import('path')

  // Compress the image first
  const compressedBuffer = await compressImage(filePath)

  // Generate filename with .jpg extension (since we convert to JPEG)
  const originalName = path.basename(filePath)
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  const fileName = `${nameWithoutExt}.jpg`

  const blob = new Blob([compressedBuffer], { type: 'image/jpeg' })
  const file = new File([blob], fileName, { type: 'image/jpeg' })

  const response = await utapi.uploadFiles([file])

  if (response[0]?.error) {
    throw new Error(response[0].error.message)
  }

  if (!response[0]?.data?.ufsUrl) {
    throw new Error('Upload failed - no URL returned')
  }

  return {
    url: response[0].data.ufsUrl,
  }
}

export async function deleteFileFromUploadthing(fileUrl: string): Promise<boolean> {
  try {
    // Extract file key from URL
    const fileKey = fileUrl.split('/').pop()
    if (!fileKey) return false

    await utapi.deleteFiles([fileKey])
    return true
  } catch (error) {
    console.error('Failed to delete file from Uploadthing:', error)
    return false
  }
}
