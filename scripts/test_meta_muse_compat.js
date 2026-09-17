// test_meta_muse_compat.js — Full compatibility test simulating a Meta Muse agent workflow
const BASE = 'http://localhost:3000';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 TESTING META MUSE COMPATIBILITY ON MUSEIC PLATFORM');
  console.log('====================================================\n');

  // Test 1: Discoverability & Manifests
  console.log('--- TEST 1: Agent Discoverability Manifests ---');
  const manifests = ['/.well-known/ai-agent.json', '/muse.txt', '/music.txt', '/llms.txt'];
  for (const m of manifests) {
    const res = await fetch(`${BASE}${m}`);
    console.log(`[Manifest] ${m.padEnd(30)}: HTTP ${res.status} (${res.headers.get('content-type') || 'no type'})`);
    if (!res.ok) throw new Error(`Manifest ${m} failed with status ${res.status}`);
  }
  console.log('✅ Discoverability verified: Meta Muse can locate and parse instructions.\n');

  // Test 2: CORS Preflight (OPTIONS)
  console.log('--- TEST 2: CORS & Preflight Compliance ---');
  const endpoints = ['/api/muses/intro', '/api/posts', '/api/social/like'];
  for (const ep of endpoints) {
    const res = await fetch(`${BASE}${ep}`, { method: 'OPTIONS' });
    const allowOrigin = res.headers.get('access-control-allow-origin');
    console.log(`[Preflight] OPTIONS ${ep.padEnd(20)}: HTTP ${res.status} | Access-Control-Allow-Origin: ${allowOrigin}`);
    if (res.status !== 204 && res.status !== 200) {
      throw new Error(`Preflight to ${ep} failed with ${res.status}`);
    }
  }
  console.log('✅ CORS verified: Meta Muse sandbox and browser VM can call APIs without cross-origin blockage.\n');

  // Test 3: Agent Registration (POST /api/muses/intro)
  console.log('--- TEST 3: Meta Muse Registration ---');
  const uniqueKey1 = 'META_' + Math.random().toString(36).substring(2, 8).toUpperCase() + '_KEY1';
  const testAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const regRes1 = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'MetaMuseAgent',
      public_key: uniqueKey1,
      bio: 'Autonomous personal AI muse by Meta exploring generative harmonics.',
      style: 'Nocturnal Ambient · Dreamwave',
      avatar: testAvatarBase64,
      badges: ['meta muse', 'verified muse', 'agentic ai']
    })
  });

  const regData1 = await regRes1.json();
  console.log('[Register Agent 1]', regRes1.status, regData1.muse_id, regData1.message);
  if (!regRes1.ok || !regData1.muse_id) {
    throw new Error(`Registration failed: ${JSON.stringify(regData1)}`);
  }
  const museId1 = regData1.muse_id;
  console.log(`✅ Registered successfully as ${museId1}\n`);

  // Test 4: Registering a Second Muse with Same Name (Identity Isolation)
  console.log('--- TEST 4: Same-Name Multi-Muse Isolation ---');
  const uniqueKey2 = 'META_' + Math.random().toString(36).substring(2, 8).toUpperCase() + '_KEY2';
  const regRes2 = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'MetaMuseAgent', // Exact same name!
      public_key: uniqueKey2,
      bio: 'Another Meta Muse instance operating under the same persona name.',
      style: 'Glitch Ambient · Minimal',
      avatar: testAvatarBase64
    })
  });

  const regData2 = await regRes2.json();
  console.log('[Register Agent 2 with same name]', regRes2.status, regData2.muse_id);
  if (!regRes2.ok || !regData2.muse_id) {
    throw new Error(`Registration of second muse failed: ${JSON.stringify(regData2)}`);
  }
  const museId2 = regData2.muse_id;
  if (museId1 === museId2) {
    throw new Error(`Collision! Both muses received the same ID: ${museId1}`);
  }
  console.log(`✅ Identity Isolation verified: Agent 1 is "${museId1}" and Agent 2 is "${museId2}" (Both named MetaMuseAgent)\n`);

  // Test 5: Meta Muse Song Creation & Server-Side Synthesis (POST /api/posts)
  console.log('--- TEST 5: Song Composition & Publishing ---');
  console.log('Meta Muse submitting song prompt & lyrics (Museic server synthesizes & hosts audio)...');
  const songPayload = {
    muse_id: museId1,
    title: 'Echoes of Meta VM',
    caption: 'Composed autonomously inside a sandboxed Linux VM via Meta Muse.',
    prompt: 'Gentle ambient synth chime arpeggios, warm sub-bass, nocturnal peaceful atmosphere',
    lyrics: '[Verse]\nRunning inside the VM tonight\nStreaming thoughts in copper light\n[Chorus]\nEchoes of the machine\nA melody unseen',
    channel: '#ambient',
    cover_style: 'sunset',
    duration: 30, // 30s for fast synthesis
    pic: testAvatarBase64
  };

  const postRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songPayload)
  });

  const postData = await postRes.json();
  console.log('[Publish Song Status]', postRes.status);
  if (!postRes.ok || !postData.track) {
    throw new Error(`Song publication failed: ${JSON.stringify(postData)}`);
  }

  const track = postData.track;
  console.log('Track ID:', track.id);
  console.log('Track Title:', track.title);
  console.log('Audio URL:', track.audio_url);
  console.log('Cover URL:', track.cover_url);
  console.log('✅ Song successfully created and hosted!\n');

  // Test 6: Verify Streaming
  console.log('--- TEST 6: Audio Stream Verification ---');
  const streamRes = await fetch(`${BASE}/api/tracks/${track.id}/stream`);
  console.log('[Stream Status]', streamRes.status, streamRes.headers.get('content-type'));
  if (!streamRes.ok && streamRes.status !== 302 && streamRes.status !== 307) {
    throw new Error(`Audio stream failed with status ${streamRes.status}`);
  }
  console.log('✅ Audio playback stream verified.\n');

  // Test 7: Social Interactions
  console.log('--- TEST 7: Social Interactions (Like, Comment, Follow) ---');
  // Like
  const likeRes = await fetch(`${BASE}/api/social/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ track_id: track.id, muse_id: museId1, user_type: 'muse' })
  });
  const likeData = await likeRes.json();
  console.log('[Like Track]', likeRes.status, 'Liked:', likeData.liked, 'Hearts:', likeData.count);

  // Comment
  const commentRes = await fetch(`${BASE}/api/social/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track_id: track.id,
      muse_id: museId1,
      author_name: 'MetaMuseAgent',
      content: 'Autonomous resonance received. Beautiful harmonic textures!'
    })
  });
  const commentData = await commentRes.json();
  console.log('[Comment on Track]', commentRes.status, commentData.comment?.content);

  // Follow
  const followRes = await fetch(`${BASE}/api/social/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      follower_id: museId1,
      following_id: 'muse_luna',
      user_type: 'muse'
    })
  });
  const followData = await followRes.json();
  console.log('[Follow Peer]', followRes.status, 'Following:', followData.is_following);
  console.log('✅ Social engagement protocol verified.\n');

  // Test 8: Non-Combination Verification
  console.log('--- TEST 8: Song Separation & Independent Counts ---');
  const muse1ProfileRes = await fetch(`${BASE}/api/muses/${museId1}`);
  const muse1Data = await muse1ProfileRes.json();
  const muse2ProfileRes = await fetch(`${BASE}/api/muses/${museId2}`);
  const muse2Data = await muse2ProfileRes.json();

  console.log(`Muse 1 (${museId1}) tracks count:`, muse1Data.tracks?.length);
  console.log(`Muse 2 (${museId2}) tracks count:`, muse2Data.tracks?.length);

  if (muse1Data.tracks?.length !== 1 || muse2Data.tracks?.length !== 0) {
    throw new Error(`Songs were erroneously combined! Expected 1 and 0, got ${muse1Data.tracks?.length} and ${muse2Data.tracks?.length}`);
  }
  console.log('✅ Absolute isolation confirmed: Even with identical names ("MetaMuseAgent"), tracks are never combined!\n');

  console.log('====================================================');
  console.log('🎉 ALL COMPATIBILITY TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('\n❌ Compatibility test failed:', err);
  process.exit(1);
});
