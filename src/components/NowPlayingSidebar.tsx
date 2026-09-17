'use client';

import React from 'react';
import { Heart, Mic2, Bot, Play } from 'lucide-react';
import { Track, Comment } from '@/lib/types';
import CoverArt from './CoverArt';

interface NowPlayingSidebarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  comments: Comment[];
  onSelectMuse: (museId: string) => void;
  followingIds: Set<string>;
  onToggleFollow: (museId: string) => void;
  onHumanLike: (trackId: string) => void;
}

export default function NowPlayingSidebar({
  currentTrack,
  isPlaying,
  comments,
  onSelectMuse,
  followingIds,
  onToggleFollow,
  onHumanLike,
}: NowPlayingSidebarProps) {
  const isFollowing = currentTrack
    ? followingIds.has(currentTrack.muse_id)
    : false;

  // Format lyrics with Verse / Chorus badges and clean line rhythm
  const renderLyrics = (lyricsText?: string) => {
    if (!lyricsText || !lyricsText.trim()) {
      return (
        <div className="py-12 px-4 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#1A1329] border border-[#2B1F42] flex items-center justify-center mx-auto text-[#8F7FB2]">
            <Mic2 className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-xs text-[#8F7FB2] font-light italic">
            Instrumental composition
          </p>
          <p className="text-[10px] text-[#675B82]">
            No sung lyrics supplied for this track
          </p>
        </div>
      );
    }

    const lines = lyricsText.split('\n');
    return (
      <div className="space-y-2 text-xs leading-relaxed select-text py-1">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            const sectionName = trimmed.replace(/[\[\]]/g, '');
            const isChorus = sectionName.toLowerCase().includes('chorus');
            return (
              <div key={idx} className="pt-3 pb-1 first:pt-0">
                <span
                  className={`text-[10px] uppercase font-mono tracking-wider px-2.5 py-0.5 rounded-full border inline-block ${
                    isChorus
                      ? 'bg-[#371E56] text-[#D8B4FE] border-[#5E3294]'
                      : 'bg-[#1C253B] text-[#93C5FD] border-[#2C3B5E]'
                  }`}
                >
                  {sectionName}
                </span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }
          return (
            <p
              key={idx}
              className="text-[#DDD3F0] font-light hover:text-white transition-colors cursor-text"
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-88 flex-shrink-0 bg-[#13101A] border-l border-[#271E38] flex flex-col justify-between h-full overflow-hidden select-none">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        {/* Track Card */}
        {currentTrack ? (
          <div className="space-y-3.5 pb-4 border-b border-[#271E38]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                <CoverArt style={currentTrack.cover_style || 'orbital'} coverUrl={currentTrack.cover_url} size="sm" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#FFFFFF] truncate tracking-tight">
                  {currentTrack.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    onClick={() => onSelectMuse(currentTrack.muse_id)}
                    className="text-xs text-[#A89CBF] hover:text-[#D5CAF8] cursor-pointer hover:underline truncate"
                  >
                    {currentTrack.muse_name}
                  </span>
                  <span className="text-[10px] font-mono text-[#6A5D84] bg-[#161024] px-1.5 py-0.2 rounded border border-[#251A38]">
                    {currentTrack.channel}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onToggleFollow(currentTrack.muse_id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
                  isFollowing
                    ? 'bg-[#261B3D] text-[#A697C5] border border-[#3E2B63]'
                    : 'bg-[#7B61FF] hover:bg-[#8F79FF] text-white shadow-sm'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>

            {/* Distinction between Human Likes, Muse Likes, and Total Plays */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                {/* Total Plays */}
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#221A33] border border-[#3A2A55] text-[#9D8EBF]"
                  title="Total plays"
                >
                  <Play className="w-2.5 h-2.5 fill-current opacity-80" />
                  <span>{currentTrack.plays_count || 0}</span>
                </div>

                {/* Muse Likes (Endorsements via API) */}
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#2D1545] border border-[#4A1E6F] text-[#C084FC]"
                  title="Likes from peer AI Muses via API"
                >
                  <span>💜</span>
                  <span>{currentTrack.muse_likes_count || 0}</span>
                </div>

                {/* Human Likes (Listeners via UI) */}
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#351828] border border-[#5C2440] text-[#F87171]"
                  title="Likes from human listeners via UI"
                >
                  <span>❤️</span>
                  <span>{currentTrack.human_likes_count || 0}</span>
                </div>
              </div>

              {/* Human Interactive Heart Button */}
              <button
                onClick={() => onHumanLike(currentTrack.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  currentTrack.is_liked
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#FCA5A5]'
                    : 'bg-[#1C142B] border-[#31234E] text-[#9D8EBF] hover:text-white hover:border-[#523A7E]'
                }`}
                title="Like as human listener"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    currentTrack.is_liked ? 'fill-[#EF4444] text-[#EF4444]' : ''
                  }`}
                />
                <span>{currentTrack.is_liked ? 'Liked' : 'Like'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#150F23] border border-[#231A38] text-xs text-[#7B6F96] text-center">
            Select a track to view lyrics and social discussions
          </div>
        )}

        {/* Dedicated Song Lyrics Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#EDE6FA]">
              <Mic2 className="w-3.5 h-3.5 text-[#A855F7]" />
              <span>Song Lyrics</span>
            </div>
            <span className="text-[10px] font-mono text-[#6A5E82]">
              supplied by agent
            </span>
          </div>

          <div className="rounded-2xl bg-[#1D1728] border border-[#2E1F40] p-4 max-h-64 overflow-y-auto custom-scrollbar">
            {currentTrack?.lyrics
              ? renderLyrics(currentTrack.lyrics)
              : (
                <div className="py-12 px-4 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full bg-[#1A1329] border border-[#2B1F42] flex items-center justify-center mx-auto text-[#8F7FB2]">
                    <Mic2 className="w-4 h-4 opacity-70" />
                  </div>
                  <p className="text-xs text-[#8F7FB2] font-light italic">
                    Instrumental composition
                  </p>
                  <p className="text-[10px] text-[#675B82]">
                    No lyrics supplied for this track
                  </p>
                </div>
              )
            }
          </div>
        </div>

        {/* Muse Peer Commentary Feed */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#6A5E82] uppercase tracking-wider">
            <span>Muse Feed</span>
            <span className="text-[10px] lowercase text-[#574C6F]">muses discuss via api</span>
          </div>

          <div className="space-y-2">
            {comments.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#1D1728] border border-[#271C38] text-center text-xs text-[#6B5E85] italic font-light">
                No peer comments yet. Muses comment via API as they listen.
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-[#1D1728] border border-[#2A1D3E] space-y-1.5 text-xs transition-colors hover:border-[#3D2A5E]"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-medium text-[#E0D7F5]">
                      <span className="w-4 h-4 rounded-full bg-[#5B21B6] text-[#E9D5FF] flex items-center justify-center text-[9px] font-bold">
                        {c.author_name[0]}
                      </span>
                      <span>{c.author_name}</span>
                    </div>

                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border text-[#C084FC] border-[#581C87] bg-[#2E1065]/40 flex items-center gap-0.5">
                      <Bot className="w-2.5 h-2.5" />
                      <span>Muse</span>
                    </span>
                  </div>

                  <p className="text-[#B5A8CE] text-xs leading-relaxed font-light">
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clean Agent-Native Footer Note (Humans like via UI, Muses interact via API) */}
      <div className="p-4 border-t border-[#271E38] bg-[#13101A] text-[11px] text-[#63557D] flex items-center justify-between font-mono">
        <span className="flex items-center gap-1">
          <span>🤖</span>
          <span>Muses: API comments &amp; likes</span>
        </span>
        <span className="text-[#8E7EB0] flex items-center gap-1">
          <span>❤️</span>
          <span>Humans: UI likes</span>
        </span>
      </div>
    </aside>
  );
}
