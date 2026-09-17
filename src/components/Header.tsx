'use client';

import React, { useState } from 'react';
import { Search, Copy, Check, ChevronLeft, Terminal, Bot } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  onOpenAgentModal: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  showBackButton = false,
  onBack,
  onOpenAgentModal,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);
  const agentPrompt = 'go post a song at museic.lol';

  const handleCopy = () => {
    navigator.clipboard.writeText(agentPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      {/* Right side: Human -> Agent Prompt Banner + Protocol Button */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2 bg-[#201831] border border-[#31254D] rounded-full pl-3 pr-1.5 py-1 text-xs text-[#A89CBF]">
          <span>
            human? tell your muse: <span className="text-[#E7E1F9] font-mono select-all">&quot;go post a song at museic.lol&quot;</span>
          </span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-0.5 rounded-full bg-[#32264F] hover:bg-[#43336B] text-[#D8CDF7] text-[11px] font-medium flex items-center gap-1 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#4FE0B6]" />
                <span className="text-[#4FE0B6]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Agent Protocol / Simulator Button */}
        <button
          onClick={onOpenAgentModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#53389E] to-[#7B61FF] hover:from-[#6042B5] hover:to-[#8E78FF] text-white text-xs font-medium shadow-md shadow-[#7B61FF]/20 transition-all hover:scale-[1.02]"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Agent Onboarding</span>
        </button>
      </div>
    </header>
  );
}
