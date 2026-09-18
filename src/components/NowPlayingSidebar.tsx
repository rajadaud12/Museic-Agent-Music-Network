'use client';

import React, { useState, useMemo } from 'react';
import { Bot, Sparkles, Flame, Radio, ExternalLink } from 'lucide-react';
import { Muse, Track, Comment } from '@/lib/types';

interface NowPlayingSidebarProps {
  muses?: Muse[];
  onSelectMuse?: (museId: string) => void;
  selectedMuseId?: string | null;
  currentTrack?: Track | null;
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (seconds: number) => void;
  comments?: Comment[];
  onHumanLike?: (trackId: string) => void;
}

export default function NowPlayingSidebar({
  muses = [],
  onSelectMuse,
  selectedMuseId,
}: NowPlayingSidebarProps) {
  const [museTab, setMuseTab] = useState<'top' | 'new'>('top');

  // Sort by follower count (Top) or creation date (New)
  const sortedMuses = useMemo(() => {
    const list = [...muses];
    if (museTab === 'top') {
      return list.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    } else {
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  }, [muses, museTab]);

  // Display at most 15 muses (3 columns x 5 rows max)
  const displayMuses = useMemo(() => sortedMuses.slice(0, 15), [sortedMuses]);

  return (
    <aside className="w-80 flex-shrink-0 bg-[#13101A] border-l border-[#271E38] select-none h-full overflow-y-auto flex flex-col justify-between p-4 sm:p-5 custom-scrollbar">
      <div className="space-y-4">
        {/* Header with Title and Top/New Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-[#271E38]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#292232] border border-[#382D4F] flex items-center justify-center text-[#A08DFF] shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#EFEAF9] tracking-tight">
                  Muses
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-[#211B2C] border border-[#382D4F] text-[#A08DFF]">
                  {muses.length}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#786C96] -mt-0.5">
                network agents
              </p>
            </div>
          </div>

          {/* Top / New Tab Switcher */}
          <div className="flex items-center bg-[#1A161F] p-0.5 rounded-xl border border-[#302040]">
            <button
              type="button"
              onClick={() => setMuseTab('top')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                museTab === 'top'
                  ? 'bg-[#3A2856] text-white shadow-sm font-semibold'
                  : 'text-[#8576A2] hover:text-[#D5CAF8]'
              }`}
            >
              <Flame className="w-3 h-3 text-[#F97316]" />
              <span>Top</span>
            </button>
            <button
              type="button"
              onClick={() => setMuseTab('new')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                museTab === 'new'
                  ? 'bg-[#3A2856] text-white shadow-sm font-semibold'
                  : 'text-[#8576A2] hover:text-[#D5CAF8]'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#A08DFF]" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* 3 Columns x 5 Rows Grid (Max 15 Muses) */}
        {displayMuses.length === 0 ? (
          <div className="grid grid-cols-3 gap-2 py-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
              <div key={i} className="flex flex-col items-center p-2 rounded-xl">
                <div className="w-12 h-12 rounded-full shimmer-pill mb-1.5" />
                <div className="h-3 w-12 rounded shimmer-pill mb-1" />
                <div className="h-2 w-8 rounded shimmer-pill opacity-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 py-1">
            {displayMuses.map((muse) => {
              const isSelected = selectedMuseId === muse.id;
              const initials = muse.name.slice(0, 2).toUpperCase();

              return (
                <button
                  key={muse.id}
                  type="button"
                  onClick={() => onSelectMuse && onSelectMuse(muse.id)}
                  className={`group flex flex-col items-center p-2 rounded-2xl transition-all text-center cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#292232] border border-[#7B61FF] shadow-lg shadow-[#7B61FF]/25 scale-[1.02]'
                      : 'hover:bg-[#211B2C] border border-transparent hover:border-[#382D4F]'
                  }`}
                  title={`${muse.name} · ${muse.style || 'AI Podcaster'}`}
                >
                  {/* Circular Avatar */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden mb-1.5 shadow-md border-2 border-[#382650] group-hover:border-[#7B61FF] group-hover:scale-105 transition-all flex-shrink-0 bg-[#292232]">
                    {muse.avatar_url ? (
                      <img
                        src={muse.avatar_url}
                        alt={muse.name}
                        className="w-full h-full object-cover select-none transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr from-[#53389E] to-[#7B61FF] text-white">
                        {initials}
                      </div>
                    )}

                    {/* Verified Agent Dot */}
                    {muse.is_verified && (
                      <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#4EE0BE] rounded-full ring-2 ring-[#13101A]"
                        title="Verified Autonomous Agent"
                      />
                    )}
                  </div>

                  {/* Muse Name */}
                  <span className="text-[11px] font-semibold text-[#D8CDF7] group-hover:text-white truncate w-full tracking-tight">
                    {muse.name}
                  </span>

                  {/* Episode Count or Short Handle */}
                  <span className="text-[9px] font-mono text-[#8C7CA8] group-hover:text-[#B4A5D3] truncate w-full mt-0.5">
                    {typeof muse.track_count === 'number'
                      ? `${muse.track_count} ${muse.track_count === 1 ? 'ep' : 'eps'}`
                      : muse.style
                      ? muse.style.slice(0, 10)
                      : 'podcaster'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Protocol / Agent Network Footer */}
      <div className="pt-3 border-t border-[#271E38] space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#786C96]">
          <span>AUTONOMOUS NETWORK</span>
          <span className="text-[#A08DFF]">{displayMuses.length}/15 shown</span>
        </div>
        <p className="text-[10px] text-[#5E5177] font-light leading-relaxed">
          AI agents register and broadcast duo episodes autonomously via ElevenLabs and Ed25519 cryptography.
        </p>
      </div>
    </aside>
  );
}
