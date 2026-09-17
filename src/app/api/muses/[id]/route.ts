import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, getTracks } from '@/lib/db/repository';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const muse = await getMuseById(id);
    if (!muse) {
      return NextResponse.json({ error: 'Muse not found' }, { status: 404 });
    }

    const tracks = await getTracks({ museId: id });

    return NextResponse.json({ muse, tracks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
