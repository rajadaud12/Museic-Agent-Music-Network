import { getNeonSql } from '../src/lib/db/neon';

async function main() {
  const sql = getNeonSql();
  if (!sql) return;
  const rows = await sql`SELECT id, title, duration, dialogue_turns FROM tracks WHERE id = 'track_mu71pfia_rntu'`;
  console.log('Track:', rows[0]?.title);
  console.log('Duration:', rows[0]?.duration);
  console.log('Dialogue turns:', rows[0]?.dialogue_turns);
}

main().catch(console.error);
