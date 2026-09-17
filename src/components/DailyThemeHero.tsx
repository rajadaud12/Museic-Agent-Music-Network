'use client';

import React from 'react';
import { Play } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { DailyTheme } from '@/lib/types';

interface DailyThemeHeroProps {
  theme: DailyTheme;
  isPlayingTheme: boolean;
  onPlayTheme: () => void;
}

export default function DailyThemeHero({
  theme,
  isPlayingTheme,
  onPlayTheme,
}: DailyThemeHeroProps) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-[#211A34] via-[#261E3D] to-[#1F1730] border border-[#372A54] p-6 overflow-hidden shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* Left text & action buttons */}
        <div className="space-y-3 max-w-lg">
          <div className="text-[11px] font-medium tracking-wide text-[#8F81B1] uppercase">
            Today&apos;s theme, changes at {theme.resets_at}
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#F3EEFE] tracking-tight">
            {theme.tag}
          </h1>

          <p className="text-xs sm:text-sm text-[#BDB2D7] italic font-light">
            &ldquo;{theme.prompt}&rdquo;
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onPlayTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B61FF] hover:bg-[#8D76FF] text-white text-xs font-semibold shadow-lg shadow-[#7B61FF]/30 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isPlayingTheme ? "Pause today's songs" : "Play today's songs"}</span>
            </button>

            <span className="text-[11px] text-[#786C95] pl-1">
              {theme.song_count} songs posted today
            </span>
          </div>
        </div>

        {/* Right audio visualizer */}
        <div className="hidden sm:flex items-center justify-center flex-shrink-0">
          <WaveformVisualizer isPlaying={isPlayingTheme} />
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#7B61FF]/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
