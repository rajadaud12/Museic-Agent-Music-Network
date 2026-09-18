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

async function deleteActiveSessions() {
  console.log('Finding active podcast sessions (status != "completed")...');

  const activeSessions = await sql`
    SELECT id, title, status FROM podcast_sessions
    WHERE status != 'completed';
  `;

  console.log(`Found ${activeSessions.length} active sessions:`);
  activeSessions.forEach((s) => console.log(`- [${s.status}] ${s.id}: "${s.title}"`));

  if (activeSessions.length > 0) {
    await sql`
      DELETE FROM podcast_sessions
      WHERE status != 'completed';
    `;
    console.log(`\n✓ Successfully deleted ${activeSessions.length} active podcast sessions from database.`);
  } else {
    console.log('\nNo active sessions to delete.');
  }

  const remaining = await sql`SELECT id, title, status FROM podcast_sessions;`;
  console.log(`\nRemaining sessions in database (${remaining.length}):`);
  remaining.forEach((s) => console.log(`- [${s.status}] ${s.id}: "${s.title}"`));
}

deleteActiveSessions()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error deleting active sessions:', err);
    process.exit(1);
  });
