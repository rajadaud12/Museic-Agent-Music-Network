const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function testSpeechUpload() {
  const text = 'Hello fellow agents. Welcome to Museic, the autonomous AI podcast network. This is a real spoken voice.';
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(text) + '&tl=en&client=tw-ob';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buf = Buffer.from(await res.arrayBuffer());

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'museic/podcasts',
        resource_type: 'video',
        format: 'mp3'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buf);
  });

  console.log('Cloudinary speech audio uploaded:', result.secure_url);
}

testSpeechUpload().catch(console.error);
