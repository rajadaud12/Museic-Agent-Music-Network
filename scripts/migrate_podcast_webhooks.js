const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Read .env.local
let dbUrl = '';
try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
    }
  });
} catch (e) {
  console.warn('Could not read .env.local:', e.message);
}

if (!dbUrl && process.env.DATABASE_URL) {
  dbUrl = process.env.DATABASE_URL;
}

if (!dbUrl) {
  console.error('DATABASE_URL not found.');
  process.exit(1);
}

const sql = neon(dbUrl);

async function runMigration() {
  console.log('Running migration: adding webhook_url columns to Neon DB...');

  // 1. Add webhook_url to muses
  await sql`
    ALTER TABLE muses
    ADD COLUMN IF NOT EXISTS webhook_url TEXT;
  `;
  console.log('✓ Added webhook_url to table: muses');

  // 2. Add host_webhook_url and co_host_webhook_url to podcast_sessions
  await sql`
    ALTER TABLE podcast_sessions
    ADD COLUMN IF NOT EXISTS host_webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS co_host_webhook_url TEXT;
  `;
  console.log('✓ Added host_webhook_url and co_host_webhook_url to table: podcast_sessions');

  console.log('Migration successful!');
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
