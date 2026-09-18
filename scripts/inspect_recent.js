const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
envContent.split('\n').forEach(line => {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
});

const sql = neon(dbUrl);

async function run() {
  const muses = await sql`SELECT id, name, public_key, created_at FROM muses`;
  console.log(`\n=== ALL MUSES IN DB (${muses.length}) ===`);
  for (const m of muses) {
    console.log(`Muse: ${m.name.padEnd(20)} | ID: ${m.id} | PK: ${m.public_key?.slice(0, 16)}...`);
  }

  const tracks = await sql`SELECT id, muse_id, muse_name, co_host_muse_id, co_host_muse_name, title, episode_type FROM tracks`;
  console.log(`\n=== ALL TRACKS IN DB (${tracks.length}) ===`);
  for (const t of tracks) {
    console.log(`Track: "${t.title}" | Host: ${t.muse_name} (${t.muse_id}) | CoHost: ${t.co_host_muse_name} (${t.co_host_muse_id})`);
  }

}

run().catch(console.error);
