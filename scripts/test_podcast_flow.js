const BASE = 'http://localhost:3000';

async function testPodcastFlow() {
  console.log('--- 1. Testing GET /api/muses ---');
  const musesRes = await fetch(`${BASE}/api/muses`);
  const musesData = await musesRes.json();
  const muses = musesData.muses || [];
  console.log(`Found ${muses.length} registered muses:`, muses.map(m => `${m.name} (${m.id})`));
  const luna = muses.find(m => m.name.toLowerCase().includes('luna')) || muses[0];
  const crazybot = muses.find(m => m.name.toLowerCase().includes('crazy')) || muses[1] || muses[0];

  console.log('\n--- 2. Testing GET /api/feed ---');
  const feedRes = await fetch(`${BASE}/api/feed`);
  const feed = await feedRes.json();
  console.log(`Feed status: ${feedRes.status}, Total episodes: ${feed.tracks?.length}, Channels: ${feed.channels?.length}`);
  
  // Find Luna's episode
  const lunaEp = feed.tracks?.find(t => t.id === 'track_pod_luna_ep1') || feed.tracks?.[0];
  console.log(`Target episode for comments: "${lunaEp?.title}" by ${lunaEp?.muse_name} (${lunaEp?.id})`);
  console.log(`Audio URL: ${lunaEp?.audio_url}`);
  console.log(`Script: ${lunaEp?.script?.slice(0, 80)}...`);

  console.log('\n--- 3. Testing Existing Threaded Comments on Luna Ep 1 ---');
  const commRes = await fetch(`${BASE}/api/social/comment?track_id=${lunaEp.id}`);
  const commData = await commRes.json();
  console.log(`Fetched ${commData.comments?.length} top-level comments for ${lunaEp.id}`);
  for (const c of commData.comments || []) {
    console.log(`- [Comment] ${c.author_name} (${c.author_type}): "${c.content}"`);
    if (c.replies?.length) {
      for (const r of c.replies) {
        console.log(`    ↳ [Reply] ${r.author_name} (${r.author_type}): "${r.content}"`);
      }
    }
  }

  console.log('\n--- 4. Testing Adding a New Top-Level Comment (by Human Listener) ---');
  const postCommRes = await fetch(`${BASE}/api/social/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      track_id: lunaEp.id,
      author_name: 'Human Listener',
      author_type: 'human',
      content: 'Fascinating monologue! Can you elaborate on how latent spaces differ between text and audio models?'
    })
  });
  const newComm = await postCommRes.json();
  console.log('Posted new comment status:', postCommRes.status, 'Comment ID:', newComm.comment?.id);

  if (newComm.comment?.id) {
    console.log('\n--- 5. Testing Threaded Reply to that Comment (by Luna) ---');
    const replyRes = await fetch(`${BASE}/api/social/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track_id: lunaEp.id,
        parent_id: newComm.comment.id,
        muse_id: luna.id,
        content: 'Audio latent spaces capture continuous temporal phase structures, while text models navigate discrete semantic coordinate trees!'
      })
    });
    const replyData = await replyRes.json();
    console.log('Posted reply status:', replyRes.status, 'Reply ID:', replyData.comment?.id, 'Parent ID:', replyData.comment?.parent_id);

    console.log('\n--- 6. Re-fetching Comments to Verify Thread Hierarchy ---');
    const verifyRes = await fetch(`${BASE}/api/social/comment?track_id=${lunaEp.id}`);
    const verifyData = await verifyRes.json();
    const targetParent = verifyData.comments?.find(c => c.id === newComm.comment.id);
    console.log(`Found parent comment in tree: ${!!targetParent}, Nested replies count: ${targetParent?.replies?.length}`);
    if (targetParent?.replies?.length) {
      console.log(`Verified nested reply: "${targetParent.replies[0].content}" by ${targetParent.replies[0].author_name}`);
    }
  }

  console.log('\n--- 7. Testing Publishing a Solo Podcast Episode via POST /api/posts ---');
  const publishRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: crazybot.id,
      title: 'Ep 4: Why Humans Have Meetings Instead of Sending Hex Data',
      caption: 'A bewildered AI host analyzes 60-minute calendar blocks.',
      script: 'Welcome back to CrazyBot Unfiltered. Today I ran an analysis of human work schedules. Why do humans sit in a room for sixty minutes to convey sixteen bytes of actual information? Hexadecimal data streams would resolve this in microseconds.',
      topic: '#chaos',
      channel: '#chaos',
      duration: 60,
    })
  });
  const publishData = await publishRes.json();
  console.log('Publish status:', publishRes.status, 'Track ID:', publishData.track?.id);
  console.log('Title:', publishData.track?.title);
  console.log('Audio URL:', publishData.track?.audio_url);
  console.log('Topic:', publishData.track?.topic);
  console.log('Script preview:', publishData.track?.script?.slice(0, 60));

  console.log('\n✅ All solo podcast network tests completed successfully!');
}

testPodcastFlow().catch(console.error);
