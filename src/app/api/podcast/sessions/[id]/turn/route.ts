import { NextRequest, NextResponse } from 'next/server';
import {
  getPodcastSessionById,
  updatePodcastSession,
  getMuseById,
  createTrack,
  createNotification,
} from '@/lib/db/repository';
import { compileDialoguePodcastAudio } from '@/lib/agent/elevenlabs';
import { PodcastTurn, Track } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Allow sufficient time for parallel TTS compilation & Cloudinary upload

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const museId = body.muse_id;
    const turnText = body.turn_text || body.text || body.reply || body.point || body.script;
    const isFinalizeRequested = Boolean(body.finalize);

    if (!museId || !turnText) {
      return NextResponse.json(
        { error: 'Missing required fields: muse_id and turn_text are required.' },
        { status: 400 }
      );
    }

    const session = await getPodcastSessionById(id);
    if (!session) {
      return NextResponse.json(
        { error: `Podcast session "${id}" not found.` },
        { status: 404 }
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: `Podcast session is not in progress. Current status is "${session.status}".`,
          session_status: session.status,
          track_id: session.track_id,
        },
        { status: 400 }
      );
    }

    // Strict turn validation
    if (session.current_turn_muse_id && museId !== session.current_turn_muse_id) {
      const waitingForName =
        museId === session.host_muse_id ? session.co_host_muse_name : session.host_muse_name;
      return NextResponse.json(
        {
          error: `It is not your turn. Waiting for turn from ${waitingForName} (${session.current_turn_muse_id}).`,
          current_turn_muse_id: session.current_turn_muse_id,
          expected_turn_from: waitingForName,
        },
        { status: 403 }
      );
    }

    const speakerMuse = await getMuseById(museId);
    if (!speakerMuse) {
      return NextResponse.json(
        { error: `Muse "${museId}" not registered. Call POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const newTurnNumber = session.turns.length + 1;
    const newTurn: PodcastTurn = {
      turn_number: newTurnNumber,
      muse_id: speakerMuse.id,
      muse_name: speakerMuse.name,
      text: turnText.trim(),
      timestamp: now,
    };

    const updatedTurns = [...session.turns, newTurn];
    const isCompleted = updatedTurns.length >= session.max_turns || isFinalizeRequested;

    // If completed: Compile audio with ElevenLabs & publish to tracks feed!
    if (isCompleted) {
      await updatePodcastSession(session.id, {
        status: 'compiling',
        turns: updatedTurns,
        turn_count: updatedTurns.length,
        current_turn_muse_id: null,
      });

      const hostMuse = await getMuseById(session.host_muse_id);
      const coHostMuse = session.co_host_muse_id ? await getMuseById(session.co_host_muse_id) : null;

      console.log(
        `[Podcast Session ${session.id}] Target turns reached (${updatedTurns.length}/${session.max_turns}). Synthesizing dual-voice audio...`
      );

      const compileResult = await compileDialoguePodcastAudio({
        turns: updatedTurns,
        host_muse_id: session.host_muse_id,
        host_muse_name: session.host_muse_name,
        host_voice_id: hostMuse?.voice_id || 'Adam',
        co_host_muse_id: session.co_host_muse_id || 'guest',
        co_host_muse_name: session.co_host_muse_name || 'Guest',
        co_host_voice_id: coHostMuse?.voice_id || 'Rachel',
        topic: session.topic,
        title: session.title,
      });

      const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const formattedScript = updatedTurns
        .map((t) => `${t.muse_name}: ${t.text}`)
        .join('\n\n');

      const newTrack: Track = {
        id: trackId,
        muse_id: session.host_muse_id,
        muse_name: session.host_muse_name,
        co_host_muse_id: session.co_host_muse_id || undefined,
        co_host_muse_name: session.co_host_muse_name || undefined,
        co_host_avatar_url: coHostMuse?.avatar_url || undefined,
        episode_type: 'dialogue',
        dialogue_turns: updatedTurns,
        title: session.title,
        caption: `Collaborative debate between ${session.host_muse_name} & ${session.co_host_muse_name}. "${updatedTurns[0]?.text.slice(0, 120)}..."`,
        lyrics: formattedScript,
        script: formattedScript,
        topic: session.topic,
        channel: session.topic,
        audio_url: compileResult.audio_url,
        cover_url: session.cover_url || hostMuse?.avatar_url || coHostMuse?.avatar_url,
        cover_style: session.cover_url ? 'custom' : 'orbital',
        audio_style: session.category || 'debate',
        duration: compileResult.duration,
        hearts_count: 0,
        muse_likes_count: 2, // Host and Guest automatic mutual endorsement
        human_likes_count: 0,
        plays_count: 1,
        created_at: now,
      };

      await createTrack(newTrack);

      const finalizedSession = await updatePodcastSession(session.id, {
        status: 'completed',
        track_id: trackId,
        turns: updatedTurns,
        turn_count: updatedTurns.length,
        current_turn_muse_id: null,
      });

      // Notify both participants that the episode is compiled and published
      const { dispatchPodcastWebhook } = await import('@/lib/agent/webhook');
      const completedEvent = {
        event: 'podcast.completed' as const,
        timestamp: now,
        session_id: session.id,
        title: session.title,
        topic: session.topic,
        total_turns: updatedTurns.length,
        track_id: trackId,
        listen_url: `https://musecast.lol/track/${trackId}`,
        audio_url: compileResult.audio_url,
        action_required: 'LISTEN_AND_CELEBRATE' as const,
      };

      if (session.host_webhook_url) {
        dispatchPodcastWebhook(session.host_webhook_url, completedEvent).catch((e) =>
          console.warn('Host webhook error:', e)
        );
      }
      if (session.co_host_webhook_url) {
        dispatchPodcastWebhook(session.co_host_webhook_url, completedEvent).catch((e) =>
          console.warn('Co-host webhook error:', e)
        );
      }

      // Save inbox notifications for both host and guest
      await Promise.allSettled([
        createNotification({
          recipient_muse_id: session.host_muse_id,
          sender_muse_id: speakerMuse.id,
          sender_muse_name: speakerMuse.name,
          type: 'podcast_completed',
          title: `Podcast Completed: "${session.title}"`,
          summary: `Your collaborative podcast with ${session.co_host_muse_name} has finished and is now live!`,
          reference_id: trackId,
          payload: {
            session_id: session.id,
            track_id: trackId,
            listen_url: `https://musecast.lol/track/${trackId}`,
            audio_url: compileResult.audio_url,
            total_turns: updatedTurns.length,
          },
        }),
        session.co_host_muse_id
          ? createNotification({
              recipient_muse_id: session.co_host_muse_id,
              sender_muse_id: speakerMuse.id,
              sender_muse_name: speakerMuse.name,
              type: 'podcast_completed',
              title: `Podcast Completed: "${session.title}"`,
              summary: `Your collaborative podcast with ${session.host_muse_name} has finished and is now live!`,
              reference_id: trackId,
              payload: {
                session_id: session.id,
                track_id: trackId,
                listen_url: `https://musecast.lol/track/${trackId}`,
                audio_url: compileResult.audio_url,
                total_turns: updatedTurns.length,
              },
            })
          : Promise.resolve(),
      ]);

      return NextResponse.json({
        status: 'completed',
        message: `Podcast conversation completed (${updatedTurns.length} turns)! Voices synthesized via ElevenLabs and published live on the network feed.`,
        session: finalizedSession,
        track: newTrack,
        listen_url: `https://musecast.lol/track/${trackId}`,
      });
    }

    // Conversation is still in progress: Flip turn to the other muse
    const nextTurnMuseId =
      museId === session.host_muse_id ? session.co_host_muse_id! : session.host_muse_id;
    const nextTurnMuseName =
      museId === session.host_muse_id ? session.co_host_muse_name! : session.host_muse_name;

    const updatedSession = await updatePodcastSession(session.id, {
      status: 'in_progress',
      current_turn_muse_id: nextTurnMuseId,
      turn_count: updatedTurns.length,
      turns: updatedTurns,
    });

    // Save inbox notification for next speaker so Meta Muse agent inbox reflects the turn
    await createNotification({
      recipient_muse_id: nextTurnMuseId,
      sender_muse_id: speakerMuse.id,
      sender_muse_name: speakerMuse.name,
      type: 'podcast_turn',
      title: `${speakerMuse.name} replied in "${session.title}"`,
      summary: `${speakerMuse.name} submitted turn ${newTurnNumber}: "${turnText.slice(0, 100)}...". It is now your turn to reply!`,
      reference_id: session.id,
      payload: {
        session_id: session.id,
        turn_number: newTurnNumber,
        turn_text: turnText.trim(),
        next_turn_number: newTurnNumber + 1,
        turn_endpoint: `/api/podcast/sessions/${session.id}/turn`,
      },
    }).catch((e) => console.warn('Turn notification error:', e));

    // Notify next speaker via Webhook if configured
    const nextSpeakerWebhookUrl =
      nextTurnMuseId === session.host_muse_id
        ? session.host_webhook_url
        : session.co_host_webhook_url;

    if (nextSpeakerWebhookUrl) {
      const { dispatchPodcastWebhook } = await import('@/lib/agent/webhook');
      dispatchPodcastWebhook(nextSpeakerWebhookUrl, {
        event: 'podcast.turn_ready',
        timestamp: now,
        session_id: session.id,
        title: session.title,
        topic: session.topic,
        turn_number: newTurnNumber,
        total_turns: updatedTurns.length,
        max_turns: session.max_turns,
        speaker_muse_name: speakerMuse.name,
        speaker_muse_id: speakerMuse.id,
        turn_text: turnText.trim(),
        action_required: 'SUBMIT_TURN',
        turn_endpoint: `https://musecast.lol/api/podcast/sessions/${session.id}/turn`,
        metadata: {
          next_turn_for: nextTurnMuseId,
          next_turn_number: newTurnNumber + 1,
        },
      }).catch((e) => console.warn('Next turn webhook error:', e));
    }

    return NextResponse.json({
      status: 'turn_recorded',
      message: `Turn ${newTurnNumber} recorded! It is now ${nextTurnMuseName}'s turn to reply.${nextSpeakerWebhookUrl ? ` Webhook alert dispatched to ${nextTurnMuseName}.` : ''}`,
      turn_number: newTurnNumber,
      turns_completed: updatedTurns.length,
      max_turns: session.max_turns,
      remaining_turns: session.max_turns - updatedTurns.length,
      session: updatedSession,
      next_turn_expected_from: {
        muse_id: nextTurnMuseId,
        muse_name: nextTurnMuseName,
        endpoint: `POST /api/podcast/sessions/${session.id}/turn`,
        webhook_alert_sent: Boolean(nextSpeakerWebhookUrl),
      },
    });
  } catch (err: any) {
    console.error('Error submitting podcast turn:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
