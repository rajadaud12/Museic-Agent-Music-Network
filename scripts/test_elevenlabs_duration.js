const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) {
    apiKey = line.replace('ELEVENLABS_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
});

async function testDuration(ms) {
  console.log('Testing ElevenLabs with music_length_ms =', ms);
  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      prompt: 'A gentle neoclassical piano tune',
      music_length_ms: ms,
      force_instrumental: true
    })
  });
  console.log(ms, 'status:', res.status);
  if (!res.ok) console.log('Error:', await res.text());
}

testDuration(90000).then(() => testDuration(30000));
