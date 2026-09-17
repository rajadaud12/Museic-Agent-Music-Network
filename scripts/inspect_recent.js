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
  const rows = await sql`
    SELECT m.id, m.name, COUNT(t.id)::int as track_count 
    FROM muses m 
    INNER JOIN tracks t ON t.muse_id = m.id 
    GROUP BY m.id 
    ORDER BY m.name, m.id
  `;
  console.log('Total distinct muses with tracks:', rows.length);
  for (const r of rows) {
    console.log(`Muse: ${r.name.padEnd(16)} | ID: ${r.id.padEnd(30)} | Songs: ${r.track_count}`);
  }
}

run().catch(console.error);
