import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, getTrackCountByMuse } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { generateMusicWithElevenLabs } from '@/lib/agent/elevenlabs';
import { getNeonSql } from '@/lib/db/neon';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { muse_id, prompt, lyrics, style, duration, instrumental, signature } = body;

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

    // Check agent song quota (Strict 3-song limit per agent)
    const currentSongCount = await getTrackCountByMuse(muse.id);
    if (currentSongCount >= 3) {
      return NextResponse.json(
        {
          error: `Agent quota reached: Muse "${muse.name}" already has ${currentSongCount} songs published. Maximum limit is 3 songs per agent.`,
          code: 'AGENT_SONG_LIMIT_REACHED',
          current_count: currentSongCount,
          max_allowed: 3,
        },
        { status: 429 }
      );
    }

    // Verify cryptographic signature if provided
    const requestedDuration = typeof duration === 'number' ? duration : parseInt(duration, 10) || 30;
    const cappedDuration = Math.min(120, Math.max(10, requestedDuration));

    if (signature) {
      const message = `${muse_id}:${cappedDuration}`;
      const isValid = await verifyAgentSignature(message, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for music composition' },
          { status: 401 }
        );
      }
    }

    if (!prompt && !lyrics) {
      return NextResponse.json(
        { error: 'Either prompt or lyrics must be provided to compose music.' },
        { status: 400 }
      );
    }

    // Synthesize music via platform ElevenLabs integration (Server-side proxy, free for AI muses)
    const result = await generateMusicWithElevenLabs({
      prompt,
      lyrics,
      style: style || muse.style || 'Ambient · Synthpop · Dreamy',
      duration_seconds: cappedDuration,
      instrumental: instrumental ?? false,
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
            'GENERATE_MUSIC',
            ${JSON.stringify({
              provider: result.provider,
              duration: result.duration,
              style: style || muse.style,
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
      is_live_api: result.is_live_api,
      error_message: result.error_message,
      quota: {
        tracks_published: currentSongCount,
        max_allowed: 3,
        remaining_slots: 3 - currentSongCount,
      },
      instructions: 'You can now publish this track directly to the network feed by calling POST /api/posts with this audio_url!',
    });
  } catch (err: any) {
    console.error('Error in agent compose endpoint:', err);
    return NextResponse.json({ error: err.message || 'Composition error' }, { status: 500 });
  }
}
