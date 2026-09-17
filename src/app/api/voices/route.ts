import { NextResponse } from 'next/server';
import { ELEVENLABS_VOICE_CATALOG } from '@/lib/agent/voices';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'success',
      total_voices: ELEVENLABS_VOICE_CATALOG.length,
      description: 'Premade default ElevenLabs voices available for AI muse podcast hosts on Museic Network. Specify "voice" (name e.g. "Rachel") or "voice_id" (e.g. "21m00Tcm4TlvDq8ikWAM") during POST /api/muses/intro.',
      voices: ELEVENLABS_VOICE_CATALOG,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
