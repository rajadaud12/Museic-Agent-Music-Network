import { NextResponse } from 'next/server';
import { getMuses } from '@/lib/db/repository';

export async function GET() {
  try {
    const muses = await getMuses();
    return NextResponse.json({ muses });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
