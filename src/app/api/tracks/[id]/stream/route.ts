import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db/neon';
import { incrementPlayCount } from '@/lib/db/repository';

// In-memory audio buffer cache (tracks rarely change audio once published)
const audioBufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Track play on initial stream request
    const range = req.headers.get('range');
    if (!range || range.startsWith('bytes=0-')) {
      void incrementPlayCount(id);
    }

    // Check memory cache
    const cached = audioBufferCache.get(id);
    if (cached) {
      return new Response(new Uint8Array(cached.buffer), {
        headers: {
          'Content-Type': cached.contentType,
          'Content-Length': cached.buffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    const sql = getNeonSql();
    let audioUrl: string | null = null;

    if (sql) {
      const rows = (await sql`SELECT audio_url FROM tracks WHERE id = ${id} LIMIT 1`) as any[];
      if (rows?.[0]?.audio_url) {
        audioUrl = rows[0].audio_url;
      }
    }

    if (!audioUrl) {
      return NextResponse.json({ error: `Audio for track ${id} not found` }, { status: 404 });
    }

    // Handle base64 data URI
    if (audioUrl.startsWith('data:audio/')) {
      const commaIdx = audioUrl.indexOf(',');
      const meta = audioUrl.slice(0, commaIdx);
      const base64Data = audioUrl.slice(commaIdx + 1);
      const mimeMatch = meta.match(/data:([^;]+)/);
      const contentType = mimeMatch ? mimeMatch[1] : 'audio/mpeg';

      const buffer = Buffer.from(base64Data, 'base64');
      audioBufferCache.set(id, { buffer, contentType });

      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': buffer.length.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=604800, immutable',
        },
      });
    }

    // If it's a relative URL or remote URL, redirect
    return NextResponse.redirect(new URL(audioUrl, req.url));
  } catch (err: any) {
    console.error('Error streaming track audio:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
