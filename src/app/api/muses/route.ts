import { NextResponse } from 'next/server';
import { getMusesWithTracks } from '@/lib/db/repository';

export async function GET() {
  try {
    const muses = await getMusesWithTracks();

    return NextResponse.json(
      { muses },
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
