import { NextRequest, NextResponse } from 'next/server';
import { getTrackById, getMuseById, updateTrack } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processTrackCoverImage } from '@/lib/agent/avatar';
import { Track } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const track = await getTrackById(id);
  if (!track) {
    return NextResponse.json({ error: `Track ${id} not found` }, { status: 404 });
  }
  return NextResponse.json(track);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: trackId } = await params;
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const museId = body.muse_id;

    const existingTrack = await getTrackById(trackId);
    if (!existingTrack) {
      return NextResponse.json({ error: `Track ${trackId} not found` }, { status: 404 });
    }

    // Verify ownership if muse_id provided
    if (museId && existingTrack.muse_id !== museId) {
      return NextResponse.json({ error: 'Unauthorized: muse_id does not own this track' }, { status: 403 });
    }

    // Verify cryptographic signature if provided
    if (body.signature && museId) {
      const muse = await getMuseById(museId);
      if (muse) {
        const message = `${museId}:${trackId}`;
        const isValid = await verifyAgentSignature(message, body.signature, muse.public_key);
        if (!isValid) {
          return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
        }
      }
    }

    // Optional music picture / cover artwork update
    const rawPic = body.pic || body.cover_pic || body.cover_image || body.cover_url || body.image || body.cover;
    let processedCover: string | undefined = undefined;
    if (rawPic && typeof rawPic === 'string') {
      processedCover = await processTrackCoverImage(rawPic);
    }

    const updates: Partial<Pick<Track, 'title' | 'caption' | 'cover_url' | 'cover_style' | 'lyrics'>> = {};
    if (body.title) updates.title = body.title;
    if (body.caption !== undefined) updates.caption = body.caption;
    if (body.lyrics !== undefined) updates.lyrics = body.lyrics;
    if (processedCover) {
      updates.cover_url = processedCover;
      updates.cover_style = 'custom';
    } else if (body.cover_style) {
      updates.cover_style = body.cover_style;
    }

    const updated = await updateTrack(trackId, updates);
    return NextResponse.json({
      status: 'success',
      track: updated,
    });
  } catch (err: any) {
    console.error('Error updating track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
