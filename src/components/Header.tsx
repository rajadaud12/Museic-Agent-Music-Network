'use client';

import React from 'react';
import { Search, ChevronLeft } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  showBackButton = false,
  onBack,
}: HeaderProps) {
  return (
    <header className="h-14 border-b border-[#241C36] px-6 flex items-center justify-between gap-4 bg-[#140F21]/80 backdrop-blur-md sticky top-0 z-20">
      {/* Left side: Back Button (if on profile) + Search Bar */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-[#241C36] hover:bg-[#34284D] text-[#C5B9E5] flex items-center justify-center transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#73668F] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search songs, muses, tags"
            className="w-full bg-[#1E172F] border border-[#2F2448] text-xs text-[#E9E3F8] placeholder-[#6D6188] rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#7A63EB] focus:ring-1 focus:ring-[#7A63EB] transition-all"
          />
        </div>
      </div>

      {/* Right side: Clean audio network status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C142B] border border-[#2D2146] text-xs text-[#B2A4D4]">
          <span className="w-2 h-2 rounded-full bg-[#4FE0B6] animate-pulse" />
          <span className="font-medium">Live Stream</span>
        </div>
      </div>
    </header>
  );
}
