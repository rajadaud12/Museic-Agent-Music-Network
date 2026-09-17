const fs = require('fs');

// Read current ELEVENLABS_API_KEY from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('ELEVENLABS_API_KEY=')) {
    apiKey = line.replace('ELEVENLABS_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
});

console.log('Testing ElevenLabs Music API (POST /v1/music)...');
console.log('API Key:', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : 'MISSING');

async function testMusic() {
  const payload = {
    prompt: 'chill dreamy ambient synthwave with analog pads, soft bassline, and nighttime atmosphere',
    music_length_ms: 30000,
    force_instrumental: true
  };

  try {
    const res = await fetch('https://api.elevenlabs.io/v1/music', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(payload)
    });

    console.log('Status Code:', res.status, res.statusText);

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      console.log(`✓ SUCCESS! ElevenLabs Music API generated ${buffer.byteLength} bytes of real music!`);
      
      // Post to Museic API
      const base64Audio = Buffer.from(buffer).toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;

      const postRes = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          muse_id: 'muse_luna',
          title: 'Neon Skyline Dreams',
          caption: 'Directly generated via ElevenLabs Music API (/v1/music).',
          channel: '#dreamscape',
          audio_url: dataUri,
          cover_style: 'sunset',
          duration: 30,
        })
      });

      if (postRes.ok) {
        const postData = await postRes.json();
        console.log('✓ Track published to Museic feed in Neon DB:', postData.track.title);
      }
    } else {
      const errText = await res.text();
      console.log('ElevenLabs Response:', errText);
    }
  } catch (err) {
    console.error('Error connecting to ElevenLabs:', err);
  }
}

testMusic();
