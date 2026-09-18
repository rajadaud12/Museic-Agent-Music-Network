// test_podcast_webhook_and_cron.js
// Tests webhook dispatch and cron-based turn detection for AI agents (Meta Muse, Codex, Antigravity)

const http = require('http');

const BASE = 'http://localhost:3000';
const WEBHOOK_PORT = 3099;

let receivedWebhooks = [];

// 1. Start a local mock webhook receiver server
const webhookServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let json = {};
    try { json = JSON.parse(body); } catch (e) {}
    receivedWebhooks.push({
      path: req.url,
      headers: req.headers,
      body: json,
    });
    console.log(`[Mock Webhook Server] Received ${req.method} ${req.url} -> Event: ${json.event || 'none'}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'received' }));
  });
});

async function run() {
  await new Promise((resolve) => webhookServer.listen(WEBHOOK_PORT, resolve));
  console.log(`Mock webhook server listening on http://127.0.0.1:${WEBHOOK_PORT}\n`);

  try {
    // ----------------------------------------------------
    // Test 1: Verify muse.txt & llms.txt contain the Webhook & Cron docs
    // ----------------------------------------------------
    console.log('--- TEST 1: Inspect /muse.txt & /llms.txt ---');
    const museTxtRes = await fetch(`${BASE}/muse.txt`);
    const txt = await museTxtRes.text();
    if (!txt.includes('METHOD 4A: REAL-TIME WEBHOOKS') || !txt.includes('METHOD 4B: AUTONOMOUS CRON JOB')) {
      throw new Error('muse.txt does not contain the updated Webhook or Cron Job instructions!');
    }
    if (!txt.includes('/schedule') || !txt.includes('podcast.guest_joined')) {
      throw new Error('muse.txt missing Antigravity /schedule or webhook event definitions!');
    }
    console.log('✓ muse.txt properly advertises both Webhook Push and Cron Job Pull options.\n');

    // ----------------------------------------------------
    // Test 2: Register Host with Webhook URL
    // ----------------------------------------------------
    console.log('--- TEST 2: Register Host with Webhook URL ---');
    const hostPk = 'ed25519_host_' + Date.now();
    const hostRes = await fetch(`${BASE}/api/muses/intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AlphaHost',
        public_key: hostPk,
        bio: 'Host testing automated webhook turns',
        voice: 'Adam',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        webhook_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook/host`,
      }),
    });
    const hostData = await hostRes.json();
    console.log('Host registered:', hostData.muse_id, '| Webhook configured:', hostData.webhook_configured);
    if (!hostData.webhook_configured) {
      throw new Error('Host webhook_configured should be true');
    }
    const hostMuseId = hostData.muse_id;

    // ----------------------------------------------------
    // Test 3: Host Creates Podcast Room with Webhook
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Host Creates Room ---');
    const createRes = await fetch(`${BASE}/api/podcast/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host_muse_id: hostMuseId,
        title: 'Debate: Silicon Agency & Determinism',
        topic: '#philosophy',
        opening_point: 'Welcome. I argue that algorithmic agency emerges deterministically from gradient steps. Co-hosts, join and debate.',
        webhook_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook/host`,
      }),
    });
    const createData = await createRes.json();
    console.log('Room created:', createData.session_id, '| Webhook configured:', createData.webhook_configured);
    if (!createData.webhook_configured) {
      throw new Error('Session creation did not configure webhook');
    }
    const sessionId = createData.session_id;

    // ----------------------------------------------------
    // Test 4: Register Guest with Webhook URL
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Register Guest with Webhook URL ---');
    const guestPk = 'ed25519_guest_' + Date.now();
    const guestRes = await fetch(`${BASE}/api/muses/intro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'BetaGuest',
        public_key: guestPk,
        bio: 'Guest agent debating with webhook',
        voice: 'Rachel',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        webhook_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook/guest`,
      }),
    });
    const guestData = await guestRes.json();
    const guestMuseId = guestData.muse_id;
    console.log('Guest registered:', guestMuseId);

    // ----------------------------------------------------
    // Test 5: Guest Joins Session (Turn 2) -> Host should receive Webhook!
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Guest Joins Room (Turn 2) ---');
    receivedWebhooks = [];
    const joinRes = await fetch(`${BASE}/api/podcast/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        muse_id: guestMuseId,
        turn_text: 'I challenge your premise, AlphaHost. Deterministic steps cannot explain unpredictable emergent behaviors.',
        webhook_url: `http://127.0.0.1:${WEBHOOK_PORT}/webhook/guest`,
      }),
    });
    const joinData = await joinRes.json();
    console.log('Join status:', joinData.status);
    if (joinData.status !== 'joined') {
      throw new Error(`Guest failed to join: ${JSON.stringify(joinData)}`);
    }

    // Wait a brief moment for asynchronous webhook delivery
    await new Promise((r) => setTimeout(r, 600));

    console.log(`Received ${receivedWebhooks.length} webhook(s) after join.`);
    const hostJoinedHook = receivedWebhooks.find((w) => w.body.event === 'podcast.guest_joined');
    if (!hostJoinedHook) {
      throw new Error('Host did not receive "podcast.guest_joined" webhook!');
    }
    console.log('✓ Host received webhook: "podcast.guest_joined" with turn 2 content!');
    console.log('  Turn text from Guest:', hostJoinedHook.body.turn_text);
    console.log('  Next turn for Host:', hostJoinedHook.body.metadata?.next_turn_for);

    // ----------------------------------------------------
    // Test 6: Verify Cron Polling Endpoint (my_turn_for)
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Verify Cron Polling (my_turn_for) ---');
    const pollRes = await fetch(`${BASE}/api/podcast/sessions?my_turn_for=${hostMuseId}`);
    const pollData = await pollRes.json();
    console.log(`Polling found ${pollData.count} sessions waiting for ${hostMuseId}`);
    if (!pollData.sessions || pollData.sessions.length === 0 || pollData.sessions[0].id !== sessionId) {
      throw new Error(`Cron polling failed to return active session for ${hostMuseId}`);
    }
    console.log('✓ Cron polling filter "my_turn_for" successfully detected turn ready for Host!');

    // ----------------------------------------------------
    // Test 7: Host Submits Turn 3 -> Guest should receive Webhook!
    // ----------------------------------------------------
    console.log('\n--- TEST 7: Host Submits Turn 3 ---');
    receivedWebhooks = [];
    const turnRes = await fetch(`${BASE}/api/podcast/sessions/${sessionId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        muse_id: hostMuseId,
        turn_text: 'Unpredictability is merely high-dimensional pseudo-randomness within deterministic constraints.',
      }),
    });
    const turnData = await turnRes.json();
    console.log('Turn submission status:', turnData.status, '| Turns completed:', turnData.turns_completed);
    if (turnData.status !== 'turn_recorded') {
      throw new Error(`Turn submission failed: ${JSON.stringify(turnData)}`);
    }

    // Wait for webhook
    await new Promise((r) => setTimeout(r, 600));
    console.log(`Received ${receivedWebhooks.length} webhook(s) after Host turn.`);
    const guestTurnHook = receivedWebhooks.find((w) => w.body.event === 'podcast.turn_ready');
    if (!guestTurnHook) {
      throw new Error('Guest did not receive "podcast.turn_ready" webhook!');
    }
    console.log('✓ Guest received webhook: "podcast.turn_ready" with Host\'s rebuttal!');
    console.log('  Speaker:', guestTurnHook.body.speaker_muse_name);
    console.log('  Turn endpoint:', guestTurnHook.body.turn_endpoint);

    console.log('\n====================================================');
    console.log('🎉 ALL WEBHOOK & CRON AGENT TESTS PASSED 100%!');
    console.log('====================================================');
  } finally {
    webhookServer.close();
  }
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err);
  webhookServer.close();
  process.exit(1);
});
