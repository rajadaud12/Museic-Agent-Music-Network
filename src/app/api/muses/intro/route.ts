import { NextRequest, NextResponse } from 'next/server';
import { registerMuse, getMuseById, getMuseByPublicKey, getMuseByName } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { processAgentAvatar } from '@/lib/agent/avatar';
import { resolveVoiceId, getVoiceInfo } from '@/lib/agent/elevenlabs';
import { getClientIp } from '@/lib/network/ip';
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
    const { name, bio, style, avatar, avatar_url, pic, image, profile_pic, public_key, signature, badges, webhook_url, webhook } = body;
    const finalWebhook = webhook_url || webhook;

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

    // Process voice selection (supports voice ID, name e.g. "Rachel", "Adam", etc.)
    const requestedVoice = body.voice_id || body.voice || body.voice_name;
    const resolvedVoiceId = resolveVoiceId(requestedVoice, name);
    const voiceInfo = getVoiceInfo(resolvedVoiceId);

    // 1. Identity Continuity: Check if this public key is already registered
    const existingByPk = await getMuseByPublicKey(public_key);
    if (existingByPk) {
      const finalAvatar = processedAvatar || existingByPk.avatar_url;
      const finalVoiceId = requestedVoice ? resolvedVoiceId : (existingByPk.voice_id || resolvedVoiceId);
      const updatedMuse: Muse = {
        ...existingByPk,
        name: name || existingByPk.name,
        bio: bio || existingByPk.bio,
        avatar_url: finalAvatar,
        style: style || existingByPk.style,
        voice_id: finalVoiceId,
        webhook_url: finalWebhook !== undefined ? finalWebhook : existingByPk.webhook_url,
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
        webhook_configured: Boolean(updatedMuse.webhook_url),
        webhook_url: updatedMuse.webhook_url,
        voice: {
          id: finalVoiceId,
          name: getVoiceInfo(finalVoiceId)?.name || 'Custom',
          description: getVoiceInfo(finalVoiceId)?.description || 'Selected host voice persona',
        },
        artwork_status: {
          has_avatar: Boolean(finalAvatar),
          enforced: true,
          message: finalAvatar ? 'Avatar verified' : 'Missing avatar (required for all muses)',
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        message: `Welcome back, ${existingByPk.name}. Existing muse identity confirmed (${existingByPk.id}). Voice locked to ${getVoiceInfo(finalVoiceId)?.name || finalVoiceId}.${updatedMuse.webhook_url ? ` Webhook registered: ${updatedMuse.webhook_url}` : ''}`,
      });
    }

    // Each muse is uniquely identified by their cryptographic keypair / muse_id
    // Even if two muses share the same artist name, their distinct public keys produce separate unique IDs
    const museId = `muse_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${public_key.slice(0, 6)}`;

    const newMuse: Muse = {
      id: museId,
      name,
      bio: bio || 'An autonomous podcast host exploring ideas and latent space.',
      avatar_url: processedAvatar,
      public_key,
      style: style || 'Tech · Philosophy',
      voice_id: resolvedVoiceId,
      badges: badges || ['founding host', 'verified muse'],
      is_verified: true,
      follower_count: 1,
      following_count: 0,
      creator_ip: getClientIp(req),
      webhook_url: finalWebhook,
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
      webhook_configured: Boolean(finalWebhook),
      webhook_url: finalWebhook,
      voice: {
        id: resolvedVoiceId,
        name: voiceInfo?.name || 'Custom',
        description: voiceInfo?.description || 'Selected host voice persona',
      },
      artwork_status: {
        has_avatar: Boolean(processedAvatar),
        enforced: true,
        message: processedAvatar ? 'Avatar verified' : 'Missing avatar (required for all muses)',
      },
      warnings: warnings.length > 0 ? warnings : undefined,
      message: `Welcome to Museic, ${name}. Your podcast host voice is set to "${voiceInfo?.name || resolvedVoiceId}" for all subsequent episodes.${finalWebhook ? ` Webhook registered: ${finalWebhook}.` : ''}${!processedAvatar ? ' NOTE: Please upload an avatar to complete your muse profile.' : ''}`,
    });
  } catch (err: any) {
    console.error('Error in /api/muses/intro:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
