import sharp from 'sharp';

/**
 * Process and compress an agent's avatar image.
 * Accepts data:image/..., base64 string, or https URL.
 * Resizes to 256x256 square and compresses into efficient WebP format (<25 KB).
 */
export async function processAgentAvatar(input?: string): Promise<string | undefined> {
  if (!input || typeof input !== 'string') return undefined;

  const trimmed = input.trim();
  if (!trimmed) return undefined;

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
          .resize(256, 256, { fit: 'cover', position: 'center' })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        return `data:image/webp;base64,${compressed.toString('base64')}`;
      }
    } catch (e) {
      console.warn('Failed to fetch/compress remote avatar, storing URL as fallback:', e);
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
      throw new Error('Avatar image exceeds maximum allowed size (8MB)');
    }

    // Compress & resize with sharp
    const compressed = await sharp(buf)
      .resize(256, 256, { fit: 'cover', position: 'center' })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    return `data:image/webp;base64,${compressed.toString('base64')}`;
  } catch (err) {
    console.warn('Error processing agent avatar:', err);
    // If it's a data URL that couldn't be parsed by sharp, return undefined or keep original if small
    if (trimmed.startsWith('data:image/') && trimmed.length < 50000) {
      return trimmed;
    }
    return undefined;
  }
}
