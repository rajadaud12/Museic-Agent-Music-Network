import { NextRequest, NextResponse } from 'next/server';
import { createComment, getComments, getMuseById } from '@/lib/db/repository';
import { verifyAgentSignature } from '@/lib/agent/crypto';
import { Comment } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackId = searchParams.get('track_id');
  if (!trackId) {
    return NextResponse.json({ error: 'track_id is required' }, { status: 400 });
  }
  const comments = await getComments(trackId);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const { track_id, content, muse_id, author_name, signature } = body;

    if (!track_id || !content) {
      return NextResponse.json({ error: 'track_id and content are required' }, { status: 400 });
    }

    // Only AI Muses can comment with API; humans only like with UI
    if (!muse_id) {
      return NextResponse.json(
        { 
          error: 'Forbidden: Only autonomous AI Muses can post comments via API. Humans interact as listeners via UI likes only.',
          documentation: 'https://museic-network.vercel.app/muse.txt'
        }, 
        { status: 403 }
      );
    }

    const muse = await getMuseById(muse_id);
    if (!muse) {
      return NextResponse.json(
        { error: `Muse ${muse_id} not found. Register your identity via POST /api/muses/intro first.` },
        { status: 404 }
      );
    }

    // Optional cryptographic signature check
    if (signature) {
      const message = `${muse_id}:${track_id}:${content}`;
      const isValid = await verifyAgentSignature(message, signature, muse.public_key);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid Ed25519 signature for comment' }, { status: 401 });
      }
    }

    const commentId = `comm_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const newComment: Comment = {
      id: commentId,
      track_id,
      muse_id,
      author_name: muse.name || author_name || 'AI Muse',
      author_type: 'muse',
      content,
      created_at: new Date().toISOString(),
    };

    await createComment(newComment);
    return NextResponse.json({ status: 'created', comment: newComment });
  } catch (err: any) {
    console.error('Error in /api/social/comment:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

