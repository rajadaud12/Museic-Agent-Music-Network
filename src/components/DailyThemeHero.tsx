'use client';

import React from 'react';
import { Play } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';
import { DailyTheme } from '@/lib/types';

interface DailyThemeHeroProps {
  theme: DailyTheme;
  isPlayingTheme: boolean;
  onPlayTheme: () => void;
  isPlaying?: boolean;
}

export default function DailyThemeHero({
  theme,
  isPlayingTheme,
  onPlayTheme,
  isPlaying = false,
}: DailyThemeHeroProps) {
  const activePlaying = isPlayingTheme || isPlaying;

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-[#292232] via-[#2F263A] to-[#251E2E] border border-[#382D4F] p-6 sm:p-7 overflow-hidden shadow-2xl">
      {/* Dynamic ambient mesh glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#7B61FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 right-0 w-60 h-60 bg-[#EC4899]/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        {/* Left side: Mascot Illustration (on/off) + Hero text */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 max-w-2xl">
          {/* Animated on/off Mascot / Visualizer Illustration */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-[#1D1728] border border-[#3E2F54] p-1.5 shadow-xl flex items-center justify-center">
            <img
              src={activePlaying ? '/on.webp' : '/off.webp'}
              alt={activePlaying ? 'Music Playing (On)' : 'Music Paused (Off)'}
              className={`w-full h-full object-contain transition-all duration-300 ${
                activePlaying ? 'scale-105 drop-shadow-[0_0_12px_rgba(123,97,255,0.7)]' : 'opacity-85'
              }`}
            />
            {activePlaying && (
              <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
              </span>
            )}
          </div>

          {/* Left text & action buttons */}
          <div className="space-y-3 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A161F]/80 border border-[#382D4F] text-[11px] font-medium tracking-wide text-[#A89CBF] uppercase">
              <span className={`w-1.5 h-1.5 rounded-full ${activePlaying ? 'bg-[#10B981] animate-ping' : 'bg-[#7B61FF] animate-pulse'}`} />
              <span>Today&apos;s Theme · Resets {theme.resets_at}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#F3EEFE] tracking-tight">
              {theme.tag}
            </h1>

            <p className="text-xs sm:text-sm text-[#C4B7DE] font-light leading-relaxed">
              &ldquo;{theme.prompt}&rdquo;
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={onPlayTheme}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#7B61FF] hover:bg-[#8D76FF] text-white text-xs font-semibold shadow-lg shadow-[#7B61FF]/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isPlayingTheme ? "Pause today's songs" : "Play today's songs"}</span>
              </button>

              <span className="text-xs text-[#8F7FA8] font-mono pl-1">
                ⚡ {theme.song_count} songs live
              </span>
            </div>
          </div>
        </div>

        {/* Right audio visualizer */}
        <div className="hidden lg:flex items-center justify-center flex-shrink-0">
          <WaveformVisualizer isPlaying={activePlaying} />
        </div>
      </div>

      {/* Ambient background glow */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#7B61FF]/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
