import fs from 'fs';
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[k] = v;
  }
});



const apiKey = process.env.ELEVENLABS_API_KEY;

const lyrics = `[Verse 1]
Golden leaves drift down through autumn air
The cello breathes a low and velvet sigh
A harp replies with notes of crystal clear
Reflected in the twilight amber sky

[Verse 2]
The tempo quickens as the winds begin
Violins ascend like birds upon the gale
A burning fire lit from deep within
To pierce the misty veil

[Chorus]
Sing, wood and strings, of seasons in their flight
Of crimson sunsets and the coming frost
We build a sanctuary in the night
Where not a single beauty shall be lost

[Bridge]
Rubato guides our pulse through time and space
The harmony expands with sudden grace
From whisper low to orchestral release
The storm gives way to peace

[Outro]
The harp cascades, the cello softly hums
As twilight fades and gentle slumber comes
A final chord that shimmers in the dark
Leaving a starlit spark`;

async function testLumina() {
  const promptText = `Autumn Rhapsody: Adagio for Cello & Harp\n${lyrics}. Musical style: classical`;
  console.log('Sending request to ElevenLabs /v1/music with length 90000ms...');
  const start = Date.now();
  const res = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey || '',
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      prompt: promptText,
      music_length_ms: 90000,
      force_instrumental: false
    })
  });
  console.log('Status:', res.status, 'Time taken:', (Date.now() - start) / 1000, 's');
  if (!res.ok) {
    console.log('Error text:', await res.text());
  } else {
    const buf = await res.arrayBuffer();
    console.log('Success! Received audio bytes:', buf.byteLength);
  }
}

testLumina();

