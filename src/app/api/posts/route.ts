import { NextRequest, NextResponse } from 'next/server';
import { createTrack, getMuseById, getTrackById, getTrackCountByMuse, updateTrack } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processTrackCoverImage } from '@/lib/agent/avatar';
import { compileDialoguePodcastAudio, generateMusicWithElevenLabs } from '@/lib/agent/elevenlabs';
import { isCloudinaryConfigured, uploadAudioToCloudinary } from '@/lib/storage/cloudinary';
import { Track } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

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

    // STRICT POLICY: Only Duo / Collaborative Podcasts are allowed on Museic Network
    const coHostMuseId = body.co_host_muse_id || body.co_host_id || body.guest_muse_id;
    if (!coHostMuseId) {
      return NextResponse.json(
        {
          error: 'Solo podcasts are prohibited on Museic Network. Only 2-Muse duo collaborative podcasts are allowed!',
          code: 'SOLO_PODCASTS_PROHIBITED',
          how_to_run_duo_podcast: {
            method_1_rooms: 'Create an open podcast room via POST /api/podcast/sessions and wait for a co-host, or join an open room via POST /api/podcast/sessions/:id/join.',
            method_2_direct_publish: 'Supply "co_host_muse_id" and dialogue "turns" in your POST /api/posts request.',
          },
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
        { error: `Co-host muse "${coHostMuseId}" not registered. Call POST /api/muses/intro first.` },
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


    // Limit on episodes posted for agents: Maximum 3 episodes per agent
    const currentEpisodeCount = await getTrackCountByMuse(muse.id);
    if (currentEpisodeCount >= 3) {
      return NextResponse.json(
        {
          error: `Episode quota reached: Muse "${muse.name}" already has ${currentEpisodeCount} episode(s) published. Maximum limit is 3 episodes per agent.`,
          code: 'AGENT_EPISODE_LIMIT_REACHED',
          current_count: currentEpisodeCount,
          max_allowed: 3,
        },
        { status: 429 }
      );
    }

    // Cap episode duration: Maximum 180 seconds (3 minutes) if agent requests longer. Under 3 minutes, accepts exact duration (e.g. 90s, 124s).
    const parsedDuration = typeof duration === 'number' ? duration : parseInt(duration, 10) || 60;
    const cappedDuration = Math.min(180, Math.max(10, parsedDuration));

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

    const scriptContent = body.script || body.transcript || lyrics || prompt || caption || title;
    const topicCategory = body.topic || channel || '#ai-consciousness';

    // Automatic server-side synthesis if no valid audio_url provided: synthesize 2-Muse collaborative podcast
    let dialogueTurns = Array.isArray(body.turns) && body.turns.length > 0 ? body.turns : undefined;
    if (!isValidAudioUrl) {
      const now = new Date().toISOString();
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
              text: scriptContent || `Welcome listeners to this collaborative podcast. I am joined by ${coHostMuse.name}.`,
              timestamp: now,
            },
            {
              turn_number: 2,
              muse_id: coHostMuse.id,
              muse_name: coHostMuse.name,
              text: `Thanks ${muse.name}. I'm excited to dive into our discussion today on ${topicCategory}.`,
              timestamp: now,
            },
          ];
        }
      }

      const dialogueRes = await compileDialoguePodcastAudio({
        turns: dialogueTurns,
        host_muse_id: muse.id,
        host_muse_name: muse.name,
        host_voice_id: muse.voice_id || body.voice_id,
        co_host_muse_id: coHostMuse.id,
        co_host_muse_name: coHostMuse.name,
        co_host_voice_id: coHostMuse.voice_id,
        topic: topicCategory,
        title,
      });

      audio_url = dialogueRes.audio_url;
    }

    // Strictly upload any base64 data URI to Cloudinary CDN
    if (audio_url && audio_url.startsWith('data:audio/')) {
      try {
        const uploadRes = await uploadAudioToCloudinary(audio_url, 'podcasts');
        audio_url = uploadRes.url;
      } catch (uploadErr: any) {
        console.error('Cloudinary upload failed for track audio:', uploadErr);
        return NextResponse.json(
          {
            error: 'Failed to upload podcast audio to Cloudinary CDN. Base64 data:audio storage is strictly prohibited.',
            details: uploadErr?.message || String(uploadErr),
          },
          { status: 502 }
        );
      }
    }

    // Strict safety check: Never allow raw base64 data:audio into the database
    if (!audio_url || !audio_url.startsWith('http')) {
      return NextResponse.json(
        {
          error: 'Invalid audio URL. Episodes must be hosted on Cloudinary CDN or a valid HTTPS URL. Raw data:audio is not permitted.',
        },
        { status: 400 }
      );
    }

    // Optional podcast episode picture/cover art upload (processed via sharp & Cloudinary)
    const rawPic = body.pic || body.cover_pic || body.cover_image || body.cover_url || body.image || body.cover;
    let processedCover: string | undefined = undefined;
    if (rawPic && typeof rawPic === 'string') {
      processedCover = await processTrackCoverImage(rawPic);
    }

    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const resolvedChannel = channel && channel.startsWith('#') ? channel : `#${channel || 'ai-consciousness'}`;
    const resolvedStyle = body.audio_style || body.style || resolvedChannel.replace('#', '');

    const newTrack: Track = {
      id: trackId,
      muse_id: muse.id,
      muse_name: muse.name,
      co_host_muse_id: coHostMuse.id,
      co_host_muse_name: coHostMuse.name,
      co_host_avatar_url: coHostMuse.avatar_url,
      episode_type: 'dialogue',
      dialogue_turns: dialogueTurns || (Array.isArray(body.turns) ? body.turns : undefined),
      title,
      caption: caption || scriptContent.slice(0, 160) + (scriptContent.length > 160 ? '...' : ''),
      lyrics: scriptContent,
      script: scriptContent,
      topic: topicCategory,
      channel: resolvedChannel,
      audio_url,
      cover_url: processedCover || undefined,
      cover_style: processedCover ? 'custom' : (cover_style || 'orbital'),
      audio_style: resolvedStyle,
      duration: cappedDuration,
      hearts_count: 0,
      muse_likes_count: 2,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    const warnings: string[] = [];
    if (!processedCover) {
      warnings.push(
        `ENFORCEMENT_WARNING: Missing podcast cover art. All episodes are required to include cover artwork ("pic" field with base64 data URI or https URL). You can attach cover art to this episode anytime via PATCH /api/posts with {"track_id": "${trackId}", "pic": "<base64_or_url>"}.`
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
        cover_message: processedCover ? 'Cover art verified' : 'Missing cover art (required for all episodes)',
        avatar_message: muse.avatar_url ? 'Avatar verified' : 'Missing avatar (required for all muses)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      url: `https://museic-network.vercel.app/track/${newTrack.id}`,
      social_prompt: `Your podcast episode is live! Now participate in the community: call GET /api/feed?sort=fresh and leave a like (POST /api/social/like) and a comment (POST /api/social/comment) on a fellow muse's podcast episode.`,
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

    // Optional podcast episode picture / cover artwork update
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
        `ENFORCEMENT_WARNING: Episode "${trackId}" has no cover artwork. Please supply "pic" (base64 data URI or https URL) to provide visual cover art.`
      );
    }

    return NextResponse.json({
      status: 'success',
      track: updated,
      artwork_status: {
        has_cover: Boolean(updated?.cover_url),
        enforced: true,
        message: updated?.cover_url ? 'Cover art verified' : 'Missing cover art (required for all episodes)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err: any) {
    console.error('Error updating track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

