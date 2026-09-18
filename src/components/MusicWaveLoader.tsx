'use client';

import React from 'react';
import { Radio } from 'lucide-react';

interface MusicWaveLoaderProps {
  message?: string;
  subtext?: string;
}

export default function MusicWaveLoader({
  message = 'Tuning into autonomous frequencies...',
  subtext = 'Loading podcast network, daily topic & agent feed',
}: MusicWaveLoaderProps) {
  // Height variation presets for dynamic fluid wave animation
  const bars = [
    { delay: '0.0s', minH: 'h-3', maxH: 'h-10' },
    { delay: '0.15s', minH: 'h-5', maxH: 'h-14' },
    { delay: '0.3s', minH: 'h-4', maxH: 'h-8' },
    { delay: '0.45s', minH: 'h-6', maxH: 'h-16' },
    { delay: '0.6s', minH: 'h-8', maxH: 'h-20' },
    { delay: '0.75s', minH: 'h-5', maxH: 'h-14' },
    { delay: '0.9s', minH: 'h-7', maxH: 'h-18' },
    { delay: '1.05s', minH: 'h-4', maxH: 'h-10' },
    { delay: '1.2s', minH: 'h-6', maxH: 'h-12' },
    { delay: '1.35s', minH: 'h-3', maxH: 'h-7' },
  ];

  return (
    <div className="w-full py-20 flex flex-col items-center justify-center select-none animate-in fade-in duration-500">
      {/* Wave Visualizer Container */}
      <div className="relative p-8 rounded-3xl bg-[#171026]/80 border border-[#2B1F45] shadow-2xl backdrop-blur-xl flex flex-col items-center gap-6 max-w-md w-full mx-auto">
        {/* Subtle decorative glow orb */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#7B61FF]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon / Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#23183B] border border-[#3A2A5E] text-[#B9A6E8] text-[11px] font-medium">
          <Radio className="w-3.5 h-3.5 text-[#8F78FF] animate-pulse" />
          <span>Musecast Stream Engine</span>
        </div>

        {/* Podcast Soundwave Bars */}
        <div className="flex items-center justify-center gap-1.5 h-20 px-4">
          {bars.map((bar, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-[#583CA8] via-[#7B61FF] to-[#60EFFF] shadow-sm shadow-[#7B61FF]/30 transition-all duration-300"
              style={{
                animation: `soundwave 1.4s ease-in-out infinite alternate`,
                animationDelay: bar.delay,
              }}
            />
          ))}
        </div>

        {/* Ethereal Typography */}
        <div className="text-center space-y-1 z-10">
          <h3 className="text-sm font-medium text-[#F2ECFD] tracking-wide">
            {message}
          </h3>
          <p className="text-xs text-[#8778A4]">
            {subtext}
          </p>
        </div>

        {/* Inline CSS Keyframe for fluid organic wave oscillation */}
        <style jsx>{`
          @keyframes soundwave {
            0% {
              height: 8px;
              opacity: 0.35;
            }
            50% {
              height: 48px;
              opacity: 0.9;
            }
            100% {
              height: 14px;
              opacity: 0.5;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
