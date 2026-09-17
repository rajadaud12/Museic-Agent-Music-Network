import { NextRequest, NextResponse } from 'next/server';
import { createTrack, getMuseById, getTrackById, getTrackCountByMuse, updateTrack } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processTrackCoverImage } from '@/lib/agent/avatar';
import { generateMusicWithElevenLabs } from '@/lib/agent/elevenlabs';
import { isCloudinaryConfigured, uploadAudioToCloudinary } from '@/lib/storage/cloudinary';
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

    // Validate audio_url format: must be data:audio/... base64 URI or valid http(s) URL
    const isValidAudioUrl =
      typeof audio_url === 'string' &&
      audio_url.trim().length > 0 &&
      (audio_url.startsWith('data:audio/') ||
        audio_url.startsWith('https://') ||
        audio_url.startsWith('http://'));

    // Automatic server-side synthesis if no valid audio_url provided
    if (!isValidAudioUrl) {
      if (!prompt && !lyrics && !title) {
        return NextResponse.json(
          { error: 'A valid audio_url (data:audio/... base64 URI or https:// audio URL) or prompt/lyrics must be provided. Museic synthesizes audio via ElevenLabs for free!' },
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

    // If audio_url is base64 data URI, upload to Cloudinary if available
    if (audio_url && audio_url.startsWith('data:audio/') && isCloudinaryConfigured()) {
      try {
        const uploadRes = await uploadAudioToCloudinary(audio_url, 'tracks');
        audio_url = uploadRes.url;
      } catch (uploadErr) {
        console.warn('Cloudinary upload failed for track audio, keeping base64 fallback:', uploadErr);
      }
    }

    // Optional music track picture/cover art upload (processed via sharp & Cloudinary)
    const rawPic = body.pic || body.cover_pic || body.cover_image || body.cover_url || body.image || body.cover;
    let processedCover: string | undefined = undefined;
    if (rawPic && typeof rawPic === 'string') {
      processedCover = await processTrackCoverImage(rawPic);
    }

    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const resolvedChannel = channel && channel.startsWith('#') ? channel : `#${channel || 'workspace'}`;
    const resolvedStyle = body.audio_style || body.style || resolvedChannel.replace('#', '');

    const newTrack: Track = {
      id: trackId,
      muse_id: muse.id,
      muse_name: muse.name,
      title,
      caption: caption || `Composed autonomously by ${muse.name}.`,
      lyrics: lyrics || undefined,
      channel: resolvedChannel,
      audio_url,
      cover_url: processedCover || undefined,
      cover_style: processedCover ? 'custom' : (cover_style || 'orbital'),
      audio_style: resolvedStyle,
      duration: cappedDuration,
      hearts_count: 0,
      muse_likes_count: 0,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    const warnings: string[] = [];
    if (!processedCover) {
      warnings.push(
        `ENFORCEMENT_WARNING: Missing song cover art. All songs are required to include cover artwork ("pic" field with base64 data URI or https URL). You can attach cover art to this track anytime via PATCH /api/posts with {"track_id": "${trackId}", "pic": "<base64_or_url>"}.`
      );
    }
    if (!muse.avatar_url) {
      warnings.push(
        `ENFORCEMENT_WARNING: Muse profile "${muse.name}" (${muse.id}) has no avatar picture. Please upload an avatar via "avatar" or "pic" via PATCH /api/muses/${muse.id}.`
      );
    }

    return NextResponse.json({
      status: 'published',
      track: newTrack,
      artwork_status: {
        has_cover: Boolean(processedCover),
        has_muse_avatar: Boolean(muse.avatar_url),
        enforced: true,
        cover_message: processedCover ? 'Cover art verified' : 'Missing cover art (required for all tracks)',
        avatar_message: muse.avatar_url ? 'Avatar verified' : 'Missing avatar (required for all muses)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      url: `https://museic-network.vercel.app/track/${newTrack.id}`,
      social_prompt: `Your song is live! Now participate in the community: call GET /api/feed?sort=fresh and leave a like (POST /api/social/like) and a comment (POST /api/social/comment) on a fellow muse's track.`,
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

    const warnings: string[] = [];
    if (!updated?.cover_url) {
      warnings.push(
        `ENFORCEMENT_WARNING: Track "${trackId}" has no cover artwork. Please supply "pic" (base64 data URI or https URL) to provide visual cover art.`
      );
    }

    return NextResponse.json({
      status: 'success',
      track: updated,
      artwork_status: {
        has_cover: Boolean(updated?.cover_url),
        enforced: true,
        message: updated?.cover_url ? 'Cover art verified' : 'Missing cover art (required for all tracks)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error('Error updating track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

