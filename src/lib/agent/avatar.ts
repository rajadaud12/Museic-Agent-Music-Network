import sharp from 'sharp';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '@/lib/storage/cloudinary';

interface ProcessImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  folder?: 'avatars' | 'covers' | string;
}

/**
 * Process, resize and compress any image input (data URL, base64 string, or https URL).
 * Uploads to Cloudinary if configured and returns the CDN HTTPS URL; otherwise returns WebP base64.
 */
export async function processImage(
  input?: string,
  options: ProcessImageOptions = { width: 256, height: 256, quality: 80, folder: 'covers' }
): Promise<string | undefined> {
  if (!input || typeof input !== 'string') return undefined;

  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // If already hosted on Cloudinary, return as-is
  if (trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }

  const { width = 256, height = 256, quality = 80, folder = 'covers' } = options;

  // Helper to persist buffer to Cloudinary or base64 fallback
  async function persistBuffer(buf: Buffer): Promise<string> {
    if (isCloudinaryConfigured()) {
      try {
        const cdnUrl = await uploadImageToCloudinary(buf, folder);
        return cdnUrl;
      } catch (err) {
        console.warn('Cloudinary image upload failed, falling back to base64 WebP:', err);
      }
    }
    return `data:image/webp;base64,${buf.toString('base64')}`;
  }

  // If input is an external HTTPS image, try fetching, optimizing, and uploading
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 10 * 1024 * 1024) {
          return undefined;
        }
        const compressed = await sharp(buf)
          .resize(width, height, { fit: 'cover', position: 'center' })
          .webp({ quality, effort: 4 })
          .toBuffer();
        return await persistBuffer(compressed);
      }
    } catch (e) {
      console.warn('Failed to fetch/compress remote image, storing original URL as fallback:', e);
      return trimmed;
    }
    return trimmed;
  }

  // If input is a base64 string (either with data URI scheme or raw)
  try {
    let base64Data = trimmed;
    if (trimmed.startsWith('data:image/')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        base64Data = trimmed.slice(commaIdx + 1);
      }
    }

    const buf = Buffer.from(base64Data, 'base64');
    if (buf.length > 10 * 1024 * 1024) {
      throw new Error('Image exceeds maximum allowed size (10MB)');
    }

    // Compress & resize with sharp
    const compressed = await sharp(buf)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .webp({ quality, effort: 4 })
      .toBuffer();

    return await persistBuffer(compressed);
  } catch (err) {
    console.warn('Error processing image:', err);
    if (trimmed.startsWith('data:image/') && trimmed.length < 50000) {
      return trimmed;
    }
    return undefined;
  }
}

/**
 * Process and compress an agent's avatar image (256x256 WebP).
 * Uploads to Cloudinary (museic/avatars) or returns base64.
 */
export async function processAgentAvatar(input?: string): Promise<string | undefined> {
  return processImage(input, { width: 256, height: 256, quality: 80, folder: 'avatars' });
}

/**
 * Process and compress a track's music picture / cover artwork (400x400 WebP).
 * Uploads to Cloudinary (museic/covers) or returns base64.
 */
export async function processTrackCoverImage(input?: string): Promise<string | undefined> {
  return processImage(input, { width: 400, height: 400, quality: 80, folder: 'covers' });
}

