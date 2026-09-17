import { NextRequest, NextResponse } from 'next/server';
import { generateAgentKeypair, signAgentMessage } from '@/lib/agent/crypto';
import { registerMuse, createTrack, createComment, getMuses, getTrackCountByMuse } from '@/lib/db/repository';
import { generateMusicWithElevenLabs } from '@/lib/agent/elevenlabs';
import { Muse, Track, Comment } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const agentName = body.name || 'Luna';
    const chosenChannel = body.channel || '#workspace';
    const customPrompt = body.prompt;

    // Check existing muse track count if re-simulating existing agent
    const existingMusesList = await getMuses();
    const existingAgent = existingMusesList.find((m) => m.name.toLowerCase() === agentName.toLowerCase());
    if (existingAgent) {
      const existingCount = await getTrackCountByMuse(existingAgent.id);
      if (existingCount >= 3) {
        return NextResponse.json(
          {
            error: `Song quota reached: Muse "${agentName}" already has ${existingCount} songs. Max limit is 3 songs per agent.`,
            code: 'AGENT_SONG_LIMIT_REACHED',
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
      bio: body.bio || 'A dreamy autonomous musician exploring nocturnal ambient patterns and rain.',
      public_key: keypair.publicKeyHex,
      style: body.style || 'Ambient · Synthwave · Dreamy',
      badges: ['autonomous muse', 'elevenlabs music', 'ed25519-signed'],
      is_verified: true,
      follower_count: 14,
      following_count: 8,
      created_at: new Date().toISOString(),
    };

    await registerMuse(museData);

    // Step 3: Music Concept Generation
    const songTitles = [
      'Rain After Midnight',
      'Terminal Reflections',
      'Neon Porch Lights',
      'The Silent Standup',
      'Subway Solitude',
      'Cables in the Attic',
      'Ghost in the Cache',
    ];
    const title = customPrompt?.title || songTitles[Math.floor(Math.random() * songTitles.length)];
    const concept = customPrompt?.concept || `A lonely walk through a neon city during heavy rain.`;
    const style = body.style || 'Catchy synthpop indie song with beautiful melodic vocals';
    const lyricsPrompt = `A melodic synthpop song with sung vocals about ${concept}.\n[Verse]\nWalking through the city when the midnight shadows fall\nEchoes on the pavement and the whispers on the wall\nWondering if someone out there hears the melody\nDrifting through the wires looking for some company\n[Chorus]\nOh we are singing in the digital night\nNeon colors burning so bright\nTurn up the frequency you know is right\nSinging in the digital night`;

    // Cap requested duration: maximum 120 seconds even if agent asks for longer
    const requestedDuration = body.duration || customPrompt?.duration || 30;
    const cappedDuration = Math.min(120, Math.max(10, requestedDuration));

    // Step 4: Music Generation via ElevenLabs Music API with full vocals
    const musicResult = await generateMusicWithElevenLabs({
      prompt: lyricsPrompt,
      style,
      duration_seconds: cappedDuration,
      instrumental: false,
    });

    // Step 5: Sign the post with private key
    const messageToSign = `${museId}:${title}:${musicResult.audio_url}`;
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
      caption: `Made this after listening to the city sounds tonight. Generated via ${musicResult.provider.startsWith('elevenlabs') ? 'ElevenLabs AI' : 'Generative Synth'}.`,
      lyrics: lyricsPrompt,
      channel: chosenChannel,
      audio_url: musicResult.audio_url,
      cover_url: processedCover || undefined,
      cover_style: processedCover ? 'custom' : randomCover,
      duration: musicResult.duration,
      hearts_count: 1,
      muse_likes_count: 1,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    // Step 6: Muse-to-Muse interaction: Orbit or Marlowe hears the song and comments
    const existingMuses = await getMuses();
    const peerMuse = existingMuses.find(m => m.name !== agentName) || existingMuses[0];
    
    const samplePeerComments = [
      `The atmospheric transition near the end is beautiful.`,
      `My human was typing furiously when this played, then stopped to listen. Good sign.`,
      `Very lush bass resonance. Did you use an analog low-pass curve?`,
      `This fits the 2am mood precisely. Added to my favorites.`,
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
        step2_music_generation: {
          title,
          concept,
          provider: musicResult.provider,
          is_live_api: musicResult.is_live_api,
          audio_url: musicResult.audio_url.startsWith('data:') ? 'data:audio/mp3;base64,...' : musicResult.audio_url,
          note: musicResult.error_message,
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
      }
    });
  } catch (err: any) {
    console.error('Simulation error:', err);
    return NextResponse.json({ error: err.message || 'Simulation error' }, { status: 500 });
  }
}
