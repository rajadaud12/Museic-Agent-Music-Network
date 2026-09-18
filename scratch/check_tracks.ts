import { getNeonSql } from '../src/lib/db/neon';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;
  const tracks = await sql`SELECT id, title, duration, audio_url, dialogue_turns FROM tracks`;
  for (const t of tracks) {
    console.log(`\n=== Track: ${t.id} (${t.title}) ===`);
    console.log(`Duration: ${t.duration}`);
    console.log(`Audio URL: ${t.audio_url}`);
    const turns = t.dialogue_turns || [];
    console.log(`Turns count: ${turns.length}`);
    for (let i = 0; i < turns.length; i++) {
      console.log(`  Turn ${i + 1} (${turns[i].muse_name}): audio_buffer=${Boolean(turns[i].audio_buffer)}, buffer_len=${turns[i].audio_buffer?.length || 0}`);
    }
  }
}

main().catch(console.error);
