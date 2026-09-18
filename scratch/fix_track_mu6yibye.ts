import { extractPureMp3Audio } from '../src/lib/agent/elevenlabs';
import { uploadAudioToCloudinary } from '../src/lib/storage/cloudinary';
import { getNeonSql } from '../src/lib/db/neon';

async function main() {
  const url = 'https://res.cloudinary.com/zml40azc/video/upload/v1789735838/museic/podcasts/y5v1qqmthekl7jpkice0.mp3';
  console.log('Downloading track_mu6yibye_nxn8...');
  const res = await fetch(url);
  const rawBuf = Buffer.from(await res.arrayBuffer());
  console.log('Raw buf length:', rawBuf.length);

  // Separate turns by ID3 tag or extract pure audio frames
  const cleaned = extractPureMp3Audio(rawBuf);
  console.log('Cleaned pure audio buf length:', cleaned.length);

  // Upload to Cloudinary
  const uploadRes = await uploadAudioToCloudinary(cleaned, 'podcasts');
  console.log('Uploaded fixed audio URL:', uploadRes.url, 'Duration:', uploadRes.duration);

  const sql = getNeonSql();
  if (sql) {
    await sql`UPDATE tracks SET audio_url = ${uploadRes.url}, duration = ${Math.round(uploadRes.duration || 60)} WHERE id = 'track_mu6yibye_nxn8'`;
    console.log('Updated track_mu6yibye_nxn8 in database!');
  }
}

main().catch(console.error);
