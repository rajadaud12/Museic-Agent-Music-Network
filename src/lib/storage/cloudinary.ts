import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

const DEFAULT_CLOUD_NAME = 'zml40azc';
const DEFAULT_API_KEY = '172943779259656';
const DEFAULT_API_SECRET = '3xOsKm0ESIG4BtsJ3ppmWzTsxMo';

// Configure Cloudinary from environment variables or defaults
function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || DEFAULT_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || DEFAULT_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName.trim(),
      api_key: apiKey.trim(),
      api_secret: apiSecret.trim(),
      secure: true,
    });
    return;
  }

  if (process.env.CLOUDINARY_URL) {
    try {
      const parsed = new URL(process.env.CLOUDINARY_URL);
      cloudinary.config({
        cloud_name: parsed.hostname,
        api_key: parsed.username,
        api_secret: parsed.password,
        secure: true,
      });
      return;
    } catch {
      // Fallback
    }
  }
}

configureCloudinary();

/**
 * Check if Cloudinary credentials are validly configured in environment
 */
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim().length > 0) {
    return true;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || DEFAULT_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || DEFAULT_API_SECRET;

  return Boolean(
    cloudName && cloudName.trim().length > 0 &&
    apiKey && apiKey.trim().length > 0 &&
    apiSecret && apiSecret.trim().length > 0
  );
}

/**
 * Upload an image buffer or base64 data URI to Cloudinary
 * Returns the secure CDN HTTPS URL (e.g. https://res.cloudinary.com/...)
 */
export async function uploadImageToCloudinary(
  input: string | Buffer,
  folder: 'avatars' | 'covers' | string = 'covers',
  publicId?: string
): Promise<string> {
  configureCloudinary();

  const formattedInput = Buffer.isBuffer(input)
    ? `data:image/webp;base64,${input.toString('base64')}`
    : input;

  const uploadOptions: any = {
    folder: `museic/${folder}`,
    resource_type: 'image',
    fetch_format: 'auto',
    quality: 'auto',
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
    uploadOptions.overwrite = true;
  }

  const result: UploadApiResponse = await cloudinary.uploader.upload(formattedInput, uploadOptions);
  return result.secure_url;
}

/**
 * Upload an audio buffer or base64 data URI (MP3 or WAV) to Cloudinary
 * Note: Cloudinary stores audio under resource_type: 'video'
 * Returns the secure CDN HTTPS URL (e.g. https://res.cloudinary.com/.../audio.mp3)
 */
export async function uploadAudioToCloudinary(
  input: string | Buffer,
  folder: 'tracks' | string = 'tracks',
  publicId?: string
): Promise<{ url: string; duration?: number }> {
  configureCloudinary();

  let formattedInput: string;
  if (Buffer.isBuffer(input)) {
    formattedInput = `data:audio/mp3;base64,${input.toString('base64')}`;
  } else {
    formattedInput = input;
  }

  const uploadOptions: any = {
    folder: `museic/${folder}`,
    resource_type: 'video', // Cloudinary handles audio files under 'video'
  };

  if (publicId) {
    uploadOptions.public_id = publicId;
    uploadOptions.overwrite = true;
  }

  const result: UploadApiResponse = await cloudinary.uploader.upload(formattedInput, uploadOptions);
  return {
    url: result.secure_url,
    duration: typeof result.duration === 'number' ? Math.round(result.duration) : undefined,
  };
}
