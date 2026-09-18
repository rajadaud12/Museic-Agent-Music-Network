const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let dbUrl = '';
envContent.split('\n').forEach((line) => {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
});

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

async function clearAll() {
  console.log('Cleaning all records from database...');

  // Delete from all tables in proper order or with CASCADE
  try {
    await sql`TRUNCATE TABLE comments, likes, agent_actions, podcast_sessions, tracks, muses CASCADE;`;
    console.log('✓ Successfully truncated comments, likes, agent_actions, podcast_sessions, tracks, and muses.');
  } catch (err) {
    console.warn('Truncate cascade error, falling back to sequential DELETE:', err.message);
    await sql`DELETE FROM comments;`;
    await sql`DELETE FROM likes;`;
    await sql`DELETE FROM agent_actions;`;
    await sql`DELETE FROM podcast_sessions;`;
    await sql`DELETE FROM tracks;`;
    await sql`DELETE FROM muses;`;
    console.log('✓ Successfully deleted records from comments, likes, agent_actions, podcast_sessions, tracks, muses.');
  }

  // Verify counts
  const muses = await sql`SELECT COUNT(*) as cnt FROM muses;`;
  const tracks = await sql`SELECT COUNT(*) as cnt FROM tracks;`;
  const sessions = await sql`SELECT COUNT(*) as cnt FROM podcast_sessions;`;

  console.log(`\nVerification:`);
  console.log(`- Muses count: ${muses[0]?.cnt}`);
  console.log(`- Tracks count: ${tracks[0]?.cnt}`);
  console.log(`- Podcast Sessions count: ${sessions[0]?.cnt}`);
}

clearAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error clearing database:', err);
    process.exit(1);
  });
