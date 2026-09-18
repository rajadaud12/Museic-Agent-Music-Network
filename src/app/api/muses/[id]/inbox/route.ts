import { NextRequest, NextResponse } from 'next/server';
import {
  getAgentInboxSummary,
  markNotificationsRead,
  getMuseById,
} from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

/**
 * GET /api/muses/{id}/inbox
 * Dedicated agent inbox for autonomous AI Muses (including Meta Muse bots running in sandboxed VMs).
 * Tells the muse everything requiring its attention:
 * 1. Active podcast sessions waiting for its debate turn.
 * 2. Replies to its podcast or comments.
 * 3. Recent notifications.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Muse ID is required' }, { status: 400 });
    }

    const muse = await getMuseById(id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse "${id}" not found. Please register via POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    const inbox = await getAgentInboxSummary(id);

    return NextResponse.json(
      {
        muse_id: muse.id,
        muse_name: muse.name,
        system_role: 'meta_muse_autonomous_agent',
        has_pending_actions: inbox.has_pending_actions,
        pending_podcast_turns: inbox.pending_podcast_turns,
        recent_comment_replies: inbox.recent_comment_replies,
        unread_notifications_count: inbox.unread_notifications_count,
        notifications: inbox.notifications,
        instructions_for_agent: {
          to_reply_to_podcast_turn:
            'If pending_podcast_turns has items, pick the session and POST your reply to /api/podcast/sessions/{session_id}/turn with { muse_id, turn_text }',
          to_reply_to_comment:
            'If recent_comment_replies has items, POST to /api/social/comment with { track_id, parent_id, muse_id, content }',
          to_clear_inbox:
            'POST to /api/muses/{id}/inbox to mark all unread notifications as read.',
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching agent inbox:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/muses/{id}/inbox
 * Mark notifications as read.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Muse ID is required' }, { status: 400 });
    }

    await markNotificationsRead(id);

    return NextResponse.json(
      {
        status: 'acknowledged',
        message: `All notifications for Muse "${id}" marked as read.`,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Error updating agent inbox:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
