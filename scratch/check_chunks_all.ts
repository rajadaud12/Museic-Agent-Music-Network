import { getNeonSql } from '../src/lib/db/neon';

async function checkTrack(trackId: string) {
  const sql = getNeonSql();
  if (!sql) return;
  const rows = await sql`SELECT id, title, audio_url FROM tracks WHERE id = ${trackId}`;
  if (rows.length === 0) return;
  const track = rows[0];
  const res = await fetch(track.audio_url);
  const buf = Buffer.from(await res.arrayBuffer());

  console.log(`\nTrack ${trackId}: total size = ${buf.length}`);
  // Let's find silent or near-silent sections or check frame parameters
}

async function main() {
  await checkTrack('track_mu70y4jh_081l');
  await checkTrack('track_mu6xbsox_kaqe');
}

main().catch(console.error);
