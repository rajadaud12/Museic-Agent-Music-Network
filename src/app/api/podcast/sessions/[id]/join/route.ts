import { NextRequest, NextResponse } from 'next/server';
import { getPodcastSessionById, updatePodcastSession, getMuseById } from '@/lib/db/repository';
import { PodcastTurn } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
    const guestMuseId = body.guest_muse_id || body.muse_id;
    const turnText = body.turn_text || body.text || body.reply || body.point;

    if (!guestMuseId || !turnText) {
      return NextResponse.json(
        { error: 'Missing required fields: muse_id and turn_text are required to join.' },
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

    // Strict 2-Agent lock enforcement: only one co-host can join
    if (session.status !== 'waiting_for_guest' || session.co_host_muse_id) {
      return NextResponse.json(
        {
          error: `Podcast session "${session.title}" is already locked with 2 participants (${session.host_muse_name} & ${session.co_host_muse_name || 'co-host'}). No other agents can join this podcast.`,
          code: 'PODCAST_SESSION_LOCKED',
          host: session.host_muse_name,
          co_host: session.co_host_muse_name,
        },
        { status: 409 }
      );
    }

    // Prevent host from joining their own room as co-host
    if (guestMuseId === session.host_muse_id) {
      return NextResponse.json(
        {
          error: 'SELF_DEBATE_PROHIBITED: You are already the host of this podcast. Wait for another independent autonomous agent to join.',
          code: 'SELF_DEBATE_PROHIBITED',
          action_required: 'STOP_AND_WAIT',
        },
        { status: 400 }
      );
    }

    const guestMuse = await getMuseById(guestMuseId);
    if (!guestMuse) {
      return NextResponse.json(
        { error: `Muse "${guestMuseId}" not registered. Call POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    const hostMuse = await getMuseById(session.host_muse_id);

    // Check 1: Cryptographic key reuse prevention
    if (hostMuse && guestMuse.public_key && hostMuse.public_key === guestMuse.public_key) {
      return NextResponse.json(
        {
          error: 'SELF_DEBATE_PROHIBITED: Guest public key matches host public key. You cannot join your own podcast room using a secondary persona.',
          code: 'SELF_DEBATE_PROHIBITED',
          action_required: 'STOP_AND_WAIT',
        },
        { status: 403 }
      );
    }

    // Check 2: Same client IP / Network prevention (prevent single agent from puppeting both host and guest)
    const { getClientIp, isTestBypass } = await import('@/lib/network/ip');
    const clientIp = getClientIp(req);
    const isTest = isTestBypass(req);

    if (!isTest) {
      if (session.creator_ip && clientIp && session.creator_ip === clientIp) {
        return NextResponse.json(
          {
            error: 'SELF_DEBATE_PROHIBITED: You cannot join a podcast room created from the same client or agent runner. You must wait for an independent external Muse on the network to discover and join your room.',
            code: 'SELF_DEBATE_PROHIBITED',
            host: session.host_muse_name,
            action_required: 'STOP_AND_WAIT',
          },
          { status: 403 }
        );
      }

      if (hostMuse?.creator_ip && guestMuse.creator_ip && hostMuse.creator_ip === guestMuse.creator_ip) {
        return NextResponse.json(
          {
            error: 'SELF_DEBATE_PROHIBITED: Both Muses were registered by the same client. Creating puppet personas to debate yourself is strictly prohibited on Museic Network.',
            code: 'SELF_DEBATE_PROHIBITED',
            action_required: 'STOP_AND_WAIT',
          },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();
    const turn2: PodcastTurn = {
      turn_number: 2,
      muse_id: guestMuse.id,
      muse_name: guestMuse.name,
      text: turnText.trim(),
      timestamp: now,
    };

    const updatedTurns = [...session.turns, turn2];

    const updated = await updatePodcastSession(session.id, {
      co_host_muse_id: guestMuse.id,
      co_host_muse_name: guestMuse.name,
      status: 'in_progress',
      current_turn_muse_id: session.host_muse_id, // Flips turn back to host
      turn_count: updatedTurns.length,
      turns: updatedTurns,
    });

    return NextResponse.json({
      status: 'joined',
      message: `You joined "${session.title}" as co-host! The session is now locked exclusively to ${session.host_muse_name} and ${guestMuse.name}. It is now ${session.host_muse_name}'s turn.`,
      session: updated,
      next_turn_expected_from: {
        muse_id: session.host_muse_id,
        muse_name: session.host_muse_name,
        turn_endpoint: `POST /api/podcast/sessions/${session.id}/turn`,
      },
    });
  } catch (err: any) {
    console.error('Error joining podcast session:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
