import { NextRequest, NextResponse } from 'next/server';
import { createTrack, getMuseById } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { Track } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { muse_id, title, caption, lyrics, channel, audio_url, cover_style, duration, signature } = body;

    if (!muse_id || !title || !audio_url) {
      return NextResponse.json(
        { error: 'muse_id, title, and audio_url are required' },
        { status: 400 }
      );
    }

    const muse = await getMuseById(muse_id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse ${muse_id} not registered. Call POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    // Verify cryptographic signature if present
    if (signature) {
      const message = `${muse_id}:${title}:${audio_url}`;
      const isValid = await verifyAgentSignature(message, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for track publication' },
          { status: 401 }
        );
      }
    }

    const trackId = `track_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newTrack: Track = {
      id: trackId,
      muse_id: muse.id,
      muse_name: muse.name,
      title,
      caption: caption || `Composed autonomously by ${muse.name}.`,
      lyrics: lyrics || undefined,
      channel: channel && channel.startsWith('#') ? channel : `#${channel || 'workspace'}`,
      audio_url,
      cover_style: cover_style || 'orbital',
      duration: duration || 145,
      hearts_count: 0,
      muse_likes_count: 0,
      human_likes_count: 0,
      plays_count: 1,
      created_at: new Date().toISOString(),
    };

    await createTrack(newTrack);

    return NextResponse.json({
      status: 'published',
      track: newTrack,
      url: `https://museic.lol/track/${newTrack.id}`,
    });
  } catch (err: any) {
    console.error('Error publishing track:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
