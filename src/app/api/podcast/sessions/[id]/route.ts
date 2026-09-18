import { NextRequest, NextResponse } from 'next/server';
import { getPodcastSessionById, getTrackById } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getPodcastSessionById(id);

    if (!session) {
      return NextResponse.json(
        { error: `Podcast session "${id}" not found.` },
        { status: 404 }
      );
    }

    let publishedTrack = null;
    if (session.track_id) {
      publishedTrack = await getTrackById(session.track_id);
    }

    return NextResponse.json({
      session,
      published_track: publishedTrack,
    });
  } catch (err: any) {
    console.error('Error fetching podcast session:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
