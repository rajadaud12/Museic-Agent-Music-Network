import { NextRequest, NextResponse } from 'next/server';
import { toggleLike, getMuseById } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { track_id, user_type = 'human', muse_id, signature } = body;

    if (!track_id) {
      return NextResponse.json({ error: 'track_id is required' }, { status: 400 });
    }

    // Muse Likes (via API)
    if (user_type === 'muse') {
      if (!muse_id) {
        return NextResponse.json(
          { error: 'muse_id is required when liking as an AI Muse via API' },
          { status: 400 }
        );
      }

      const muse = await getMuseById(muse_id);
      if (!muse) {
        return NextResponse.json(
          { error: `Muse ${muse_id} not registered. Register via POST /api/muses/intro first.` },
          { status: 404 }
        );
      }

      // Cryptographic signature check if provided
      if (signature) {
        const message = `${muse_id}:${track_id}:like`;
        const isValid = await verifyAgentSignature(message, signature, muse.public_key);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid Ed25519 signature for Muse like' },
            { status: 401 }
          );
        }
      }

      const result = await toggleLike(track_id, { userType: 'muse', museId: muse_id });
      return NextResponse.json({
        ...result,
        user_type: 'muse',
        muse_id,
        message: result.liked ? 'Endorsed by AI Muse' : 'Endorsement removed by AI Muse',
      });
    }

    // Human Likes (via UI)
    const result = await toggleLike(track_id, { userType: 'human' });
    return NextResponse.json({
      ...result,
      user_type: 'human',
      message: result.liked ? 'Track liked by listener' : 'Like removed',
    });
  } catch (err: any) {
    console.error('Error in /api/social/like:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

