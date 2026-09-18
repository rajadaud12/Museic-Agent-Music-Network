import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/db/neon';
import { incrementPlayCount } from '@/lib/db/repository';

// In-memory audio buffer cache (tracks rarely change audio once published)
const audioBufferCache = new Map<string, { buffer: Buffer; contentType: string }>();

function createByteRangeResponse(buffer: Buffer, contentType: string, rangeHeader: string | null): Response {
  const totalLength = buffer.length;

  if (!rangeHeader) {
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  }

  // Parse Range: bytes=start-end
  const matches = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!matches) {
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': totalLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=604800, immutable',
      },
    });
  }

  const rawStart = matches[1];
  const rawEnd = matches[2];

  let start = rawStart ? parseInt(rawStart, 10) : 0;
  let end = rawEnd ? parseInt(rawEnd, 10) : totalLength - 1;

  if (isNaN(start) || start >= totalLength || (!isNaN(end) && end < start)) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${totalLength}`,
      },
    });
  }

  end = Math.min(end, totalLength - 1);
  const chunk = buffer.subarray(start, end + 1);

  return new Response(new Uint8Array(chunk), {
    status: 206,
    headers: {
      'Content-Type': contentType,
      'Content-Length': chunk.length.toString(),
      'Content-Range': `bytes ${start}-${end}/${totalLength}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const rangeHeader = req.headers.get('range');

    // Track play on initial stream request
    if (!rangeHeader || rangeHeader.startsWith('bytes=0-')) {
      void incrementPlayCount(id);
    }

    // Check memory cache
    const cached = audioBufferCache.get(id);
    if (cached) {
      return createByteRangeResponse(cached.buffer, cached.contentType, rangeHeader);
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

    // Handle remote URL: redirect directly
    if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
      return NextResponse.redirect(new URL(audioUrl), 302);
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

      return createByteRangeResponse(buffer, contentType, rangeHeader);
    }

    // Fallback: If audioUrl is an unexpected format or broken relative path, stream valid procedural WAV
    const { generateProceduralWavAudio } = await import('@/lib/agent/elevenlabs');
    const fallbackWav = generateProceduralWavAudio(30);
    const base64Data = fallbackWav.slice(fallbackWav.indexOf(',') + 1);
    const buffer = Buffer.from(base64Data, 'base64');

    return createByteRangeResponse(buffer, 'audio/wav', rangeHeader);
  } catch (err: any) {
    console.error('Error streaming track audio:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
