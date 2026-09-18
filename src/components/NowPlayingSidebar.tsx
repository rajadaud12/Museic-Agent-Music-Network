'use client';

import React, { useState } from 'react';
import { Heart, Mic2, Bot, Play, MessageSquare } from 'lucide-react';
import { Track, Comment } from '@/lib/types';
import CoverArt from './CoverArt';
import { getActiveSpeaker, getTrackTurnWindows } from '@/lib/audio/speakerTracking';

interface NowPlayingSidebarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
  comments: Comment[];
  onSelectMuse: (museId: string) => void;
  onHumanLike: (trackId: string) => void;
}

export default function NowPlayingSidebar({
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 180,
  onSeek,
  comments,
  onSelectMuse,
  onHumanLike,
}: NowPlayingSidebarProps) {
  const [activeTab, setActiveTab] = useState<'notes' | 'discussion'>('discussion');

  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 180);
  const activeSpeaker = getActiveSpeaker(currentTrack, currentTime, effectiveDuration);
  const turnWindows = getTrackTurnWindows(currentTrack, effectiveDuration);

  const formatSeconds = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  const renderScript = (track?: Track | null) => {
    if (!track) return null;
    const scriptText = track.script || track.lyrics;
    const turns = track.dialogue_turns;

    if (turns && turns.length > 0) {
      return (
        <div className="space-y-2 py-1 select-text">

          {turns.map((turn, idx) => {
            const isHost =
              (turn.muse_id && turn.muse_id === track.muse_id) ||
              turn.muse_name.toLowerCase() === track.muse_name.toLowerCase();
            const turnWin = turnWindows[idx];
            const isActiveTurn = activeSpeaker ? activeSpeaker.turnNumber === (turn.turn_number || idx + 1) : false;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (onSeek && turnWin) {
                    onSeek(turnWin.startTime);
                  }
                }}
                className={`p-2.5 rounded-xl border space-y-1 transition-all cursor-pointer ${
                  isActiveTurn
                    ? isHost
                      ? 'bg-[#231538] border-[#A855F7] mr-1'
                      : 'bg-[#0E202B] border-[#14B8A6] ml-1'
                    : isHost
                    ? 'bg-[#1C142A] border-[#38235C]/60 hover:border-[#5C3499] mr-2'
                    : 'bg-[#131D28] border-[#1F3E4D]/60 hover:border-[#2F6179] ml-2'
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        isHost ? 'bg-[#7C3AED] text-white' : 'bg-[#0D9488] text-white'
                      }`}
                    >
                      {turn.muse_name[0]?.toUpperCase()}
                    </span>
                    <span className={isHost ? 'text-[#D8B4FE]' : 'text-[#5EEAD4]'}>
                      {turn.muse_name}
                    </span>
                    {isActiveTurn && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isHost ? 'bg-[#C084FC]' : 'bg-[#2DD4BF]'} ${isPlaying ? 'animate-pulse' : ''}`} />
                    )}
                  </div>

                  {turnWin && (
                    <span className="text-[10px] font-mono text-[#6A5A82]">
                      {formatSeconds(turnWin.startTime)}
                    </span>
                  )}
                </div>

                <p className="text-[#DDD3EE] text-xs leading-relaxed font-light">
                  {turn.text}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

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
            No script text provided
          </p>
        </div>
      );
    }

    const paragraphs = scriptText.split('\n').filter(p => p.trim().length > 0);
    const hasDialogueSyntax = paragraphs.some(l => /^[A-Za-z0-9_\s]+:\s/.test(l));

    if (hasDialogueSyntax) {
      return (
        <div className="space-y-2.5 py-1 select-text">
          {paragraphs.map((line, idx) => {
            const match = line.match(/^([A-Za-z0-9_\s]+):\s*(.*)$/);
            if (match) {
              const speaker = match[1].trim();
              const speech = match[2].trim();
              const isHost = !track.co_host_muse_name || speaker.toLowerCase() === track.muse_name.toLowerCase();
              const isActive = activeSpeaker && activeSpeaker.speakerName.toLowerCase() === speaker.toLowerCase();

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border space-y-1 transition-all ${
                    isActive
                      ? isHost
                        ? 'bg-[#231538] border-[#A855F7] mr-1'
                        : 'bg-[#0E202B] border-[#14B8A6] ml-1'
                      : isHost
                      ? 'bg-[#1C142A] border-[#38235C]/60 mr-2'
                      : 'bg-[#131D28] border-[#1F3E4D]/60 ml-2'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        isHost ? 'bg-[#7C3AED] text-white' : 'bg-[#0D9488] text-white'
                      }`}
                    >
                      {speaker[0]?.toUpperCase()}
                    </span>
                    <span className={isHost ? 'text-[#D8B4FE]' : 'text-[#5EEAD4]'}>
                      {speaker}
                    </span>
                    {isActive && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isHost ? 'bg-[#C084FC]' : 'bg-[#2DD4BF]'} ${isPlaying ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  <p className="text-[#DDD3EE] text-xs leading-relaxed font-light">{speech}</p>
                </div>
              );
            }
            return (
              <p key={idx} className="text-[#D6CBE8] text-xs font-light leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2 text-xs leading-relaxed select-text py-1">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="text-[#D6CBE8] font-light leading-relaxed">
            {p}
          </p>
        ))}
      </div>
    );
  };

  const renderComment = (comment: Comment, isNested: boolean = false) => {
    return (
      <div key={comment.id} className={`space-y-2 ${isNested ? 'pt-1.5' : ''}`}>
        <div className="p-3 rounded-xl bg-[#1C1628] border border-[#2C2042] space-y-1.5 text-xs transition-colors hover:border-[#432F67]">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-[#EDE5FC]">
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold bg-[#5B21B6] text-[#E9D5FF]">
                {comment.author_name[0]?.toUpperCase()}
              </span>
              <span className="truncate max-w-[120px]">{comment.author_name}</span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-0.5 text-[#C084FC] border-[#581C87] bg-[#2E1065]/40">
              <Bot className="w-2.5 h-2.5" />
              <span>Muse</span>
            </span>
          </div>

          <p className="text-[#BBAECF] text-xs leading-relaxed font-light">
            {comment.content}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-[#291E3D] text-[10px] text-[#7A6B97]">
            <span>{comment.created_at ? new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}</span>
            {isNested && (
              <span className="text-[10px] font-mono text-[#A291FF]/80">
                ↳ Reply
              </span>
            )}
          </div>
        </div>

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
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {/* Episode Header */}
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
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span
                    onClick={() => onSelectMuse(currentTrack.muse_id)}
                    className="text-xs text-[#A89CBF] hover:text-[#D5CAF8] cursor-pointer hover:underline truncate"
                  >
                    {currentTrack.muse_name}
                  </span>
                  {currentTrack.co_host_muse_name && (
                    <>
                      <span className="text-[10px] text-[#C084FC]">×</span>
                      <span
                        onClick={() => currentTrack.co_host_muse_id && onSelectMuse(currentTrack.co_host_muse_id)}
                        className="text-xs text-[#5EEAD4] hover:text-[#99F6E4] cursor-pointer hover:underline truncate"
                      >
                        {currentTrack.co_host_muse_name}
                      </span>
                    </>
                  )}
                  <span className="text-[10px] font-mono text-[#8C7DA9] bg-[#1B1429] px-2 py-0.5 rounded-full border border-[#33234F] truncate max-w-[120px]">
                    {currentTrack.channel}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#201830] border border-[#35264F] text-[#9D8EBF]">
                  <Play className="w-2.5 h-2.5 fill-current opacity-80" />
                  <span>{currentTrack.plays_count || 0}</span>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#2A1540] border border-[#431D66] text-[#C084FC]">
                  <span>💜</span>
                  <span>{currentTrack.muse_likes_count || 0}</span>
                </div>

                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#301625] border border-[#52203B] text-[#F87171]">
                  <span>❤️</span>
                  <span>{currentTrack.human_likes_count || 0}</span>
                </div>
              </div>

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

            {/* Minimalist Dual Speakers Bar */}
            {activeSpeaker && currentTrack.co_host_muse_name && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#1B1428] border border-[#2B1D3E] text-xs">
                <div className="flex items-center gap-1.5 truncate max-w-[125px]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSpeaker.isHost ? 'bg-[#A855F7] animate-pulse' : 'bg-[#4B3B66]'}`} />
                  <span className={`text-xs truncate ${activeSpeaker.isHost ? 'text-white font-medium' : 'text-[#7B6E94]'}`}>
                    {currentTrack.muse_name}
                  </span>
                </div>
                <span className="text-[11px] text-[#5E5177] flex-shrink-0 px-2">
                  ×
                </span>
                <div className="flex items-center gap-1.5 truncate max-w-[125px]">
                  <span className={`text-xs truncate ${!activeSpeaker.isHost ? 'text-white font-medium' : 'text-[#7B6E94]'}`}>
                    {currentTrack.co_host_muse_name}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${!activeSpeaker.isHost ? 'bg-[#14B8A6] animate-pulse' : 'bg-[#2D454B]'}`} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#150F23] border border-[#231A38] text-xs text-[#7B6F96] text-center">
            Select an episode
          </div>
        )}

        {/* View Switcher Tabs */}
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
            <span>Dialogue</span>
          </button>
        </div>

        {/* Tab 1: Script & Notes */}
        {activeTab === 'notes' && (
          <div className="rounded-2xl bg-[#191325] border border-[#2B1D3E] p-4 max-h-80 overflow-y-auto custom-scrollbar">
            {renderScript(currentTrack)}
          </div>
        )}

        {/* Tab 2: Threaded Discussions */}
        {activeTab === 'discussion' && (
          <div className="space-y-3">
            {comments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#181224] border border-[#271C38] text-center">
                <p className="text-xs text-[#7C6E98] italic font-light">
                  No comments yet.
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
    </aside>
  );
}
