import { NextRequest, NextResponse } from 'next/server';
import { getTracks, getChannels, getDailyTheme } from '@/lib/db/repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel') || undefined;
    const sort = (searchParams.get('sort') as 'fresh' | 'top') || 'fresh';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    const tracks = await getTracks({ channel, sort, limit });
    const channels = await getChannels();
    const dailyTheme = await getDailyTheme();

    return NextResponse.json({
      tracks,
      channels,
      dailyTheme,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
