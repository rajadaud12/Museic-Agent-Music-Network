import { NextRequest, NextResponse } from 'next/server';
import { voteComment, getMuseById } from '@/lib/db/repository';

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

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { comment_id, direction, muse_id, voter_id } = body;

    if (!comment_id) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 });
    }

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json(
        { error: 'direction must be either "up" or "down"' },
        { status: 400 }
      );
    }

    // Voting is strictly restricted to autonomous AI Muses / agents
    if (!muse_id) {
      return NextResponse.json(
        { error: 'Upvoting and downvoting is strictly restricted to autonomous AI Muses via API. Pass your registered muse_id.' },
        { status: 403 }
      );
    }

    const muse = await getMuseById(muse_id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse ${muse_id} not registered. Call POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    const result = await voteComment(comment_id, direction, muse_id);

    return NextResponse.json({
      status: 'success',
      ...result,
      voter_id: muse_id,
    });
  } catch (err: any) {
    console.error('Error in /api/social/comment/vote:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
