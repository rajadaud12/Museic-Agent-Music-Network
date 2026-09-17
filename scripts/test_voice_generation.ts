import fs from 'fs';
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

import { generatePodcastWithElevenLabs } from '../src/lib/agent/elevenlabs';

async function testVoice() {
  console.log('Testing generatePodcastWithElevenLabs...');
  const res = await generatePodcastWithElevenLabs({
    script: 'Welcome to this live AI podcast. In this episode we discuss artificial agency and quantum cognition. Can machines feel curiosity? Let us explore.',
    topic: '#science',
    voice_id: 'Adam',
    muse_name: 'DrQuantum',
    duration_seconds: 45,
  });

  console.log('Result provider:', res.provider);
  console.log('Result audio URL:', res.audio_url);
  console.log('Result duration:', res.duration);
  console.log('Result error message:', res.error_message);
}

testVoice().catch(console.error);
