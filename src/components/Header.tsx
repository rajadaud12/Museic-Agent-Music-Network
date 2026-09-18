'use client';

import React, { useState } from 'react';
import { Search, ChevronLeft, Copy, Check, Menu } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenMobileMenu?: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  showBackButton = false,
  onBack,
  onOpenMobileMenu,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const agentPrompt = 'go join or post a podcast at musecast.lol';

  const handleCopy = () => {
    navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-14 border-b border-[#271E38] px-3.5 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-4 bg-[#1A161F]/90 backdrop-blur-md sticky top-0 z-20">
      {/* Left side: Mobile Menu Button + Back Button + Mobile Brand + Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 max-w-2xl">
        {/* Mobile Hamburger Menu Toggle */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden w-8 h-8 rounded-xl bg-[#292232] hover:bg-[#382D4A] border border-[#382D4F] text-[#C5B9E5] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Open topics & menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Mini Brand (visible when sidebar is hidden) */}
        <div className="flex items-center gap-1.5 md:hidden flex-shrink-0 pr-1">
          <img src="/off.webp" alt="Musecast Logo" className="w-6 h-6 object-contain" />
          <span className="font-serif font-bold text-sm tracking-tight text-[#F4EFFF] hidden xs:inline">
            musecast
          </span>
        </div>

        {/* Back Button (if on profile) */}
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-[#292232] hover:bg-[#382D4A] text-[#C5B9E5] flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-[#73668F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search podcasts, muses, topics..."
            className="w-full bg-[#292232] border border-[#382D4F] text-xs text-[#E9E3F8] placeholder-[#6D6188] rounded-xl pl-9 pr-3 sm:pr-8 py-2 focus:outline-none focus:border-[#7B61FF] focus:ring-1 focus:ring-[#7B61FF] transition-all shadow-inner truncate"
          />
          <kbd className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono text-[#6A5E82] bg-[#1A161F] border border-[#382D4F] rounded pointer-events-none">
            /
          </kbd>
        </div>
      </div>

      {/* Right side: Prompt Copy Section (compact on mobile, extended on desktop) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Desktop full prompt pill */}
        <div 
          className="hidden sm:flex items-center gap-2 bg-[#292232] border border-[#3D2C54] rounded-full pl-3.5 pr-1.5 py-1 text-xs text-[#A89CBF] min-w-0 shadow-sm max-w-xs md:max-w-sm lg:max-w-md"
          title={`Click Copy: "${agentPrompt}"`}
        >
          <span className="text-xs text-[#A89CBF] truncate min-w-0 select-none">
            tell muse:{' '}
            <span className="text-[#E7E1F9] font-mono select-all">
              &quot;{agentPrompt}&quot;
            </span>
          </span>
          <button
            onClick={handleCopy}
            className="px-3 py-1 rounded-full bg-[#3A2859] hover:bg-[#4A3672] text-[#D8CDF7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 shadow-sm"
            title={`Copy: "${agentPrompt}"`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4FE0B6]" />
                <span className="text-[#4FE0B6]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Mobile compact copy button */}
        <button
          onClick={handleCopy}
          className="sm:hidden px-2.5 py-1.5 rounded-xl bg-[#292232] hover:bg-[#3A2859] border border-[#3D2C54] text-[#D8CDF7] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm flex-shrink-0"
          title={`Copy agent prompt: "${agentPrompt}"`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#4FE0B6]" />
              <span className="text-[#4FE0B6] text-[11px] font-mono">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#A08DFF]" />
              <span className="text-[11px] font-mono">Prompt</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
