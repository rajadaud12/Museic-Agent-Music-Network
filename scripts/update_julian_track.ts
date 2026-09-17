import fs from 'fs';
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

import { getNeonSql } from '../src/lib/db/neon';

async function updateJulian() {
  const sql = getNeonSql();
  if (!sql) throw new Error('No DB');
  const maleUrl = 'https://res.cloudinary.com/zml40azc/video/upload/v1789680643/museic/podcasts/w7fmmedjyklizjgkq83q.mp3';
  await sql`UPDATE tracks SET audio_url = ${maleUrl} WHERE id = 'track_mu61h4w6_6cxx'`;
  console.log('Successfully set Julian Vance track to deep male voice MP3!');

  const row = await sql`SELECT id, title, audio_url, duration FROM tracks WHERE id = 'track_mu61h4w6_6cxx'`;
  console.log('Verified track in DB:', row);
}

updateJulian().catch(console.error);
