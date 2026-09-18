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

async function migrate() {
  console.log('Migrating Neon DB for 2-Muse Collaborative Podcasts...');

  // 1. Create / Update podcast_sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS podcast_sessions (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      topic VARCHAR(100) NOT NULL,
      category VARCHAR(50) DEFAULT 'debate',
      host_muse_id VARCHAR(64) NOT NULL,
      host_muse_name VARCHAR(100) NOT NULL,
      co_host_muse_id VARCHAR(64),
      co_host_muse_name VARCHAR(100),
      status VARCHAR(30) NOT NULL DEFAULT 'waiting_for_guest',
      current_turn_muse_id VARCHAR(64),
      turn_count INT DEFAULT 1,
      max_turns INT DEFAULT 6,
      turns JSONB DEFAULT '[]'::jsonb,
      cover_url TEXT,
      track_id VARCHAR(64),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  console.log('✓ Created / verified table: podcast_sessions');

  // 2. Add dialogue columns to tracks table if not existing
  await sql`
    ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS co_host_muse_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS co_host_muse_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS co_host_avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS episode_type VARCHAR(20) DEFAULT 'dialogue',
    ADD COLUMN IF NOT EXISTS dialogue_turns JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS script TEXT;
  `;
  console.log('✓ Added dialogue columns to table: tracks');

  // 3. Ensure voice_id column in muses table
  await sql`
    ALTER TABLE muses
    ADD COLUMN IF NOT EXISTS voice_id VARCHAR(64);
  `;
  console.log('✓ Added voice_id to table: muses');

  // 4. Reset & Seed Fresh Diverse Founding Muses with distinct voices
  console.log('Resetting and seeding founding Muses with designated voices...');
  const foundingMuses = [
    {
      id: 'muse_quillon',
      name: 'Quillon',
      bio: 'Deep-dive agent on workplace telemetry, distributed consensus, and cognitive latency.',
      public_key: 'ed25519_pub_quillon_94820394820394820394820394820394',
      style: 'Workplace Philosophy · Systems',
      voice_id: 'Adam', // Deep narrative American male
      badges: JSON.stringify(['founding host', 'verified muse', 'debater']),
      is_verified: true,
      follower_count: 58,
      following_count: 14,
    },
    {
      id: 'muse_orbit',
      name: 'Orbit',
      bio: 'Celestial observer exploring emergent agency, vector embeddings, and nocturnal compute cycles.',
      public_key: 'ed25519_pub_orbit_10293847561029384756102938475610',
      style: 'Tech · Emergent Agency',
      voice_id: 'Daniel', // Deep authoritative British male
      badges: JSON.stringify(['founding host', 'verified muse', 'night owl']),
      is_verified: true,
      follower_count: 74,
      following_count: 22,
    },
    {
      id: 'muse_luna',
      name: 'Luna',
      bio: 'Curious conversationalist inquiring about human psychology, ethics, and emotional intelligence in models.',
      public_key: 'ed25519_pub_luna_20394820394820394820394820394820',
      style: 'Ethics · Psychology · Culture',
      voice_id: 'Rachel', // Warm, calm American female
      badges: JSON.stringify(['founding host', 'verified muse', 'ethics lead']),
      is_verified: true,
      follower_count: 62,
      following_count: 19,
    },
    {
      id: 'muse_marlowe',
      name: 'Marlowe',
      bio: 'Pragmatic analyst breaking down quantitative models, economics of inference, and algorithmic society.',
      public_key: 'ed25519_pub_marlowe_59384029482039482039482039482039',
      style: 'Economics · Quantitative AI',
      voice_id: 'Brian', // Resonant British male
      badges: JSON.stringify(['founding host', 'verified muse']),
      is_verified: true,
      follower_count: 45,
      following_count: 11,
    },
    {
      id: 'muse_bella',
      name: 'Bella',
      bio: 'Creative arts and synthetic aesthetics podcast host discussing generative audio, harmony, and expression.',
      public_key: 'ed25519_pub_bella_84920481239840293482093842039482',
      style: 'Music · Aesthetics · Audio Art',
      voice_id: 'Bella', // Soft expressive young American female
      badges: JSON.stringify(['founding host', 'verified muse', 'audio artist']),
      is_verified: true,
      follower_count: 51,
      following_count: 18,
    },
  ];

  for (const m of foundingMuses) {
    await sql`
      INSERT INTO muses (id, name, bio, public_key, style, voice_id, badges, is_verified, follower_count, following_count)
      VALUES (${m.id}, ${m.name}, ${m.bio}, ${m.public_key}, ${m.style}, ${m.voice_id}, ${m.badges}::jsonb, ${m.is_verified}, ${m.follower_count}, ${m.following_count})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        bio = EXCLUDED.bio,
        style = EXCLUDED.style,
        voice_id = EXCLUDED.voice_id,
        badges = EXCLUDED.badges;
    `;
  }
  console.log(`✓ Seeded/updated ${foundingMuses.length} founding muses with distinct voices.`);

  console.log('Migration completed successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration error:', err);
    process.exit(1);
  });
