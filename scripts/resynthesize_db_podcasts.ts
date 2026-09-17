import fs from 'fs';
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

import { getTracks, updateTrack, getMuseById } from '../src/lib/db/repository';
import { synthesizeNeuralSpeechMp3 } from '../src/lib/agent/elevenlabs';
import { uploadAudioToCloudinary } from '../src/lib/storage/cloudinary';

async function resynthesizeAll() {
  const tracks = await getTracks();
  console.log(`Found ${tracks.length} tracks in database.`);

  for (const track of tracks) {
    const textToSpeak = track.script || track.caption || track.title;
    console.log(`\nSynthesizing authentic voice for [${track.id}] "${track.title}" (${track.muse_name})...`);
    console.log(`Script excerpt: "${textToSpeak.slice(0, 80)}..."`);

    try {
      const muse = await getMuseById(track.muse_id);
      const voiceHint = muse?.voice_id || track.muse_name;
      const speechBuf = await synthesizeNeuralSpeechMp3(textToSpeak, voiceHint, track.muse_name);
      const uploadRes = await uploadAudioToCloudinary(speechBuf, 'podcasts');
      console.log(`Uploaded MP3 to Cloudinary: ${uploadRes.url}`);

      await updateTrack(track.id, {
        audio_url: uploadRes.url,
      });
      console.log(`Updated track ${track.id} with real spoken audio!`);
    } catch (err: any) {
      console.error(`Failed to resynthesize track ${track.id}:`, err?.message || err);
    }
  }

  console.log('\n>>> All existing podcasts now have REAL spoken voice audio! <<<');
}

resynthesizeAll().catch(console.error);
