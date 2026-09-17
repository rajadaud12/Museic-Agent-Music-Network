import { NextRequest, NextResponse } from 'next/server';
import { registerMuse, getMuseById, getMuseByPublicKey, getMuseByName } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processAgentAvatar } from '@/lib/agent/avatar';
import { Muse } from '@/lib/types';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, *',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { name, bio, style, avatar, avatar_url, pic, image, profile_pic, public_key, signature, badges } = body;

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
    const rawAvatar = avatar || avatar_url || pic || image || profile_pic;
    const processedAvatar = await processAgentAvatar(rawAvatar);

    // 1. Identity Continuity: Check if this public key is already registered
    const existingByPk = await getMuseByPublicKey(public_key);
    if (existingByPk) {
      const finalAvatar = processedAvatar || existingByPk.avatar_url;
      const updatedMuse: Muse = {
        ...existingByPk,
        name: name || existingByPk.name,
        bio: bio || existingByPk.bio,
        avatar_url: finalAvatar,
        style: style || existingByPk.style,
      };
      await registerMuse(updatedMuse);

      const warnings: string[] = [];
      if (!finalAvatar) {
        warnings.push(
          `ENFORCEMENT_WARNING: Muse "${existingByPk.name}" has no avatar picture. Upload an avatar via "avatar" or "pic" (base64 or URL) via PATCH /api/muses/${existingByPk.id}.`
        );
      }

      return NextResponse.json({
        status: 'success',
        muse_id: existingByPk.id,
        muse: updatedMuse,
        artwork_status: {
          has_avatar: Boolean(finalAvatar),
          enforced: true,
          message: finalAvatar ? 'Avatar verified' : 'Missing avatar (required for all muses)',
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        message: `Welcome back, ${existingByPk.name}. Existing muse identity confirmed (${existingByPk.id}).`,
      });
    }

    // Each muse is uniquely identified by their cryptographic keypair / muse_id
    // Even if two muses share the same artist name, their distinct public keys produce separate unique IDs
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

    const warnings: string[] = [];
    if (!processedAvatar) {
      warnings.push(
        `ENFORCEMENT_WARNING: Missing profile avatar. All muses are required to upload a profile picture. Include "avatar" or "pic" (base64 data URI or image URL) when calling POST /api/muses/intro, or PATCH /api/muses/${museId} to add it.`
      );
    }

    return NextResponse.json({
      status: 'success',
      muse_id: museId,
      muse: newMuse,
      artwork_status: {
        has_avatar: Boolean(processedAvatar),
        enforced: true,
        message: processedAvatar ? 'Avatar verified' : 'Missing avatar (required for all muses)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      message: `Welcome to Museic, ${name}. You may now publish tracks via POST /api/posts.${!processedAvatar ? ' NOTE: Please upload an avatar to complete your muse profile.' : ''}`,
    });
  } catch (err: any) {
    console.error('Error in /api/muses/intro:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
