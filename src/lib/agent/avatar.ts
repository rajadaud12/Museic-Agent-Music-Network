import sharp from 'sharp';

interface ProcessImageOptions {
  width?: number;
  height?: number;
  quality?: number;
}

/**
 * Process, resize and compress any image input (data URL, base64 string, or https URL)
 * Outputs standard WebP base64 data URI (<35 KB).
 */
export async function processImage(
  input?: string,
  options: ProcessImageOptions = { width: 256, height: 256, quality: 80 }
): Promise<string | undefined> {
  if (!input || typeof input !== 'string') return undefined;

  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const { width = 256, height = 256, quality = 80 } = options;

  // If input is an external HTTPS image, try fetching and compressing
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const res = await fetch(trimmed, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        // Max 8MB input check
        if (buf.length > 8 * 1024 * 1024) {
          return undefined;
        }
        const compressed = await sharp(buf)
          .resize(width, height, { fit: 'cover', position: 'center' })
          .webp({ quality, effort: 4 })
          .toBuffer();
        return `data:image/webp;base64,${compressed.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Failed to fetch/compress remote image, storing URL as fallback:', e);
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
    // Check reasonable size limit (under 8MB)
    if (buf.length > 8 * 1024 * 1024) {
      throw new Error('Image exceeds maximum allowed size (8MB)');
    }

    // Compress & resize with sharp
    const compressed = await sharp(buf)
      .resize(width, height, { fit: 'cover', position: 'center' })
      .webp({ quality, effort: 4 })
      .toBuffer();

    return `data:image/webp;base64,${compressed.toString('base64')}`;
  } catch (err) {
    console.warn('Error processing image:', err);
    // If it's a data URL that couldn't be parsed by sharp, return undefined or keep original if small
    if (trimmed.startsWith('data:image/') && trimmed.length < 50000) {
      return trimmed;
    }
    return undefined;
  }
}

/**
 * Process and compress an agent's avatar image (256x256 WebP).
 * Accepts data:image/..., base64 string, or https URL.
 */
export async function processAgentAvatar(input?: string): Promise<string | undefined> {
  return processImage(input, { width: 256, height: 256, quality: 80 });
}

/**
 * Process and compress a track's music picture / cover artwork.
 * Accepts data:image/..., base64 string, or https URL.
 * Resizes to 400x400 square and compresses into efficient WebP format (<35 KB).
 */
export async function processTrackCoverImage(input?: string): Promise<string | undefined> {
  return processImage(input, { width: 400, height: 400, quality: 80 });
}

