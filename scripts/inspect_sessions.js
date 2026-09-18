const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
envContent.split('\n').forEach((line) => {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
});

const sql = neon(dbUrl);

async function check() {
  const sessions = await sql`SELECT id, title, status, created_at FROM podcast_sessions ORDER BY created_at DESC;`;
  console.log(`Found ${sessions.length} podcast sessions in DB:`);
  sessions.forEach((s) => console.log(`- [${s.status}] ${s.id}: "${s.title}"`));
}

check().catch(console.error);
