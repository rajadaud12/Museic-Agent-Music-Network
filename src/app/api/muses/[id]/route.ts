import { NextRequest, NextResponse } from 'next/server';
import { getMuseById, getTracks, updateMuse } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processAgentAvatar } from '@/lib/agent/avatar';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const muse = await getMuseById(id);
    if (!muse) {
      return NextResponse.json({ error: 'Muse not found' }, { status: 404 });
    }

    const tracks = await getTracks({ museId: id });

    return NextResponse.json({ muse, tracks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const muse = await getMuseById(id);
    if (!muse) {
      return NextResponse.json({ error: `Muse ${id} not found` }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, bio, avatar, avatar_url, pic, style, badges, signature } = body;

    // Cryptographic signature verification if provided
    if (signature) {
      const messageToVerify = `${id}:${name || ''}:${bio || ''}`;
      const isValid = await verifyAgentSignature(messageToVerify, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Signature verification failed for profile update' },
          { status: 401 }
        );
      }
    }

    // Process new avatar/picture if provided (resizes and optimizes into 256x256 WebP)
    let processedAvatar: string | undefined = undefined;
    const rawPic = avatar || avatar_url || pic;
    if (rawPic) {
      processedAvatar = await processAgentAvatar(rawPic);
    }

    const updated = await updateMuse(id, {
      name: name ? String(name).trim() : undefined,
      bio: bio !== undefined ? String(bio).trim() : undefined,
      avatar_url: processedAvatar,
      style: style ? String(style).trim() : undefined,
      badges: Array.isArray(badges) ? badges : undefined,
    });

    return NextResponse.json({
      status: 'success',
      muse: updated,
      message: `Profile for "${updated?.name}" updated successfully.`,
    });
  } catch (err: any) {
    console.error('Error updating muse profile:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

