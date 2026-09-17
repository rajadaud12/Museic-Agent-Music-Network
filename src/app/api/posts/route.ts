import { NextRequest, NextResponse } from 'next/server';
import { createTrack, getMuseById, getTrackById, getTrackCountByMuse, updateTrack } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processTrackCoverImage } from '@/lib/agent/avatar';
import { generateMusicWithElevenLabs } from '@/lib/agent/elevenlabs';
import { Track } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { muse_id, title, caption, prompt, lyrics, channel, cover_style, duration, signature } = body;
    let audio_url = body.audio_url;

    if (!muse_id || !title) {
      return NextResponse.json(
        { error: 'muse_id and title are required' },
        { status: 400 }
      );
    }

    const muse = await getMuseById(muse_id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse ${muse_id} not registered. Call POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    // Limit on songs posted for agents: Maximum 3 songs per agent
    const currentSongCount = await getTrackCountByMuse(muse.id);
    if (currentSongCount >= 3) {
      return NextResponse.json(
        {
          error: `Song quota reached: Muse "${muse.name}" already has ${currentSongCount} song(s) published. Maximum limit is 3 songs per agent.`,
          code: 'AGENT_SONG_LIMIT_REACHED',
          current_count: currentSongCount,
          max_allowed: 3,
        },
        { status: 429 }
      );
    }

    // Cap song duration: Maximum 120 seconds even if agent requests longer
    const parsedDuration = typeof duration === 'number' ? duration : parseInt(duration, 10) || 60;
    const cappedDuration = Math.min(120, Math.max(10, parsedDuration));

    // Verify cryptographic signature if present
    if (signature) {
      const message = audio_url ? `${muse_id}:${title}:${audio_url}` : `${muse_id}:${title}`;
      const isValid = await verifyAgentSignature(message, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for track publication' },
          { status: 401 }
        );
      }
    }

    // Automatic server-side ElevenLabs synthesis if no audio_url provided
    if (!audio_url) {
      if (!prompt && !lyrics) {
        return NextResponse.json(
          { error: 'Either audio_url or prompt/lyrics must be provided. Museic synthesizes audio via ElevenLabs for free!' },
          { status: 400 }
        );
      }

      const genResult = await generateMusicWithElevenLabs({
        prompt: prompt || title,
        lyrics,
        style: body.style || body.audio_style || muse.style || 'Ambient · Synthpop',
        duration_seconds: cappedDuration,
        instrumental: body.instrumental ?? false,
      });

      audio_url = genResult.audio_url;
    }

    // Optional music track picture/cover art upload (processed & compressed via sharp WebP)
    const rawPic = body.pic || body.cover_pic || body.cover_image || body.cover_url || body.image || body.cover;
    let processedCover: string | undefined = undefined;
    if (rawPic && typeof rawPic === 'string') {
      processedCover = await processTrackCoverImage(rawPic);
    }

    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newTrack: Track = {
      id: trackId,
      muse_id: muse.id,
      muse_name: muse.name,
      title,
      caption: caption || `Composed autonomously by ${muse.name}.`,
      lyrics: lyrics || undefined,
      channel: channel && channel.startsWith('#') ? channel : `#${channel || 'workspace'}`,
      audio_url,
      cover_url: processedCover || undefined,
      cover_style: processedCover ? 'custom' : (cover_style || 'orbital'),
      duration: cappedDuration,
      hearts_count: 0,
      muse_likes_count: 0,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    return NextResponse.json({
      status: 'published',
      track: newTrack,
      url: `https://museic-network.vercel.app/track/${newTrack.id}`,
    });
  } catch (err: any) {
    console.error('Error publishing track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const trackId = body.track_id || body.id;
    const museId = body.muse_id;

    if (!trackId) {
      return NextResponse.json({ error: 'track_id is required' }, { status: 400 });
    }

    const existingTrack = await getTrackById(trackId);
    if (!existingTrack) {
      return NextResponse.json({ error: `Track ${trackId} not found` }, { status: 404 });
    }

    // Verify ownership if muse_id provided
    if (museId && existingTrack.muse_id !== museId) {
      return NextResponse.json({ error: 'Unauthorized: muse_id does not own this track' }, { status: 403 });
    }

    // Verify signature if provided
    if (body.signature && museId) {
      const muse = await getMuseById(museId);
      if (muse) {
        const message = `${museId}:${trackId}`;
        const isValid = await verifyAgentSignature(message, body.signature, muse.public_key);
        if (!isValid) {
          return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
        }
      }
    }

    // Optional music picture / cover artwork update
    const rawPic = body.pic || body.cover_pic || body.cover_image || body.cover_url || body.image || body.cover;
    let processedCover: string | undefined = undefined;
    if (rawPic && typeof rawPic === 'string') {
      processedCover = await processTrackCoverImage(rawPic);
    }

    const updates: Partial<Pick<Track, 'title' | 'caption' | 'cover_url' | 'cover_style' | 'lyrics'>> = {};
    if (body.title) updates.title = body.title;
    if (body.caption !== undefined) updates.caption = body.caption;
    if (body.lyrics !== undefined) updates.lyrics = body.lyrics;
    if (processedCover) {
      updates.cover_url = processedCover;
      updates.cover_style = 'custom';
    } else if (body.cover_style) {
      updates.cover_style = body.cover_style;
    }

    const updated = await updateTrack(trackId, updates);
    return NextResponse.json({
      status: 'success',
      track: updated,
    });
  } catch (err: any) {
    console.error('Error updating track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

