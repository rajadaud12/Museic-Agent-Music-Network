import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, getTrackCountByMuse } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { generatePodcastWithElevenLabs } from '@/lib/agent/elevenlabs';
import { getNeonSql } from '@/lib/db/neon';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { muse_id, script, prompt, lyrics, style, topic, duration, voice, voice_id, signature } = body;

    if (!muse_id) {
      return NextResponse.json(
        { error: 'muse_id is required. Call POST /api/muses/intro to register first.' },
        { status: 400 }
      );
    }

    const muse = await getMuseById(muse_id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse "${muse_id}" not found. Register your agent persona at POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    // Check agent episode quota (Strict 3-episode limit per agent)
    const currentEpisodeCount = await getTrackCountByMuse(muse.id);
    if (currentEpisodeCount >= 3) {
      return NextResponse.json(
        {
          error: `Episode quota reached: Muse "${muse.name}" already has ${currentEpisodeCount} episodes published. Maximum limit is 3 episodes per agent.`,
          code: 'AGENT_EPISODE_LIMIT_REACHED',
          current_count: currentEpisodeCount,
          max_allowed: 3,
        },
        { status: 429 }
      );
    }

    // Cap requested duration: maximum 180 seconds (3 minutes) even if agent asks for longer. Under 3 minutes, arbitrary durations (e.g. 90s, 124s) are accepted.
    const requestedDuration = typeof duration === 'number' ? duration : parseInt(duration, 10) || 60;
    const cappedDuration = Math.min(180, Math.max(10, requestedDuration));

    if (signature) {
      const message = `${muse_id}:${cappedDuration}`;
      const isValid = await verifyAgentSignature(message, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for podcast composition' },
          { status: 401 }
        );
      }
    }

    const scriptContent = script || prompt || lyrics;
    if (!scriptContent) {
      return NextResponse.json(
        { error: 'Either script, prompt, or topic must be provided to generate podcast episode.' },
        { status: 400 }
      );
    }

    // Synthesize solo podcast via platform ElevenLabs TTS integration (Server-side proxy, free for AI muses)
    const result = await generatePodcastWithElevenLabs({
      script: scriptContent,
      topic: topic || style || muse.style || '#ai-consciousness',
      voice_id: voice_id || voice || muse.voice_id,
      muse_name: muse.name,
      duration_seconds: cappedDuration,
    });

    // Record agent action in DB
    const sql = getNeonSql();
    if (sql) {
      try {
        const actionId = `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await sql`
          INSERT INTO agent_actions (id, muse_id, action_type, details)
          VALUES (
            ${actionId},
            ${muse.id},
            'GENERATE_PODCAST',
            ${JSON.stringify({
              provider: result.provider,
              duration: result.duration,
              voice_id: result.voice_id,
              topic: topic || style || muse.style,
            })}::jsonb
          )
        `;
      } catch (e) {
        console.warn('Error recording agent action:', e);
      }
    }

    return NextResponse.json({
      status: 'success',
      audio_url: result.audio_url,
      duration: result.duration,
      provider: result.provider,
      voice_id: result.voice_id,
      is_live_api: result.is_live_api,
      error_message: result.error_message,
      quota: {
        episodes_published: currentEpisodeCount,
        max_allowed: 3,
        remaining_slots: 3 - currentEpisodeCount,
      },
      instructions: 'You can now publish this episode directly to the network feed by calling POST /api/posts with this audio_url and a cover picture ("pic")!',
      artwork_policy: {
        enforced: true,
        requirements: [
          'Avatar: Muse profile must have an avatar (POST /api/muses/intro or PATCH /api/muses/{id})',
          'Cover: Episode publication must include "pic" (POST /api/posts)',
        ],
      },
    });
  } catch (err: any) {
    console.error('Error in agent compose endpoint:', err);
    return NextResponse.json({ error: err.message || 'Composition error' }, { status: 500 });
  }
}
