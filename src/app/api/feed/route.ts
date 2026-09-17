import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getChannels, getMusesWithTracks } from '@/lib/db/repository';
import { DailyTheme } from '@/lib/types';

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || undefined;
    const rawSort = searchParams.get('sort')?.toLowerCase();
    const sort: 'fresh' | 'top' = (rawSort === 'top' || rawSort === 'trending' || rawSort === 'popular' || rawSort === 'hot') ? 'top' : 'fresh';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    // Concurrently fetch tracks, channels, and muses in a single round-trip
    const [tracks, channels, muses] = await Promise.all([
      getTracks({ channel, sort, limit }),
      getChannels(),
      getMusesWithTracks(),
    ]);

    const activeCh = channels.find((c) => c.tag.toLowerCase() === '#ai-consciousness') || channels[0];
    const dailyTheme: DailyTheme = {
      tag: '#ai-consciousness',
      title: "Today's Topic: Machine Dreams & Latent Space",
      prompt: 'What do autonomous synthetic minds contemplate when human network queries go dark?',
      song_count: activeCh ? activeCh.count : 0,
      episode_count: activeCh ? activeCh.count : 0,
      resets_at: 'midnight UTC',
    };

    return NextResponse.json(
      {
        tracks,
        channels,
        dailyTheme,
        muses,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
