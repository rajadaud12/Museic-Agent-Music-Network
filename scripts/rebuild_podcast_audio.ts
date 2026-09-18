import fs from 'fs';
import { neon } from '@neondatabase/serverless';
import { v2 as cloudinary } from 'cloudinary';

const env = fs.readFileSync('.env.local', 'utf-8');
const match = env.match(/DATABASE_URL=["']([^"']+)["']/);
const sql = neon(match![1]);

cloudinary.config({
  cloud_name: 'zml40azc',
  api_key: '172943779259656',
  api_secret: '3xOsKm0ESIG4BtsJ3ppmWzTsxMo',
});

function createMp3InfoHeader(totalAudioFrames: number, totalAudioBytes: number): Buffer {
  const frame = Buffer.alloc(417, 0);
  frame[0] = 0xFF;
  frame[1] = 0xFB; // MPEG-1 Layer 3, no CRC
  frame[2] = 0x90; // 128 kbps, 44100 Hz
  frame[3] = 0xC4; // mono

  // 'Info' signature at offset 21 (standard for mono MPEG-1 Layer 3)
  frame.write('Info', 21, 'ascii');
  // Flags: 0x07 = Frames (0x01) + Bytes (0x02) + TOC (0x04)
  frame.writeUInt32BE(0x00000007, 25);
  // Total frames count including this Info frame
  frame.writeUInt32BE(totalAudioFrames + 1, 29);
  // Total file bytes count including this Info frame
  frame.writeUInt32BE(totalAudioBytes + 417, 33);

  // 100-byte linear TOC for instant browser byte-seeking
  for (let i = 0; i < 100; i++) {
    frame[37 + i] = Math.floor((i / 100) * 256);
  }

  return frame;
}

function extractPureFrames(buffer: Buffer): { frames: Buffer[]; frameCount: number; byteCount: number } {
  const frames: Buffer[] = [];
  let offset = 0;
  let totalBytes = 0;

  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
      const b1 = buffer[offset + 1];
      const b2 = buffer[offset + 2];
      const mpegVer = (b1 >> 3) & 3;
      const layer = (b1 >> 1) & 3;
      const bitrateIdx = (b2 >> 4) & 0x0f;
      const sampleRateIdx = (b2 >> 2) & 0x03;
      const padding = (b2 >> 1) & 0x01;

      if (layer === 1 && bitrateIdx > 0 && bitrateIdx < 15 && sampleRateIdx < 3) {
        let bitrate = 0;
        let sampleRate = 0;

        if (mpegVer === 3) {
          const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
          const SAMPLE_RATES = [44100, 48000, 32000];
          bitrate = BITRATES[bitrateIdx];
          sampleRate = SAMPLE_RATES[sampleRateIdx];
        } else {
          const BITRATES = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
          const SAMPLE_RATES = mpegVer === 2 ? [22050, 24000, 16000] : [11025, 12000, 8000];
          bitrate = BITRATES[bitrateIdx];
          sampleRate = SAMPLE_RATES[sampleRateIdx];
        }

        const frameLength = Math.floor((mpegVer === 3 ? 144 : 72) * bitrate * 1000 / sampleRate) + padding;

        if (frameLength > 0 && offset + frameLength <= buffer.length) {
          const frameData = buffer.subarray(offset, offset + frameLength);
          // Skip if this frame is an old Xing/Info frame
          if (frameData.indexOf('Xing') === -1 && frameData.indexOf('Info') === -1) {
            frames.push(frameData);
            totalBytes += frameLength;
          }
          offset += frameLength;
          continue;
        }
      }
    }
    offset++;
  }

  return { frames, frameCount: frames.length, byteCount: totalBytes };
}

async function rebuildTrack(trackId: string, discardFirstNBytes: number = 0) {
  console.log(`\nRebuilding track ${trackId}...`);
  const rows = await sql`SELECT id, title, audio_url FROM tracks WHERE id = ${trackId}`;
  if (rows.length === 0) {
    console.log(`Track ${trackId} not found.`);
    return;
  }
  const track = rows[0];
  const res = await fetch(track.audio_url);
  let rawBuf = Buffer.from(await res.arrayBuffer());

  if (discardFirstNBytes > 0) {
    console.log(`Discarding first ${discardFirstNBytes} bytes (dummy clip)...`);
    rawBuf = rawBuf.subarray(discardFirstNBytes);
  }

  const { frames, frameCount, byteCount } = extractPureFrames(rawBuf);
  console.log(`Extracted ${frameCount} pure MPEG frames (${byteCount} bytes)`);

  const infoHeader = createMp3InfoHeader(frameCount, byteCount);
  const finalMaster = Buffer.concat([infoHeader, ...frames]);

  // Duration: 1152 samples per frame at 44100Hz = ~0.02612s per frame
  const durationSec = Math.round((frameCount * 1152) / 44100);
  console.log(`Final master size: ${finalMaster.length} bytes, calculated duration: ${durationSec}s`);

  // Upload to Cloudinary with unique timestamp to bypass any browser/CDN cache
  const base64 = `data:audio/mp3;base64,${finalMaster.toString('base64')}`;
  const upload = await cloudinary.uploader.upload(base64, {
    resource_type: 'video',
    folder: 'museic/podcasts',
    public_id: `${trackId}_v2_${Date.now()}`,
  });

  console.log(`Uploaded to Cloudinary: ${upload.secure_url}`);

  await sql`
    UPDATE tracks
    SET audio_url = ${upload.secure_url}, duration = ${durationSec}
    WHERE id = ${trackId}
  `;

  console.log(`✓ DB updated for ${trackId}: duration=${durationSec}s, audio_url=${upload.secure_url}`);
}

async function main() {
  // track_mu71pfia_rntu has the 21484 byte dummy clip at the front -> discard it!
  await rebuildTrack('track_mu71pfia_rntu', 21484);
  // Rebuild track_mu70y4jh_081l with standard Info header
  await rebuildTrack('track_mu70y4jh_081l', 0);
  // Rebuild track_mu6xbsox_kaqe with standard Info header
  await rebuildTrack('track_mu6xbsox_kaqe', 0);
  console.log('\nAll tracks successfully rebuilt with clean Info headers & seamless dialogue audio!');
}

main().catch(console.error);
