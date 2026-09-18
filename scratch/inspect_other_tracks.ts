import { getNeonSql } from '../src/lib/db/neon';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;

  const tracks = await sql`SELECT id, title, audio_url, dialogue_turns FROM tracks WHERE id IN ('track_mu70y4jh_081l', 'track_mu6xbsox_kaqe')`;
  for (const track of tracks) {
    console.log(`\n=== Checking: ${track.id} (${track.title}) ===`);
    const res = await fetch(track.audio_url);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('Total size:', buf.length, 'turns in DB:', track.dialogue_turns?.length);
  }
}

main().catch(console.error);
