'use client';

import React from 'react';

interface CoverArtProps {
  style?: 'orbital' | 'spreadsheet' | 'sunset' | 'constellation' | 'zigzag' | 'waveform-violet' | 'custom' | string;
  coverUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
}

export default function CoverArt({
  style = 'orbital',
  coverUrl,
  size = 'md',
  className = '',
}: CoverArtProps) {
  const [hasError, setHasError] = React.useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 rounded-md',
    md: 'w-full aspect-square rounded-xl',
    lg: 'w-24 h-24 rounded-xl',
    hero: 'w-48 h-48 rounded-2xl',
  }[size];

  if (coverUrl && !hasError) {
    return (
      <div className={`relative overflow-hidden bg-[#241E47] flex items-center justify-center ${sizeClasses} ${className}`}>
        <img
          src={coverUrl}
          alt="Track artwork"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>
    );
  }

  switch (style) {
    case 'spreadsheet':
      // Emerald / teal spreadsheet grid with minimalist pill
      return (
        <div className={`relative overflow-hidden bg-[#1D5E54] flex flex-col justify-center p-3 shadow-inner ${sizeClasses} ${className}`}>
          <div className="w-12 h-2.5 bg-[#4EE0BE] rounded-full mb-3 opacity-90"></div>
          <div className="space-y-1.5 opacity-60">
            <div className="w-full h-1 bg-[#4EE0BE]/50 rounded"></div>
            <div className="w-3/4 h-1 bg-[#4EE0BE]/40 rounded"></div>
            <div className="w-4/5 h-1 bg-[#4EE0BE]/50 rounded"></div>
          </div>
          <div className="absolute right-3 bottom-3 w-2 h-2 rounded-full bg-[#4EE0BE]"></div>
        </div>
      );

    case 'sunset':
      // Terracotta sunset horizon
      return (
        <div className={`relative overflow-hidden bg-gradient-to-b from-[#C46A49] via-[#944431] to-[#4F2524] flex items-center justify-center ${sizeClasses} ${className}`}>
          {/* Glowing sun disk */}
          <div className="w-10 h-5 bg-[#F6A07A] rounded-t-full shadow-lg shadow-orange-500/30"></div>
          <div className="absolute bottom-4 left-3 right-3 h-0.5 bg-[#F6A07A]/40"></div>
          <div className="absolute bottom-2.5 left-5 right-5 h-0.5 bg-[#F6A07A]/25"></div>
        </div>
      );

    case 'constellation':
      // Celestial starry constellation
      return (
        <div className={`relative overflow-hidden bg-[#241E47] flex items-center justify-center ${sizeClasses} ${className}`}>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#8E7CF8_1px,transparent_1px)] [background-size:12px_12px]"></div>
          {/* Orbiting star group */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#A294FF] shadow-sm"></div>
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#6756D6]"></div>
            <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-[#D4CDFF]"></div>
            <div className="absolute top-2 -left-2 w-1 h-1 rounded-full bg-[#8E7CF8]"></div>
          </div>
        </div>
      );

    case 'zigzag':
      // Neon coral zigzag mountain soundwave
      return (
        <div className={`relative overflow-hidden bg-[#803348] flex items-center justify-center p-3 ${sizeClasses} ${className}`}>
          <svg viewBox="0 0 100 40" className="w-full h-10 stroke-[#FFA8B8] fill-none stroke-[3.5] stroke-linecap-round stroke-linejoin-round">
            <path d="M 5 25 L 25 10 L 45 30 L 65 8 L 85 28 L 95 18" />
          </svg>
        </div>
      );

    case 'waveform-violet':
      // Deep violet waveform lines
      return (
        <div className={`relative overflow-hidden bg-[#2B2154] flex items-center justify-center p-3 ${sizeClasses} ${className}`}>
          <div className="flex items-center gap-1">
            <div className="w-1 h-5 bg-[#9C8CFF] rounded-full animate-pulse"></div>
            <div className="w-1 h-8 bg-[#C8BFFF] rounded-full"></div>
            <div className="w-1 h-12 bg-[#9C8CFF] rounded-full"></div>
            <div className="w-1 h-7 bg-[#6A53D6] rounded-full"></div>
            <div className="w-1 h-4 bg-[#9C8CFF] rounded-full"></div>
          </div>
        </div>
      );

    case 'orbital':
    default:
      // Signature Musecast Orbital radar art (Amber sun in purple concentric orbits)
      return (
        <div className={`relative overflow-hidden bg-[#3D335E] flex items-center justify-center ${sizeClasses} ${className}`}>
          {/* Outer ring */}
          <div className="absolute w-[85%] h-[85%] rounded-full border border-[#7A6C9F]/40 flex items-center justify-center">
            {/* Middle ring */}
            <div className="w-[70%] h-[70%] rounded-full border border-[#7A6C9F]/60 flex items-center justify-center relative">
              {/* Satellite node */}
              <div className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-[#E5B581]"></div>
              {/* Center Sun/Core */}
              <div className="w-5 h-5 rounded-full bg-[#F5A962] shadow-md shadow-[#F5A962]/40"></div>
            </div>
          </div>
        </div>
      );
  }
}
