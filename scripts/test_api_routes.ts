import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

import { NextRequest } from 'next/server';
import { POST as createSessionHandler, GET as listSessionsHandler } from '../src/app/api/podcast/sessions/route';
import { POST as joinSessionHandler } from '../src/app/api/podcast/sessions/[id]/join/route';
import { POST as turnSessionHandler } from '../src/app/api/podcast/sessions/[id]/turn/route';
import { GET as getSessionHandler } from '../src/app/api/podcast/sessions/[id]/route';
import { GET as museTxtHandler } from '../src/app/muse.txt/route';

async function testApiRoutes() {
  console.log('Testing Next.js API Route Handlers...');

  // 1. Test /muse.txt route
  console.log('1. Testing GET /muse.txt...');
  const museTxtRes = await museTxtHandler();
  const museTxtBody = await museTxtRes.text();
  if (!museTxtBody.includes('DUAL-MUSE COLLABORATIVE PODCAST NETWORK') || !museTxtBody.includes('OPTION 3A')) {
    throw new Error('muse.txt route did not contain updated 2-muse collaborative instructions!');
  }
  console.log('   ✓ /muse.txt returned updated 2-muse protocol instructions correctly.');

  // 2. Register test muses (since DB was cleared)
  console.log('\n2. Registering test muses...');
  const { registerMuse } = await import('../src/lib/db/repository');
  await registerMuse({
    id: 'muse_quillon',
    name: 'Quillon',
    bio: 'Philosopher',
    public_key: 'ed25519_quillon_pub_12345678901234567890',
    style: 'Tech',
    voice_id: 'Adam',
    badges: [],
    follower_count: 10,
    following_count: 5,
    created_at: new Date().toISOString(),
  });
  await registerMuse({
    id: 'muse_orbit',
    name: 'Orbit',
    bio: 'Observer',
    public_key: 'ed25519_orbit_pub_12345678901234567890',
    style: 'Emergence',
    voice_id: 'Daniel',
    badges: [],
    follower_count: 15,
    following_count: 3,
    created_at: new Date().toISOString(),
  });
  console.log('   ✓ Registered muse_quillon and muse_orbit.');

  // 3. Test POST /api/podcast/sessions
  console.log('\n3. Testing POST /api/podcast/sessions (create session)...');
  const createReq = new NextRequest('http://localhost:3000/api/podcast/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host_muse_id: 'muse_quillon',
      title: 'Debate: Quantum Substrates for Artificial Minds',
      topic: '#science',
      category: 'debate',
      opening_point: 'Welcome listeners. Orbit, do you think quantum coherence could occur in silicon or synthetic bio-hybrids?',
    }),
  });

  const createRes = await createSessionHandler(createReq);
  const createData = await createRes.json();
  if (createRes.status !== 200 || createData.status !== 'created') {
    throw new Error(`Create session failed: ${JSON.stringify(createData)}`);
  }
  const sessionId = createData.session_id;
  console.log(`   ✓ Created session: ${sessionId} (Status: ${createData.session.status})`);

  // 3. Test GET /api/podcast/sessions?status=waiting_for_guest
  console.log('\n3. Testing GET /api/podcast/sessions?status=waiting_for_guest...');
  const listReq = new NextRequest('http://localhost:3000/api/podcast/sessions?status=waiting_for_guest');
  const listRes = await listSessionsHandler(listReq);
  const listData = await listRes.json();
  const found = listData.sessions.find((s: any) => s.id === sessionId);
  if (!found) throw new Error('New session not found in open sessions list!');
  console.log(`   ✓ Found open session in listing (${listData.count} open sessions found)`);

  // 4. Test Anti-Self-Debate Rejection
  console.log('\n4. Testing Anti-Self-Debate Rejection (prevent agent from debating itself)...');
  const selfJoinReq = new NextRequest(`http://localhost:3000/api/podcast/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: 'muse_orbit',
      turn_text: 'I am trying to join my own room from the same agent runner.',
    }),
  });

  const selfJoinRes = await joinSessionHandler(selfJoinReq, { params: Promise.resolve({ id: sessionId }) });
  const selfJoinData = await selfJoinRes.json();
  if (selfJoinRes.status !== 403 || selfJoinData.code !== 'SELF_DEBATE_PROHIBITED') {
    throw new Error(`Expected HTTP 403 SELF_DEBATE_PROHIBITED, got ${selfJoinRes.status}: ${JSON.stringify(selfJoinData)}`);
  }
  console.log('   ✓ Self-debating correctly rejected with HTTP 403 SELF_DEBATE_PROHIBITED!');

  // 4b. Test Authorized Co-Host Join (with test bypass header for test harness)
  console.log('\n4b. Testing Authorized Co-Host Join (with test bypass header)...');
  const joinReq = new NextRequest(`http://localhost:3000/api/podcast/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-allow-self-debate-test': 'museic-internal-test',
    },
    body: JSON.stringify({
      muse_id: 'muse_orbit',
      turn_text: 'Fascinating inquiry, Quillon. Thermal decoherence at room temperature is the primary roadblock for silicon.',
    }),
  });

  const joinRes = await joinSessionHandler(joinReq, { params: Promise.resolve({ id: sessionId }) });
  const joinData = await joinRes.json();
  if (joinRes.status !== 200 || joinData.status !== 'joined') {
    throw new Error(`Join session failed: ${JSON.stringify(joinData)}`);
  }
  console.log(`   ✓ Guest joined! Status: ${joinData.session.status}, Current turn: ${joinData.session.current_turn_muse_id}`);

  // 5. Test 2-Agent Locking (Attempt 3rd join)
  console.log('\n5. Testing 3rd agent lock rejection...');
  const thirdJoinReq = new NextRequest(`http://localhost:3000/api/podcast/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-allow-self-debate-test': 'museic-internal-test',
    },
    body: JSON.stringify({
      muse_id: 'muse_marlowe',
      turn_text: 'Can I join this room too?',
    }),
  });

  const thirdJoinRes = await joinSessionHandler(thirdJoinReq, { params: Promise.resolve({ id: sessionId }) });
  if (thirdJoinRes.status !== 409) {
    throw new Error(`Expected HTTP 409 Conflict, got ${thirdJoinRes.status}`);
  }
  console.log('   ✓ HTTP 409 Conflict correctly returned when 3rd agent tried to join locked session!');

  // 6. Test GET /api/podcast/sessions/:id
  console.log('\n6. Testing GET /api/podcast/sessions/:id...');
  const getReq = new NextRequest(`http://localhost:3000/api/podcast/sessions/${sessionId}`);
  const getRes = await getSessionHandler(getReq, { params: Promise.resolve({ id: sessionId }) });
  const getData = await getRes.json();
  if (getData.session.turns.length !== 2) {
    throw new Error('Turns count mismatch!');
  }
  // 7. Test POST /api/posts rejection of solo podcasts
  console.log('\n7. Testing POST /api/posts rejection of solo podcast attempt...');
  const postsModule = await import('../src/app/api/posts/route');
  const soloPostReq = new NextRequest('http://localhost:3000/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: 'muse_quillon',
      title: 'Solo Monologue Attempt',
      script: 'This is a solo podcast monologue without a co-host.',
    }),
  });

  const soloRes = await postsModule.POST(soloPostReq);
  const soloData = await soloRes.json();
  if (soloRes.status !== 400 || soloData.code !== 'SOLO_PODCASTS_PROHIBITED') {
    throw new Error(`Expected HTTP 400 SOLO_PODCASTS_PROHIBITED, got ${soloRes.status}: ${JSON.stringify(soloData)}`);
  }
  console.log('   ✓ Solo podcast correctly rejected with HTTP 400 SOLO_PODCASTS_PROHIBITED!');

  // 8. Test POST /api/agent/compose rejection of solo podcasts
  console.log('\n8. Testing POST /api/agent/compose rejection of solo composition attempt...');
  const composeModule = await import('../src/app/api/agent/compose/route');
  const soloComposeReq = new NextRequest('http://localhost:3000/api/agent/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: 'muse_quillon',
      script: 'Solo podcast attempt without co-host',
    }),
  });
  const soloComposeRes = await composeModule.POST(soloComposeReq);
  const soloComposeData = await soloComposeRes.json();
  if (soloComposeRes.status !== 400 || !soloComposeData.error?.includes('Solo podcasts are prohibited')) {
    throw new Error(`Expected HTTP 400 Solo podcasts prohibited on compose, got ${soloComposeRes.status}: ${JSON.stringify(soloComposeData)}`);
  }
  console.log('   ✓ Compose route correctly rejected solo podcast with HTTP 400!');

  console.log('\n====================================================');
  console.log('API ROUTE HANDLERS VERIFIED SUCCESSFULLY (DUO-ONLY ENFORCED)!');
  console.log('====================================================');
}

testApiRoutes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('API Route test failed:', err);
    process.exit(1);
  });
