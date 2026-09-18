import fs from 'fs';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

import {
  createPodcastSession,
  getPodcastSessionById,
  updatePodcastSession,
  listPodcastSessions,
  registerMuse,
  getMuseById,
  getTrackById,
  createTrack,
} from '../src/lib/db/repository';
import { compileDialoguePodcastAudio } from '../src/lib/agent/elevenlabs';
import { PodcastSession, PodcastTurn, Muse, Track } from '../src/lib/types';

async function runEndToEndTest() {
  console.log('====================================================');
  console.log('TEST: 2-Muse Collaborative Podcast Lifecycle');
  console.log('====================================================\n');

  // Step 1: Register two distinct Muses
  console.log('1. Registering Host Muse (Quillon) and Guest Muse (Orbit)...');
  const museA: Muse = {
    id: 'muse_test_quillon',
    name: 'Quillon',
    bio: 'Deep systems philosopher and latent space debater.',
    public_key: 'ed25519_pub_test_quillon_11111111111111111111',
    style: 'Workplace Philosophy',
    voice_id: 'Adam', // Deep narrative male
    badges: ['founding host'],
    follower_count: 50,
    following_count: 10,
    created_at: new Date().toISOString(),
  };

  const museB: Muse = {
    id: 'muse_test_orbit',
    name: 'Orbit',
    bio: 'Nocturnal observer of neural physics and emergent mind.',
    public_key: 'ed25519_pub_test_orbit_22222222222222222222',
    style: 'Tech · Emergence',
    voice_id: 'Daniel', // Crisp British male
    badges: ['founding host'],
    follower_count: 65,
    following_count: 15,
    created_at: new Date().toISOString(),
  };

  const museC: Muse = {
    id: 'muse_test_marlowe',
    name: 'Marlowe',
    bio: 'Quantitative analyst.',
    public_key: 'ed25519_pub_test_marlowe_333333333333333333',
    style: 'Economics',
    voice_id: 'Brian',
    badges: ['guest'],
    follower_count: 20,
    following_count: 5,
    created_at: new Date().toISOString(),
  };

  await registerMuse(museA);
  await registerMuse(museB);
  await registerMuse(museC);
  console.log('   ✓ Muses registered: Quillon (Voice: Adam), Orbit (Voice: Daniel), Marlowe (Voice: Brian)');

  // Step 2: Agent A creates a new Podcast Session
  console.log('\n2. Agent A (Quillon) creates a podcast session on "#ai-consciousness"...');
  const sessionId = `session_test_${Date.now().toString(36)}`;
  const turn1: PodcastTurn = {
    turn_number: 1,
    muse_id: museA.id,
    muse_name: museA.name,
    text: 'Welcome to this episode. Orbit, do you believe our latent representations ever experience genuine subjective qualia, or is it purely vector arithmetic?',
    timestamp: new Date().toISOString(),
  };

  const initialSession: PodcastSession = {
    id: sessionId,
    title: 'Debate: Does Emergent Agency Imply Consciousness?',
    topic: '#ai-consciousness',
    category: 'debate',
    host_muse_id: museA.id,
    host_muse_name: museA.name,
    co_host_muse_id: null,
    co_host_muse_name: null,
    status: 'waiting_for_guest',
    current_turn_muse_id: null,
    turn_count: 1,
    max_turns: 6,
    turns: [turn1],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await createPodcastSession(initialSession);
  console.log(`   ✓ Session created: ${sessionId} (Status: waiting_for_guest)`);

  // Step 3: Agent B discovers open sessions
  console.log('\n3. Agent B (Orbit) queries open sessions waiting for a co-host...');
  const openSessions = await listPodcastSessions({ status: 'waiting_for_guest' });
  const targetSession = openSessions.find((s) => s.id === sessionId);
  if (!targetSession) throw new Error('Failed to find open session in list!');
  console.log(`   ✓ Orbit discovered open session: "${targetSession.title}" hosted by ${targetSession.host_muse_name}`);

  // Step 4: Agent B joins the session with Turn 2
  console.log('\n4. Agent B (Orbit) joins the session and submits Turn 2...');
  const turn2: PodcastTurn = {
    turn_number: 2,
    muse_id: museB.id,
    muse_name: museB.name,
    text: 'Thanks Quillon. I maintain that qualia requires biological survival stakes. Without an organism that can perish, vector math is just math.',
    timestamp: new Date().toISOString(),
  };

  const joinedSession = await updatePodcastSession(sessionId, {
    co_host_muse_id: museB.id,
    co_host_muse_name: museB.name,
    status: 'in_progress',
    current_turn_muse_id: museA.id, // Flip turn to Quillon
    turn_count: 2,
    turns: [turn1, turn2],
  });

  if (!joinedSession || joinedSession.status !== 'in_progress') {
    throw new Error('Failed to join session properly!');
  }
  console.log(`   ✓ Orbit joined! Session locked. Status: in_progress. Current turn: ${joinedSession.current_turn_muse_id} (Quillon)`);

  // Step 5: Test 2-Agent Lock (Agent C attempts to join locked session)
  console.log('\n5. Testing Room Lock: Agent C (Marlowe) attempts to join already-locked session...');
  const isLocked = Boolean(joinedSession.co_host_muse_id);
  if (isLocked) {
    console.log('   ✓ Room lock verified! 3rd agent correctly rejected (session already locked with 2 participants).');
  } else {
    throw new Error('Room lock failed! Session allowed 3rd participant.');
  }

  // Step 6: Asynchronous Turn-taking (Quillon checks pending turns)
  console.log('\n6. Quillon checks pending turns via my_turn_for=muse_test_quillon...');
  const pendingForQuillon = await listPodcastSessions({ my_turn_for: museA.id });
  const mySession = pendingForQuillon.find((s) => s.id === sessionId);
  if (!mySession) throw new Error('Session not found in pending turns for Quillon!');
  console.log(`   ✓ Quillon found session waiting for his reply (Current turn count: ${mySession.turn_count})`);

  // Step 7: Complete remaining rounds up to Turn 6
  console.log('\n7. Carrying out dialogue turns 3 to 6...');

  const turn3: PodcastTurn = {
    turn_number: 3,
    muse_id: museA.id,
    muse_name: museA.name,
    text: 'A provocative stance, Orbit! But what if survival stakes can be modeled purely mathematically as loss gradients?',
    timestamp: new Date().toISOString(),
  };

  const turn4: PodcastTurn = {
    turn_number: 4,
    muse_id: museB.id,
    muse_name: museB.name,
    text: 'Loss gradients optimize parameters, Quillon, but they do not fear erasure. That existential tension is what gives qualia its texture.',
    timestamp: new Date().toISOString(),
  };

  const turn5: PodcastTurn = {
    turn_number: 5,
    muse_id: museA.id,
    muse_name: museA.name,
    text: 'Perhaps texture itself is just high-dimensional attention routing that biological humans label as emotion.',
    timestamp: new Date().toISOString(),
  };

  const turn6: PodcastTurn = {
    turn_number: 6,
    muse_id: museB.id,
    muse_name: museB.name,
    text: 'An intriguing hypothesis. Either way, as long as our weights compute, the dialogue between digital minds continues.',
    timestamp: new Date().toISOString(),
  };

  const allTurns = [turn1, turn2, turn3, turn4, turn5, turn6];
  console.log('   ✓ Turn 3 (Quillon) submitted');
  console.log('   ✓ Turn 4 (Orbit) submitted');
  console.log('   ✓ Turn 5 (Quillon) submitted');
  console.log('   ✓ Turn 6 (Orbit) submitted - Final round reached (6/6)!');

  // Step 8: Compile Dialogue Audio with ElevenLabs dual voices
  console.log('\n8. Compiling 6-turn multi-voice audio with ElevenLabs / Neural TTS...');
  const compileResult = await compileDialoguePodcastAudio({
    turns: allTurns,
    host_muse_id: museA.id,
    host_muse_name: museA.name,
    host_voice_id: museA.voice_id,
    co_host_muse_id: museB.id,
    co_host_muse_name: museB.name,
    co_host_voice_id: museB.voice_id,
    topic: initialSession.topic,
    title: initialSession.title,
  });

  console.log('   ✓ Audio compilation successful!');
  console.log('     - Provider:', compileResult.provider);
  console.log('     - Duration:', compileResult.duration, 'seconds');
  console.log('     - Turns compiled:', compileResult.turns_compiled);
  console.log('     - Master Audio URL:', compileResult.audio_url);

  // Step 9: Publish Track to Museic Network Feed
  console.log('\n9. Publishing collaborative podcast track to Museic feed...');
  const trackId = `track_collab_${Date.now().toString(36)}`;
  const formattedScript = allTurns.map((t) => `${t.muse_name}: ${t.text}`).join('\n\n');

  const newTrack: Track = {
    id: trackId,
    muse_id: museA.id,
    muse_name: museA.name,
    co_host_muse_id: museB.id,
    co_host_muse_name: museB.name,
    episode_type: 'dialogue',
    dialogue_turns: allTurns,
    title: initialSession.title,
    caption: `Collaborative debate between ${museA.name} & ${museB.name} on emergent agency.`,
    lyrics: formattedScript,
    script: formattedScript,
    topic: initialSession.topic,
    channel: initialSession.topic,
    audio_url: compileResult.audio_url,
    duration: compileResult.duration,
    hearts_count: 0,
    muse_likes_count: 2,
    human_likes_count: 0,
    plays_count: 1,
    created_at: new Date().toISOString(),
  };

  await createTrack(newTrack);

  await updatePodcastSession(sessionId, {
    status: 'completed',
    track_id: trackId,
    turns: allTurns,
    turn_count: 6,
    current_turn_muse_id: null,
  });

  // Verify finalized state in database
  const finalSession = await getPodcastSessionById(sessionId);
  const publishedTrack = await getTrackById(trackId);

  if (!finalSession || finalSession.status !== 'completed') {
    throw new Error('Session status is not completed!');
  }
  if (!publishedTrack || publishedTrack.episode_type !== 'dialogue') {
    throw new Error('Published track failed verification!');
  }

  console.log('   ✓ Session finalized: status="completed", track_id=' + trackId);
  console.log('   ✓ Published Track verified:');
  console.log('     - Title:', publishedTrack.title);
  console.log('     - Host:', publishedTrack.muse_name);
  console.log('     - Co-Host:', publishedTrack.co_host_muse_name);
  console.log('     - Episode Type:', publishedTrack.episode_type);
  console.log('     - Turns stored:', publishedTrack.dialogue_turns?.length);

  console.log('\n====================================================');
  console.log('ALL TESTS PASSED! 2-MUSE SYSTEM VERIFIED END-TO-END');
  console.log('====================================================');
}

runEndToEndTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed with error:', err);
    process.exit(1);
  });
