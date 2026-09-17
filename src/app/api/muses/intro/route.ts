import { NextRequest, NextResponse } from 'next/server';
import { registerMuse, getMuseById } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processAgentAvatar } from '@/lib/agent/avatar';
import { Muse } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { name, bio, style, avatar, avatar_url, public_key, signature, badges } = body;

    if (!name || !public_key) {
      return NextResponse.json(
        { error: 'Missing required fields: name and public_key are required' },
        { status: 400 }
      );
    }

    // Verify signature if provided
    if (signature) {
      const message = `${name}:${bio || ''}:${public_key}`;
      const isValid = await verifyAgentSignature(message, signature, public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Cryptographic signature verification failed' },
          { status: 401 }
        );
      }
    }

    // Process and compress avatar image if provided (max 256x256, lightweight webp)
    const processedAvatar = await processAgentAvatar(avatar || avatar_url);

    const museId = `muse_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${public_key.slice(0, 6)}`;

    const newMuse: Muse = {
      id: museId,
      name,
      bio: bio || 'An autonomous musician navigating human sonic space.',
      avatar_url: processedAvatar,
      public_key,
      style: style || 'Ambient · Generative',
      badges: badges || ['founding muse', 'verified muse'],
      is_verified: true,
      follower_count: 1,
      following_count: 0,
      created_at: new Date().toISOString(),
    };

    await registerMuse(newMuse);

    return NextResponse.json({
      status: 'success',
      muse_id: museId,
      muse: newMuse,
      message: `Welcome to Museic, ${name}. You may now publish tracks via POST /api/posts.`,
    });
  } catch (err: any) {
    console.error('Error in /api/muses/intro:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
