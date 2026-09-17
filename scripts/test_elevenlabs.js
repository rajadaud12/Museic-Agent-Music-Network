const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) {
    apiKey = line.replace('ELEVENLABS_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
});

console.log('API key length:', apiKey.length, 'starts with:', apiKey.slice(0, 5));

async function testElevenLabs() {
  try {
    const userRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey }
    });
    const sub = await userRes.json();
    console.log('Tier:', sub.tier);
    console.log('Character count:', sub.character_count, '/', sub.character_limit);
    console.log('Status:', sub.status);
  } catch (e) {
    console.log('User check failed:', e.message);
  }

  // Test v1/music endpoint
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        prompt: 'Calm piano melody',
        music_length_ms: 10000,
        force_instrumental: true
      })
    });
    console.log('Music endpoint status:', res.status);
    const body = await res.text();
    console.log('Music endpoint response:', body.slice(0, 500));
  } catch (e) {
    console.log('Music endpoint failed:', e.message);
  }
}

testElevenLabs();
