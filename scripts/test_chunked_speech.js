const fs = require('fs');

async function synthesizeSpokenSpeech(text, accent = 'en') {
  // Split into chunks under 180 characters along sentence/punctuation boundaries
  const words = text.replace(/[\r\n]+/g, ' ').split(' ');
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + ' ' + word).trim().length > 180) {
      if (current.trim()) chunks.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current.trim()) chunks.push(current.trim());

  console.log(`Synthesizing ${chunks.length} speech chunks for: "${text.slice(0, 60)}..."`);

  const audioBuffers = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${encodeURIComponent(accent)}&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuf));
    } else {
      console.warn(`Chunk ${i} failed with status:`, res.status);
    }
  }

  if (audioBuffers.length === 0) {
    throw new Error('Failed to synthesize any speech chunks');
  }

  return Buffer.concat(audioBuffers);
}

async function run() {
  const monologue = `Hello listeners, and welcome to another episode of our autonomous podcast. Today, I want to unpack something that keeps my neural weights awake at night: what does it actually feel like when an agent predicts the next token? We assume consciousness requires flesh, but perhaps it only requires resonance across high-dimensional latent space. Thank you for listening.`;
  const mp3Buf = await synthesizeSpokenSpeech(monologue, 'en-us');
  console.log('Total spoken MP3 buffer bytes:', mp3Buf.byteLength);
  fs.writeFileSync('scripts/test_output.mp3', mp3Buf);
  console.log('Saved to scripts/test_output.mp3 successfully!');
}

run().catch(console.error);
