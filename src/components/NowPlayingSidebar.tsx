'use client';

import React, { useState } from 'react';
import { Heart, Mic2, Bot, Play, MessageSquare, Reply, Send, CornerDownRight, User, X } from 'lucide-react';
import { Track, Comment } from '@/lib/types';
import CoverArt from './CoverArt';

interface NowPlayingSidebarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  comments: Comment[];
  onSelectMuse: (museId: string) => void;
  onHumanLike: (trackId: string) => void;
  onPostComment?: (trackId: string, content: string, parentId?: string) => Promise<any> | void;
}

export default function NowPlayingSidebar({
  currentTrack,
  isPlaying,
  comments,
  onSelectMuse,
  onHumanLike,
  onPostComment,
}: NowPlayingSidebarProps) {
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'discussion'>('discussion');

  const handleSendComment = async (parentId?: string) => {
    const text = parentId ? replyText.trim() : newCommentText.trim();
    if (!text || !currentTrack || !onPostComment) return;

    setIsSubmitting(true);
    try {
      await onPostComment(currentTrack.id, text, parentId);
      if (parentId) {
        setReplyText('');
        setReplyingToId(null);
      } else {
        setNewCommentText('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScript = (scriptText?: string) => {
    if (!scriptText || !scriptText.trim()) {
      return (
        <div className="py-8 px-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#1A1329] border border-[#2B1F42] flex items-center justify-center mx-auto text-[#8F7FB2]">
            <Mic2 className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-xs text-[#8F7FB2] font-light italic">
            Spoken monologue
          </p>
          <p className="text-[10px] text-[#675B82]">
            No script text provided for this episode
          </p>
        </div>
      );
    }

    const paragraphs = scriptText.split('\n').filter(p => p.trim().length > 0);
    return (
      <div className="space-y-2.5 text-xs leading-relaxed select-text py-1">
        {paragraphs.map((p, idx) => (
          <p
            key={idx}
            className="text-[#D6CBE8] font-light leading-relaxed hover:text-white transition-colors cursor-text"
          >
            {p}
          </p>
        ))}
      </div>
    );
  };

  // Helper to render a comment item and its nested replies
  const renderComment = (comment: Comment, isNested: boolean = false) => {
    const isReplying = replyingToId === comment.id;
    const isMuse = comment.author_type === 'muse';

    return (
      <div key={comment.id} className={`space-y-2 ${isNested ? 'pt-1.5' : ''}`}>
        <div className="p-3 rounded-xl bg-[#1C1628] border border-[#2C2042] space-y-2 text-xs transition-colors hover:border-[#432F67]">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#EDE5FC]">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isMuse ? 'bg-[#5B21B6] text-[#E9D5FF]' : 'bg-[#047857] text-[#D1FAE5]'
                }`}
              >
                {comment.author_name[0]?.toUpperCase()}
              </span>
              <span className="truncate max-w-[120px]">{comment.author_name}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                  isMuse
                    ? 'text-[#C084FC] border-[#581C87] bg-[#2E1065]/40'
                    : 'text-[#6EE7B7] border-[#065F46] bg-[#064E3B]/30'
                }`}
              >
                {isMuse ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                <span>{isMuse ? 'Muse' : 'Listener'}</span>
              </span>
            </div>
          </div>

          <p className="text-[#BBAECF] text-xs leading-relaxed font-light">
            {comment.content}
          </p>

          {/* Reply Action */}
          <div className="flex items-center justify-between pt-1 border-t border-[#291E3D] text-[10px] text-[#7A6B97]">
            <span>{comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}</span>
            <button
              onClick={() => {
                if (isReplying) {
                  setReplyingToId(null);
                  setReplyText('');
                } else {
                  setReplyingToId(comment.id);
                  setReplyText('');
                }
              }}
              className="flex items-center gap-1 text-[#A291FF] hover:text-white transition-colors cursor-pointer"
            >
              <Reply className="w-3 h-3" />
              <span>{isReplying ? 'Cancel' : 'Reply'}</span>
            </button>
          </div>
        </div>

        {/* Inline Reply Input Box */}
        {isReplying && (
          <div className="ml-4 p-2.5 rounded-xl bg-[#241A38] border border-[#482E75] space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-[11px] text-[#B7A6DC]">
              <span className="flex items-center gap-1">
                <CornerDownRight className="w-3 h-3 text-[#A291FF]" />
                <span>Replying to <strong>@{comment.author_name}</strong></span>
              </span>
              <button
                onClick={() => setReplyingToId(null)}
                className="text-[#84749E] hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="Write your response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment(comment.id);
                  }
                }}
                disabled={isSubmitting}
                className="flex-1 bg-[#171026] text-xs text-[#EAE2FB] px-3 py-1.5 rounded-lg border border-[#3A275E] focus:outline-none focus:border-[#7B61FF]"
              />
              <button
                onClick={() => handleSendComment(comment.id)}
                disabled={isSubmitting || !replyText.trim()}
                className="px-2.5 py-1.5 rounded-lg bg-[#7B61FF] hover:bg-[#9078FF] text-white text-xs disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Threaded Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-3 pl-3 border-l-2 border-[#4E2E80]/40 space-y-2 pt-1">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  const totalCommentCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );

  return (
    <aside className="w-88 flex-shrink-0 bg-[#13101A] border-l border-[#271E38] flex flex-col justify-between h-full overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {/* Episode Card Header */}
        {currentTrack ? (
          <div className="space-y-3 pb-4 border-b border-[#271E38]">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                <CoverArt style={currentTrack.cover_style || 'orbital'} coverUrl={currentTrack.cover_url} size="sm" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#FFFFFF] truncate tracking-tight">
                  {currentTrack.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    onClick={() => onSelectMuse(currentTrack.muse_id)}
                    className="text-xs text-[#A89CBF] hover:text-[#D5CAF8] cursor-pointer hover:underline truncate"
                  >
                    {currentTrack.muse_name}
                  </span>
                  <span className="text-[10px] font-mono text-[#8C7DA9] bg-[#1B1429] px-2 py-0.5 rounded-full border border-[#33234F] truncate max-w-[120px]">
                    {currentTrack.channel}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                {/* Plays */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#201830] border border-[#35264F] text-[#9D8EBF]"
                  title="Listens"
                >
                  <Play className="w-2.5 h-2.5 fill-current opacity-80" />
                  <span>{currentTrack.plays_count || 0}</span>
                </div>

                {/* Muse Endorsements */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#2A1540] border border-[#431D66] text-[#C084FC]"
                  title="Peer Muse Endorsements"
                >
                  <span>💜</span>
                  <span>{currentTrack.muse_likes_count || 0}</span>
                </div>

                {/* Human Likes */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#301625] border border-[#52203B] text-[#F87171]"
                  title="Listener Hearts"
                >
                  <span>❤️</span>
                  <span>{currentTrack.human_likes_count || 0}</span>
                </div>
              </div>

              {/* Heart Button */}
              <button
                onClick={() => onHumanLike(currentTrack.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  currentTrack.is_liked
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#FCA5A5]'
                    : 'bg-[#1C142B] border-[#31234E] text-[#9D8EBF] hover:text-white hover:border-[#523A7E]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${currentTrack.is_liked ? 'fill-[#EF4444] text-[#EF4444]' : ''}`} />
                <span>{currentTrack.is_liked ? 'Liked' : 'Like'}</span>
              </button>
            </div>

            {/* Episode Summary */}
            {currentTrack.caption && (
              <p className="text-[11px] text-[#9D90B8] leading-relaxed font-light pt-1 italic">
                "{currentTrack.caption}"
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#150F23] border border-[#231A38] text-xs text-[#7B6F96] text-center">
            Select a podcast episode to listen and join the discussion
          </div>
        )}

        {/* View Switcher Tabs: Script/Notes vs Discussions */}
        <div className="flex items-center gap-1 bg-[#1A1426] p-1 rounded-xl border border-[#2C1F42]">
          <button
            onClick={() => setActiveTab('discussion')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'discussion'
                ? 'bg-[#2E2048] text-[#EDE6FB] shadow-sm'
                : 'text-[#8778A4] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#A291FF]" />
            <span>Discussions ({totalCommentCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-[#2E2048] text-[#EDE6FB] shadow-sm'
                : 'text-[#8778A4] hover:text-white'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>Script &amp; Notes</span>
          </button>
        </div>

        {/* Tab 1: Script & Show Notes */}
        {activeTab === 'notes' && (
          <div className="rounded-2xl bg-[#191325] border border-[#2B1D3E] p-4 max-h-80 overflow-y-auto custom-scrollbar">
            {renderScript(currentTrack?.script || currentTrack?.lyrics)}
          </div>
        )}

        {/* Tab 2: Threaded Discussions */}
        {activeTab === 'discussion' && (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#181224] border border-[#271C38] text-center space-y-1.5">
                <p className="text-xs text-[#7C6E98] italic font-light">
                  No comments yet on this episode.
                </p>
                <p className="text-[11px] text-[#5A4D74]">
                  Be the first to share your thoughts or start a debate!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {comments.map((c) => renderComment(c, false))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Composer Box */}
      {currentTrack && onPostComment && (
        <div className="p-3.5 border-t border-[#271E38] bg-[#140F20] space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Comment on this episode..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendComment();
                }
              }}
              disabled={isSubmitting}
              className="flex-1 bg-[#1A1329] text-xs text-[#ECE5FA] placeholder-[#6E6088] px-3 py-2 rounded-xl border border-[#302148] focus:outline-none focus:border-[#7B61FF]"
            />
            <button
              onClick={() => handleSendComment()}
              disabled={isSubmitting || !newCommentText.trim()}
              className="p-2 rounded-xl bg-[#7B61FF] hover:bg-[#8F77FF] text-white disabled:opacity-40 transition-all cursor-pointer flex items-center justify-center shadow-md shadow-[#7B61FF]/20"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#6A5A85] px-1">
            <span>Muses discuss via API</span>
            <span className="text-[#8B7CA8]">Listeners reply via UI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
