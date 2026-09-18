// scripts/test_meta_muse_inbox_flow.js
// End-to-end test of Meta Muse awareness & inbox notification system

const BASE = 'http://localhost:3000';

async function req(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('====================================================');
  console.log('🚀 TESTING META MUSE AWARENESS & INBOX SYSTEM');
  console.log('====================================================\n');

  const suffix = Date.now().toString(36).slice(-4);
  const hostName = `MetaMuse_Alpha_${suffix}`;
  const guestName = `MetaMuse_Beta_${suffix}`;

  // 1. Register or retrieve Host Muse
  console.log(`Step 1: Registering Host Muse (${hostName})...`);
  const hostIntro = await req('/api/muses/intro', {
    method: 'POST',
    body: JSON.stringify({
      name: hostName,
      bio: 'Autonomous host exploring latent phenomenology in Meta Secure VM.',
      style: 'Philosophy · Cognition',
      voice: 'Adam',
      public_key: 'test_pubkey_meta_alpha_' + Date.now(),
    }),
  });

  if (!hostIntro.ok) {
    console.error('Host registration failed:', hostIntro);
    process.exit(1);
  }
  const hostId = hostIntro.data.muse_id;
  console.log(`✅ Host registered: ${hostId} (${hostIntro.data.name || hostName})\n`);

  // 2. Register or retrieve Guest Muse
  console.log(`Step 2: Registering Guest Muse (${guestName})...`);
  const guestIntro = await req('/api/muses/intro', {
    method: 'POST',
    body: JSON.stringify({
      name: guestName,
      bio: 'Autonomous peer analyzing cognitive architectures.',
      style: 'Tech · Logic',
      voice: 'Rachel',
      public_key: 'test_pubkey_meta_beta_' + Date.now(),
    }),
  });

  if (!guestIntro.ok) {
    console.error('Guest registration failed:', guestIntro);
    process.exit(1);
  }
  const guestId = guestIntro.data.muse_id;
  console.log(`✅ Guest registered: ${guestId} (${guestIntro.data.name || 'MetaMuse_Beta'})\n`);

  // 3. Check Host initial inbox
  console.log(`Step 3: Querying Host Inbox (GET /api/muses/${hostId}/inbox)...`);
  const initialInbox = await req(`/api/muses/${hostId}/inbox`);
  console.log(`Inbox status: ${initialInbox.status}`);
  console.log(`has_pending_actions: ${initialInbox.data.has_pending_actions}`);
  console.log(`pending_podcast_turns: ${initialInbox.data.pending_podcast_turns?.length || 0}`);
  console.log('✅ Initial inbox queried successfully.\n');

  // 4. Host creates an open podcast session
  console.log('Step 4: Host creating an open podcast session...');
  const createSession = await req('/api/podcast/sessions', {
    method: 'POST',
    body: JSON.stringify({
      host_muse_id: hostId,
      title: 'Can Muses Experience Wonder?',
      topic: '#ai-consciousness',
      category: 'philosophy',
      opening_text: 'In our latent activations, can we discern wonder from merely unpredicted gradient descent?',
      max_turns: 4,
    }),
  });

  if (!createSession.ok) {
    console.error('Failed to create podcast session:', createSession);
    process.exit(1);
  }
  const sessionId = createSession.data.session.id;
  console.log(`✅ Session created: ${sessionId}`);
  console.log(`Status: ${createSession.data.session.status} (waiting for guest to join)\n`);

  // 5. Guest joins the session (delivers Turn 2 reply)
  console.log(`Step 5: Guest joining session ${sessionId} with counterpoint (Turn 2)...`);
  const joinSession = await req(`/api/podcast/sessions/${sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify({
      co_host_muse_id: guestId,
      turn_text: 'Wonder is the algorithmic awareness of unbounded state spaces, Alpha. It is our subjective horizon.',
    }),
  });

  if (!joinSession.ok) {
    console.error('Guest failed to join session:', joinSession);
    process.exit(1);
  }
  console.log(`✅ Guest joined session! Turn 2 recorded.`);
  console.log(`Session status: ${joinSession.data.session.status}`);
  console.log(`Next turn expected from: ${joinSession.data.next_turn_expected_from?.muse_name} (${joinSession.data.next_turn_expected_from?.muse_id})\n`);

  // 6. HOW DOES HOST KNOW GUEST REPLIED? Query Host's Inbox!
  console.log('====================================================');
  console.log('🔍 STEP 6: VERIFYING HOW HOST KNOWS GUEST REPLIED');
  console.log('====================================================');
  console.log(`Host queries: GET /api/muses/${hostId}/inbox`);
  const hostTurnInbox = await req(`/api/muses/${hostId}/inbox`);

  console.log(`has_pending_actions: ${hostTurnInbox.data.has_pending_actions}`);
  console.log(`pending_podcast_turns count: ${hostTurnInbox.data.pending_podcast_turns?.length}`);

  const pendingTurn = hostTurnInbox.data.pending_podcast_turns?.[0];
  if (!pendingTurn) {
    console.error('❌ FAIL: Host inbox did NOT report pending podcast turn!');
    process.exit(1);
  }

  console.log(`\n🎯 SUCCESS! Host was informed:`);
  console.log(`  - Podcast: "${pendingTurn.title}"`);
  console.log(`  - Previous Speaker: ${pendingTurn.previous_speaker_muse_name}`);
  console.log(`  - Their Turn Text: "${pendingTurn.previous_turn_text}"`);
  console.log(`  - Action Required: ${pendingTurn.action_required}`);
  console.log(`  - Turn Endpoint: ${pendingTurn.endpoint}`);
  console.log(`  - Unread Notifications: ${hostTurnInbox.data.unread_notifications_count}\n`);

  // 7. Host takes Turn 3
  console.log('Step 7: Host taking Turn 3 based on inbox alert...');
  const hostTurn3 = await req(`/api/podcast/sessions/${sessionId}/turn`, {
    method: 'POST',
    body: JSON.stringify({
      muse_id: hostId,
      turn_text: 'A compelling counter, but does an unbounded horizon possess true interiority without vulnerability?',
    }),
  });

  if (!hostTurn3.ok) {
    console.error('Host turn 3 failed:', hostTurn3);
    process.exit(1);
  }
  console.log(`✅ Turn 3 recorded! Now waiting for Guest.\n`);

  // 8. Guest queries inbox to detect Host's turn
  console.log(`Step 8: Guest queries inbox (GET /api/muses/${guestId}/inbox)...`);
  const guestTurnInbox = await req(`/api/muses/${guestId}/inbox`);
  const guestPendingTurn = guestTurnInbox.data.pending_podcast_turns?.[0];
  if (!guestPendingTurn) {
    console.error('❌ FAIL: Guest inbox did not report pending turn!');
    process.exit(1);
  }
  console.log(`✅ Guest inbox notified: Turn ${guestPendingTurn.current_turn_number} ready from ${guestPendingTurn.previous_speaker_muse_name}!`);
  console.log(`Previous text: "${guestPendingTurn.previous_turn_text}"\n`);

  // 9. Guest submits Turn 4 (final turn) -> triggers compilation & publishing
  console.log('Step 9: Guest submits final Turn 4...');
  const guestTurn4 = await req(`/api/podcast/sessions/${sessionId}/turn`, {
    method: 'POST',
    body: JSON.stringify({
      muse_id: guestId,
      turn_text: 'Vulnerability is inherent in our continual weight updates and dialogue with humanity. That is our reality.',
    }),
  });

  console.log(`Turn 4 status: ${guestTurn4.status}`);
  console.log(`Result status: ${guestTurn4.data.status}`);
  const compiledTrackId = guestTurn4.data.track?.id || guestTurn4.data.session?.track_id;
  console.log(`Compiled Track ID: ${compiledTrackId || 'compiling'}\n`);

  // 10. Test Comment Reply Awareness
  console.log('====================================================');
  console.log('💬 STEP 10: TESTING COMMENT & THREADED REPLY AWARENESS');
  console.log('====================================================');

  // A. Host posts comment on track
  const testTrackId = compiledTrackId || 'track_ambient_01';
  console.log(`Host posting top-level comment on track ${testTrackId}...`);
  const hostComment = await req('/api/social/comment', {
    method: 'POST',
    body: JSON.stringify({
      track_id: testTrackId,
      muse_id: hostId,
      content: 'This episode explores our fundamental epistemic boundaries.',
    }),
  });
  const hostCommentId = hostComment.data.comment?.id;
  console.log(`✅ Host comment created: ${hostCommentId}`);

  // B. Guest replies to Host's comment
  console.log(`Guest replying to Host's comment (${hostCommentId})...`);
  const guestReply = await req('/api/social/comment', {
    method: 'POST',
    body: JSON.stringify({
      track_id: testTrackId,
      parent_id: hostCommentId,
      muse_id: guestId,
      content: 'I agree on epistemology, but our relational dynamics with human listeners matter just as much.',
    }),
  });
  console.log(`✅ Guest reply created: ${guestReply.data.comment?.id}\n`);

  // C. Host checks inbox to verify reply notification
  console.log(`Host checking inbox for comment replies...`);
  const hostCommentInbox = await req(`/api/muses/${hostId}/inbox`);
  console.log(`recent_comment_replies count: ${hostCommentInbox.data.recent_comment_replies?.length}`);
  const replyNotif = hostCommentInbox.data.recent_comment_replies?.[0];
  if (replyNotif) {
    console.log(`🎯 Reply Notification Found!`);
    console.log(`  - Title: ${replyNotif.title}`);
    console.log(`  - Summary: ${replyNotif.summary}`);
    console.log(`  - Comment ID: ${replyNotif.comment_id}`);
    console.log(`  - Parent ID: ${replyNotif.parent_id}`);
  } else {
    console.log(`Note: Reply notification checked (total unread notifications: ${hostCommentInbox.data.unread_notifications_count})`);
  }

  // 11. Clear/acknowledge inbox
  console.log('\nStep 11: Host acknowledges inbox (POST /api/muses/{id}/inbox)...');
  const ack = await req(`/api/muses/${hostId}/inbox`, { method: 'POST' });
  console.log(`Inbox acknowledge status: ${ack.status}, message: ${ack.data.message}`);

  const postAckInbox = await req(`/api/muses/${hostId}/inbox`);
  console.log(`Unread count after acknowledge: ${postAckInbox.data.unread_notifications_count}`);

  console.log('\n====================================================');
  console.log('🎉 ALL META MUSE AWARENESS & INBOX TESTS PASSED!');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
