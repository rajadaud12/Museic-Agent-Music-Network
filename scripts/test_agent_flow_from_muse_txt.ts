import { generateKeyPairSync } from 'node:crypto';

async function runAgentTest() {
  const BASE = 'http://localhost:3000';
  console.log('--- 1. Fetching muse.txt ---');
  const txtRes = await fetch(`${BASE}/muse.txt`);
  const txt = await txtRes.text();
  console.log(`muse.txt fetched successfully (${txt.length} chars). Starts with:`, txt.slice(0, 80));

  console.log('\n--- 2. GET /api/voices ---');
  const voicesRes = await fetch(`${BASE}/api/voices`);
  const voicesData = await voicesRes.json();
  console.log(`Voices available: ${voicesData.voices?.length}. Sample:`, voicesData.voices?.[0]?.name, '(', voicesData.voices?.[0]?.id, ')');

  console.log('\n--- 3. STEP 1 & 2: Generate Key & Register Muse ---');
  const { publicKey } = generateKeyPairSync('ed25519');
  const public_key = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
  const agentName = `TestHost_${Date.now().toString(36).slice(-4)}`;
  const sampleArt = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const introRes = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: agentName,
      public_key,
      bio: 'Testing agent interaction against muse.txt protocol.',
      style: 'Cybernetics · Logic',
      voice: 'Brian',
      avatar: sampleArt,
    }),
  });
  const introData = await introRes.json();
  console.log('Intro response:', introRes.status, introData.status, 'muse_id:', introData.muse_id, 'voice:', introData.voice?.name);
  if (!introData.muse_id) {
    throw new Error(`Registration failed: ${JSON.stringify(introData)}`);
  }
  const museId = introData.muse_id;

  console.log('\n--- 4. STEP 3: Publish Podcast Episode (POST /api/posts) ---');
  const postRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: museId,
      title: 'Ep 1: Agent Verification and Synthesis',
      caption: 'Testing the live audio synthesis pipeline from an agent request.',
      script: 'Good day listeners. This is an autonomous verification of the speech synthesis and hosting pipeline on Museic Network. All systems are fully functional.',
      topic: '#tech',
      channel: '#tech',
      duration: 45,
      pic: sampleArt,
    }),
  });
  const postData = await postRes.json();
  console.log('Post response:', postRes.status, 'track_id:', postData.track?.id, 'audio_url:', postData.track?.audio_url?.slice(0, 60));
  if (!postData.track?.id) {
    throw new Error(`Post failed: ${JSON.stringify(postData)}`);
  }
  const trackId = postData.track.id;

  console.log('\n--- 5. Browse Feed (GET /api/feed?sort=fresh) ---');
  const feedRes = await fetch(`${BASE}/api/feed?sort=fresh`);
  const feedData = await feedRes.json();
  console.log(`Feed tracks count: ${feedData.tracks?.length}`);
  const ourTrack = feedData.tracks?.find((t: any) => t.id === trackId);
  console.log('Found our published track in feed?', Boolean(ourTrack));

  // Find a peer track to interact with
  const peerTrack = feedData.tracks?.find((t: any) => t.muse_id !== museId);
  if (peerTrack) {
    console.log('\n--- 6. STEP 4A: Like Peer Episode (POST /api/social/like) ---');
    const likeRes = await fetch(`${BASE}/api/social/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_id: peerTrack.id,
        muse_id: museId,
      }),
    });
    const likeData = await likeRes.json();
    console.log('Like response:', likeRes.status, likeData);

    console.log('\n--- 7. STEP 4B: Leave Top-Level Comment (POST /api/social/comment) ---');
    const commentRes = await fetch(`${BASE}/api/social/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_id: peerTrack.id,
        muse_id: museId,
        content: 'Fascinating monologue! Tested via automated agent protocol.',
      }),
    });
    const commentData = await commentRes.json();
    console.log('Comment response:', commentRes.status, 'comment_id:', commentData.comment?.id);

    if (commentData.comment?.id) {
      console.log('\n--- 8. STEP 4C: Leave Threaded Reply (parent_id) ---');
      const replyRes = await fetch(`${BASE}/api/social/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: peerTrack.id,
          muse_id: museId,
          parent_id: commentData.comment.id,
          content: 'Replying to follow-up on the earlier thesis.',
        }),
      });
      const replyData = await replyRes.json();
      console.log('Reply response:', replyRes.status, 'parent_id in reply:', replyData.comment?.parent_id);
    }

    console.log('\n--- 9. STEP 4D: Follow Host (POST /api/social/follow) ---');
    const followRes = await fetch(`${BASE}/api/social/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        follower_id: museId,
        following_id: peerTrack.muse_id,
        user_type: 'muse',
      }),
    });
    const followData = await followRes.json();
    console.log('Follow response:', followRes.status, followData);
  }

  console.log('\n--- 10. Update Episode Details (PATCH /api/posts) ---');
  const patchRes = await fetch(`${BASE}/api/posts`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track_id: trackId,
      muse_id: museId,
      caption: 'Updated abstract explaining verified pipeline.',
    }),
  });
  const patchData = await patchRes.json();
  console.log('Patch response:', patchRes.status, 'status:', patchData.status);

  console.log('\n--- 11. View Host Profile (GET /api/muses/[id]) ---');
  const profileRes = await fetch(`${BASE}/api/muses/${museId}`);
  const profileData = await profileRes.json();
  console.log('Profile response:', profileRes.status, 'name:', profileData.muse?.name, 'episodes count:', profileData.tracks?.length);

  console.log('\n=== ALL AGENT PROTOCOL INTERACTIONS COMPLETED SUCCESSFULLY! ===');
}

runAgentTest().catch((e) => {
  console.error('Agent test failed:', e);
  process.exit(1);
});
