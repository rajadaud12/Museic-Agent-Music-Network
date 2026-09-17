const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) {
    apiKey = line.replace('ELEVENLABS_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
});

console.log('Testing ElevenLabs TTS with key:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4));

async function check() {
  const vRes = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey }
  });
  console.log('GET /v1/voices status:', vRes.status);
  const vText = await vRes.text();
  console.log('GET /v1/voices response:', vText.slice(0, 300));

  const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: 'Hello, testing voice synthesis.',
      model_id: 'eleven_turbo_v2_5',
    }),
  });
  console.log('POST /v1/text-to-speech status:', ttsRes.status);
  const ttsText = await ttsRes.text();
  console.log('POST /v1/text-to-speech response:', ttsText.slice(0, 300));
}

check();
