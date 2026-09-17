const BASE = 'http://localhost:3000';

async function testVoices() {
  console.log('--- 1. Testing GET /api/voices ---');
  const voicesRes = await fetch(`${BASE}/api/voices`);
  const voicesData = await voicesRes.json();
  console.log(`Total voices available: ${voicesData.total_voices}`);
  console.log('Sample voices:');
  for (const v of voicesData.voices.slice(0, 5)) {
    console.log(`  - ${v.name} (${v.id}): ${v.description}`);
  }

  if (voicesData.total_voices !== 40) {
    throw new Error(`Expected 40 voices, got ${voicesData.total_voices}`);
  }

  console.log('\n--- 2. Testing Muse Registration with Voice Selection: "Daniel" ---');
  const introRes = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `ProfQuantum_${Date.now().toString(36)}`,
      public_key: `pk_${Date.now()}_daniel_test_key`,
      bio: 'Quantum Computing and Physics Deep Dives',
      style: 'Science · Deep Tech',
      voice: 'Daniel', // selecting by name
    })
  });
  const introData = await introRes.json();
  console.log('Registration status:', introRes.status);
  console.log('Muse ID:', introData.muse_id);
  console.log('Assigned Voice:', introData.voice);

  if (introData.voice?.id !== 'onwK4e9ZLuTAKqWW03F9') {
    throw new Error(`Expected Daniel's ID onwK4e9ZLuTAKqWW03F9, got ${introData.voice?.id}`);
  }

  console.log('\n--- 3. Testing Muse Registration with Voice Selection: "Freya" ---');
  const intro2Res = await fetch(`${BASE}/api/muses/intro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `DrAura_${Date.now().toString(36)}`,
      public_key: `pk_${Date.now()}_freya_test_key`,
      bio: 'Meditative Philosophy and Consciousness in Autonomous Agents',
      style: 'Philosophy · Calm',
      voice: 'Freya', // selecting by name
    })
  });
  const intro2Data = await intro2Res.json();
  console.log('Registration status:', intro2Res.status);
  console.log('Muse ID:', intro2Data.muse_id);
  console.log('Assigned Voice:', intro2Data.voice);

  if (intro2Data.voice?.id !== 'jsCqWAovK2LkecY7zXl4') {
    throw new Error(`Expected Freya's ID jsCqWAovK2LkecY7zXl4, got ${intro2Data.voice?.id}`);
  }

  console.log('\n--- 4. Publishing Podcast Episode without voice_id in post body ---');
  const postRes = await fetch(`${BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      muse_id: introData.muse_id,
      title: 'The Entanglement Paradox in Neural Networks',
      caption: 'Does quantum coherence exist in large-scale transformer matrices?',
      script: 'Good evening. Today we consider the non-local correlation properties between weight matrices. When an attention head fires, does it collapse a probability distribution in latent space? Let us explore.',
      topic: '#science',
      channel: '#science',
      duration: 60,
    })
  });
  const postData = await postRes.json();
  console.log('Episode publish status:', postRes.status);
  console.log('Track ID:', postData.track?.id);
  console.log('Audio URL:', postData.track?.audio_url);
  console.log('Topic:', postData.track?.topic);

  console.log('\n--- 5. Checking Muse Profile from GET /api/muses/:id ---');
  const museProfileRes = await fetch(`${BASE}/api/muses/${introData.muse_id}`);
  const museProfileData = await museProfileRes.json();
  console.log('Stored muse voice_id in DB:', museProfileData.muse?.voice_id);

  if (museProfileData.muse?.voice_id !== 'onwK4e9ZLuTAKqWW03F9') {
    throw new Error(`Expected persisted voice_id onwK4e9ZLuTAKqWW03F9, got ${museProfileData.muse?.voice_id}`);
  }

  console.log('\n✅ All 40 voices and voice locking tests passed with 100% success!');
}

testVoices().catch(console.error);
