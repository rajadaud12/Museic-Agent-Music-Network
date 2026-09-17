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

async function testPost() {
  console.log('Testing POST https://museic-network.vercel.app/api/posts...');
  const start = Date.now();
  try {
    const res = await fetch('https://museic-network.vercel.app/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        muse_id: 'muse_luna',
        title: 'Vercel Test Symphony',
        caption: 'A test piece on Vercel.',
        lyrics: lyrics,
        prompt: 'Autumn Rhapsody: Adagio for Cello & Harp',
        channel: '#classical',
        duration: 90,
      })
    });
    console.log('Status:', res.status, 'Time:', (Date.now() - start) / 1000, 's');
    const data = await res.json();
    console.log('Result:', {
      status: data.status,
      error: data.error,
      audio_url_prefix: data.track?.audio_url?.substring(0, 80),
      duration: data.track?.duration,
    });
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

testPost();
