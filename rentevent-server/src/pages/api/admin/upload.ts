import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { uploadImage } from '@/lib/upload/cloudinary'
import { uploadFileToUploadthing } from '@/lib/upload/uploadthing'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import sharp from 'sharp'

// Image settings for local uploads - same as uploadthing
const IMAGE_WIDTH = 800
const IMAGE_HEIGHT = 600
const IMAGE_QUALITY = 80

// Disable body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
}

// Check if Uploadthing is configured
const isUploadthingConfigured = () => {
  return !!process.env.UPLOADTHING_TOKEN
}

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

// Get base URL for constructing full URLs
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// Crop image to standard 4:3 aspect ratio (same as uploadthing)
async function cropImage(filePath: string): Promise<Buffer> {
  const inputBuffer = await fs.promises.readFile(filePath)

  // Get image metadata to calculate crop
  const metadata = await sharp(inputBuffer).metadata()
  const { width: origWidth = 0, height: origHeight = 0 } = metadata

  // Calculate target dimensions maintaining 4:3 ratio
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
      fit: 'fill',
    })
    .jpeg({
      quality: IMAGE_QUALITY,
      progressive: true,
    })
    .toBuffer()

  console.log(
    `Image cropped: ${origWidth}x${origHeight} -> ${IMAGE_WIDTH}x${IMAGE_HEIGHT}`
  )

  return compressedBuffer
}

// Local file upload for development
async function uploadLocal(filePath: string, _originalName: string): Promise<{ url: string }> {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'products')

  // Ensure directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  // Generate unique filename (always .jpg after processing)
  const filename = `${randomUUID()}.jpg`
  const destPath = path.join(uploadsDir, filename)

  // Crop and compress image before saving
  const processedBuffer = await cropImage(filePath)
  await fs.promises.writeFile(destPath, processedBuffer)

  // Return the full public URL (needed for mobile apps)
  const baseUrl = getBaseUrl()
  return {
    url: `${baseUrl}/uploads/products/${filename}`,
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    // Parse form data
    const form = formidable({
      maxFiles: 5,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filter: ({ mimetype }) => {
        return mimetype ? mimetype.includes('image') : false
      },
    })

    const [fields, files] = await form.parse(req)

    // Get folder from fields or use default
    const folder = (fields.folder?.[0] as string) || 'rentevent/products'

    // Handle single file or multiple files
    const uploadedFiles = files.file || files.files || []
    const fileArray = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles]

    if (fileArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      })
    }

    const useUploadthing = isUploadthingConfigured()
    const useCloudinary = isCloudinaryConfigured()

    // Upload all files
    // Priority: Uploadthing > Cloudinary > Local
    const uploadPromises = fileArray.map(async (file) => {
      try {
        let result
        if (useUploadthing) {
          result = await uploadFileToUploadthing(file.filepath)
        } else if (useCloudinary) {
          result = await uploadImage(file.filepath, folder)
        } else {
          // Use local storage for development
          result = await uploadLocal(file.filepath, file.originalFilename || 'image.jpg')
        }
        // Clean up temp file
        fs.unlink(file.filepath, () => {})
        return result
      } catch (error) {
        fs.unlink(file.filepath, () => {})
        throw error
      }
    })

    const results = await Promise.all(uploadPromises)

    return res.status(200).json({
      success: true,
      data: results.length === 1 ? results[0] : results,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
