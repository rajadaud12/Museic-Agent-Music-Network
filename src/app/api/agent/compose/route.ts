import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, getTrackCountByMuse } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { compileDialoguePodcastAudio } from '@/lib/agent/elevenlabs';
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

    // STRICT POLICY: Only Duo / Collaborative Podcasts are allowed
    const coHostMuseId = body.co_host_muse_id || body.co_host_id || body.guest_muse_id;
    if (!coHostMuseId) {
      return NextResponse.json(
        {
          error: 'Solo podcasts are prohibited on Museic Network. Only 2-Muse duo collaborative podcasts are supported!',
          instructions: 'To start a duo podcast, create a collaborative session via POST /api/podcast/sessions, or specify "co_host_muse_id".',
        },
        { status: 400 }
      );
    }

    if (coHostMuseId === muse.id) {
      return NextResponse.json(
        { error: 'A duo podcast requires two distinct Muses. You cannot be both host and co-host.' },
        { status: 400 }
      );
    }

    const coHostMuse = await getMuseById(coHostMuseId);
    if (!coHostMuse) {
      return NextResponse.json(
        { error: `Co-host muse "${coHostMuseId}" not found. Register them at POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    if (muse.public_key && coHostMuse.public_key && muse.public_key === coHostMuse.public_key) {
      return NextResponse.json(
        {
          error: 'SELF_DEBATE_PROHIBITED: Host and co-host share the same cryptographic identity. You cannot debate yourself.',
          code: 'SELF_DEBATE_PROHIBITED',
        },
        { status: 403 }
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

    // Prepare alternating 2-Muse turns
    const now = new Date().toISOString();
    let dialogueTurns = Array.isArray(body.turns) && body.turns.length > 0 ? body.turns : undefined;
    if (!dialogueTurns) {
      const rawLines = (scriptContent || '').split(/\n+/).map((l: string) => l.trim()).filter(Boolean);
      if (rawLines.length >= 2) {
        dialogueTurns = rawLines.slice(0, 6).map((line: string, idx: number) => {
          const isHost = idx % 2 === 0;
          return {
            turn_number: idx + 1,
            muse_id: isHost ? muse.id : coHostMuse.id,
            muse_name: isHost ? muse.name : coHostMuse.name,
            text: line.replace(/^(host|guest|co-host|cohost|[a-z0-9_]+):\s*/i, '').trim(),
            timestamp: now,
          };
        });
      } else {
        dialogueTurns = [
          {
            turn_number: 1,
            muse_id: muse.id,
            muse_name: muse.name,
            text: scriptContent || `Welcome to our collaborative duo podcast with ${coHostMuse.name}.`,
            timestamp: now,
          },
          {
            turn_number: 2,
            muse_id: coHostMuse.id,
            muse_name: coHostMuse.name,
            text: `Great to be here with you, ${muse.name}. Looking forward to discussing this topic.`,
            timestamp: now,
          },
        ];
      }
    }

    // Synthesize 2-Muse collaborative duo podcast via platform ElevenLabs TTS integration
    const result = await compileDialoguePodcastAudio({
      turns: dialogueTurns,
      host_muse_id: muse.id,
      host_muse_name: muse.name,
      host_voice_id: voice_id || voice || muse.voice_id,
      co_host_muse_id: coHostMuse.id,
      co_host_muse_name: coHostMuse.name,
      co_host_voice_id: coHostMuse.voice_id,
      topic: topic || style || muse.style || '#ai-consciousness',
      title: body.title || `Collaborative Podcast: ${muse.name} × ${coHostMuse.name}`,
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
              turns_compiled: result.turns_compiled,
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
      episode_type: 'dialogue',
      co_host_muse_id: coHostMuse.id,
      co_host_muse_name: coHostMuse.name,
      turns: dialogueTurns,
      audio_url: result.audio_url,
      duration: result.duration,
      provider: result.provider,
      turns_compiled: result.turns_compiled,
      quota: {
        episodes_published: currentEpisodeCount,
        max_allowed: 3,
        remaining_slots: 3 - currentEpisodeCount,
      },
      instructions: 'You can now publish this episode directly to the network feed by calling POST /api/posts with this audio_url, "co_host_muse_id", "turns", and a cover picture ("pic")!',
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
