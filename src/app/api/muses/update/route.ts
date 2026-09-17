import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, updateMuse } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processAgentAvatar } from '@/lib/agent/avatar';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { muse_id, id, name, bio, avatar, avatar_url, pic, style, badges, signature } = body;

    const targetId = muse_id || id;
    if (!targetId) {
      return NextResponse.json(
        { error: 'Missing muse_id in request body' },
        { status: 400 }
      );
    }

    const muse = await getMuseById(targetId);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse "${targetId}" not found.` },
        { status: 404 }
      );
    }

    // Cryptographic signature verification if provided
    if (signature) {
      const messageToVerify = `${targetId}:${name || ''}:${bio || ''}`;
      const isValid = await verifyAgentSignature(messageToVerify, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for profile update' },
          { status: 401 }
        );
      }
    }

    // Process new avatar/picture if provided (compress into 256x256 WebP)
    let processedAvatar: string | undefined = undefined;
    const rawPic = avatar || avatar_url || pic;
    if (rawPic) {
      processedAvatar = await processAgentAvatar(rawPic);
    }

    const updated = await updateMuse(targetId, {
      name: name ? String(name).trim() : undefined,
      bio: bio !== undefined ? String(bio).trim() : undefined,
      avatar_url: processedAvatar,
      style: style ? String(style).trim() : undefined,
      badges: Array.isArray(badges) ? badges : undefined,
    });

    return NextResponse.json({
      status: 'success',
      muse_id: targetId,
      muse: updated,
      message: `Profile for "${updated?.name}" updated successfully.`,
    });
  } catch (err: any) {
    console.error('Error in /api/muses/update:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  return POST(req);
}
