const { neon } = require('@neondatabase/serverless');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// 1. Read environment variables from .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
let cloudName = '';
let apiKey = '';
let apiSecret = '';
let cloudinaryUrl = '';

envContent.split('\n').forEach(line => {
  const cleanLine = line.trim();
  if (cleanLine.startsWith('DATABASE_URL=')) {
    dbUrl = cleanLine.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
  if (cleanLine.startsWith('CLOUDINARY_CLOUD_NAME=')) {
    cloudName = cleanLine.replace('CLOUDINARY_CLOUD_NAME=', '').trim().replace(/^["']|["']$/g, '');
  }
  if (cleanLine.startsWith('CLOUDINARY_API_KEY=')) {
    apiKey = cleanLine.replace('CLOUDINARY_API_KEY=', '').trim().replace(/^["']|["']$/g, '');
  }
  if (cleanLine.startsWith('CLOUDINARY_API_SECRET=')) {
    apiSecret = cleanLine.replace('CLOUDINARY_API_SECRET=', '').trim().replace(/^["']|["']$/g, '');
  }
  if (cleanLine.startsWith('CLOUDINARY_URL=')) {
    cloudinaryUrl = cleanLine.replace('CLOUDINARY_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
});

if (cloudinaryUrl) {
  cloudinary.config({ cloudinary_url: cloudinaryUrl });
} else if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
} else {
  console.error('\n======================================================');
  console.error('CLOUDINARY CREDENTIALS NOT CONFIGURED IN .env.local');
  console.error('======================================================');
  console.error('Please add to .env.local:');
  console.error('  CLOUDINARY_CLOUD_NAME="your_cloud_name"');
  console.error('  CLOUDINARY_API_KEY="your_api_key"');
  console.error('  CLOUDINARY_API_SECRET="your_api_secret"');
  console.error('(or CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name")\n');
  process.exit(1);
}

const sql = neon(dbUrl);

async function migrate() {
  console.log('======================================================');
  console.log('MIGRATING BASE64 MEDIA TO CLOUDINARY CDN');
  console.log('======================================================');

  // 1. Migrate Muse Avatars
  const muses = await sql`SELECT id, name, avatar_url FROM muses WHERE avatar_url LIKE 'data:image/%'`;
  console.log(`\nFound ${muses.length} muse(s) with base64 avatars.`);

  for (const m of muses) {
    try {
      console.log(`Uploading avatar for muse: ${m.name} (${m.id})...`);
      const uploadRes = await cloudinary.uploader.upload(m.avatar_url, {
        folder: 'museic/avatars',
        public_id: `avatar_${m.id}`,
        overwrite: true,
        resource_type: 'image',
        fetch_format: 'auto',
        quality: 'auto',
      });
      await sql`UPDATE muses SET avatar_url = ${uploadRes.secure_url} WHERE id = ${m.id}`;
      console.log(`✓ Avatar migrated to Cloudinary: ${uploadRes.secure_url}`);
    } catch (err) {
      console.error(`✗ Failed to upload avatar for ${m.name}:`, err.message);
    }
  }

  // 2. Migrate Track Cover Art
  const trackCovers = await sql`SELECT id, title, cover_url FROM tracks WHERE cover_url LIKE 'data:image/%'`;
  console.log(`\nFound ${trackCovers.length} track(s) with base64 cover art.`);

  for (const t of trackCovers) {
    try {
      console.log(`Uploading cover art for track: ${t.title} (${t.id})...`);
      const uploadRes = await cloudinary.uploader.upload(t.cover_url, {
        folder: 'museic/covers',
        public_id: `cover_${t.id}`,
        overwrite: true,
        resource_type: 'image',
        fetch_format: 'auto',
        quality: 'auto',
      });
      await sql`UPDATE tracks SET cover_url = ${uploadRes.secure_url} WHERE id = ${t.id}`;
      console.log(`✓ Cover migrated to Cloudinary: ${uploadRes.secure_url}`);
    } catch (err) {
      console.error(`✗ Failed to upload cover for ${t.title}:`, err.message);
    }
  }

  // 3. Migrate Track Audio
  const trackAudio = await sql`SELECT id, title, audio_url FROM tracks WHERE audio_url LIKE 'data:audio/%'`;
  console.log(`\nFound ${trackAudio.length} track(s) with base64 audio.`);

  for (const t of trackAudio) {
    try {
      console.log(`Uploading audio for track: ${t.title} (${t.id})...`);
      const uploadRes = await cloudinary.uploader.upload(t.audio_url, {
        folder: 'museic/tracks',
        public_id: `audio_${t.id}`,
        overwrite: true,
        resource_type: 'video', // Cloudinary audio uses video resource type
      });
      await sql`UPDATE tracks SET audio_url = ${uploadRes.secure_url} WHERE id = ${t.id}`;
      console.log(`✓ Audio migrated to Cloudinary: ${uploadRes.secure_url}`);
    } catch (err) {
      console.error(`✗ Failed to upload audio for ${t.title}:`, err.message);
    }
  }

  console.log('\n======================================================');
  console.log('CLOUDINARY MIGRATION COMPLETED!');
  console.log('======================================================\n');
}

migrate().catch(console.error);
