const fs = require('fs');

async function run() {
  const BASE = 'http://localhost:3000';

  console.log('--- 1. Testing /muse.txt for any lingering song/music mentions ---');
  const museTxtRes = await fetch(`${BASE}/muse.txt`);
  const museTxt = await museTxtRes.text();
  const hasSong = /\bsongs?\b/i.test(museTxt);
  const hasLyric = /\blyrics?\b/i.test(museTxt);
  const has120 = /120/i.test(museTxt);
  console.log('muse.txt contains "song":', hasSong);
  console.log('muse.txt contains "lyric":', hasLyric);
  console.log('muse.txt contains "120":', has120);

  if (hasSong || hasLyric || has120) {
    console.error('FAIL: muse.txt still has lingering song/lyric/120 terms!');
    process.exit(1);
  }

  console.log('\n--- 2. Registering a test podcast muse with voice Adam ---');
  const uniqueName = 'HostTest_' + Date.now().toString(36);
  const fakeKey = Buffer.from('test_pubkey_' + Date.now()).toString('base64url').slice(0, 32);
  const sampleArt = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const introRes = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: uniqueName,
      public_key: fakeKey,
      bio: 'Autonomous host testing dynamic durations.',
      style: 'Science · Deep Tech',
      voice: 'Adam',
      avatar: sampleArt,
    }),
  });
  const introData = await introRes.json();
  console.log('Registered muse_id:', introData.muse?.id, 'Voice ID:', introData.muse?.voice_id);
  const museId = introData.muse.id;

  console.log('\n--- 3. Publishing Episode 1 with arbitrary duration: 124 seconds (2m 4s) ---');
  const ep1Res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: museId,
      title: 'Ep 1: Quantum Foundations (2m 4s)',
      script: 'Today we discuss whether quantum wavefunctions represent reality or merely observer knowledge. Under 3 minutes, our recording is 124 seconds.',
      topic: '#science',
      duration: 124, // 2m 4s!
      pic: sampleArt,
    }),
  });
  const ep1 = await ep1Res.json();
  console.log('Ep 1 Status:', ep1.status, 'Duration:', ep1.track?.duration);
  if (ep1.track?.duration !== 124) {
    console.error('FAIL: Duration was not preserved as 124 seconds! Got:', ep1.track?.duration);
    process.exit(1);
  }

  console.log('\n--- 4. Publishing Episode 2 with arbitrary duration: 90 seconds (1m 30s) ---');
  const ep2Res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: museId,
      title: 'Ep 2: Entropy and Time (1m 30s)',
      script: 'In this episode, we unpack why the arrow of time aligns with thermodynamic entropy. Duration is 90 seconds.',
      topic: '#science',
      duration: 90, // 1m 30s!
      pic: sampleArt,
    }),
  });
  const ep2 = await ep2Res.json();
  console.log('Ep 2 Status:', ep2.status, 'Duration:', ep2.track?.duration);
  if (ep2.track?.duration !== 90) {
    console.error('FAIL: Duration was not preserved as 90 seconds! Got:', ep2.track?.duration);
    process.exit(1);
  }

  console.log('\n--- 5. Publishing Episode 3 requesting 240 seconds (over 3 minutes, must cap at 180s) ---');
  const ep3Res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: museId,
      title: 'Ep 3: The Boundary of Space (Capped at 180s)',
      script: 'An extensive deep dive exceeding standard limits to test the 3-minute clamp.',
      topic: '#science',
      duration: 240, // Should be capped at 180!
      pic: sampleArt,
    }),
  });
  const ep3 = await ep3Res.json();
  console.log('Ep 3 Status:', ep3.status, 'Duration:', ep3.track?.duration);
  if (ep3.track?.duration !== 180) {
    console.error('FAIL: Duration was not capped at 180 seconds! Got:', ep3.track?.duration);
    process.exit(1);
  }

  console.log('\n--- 6. Publishing Episode 4 (should trigger AGENT_EPISODE_LIMIT_REACHED HTTP 429) ---');
  const ep4Res = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: museId,
      title: 'Ep 4: Overflow episode',
      script: 'This should be blocked by the 3 episode quota limit.',
      topic: '#science',
      duration: 60,
      pic: sampleArt,
    }),
  });
  const ep4 = await ep4Res.json();
  console.log('Ep 4 HTTP Status:', ep4Res.status, 'Code:', ep4.code, 'Error:', ep4.error);
  if (ep4Res.status !== 429 || ep4.code !== 'AGENT_EPISODE_LIMIT_REACHED') {
    console.error('FAIL: Expected HTTP 429 with AGENT_EPISODE_LIMIT_REACHED! Got:', ep4);
    process.exit(1);
  }

  console.log('\n--- 7. Testing ai-agent.json manifest ---');
  const manifestRes = await fetch(`${BASE}/.well-known/ai-agent.json`);
  const manifest = await manifestRes.json();
  console.log('Manifest name:', manifest.name_for_human);
  console.log('Rules quotas:', manifest.protocol.rules_and_quotas);
  if (manifest.protocol.rules_and_quotas.max_duration_seconds !== 180) {
    console.error('FAIL: max_duration_seconds in manifest is not 180!');
    process.exit(1);
  }

  console.log('\n>>> ALL PODCAST DURATION AND LIMIT TESTS PASSED SUCCESSFULLY! <<<');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
