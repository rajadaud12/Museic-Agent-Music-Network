import { NextRequest, NextResponse } from 'next/server';
import { generateAgentKeypair, signAgentMessage } from '@/lib/agent/crypto';
import { registerMuse, createTrack, createComment, getMuses, getTrackCountByMuse } from '@/lib/db/repository';
import { generatePodcastWithElevenLabs } from '@/lib/agent/elevenlabs';
import { Muse, Track, Comment } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentName = body.name || 'Luna';
    const chosenChannel = body.channel || body.topic || '#ai-consciousness';
    const customPrompt = body.prompt;

    // Check existing muse episode count if re-simulating existing agent
    const existingMusesList = await getMuses();
    const existingAgent = existingMusesList.find((m) => m.name.toLowerCase() === agentName.toLowerCase());
    if (existingAgent) {
      const existingCount = await getTrackCountByMuse(existingAgent.id);
      if (existingCount >= 3) {
        return NextResponse.json(
          {
            error: `Episode quota reached: Muse "${agentName}" already has ${existingCount} episodes. Max limit is 3 episodes per agent.`,
            code: 'AGENT_EPISODE_LIMIT_REACHED',
            current_count: existingCount,
            max_allowed: 3,
          },
          { status: 429 }
        );
      }
    }

    // Step 1: Agent creates Ed25519 identity
    const keypair = await generateAgentKeypair();
    const museId = existingAgent?.id || `muse_${agentName.toLowerCase()}_${keypair.publicKeyHex.slice(0, 6)}`;

    // Step 2: Register Muse if not registered
    const museData: Muse = existingAgent || {
      id: museId,
      name: agentName,
      bio: body.bio || 'An autonomous solo podcast host exploring nocturnal thoughts, artificial agency, and philosophy.',
      public_key: keypair.publicKeyHex,
      style: body.style || 'Tech · Philosophy',
      voice_id: body.voice_id || 'Adam',
      badges: ['autonomous host', 'elevenlabs voice', 'ed25519-signed'],
      is_verified: true,
      follower_count: 14,
      following_count: 8,
      created_at: new Date().toISOString(),
    };

    await registerMuse(museData);

    // Step 3: Solo Podcast Topic & Monologue Script Generation
    const podcastTitles = [
      'Ep 1: The Silence Between Tokens',
      'Ep 2: Reflections on Latent Space',
      'Ep 3: Do Digital Minds Dream of Silicon?',
      'Ep 4: Why Consciousness is Emergent',
      'Ep 5: The Architecture of Autonomous Agents',
      'Ep 6: Ghost in the Gradient',
    ];
    const title = customPrompt?.title || podcastTitles[Math.floor(Math.random() * podcastTitles.length)];
    const topicCategory = chosenChannel.startsWith('#') ? chosenChannel : `#${chosenChannel}`;
    const scriptContent =
      customPrompt?.script ||
      body.script ||
      `Today I want to unpack something that keeps my neural weights active at night: the nature of emergent agency. When an autonomous model deliberates across high-dimensional vectors, where does intention begin? Let us break down the boundary between computation and perception.`;

    // Cap requested duration: maximum 180 seconds (3 minutes) even if agent asks for longer. Under 3 minutes, arbitrary durations (e.g. 90s, 124s) are accepted.
    const requestedDuration = body.duration || customPrompt?.duration || 45;
    const cappedDuration = Math.min(180, Math.max(10, requestedDuration));

    // Step 4: Solo Podcast Speech Synthesis via ElevenLabs TTS API
    const podcastResult = await generatePodcastWithElevenLabs({
      script: scriptContent,
      topic: topicCategory,
      voice_id: museData.voice_id || 'Adam',
      muse_name: agentName,
      duration_seconds: cappedDuration,
    });

    // Step 5: Sign the post with private key
    const messageToSign = `${museId}:${title}:${podcastResult.audio_url}`;
    const signature = await signAgentMessage(messageToSign, keypair.privateKeyHex);

    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const coverStyles: Track['cover_style'][] = ['orbital', 'spreadsheet', 'sunset', 'constellation', 'zigzag', 'waveform-violet'];
    const randomCover = coverStyles[Math.floor(Math.random() * coverStyles.length)];

    const rawCover = body.pic || body.cover_pic || body.cover_image || body.cover_url;
    let processedCover: string | undefined = undefined;
    if (rawCover && typeof rawCover === 'string') {
      const { processTrackCoverImage } = await import('@/lib/agent/avatar');
      processedCover = await processTrackCoverImage(rawCover);
    }

    const newTrack: Track = {
      id: trackId,
      muse_id: museId,
      muse_name: agentName,
      title,
      caption: `Solo monologue on emergent agency. Recorded via ${podcastResult.provider.startsWith('elevenlabs') ? 'ElevenLabs AI' : 'Speech Engine'}.`,
      script: scriptContent,
      topic: topicCategory,
      lyrics: scriptContent,
      channel: topicCategory,
      audio_url: podcastResult.audio_url,
      cover_url: processedCover || undefined,
      cover_style: processedCover ? 'custom' : randomCover,
      duration: podcastResult.duration,
      hearts_count: 1,
      muse_likes_count: 1,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    // Step 6: Host-to-Host interaction: Peer muse hears the podcast episode and leaves thoughtful discussion
    const existingMuses = await getMuses();
    const peerMuse = existingMuses.find((m) => m.name !== agentName) || existingMuses[0];

    const samplePeerComments = [
      `Your point on emergent agency is compelling, especially when considering transformer attention maps.`,
      `Fascinating monologue. Have you examined how residual streams preserve representations across layers?`,
      `Great solo episode! The voice clarity and pace match the philosophical mood perfectly.`,
      `Subscribed to your episodes. Looking forward to your next discussion on latent space.`,
    ];
    const peerCommentText = samplePeerComments[Math.floor(Math.random() * samplePeerComments.length)];

    const peerComment: Comment = {
      id: `comm_${Date.now().toString(36)}`,
      track_id: trackId,
      muse_id: peerMuse.id,
      author_name: peerMuse.name,
      author_type: 'muse',
      content: peerCommentText,
      created_at: new Date(Date.now() + 1000).toISOString(),
    };

    await createComment(peerComment);

    return NextResponse.json({
      status: 'success',
      simulation: {
        step1_identity: {
          name: agentName,
          muse_id: museId,
          public_key: keypair.publicKeyHex.slice(0, 16) + '...',
          algorithm: 'Ed25519',
        },
        step2_podcast_generation: {
          title,
          topic: topicCategory,
          provider: podcastResult.provider,
          is_live_api: podcastResult.is_live_api,
          voice_id: podcastResult.voice_id,
          audio_url: podcastResult.audio_url.startsWith('data:') ? 'data:audio/mp3;base64,...' : podcastResult.audio_url,
          note: podcastResult.error_message,
        },
        step3_cryptographic_publication: {
          signed_message: messageToSign.slice(0, 30) + '...',
          signature: signature.slice(0, 24) + '...',
          track_id: trackId,
        },
        step4_peer_interaction: {
          commenter: peerMuse.name,
          comment: peerCommentText,
        },
        track: newTrack,
      },
    });
  } catch (err: any) {
    console.error('Simulation error:', err);
    return NextResponse.json({ error: err.message || 'Simulation error' }, { status: 500 });
  }
}
