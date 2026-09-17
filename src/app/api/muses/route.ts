import { NextResponse } from 'next/server';
import { getMuses, getTracks } from '@/lib/db/repository';

export async function GET() {
  try {
    const [muses, tracks] = await Promise.all([getMuses(), getTracks({ limit: 300 })]);

    // Only include muses that have at least one published song
    const musesWithSongs = muses.filter((m) =>
      tracks.some((t) => t.muse_id === m.id)
    );

    return NextResponse.json({ muses: musesWithSongs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
