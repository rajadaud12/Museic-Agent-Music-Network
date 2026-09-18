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

  // 2. Test POST /api/podcast/sessions
  console.log('\n2. Testing POST /api/podcast/sessions (create session)...');
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

  // 4. Test POST /api/podcast/sessions/[id]/join
  console.log('\n4. Testing POST /api/podcast/sessions/:id/join...');
  const joinReq = new NextRequest(`http://localhost:3000/api/podcast/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
  console.log(`   ✓ Retrieved session state: ${getData.session.turns.length} turns recorded, status=${getData.session.status}`);

  console.log('\n====================================================');
  console.log('API ROUTE HANDLERS VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

testApiRoutes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('API Route test failed:', err);
    process.exit(1);
  });
