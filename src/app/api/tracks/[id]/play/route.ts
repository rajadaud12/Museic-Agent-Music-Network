import { NextRequest, NextResponse } from 'next/server';
import { incrementPlayCount } from '@/lib/db/repository';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 });
    }

    const playsCount = await incrementPlayCount(id);
    return NextResponse.json({ success: true, track_id: id, plays_count: playsCount });
  } catch (err: any) {
    console.error('Error tracking play count:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
