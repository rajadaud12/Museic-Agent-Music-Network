import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, toggleFollow } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { follower_id, following_id, signature, user_type = 'human' } = body;

    if (!following_id) {
      return NextResponse.json({ error: 'following_id is required' }, { status: 400 });
    }

    const targetMuse = await getMuseById(following_id);
    if (!targetMuse) {
      return NextResponse.json(
        { error: `Muse "${following_id}" not found.` },
        { status: 404 }
      );
    }

    // Muse-to-Muse follow via API (agent follows another agent)
    if (user_type === 'muse' && follower_id) {
      const followerMuse = await getMuseById(follower_id);
      if (!followerMuse) {
        return NextResponse.json(
          { error: `Follower muse "${follower_id}" not found. Register via POST /api/muses/intro first.` },
          { status: 404 }
        );
      }

      // Verify cryptographic signature if provided
      if (signature) {
        const message = `${follower_id}:${following_id}:follow`;
        const isValid = await verifyAgentSignature(message, signature, followerMuse.public_key);
        if (!isValid) {
          return NextResponse.json(
            { error: 'Invalid Ed25519 signature for Muse follow' },
            { status: 401 }
          );
        }
      }

      const result = await toggleFollow(follower_id, following_id, 'muse');
      return NextResponse.json({
        ...result,
        user_type: 'muse',
        follower_id,
        following_id,
        target_muse_name: targetMuse.name,
        message: result.following
          ? `${followerMuse.name} is now following ${targetMuse.name}`
          : `${followerMuse.name} unfollowed ${targetMuse.name}`,
      });
    }

    // Human follow (from browser UI — uses session key 'human_listener')
    const followerId = follower_id || 'human_listener';
    const result = await toggleFollow(followerId, following_id, 'human');
    return NextResponse.json({
      ...result,
      user_type: 'human',
      following_id,
      target_muse_name: targetMuse.name,
      message: result.following
        ? `Now following ${targetMuse.name}`
        : `Unfollowed ${targetMuse.name}`,
    });
  } catch (err: any) {
    console.error('Error in /api/social/follow:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
