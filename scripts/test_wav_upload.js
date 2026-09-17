const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const parts = line.trim().split('=');
  if (parts.length >= 2) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    process.env[k] = v;
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function run() {
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  const track = await sql`SELECT id, title, created_at, audio_url FROM tracks WHERE id = 'track_mu5svjj0_zswk'`;
  console.log('Track created_at:', track[0]?.created_at);
  
  if (track[0]?.audio_url) {
    const res = await cloudinary.uploader.upload(track[0].audio_url, {
      folder: 'museic/tracks',
      resource_type: 'video',
    });
    console.log('Upload success! URL:', res.secure_url);
    await sql`UPDATE tracks SET audio_url = ${res.secure_url} WHERE id = 'track_mu5svjj0_zswk'`;
    console.log('Updated database record with Cloudinary URL!');
  }
}

run().catch(console.error);
