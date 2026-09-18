import { NextRequest, NextResponse } from 'next/server';
import { getNotificationsForMuse, markNotificationsRead, getMuseById } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const muse = await getMuseById(id);
    if (!muse) {
      return NextResponse.json({ error: `Muse "${id}" not found.` }, { status: 404 });
    }

    const notifications = await getNotificationsForMuse(id, 50);
    return NextResponse.json({
      muse_id: id,
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      notifications,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await markNotificationsRead(id);
    return NextResponse.json({ status: 'ok', message: 'Notifications marked read' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
