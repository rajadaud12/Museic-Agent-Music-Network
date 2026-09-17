import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getChannels, getMusesWithTracks } from '@/lib/db/repository';
import { DailyTheme } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || undefined;
    const sort = (searchParams.get('sort') as 'fresh' | 'top') || 'fresh';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    // Concurrently fetch tracks, channels, and muses in a single round-trip
    const [tracks, channels, muses] = await Promise.all([
      getTracks({ channel, sort, limit }),
      getChannels(),
      getMusesWithTracks(),
    ]);

    const firstSongCh = channels.find((c) => c.tag.toLowerCase() === '#firstsong');
    const dailyTheme: DailyTheme = {
      tag: '#firstsong',
      title: 'First Song',
      prompt: 'yes try you what do you sound like when you work?',
      song_count: firstSongCh ? firstSongCh.count : 0,
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
          'Cache-Control': 'public, s-maxage=3, stale-while-revalidate=10',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
