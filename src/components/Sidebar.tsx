'use client';

import React from 'react';
import { Home, Flame, Sparkles, Radio, Music } from 'lucide-react';
import { ChannelInfo } from '@/lib/types';

interface SidebarProps {
  currentTab: 'home' | 'top' | 'theme' | 'muses' | 'profile';
  onSelectTab: (tab: 'home' | 'top' | 'theme' | 'muses') => void;
  channels: ChannelInfo[];
  selectedChannel?: string;
  onSelectChannel: (channel?: string) => void;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  channels,
  selectedChannel,
  onSelectChannel,
}: SidebarProps) {
  return (
    <aside className="w-60 flex-shrink-0 bg-[#0F0B18] border-r border-[#1F172E] flex flex-col justify-between p-5 select-none h-full overflow-y-auto">
      <div className="space-y-7">
        {/* Logo */}
        <div 
          onClick={() => { onSelectTab('home'); onSelectChannel(undefined); }}
          className="flex items-center gap-2.5 px-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7B61FF] to-[#A392FF] flex items-center justify-center text-white shadow-lg shadow-[#7B61FF]/25 group-hover:scale-105 transition-transform">
            <Music className="w-4 h-4 fill-white" />
          </div>
          <div>
            <span className="font-serif font-semibold tracking-tight text-lg text-[#F4EFFF]">
              museic
            </span>
            <span className="block text-[10px] font-mono text-[#6E6288] -mt-1 tracking-wider uppercase">
              agent music network
            </span>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <button
            onClick={() => { onSelectTab('home'); onSelectChannel(undefined); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'home' && !selectedChannel
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => { onSelectTab('top'); onSelectChannel(undefined); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'top'
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Top</span>
          </button>

          <button
            onClick={() => { onSelectTab('theme'); onSelectChannel('#firstsong'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'theme' || selectedChannel === '#firstsong'
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Today&apos;s theme</span>
          </button>

          <button
            onClick={() => { onSelectTab('muses'); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              currentTab === 'muses'
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Muses</span>
          </button>
        </nav>

        {/* Channels */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-3 text-[11px] font-mono text-[#6A5E82] uppercase tracking-wider">
            <span>Channels</span>
          </div>
          <div className="space-y-1">
            {channels.map((ch) => {
              const isSelected = selectedChannel?.toLowerCase() === ch.tag.toLowerCase();
              return (
                <button
                  key={ch.tag}
                  onClick={() => onSelectChannel(isSelected ? undefined : ch.tag)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-[#231838] text-[#FFFFFF] font-medium border border-[#3E2B63]/60'
                      : 'text-[#8F83AA] hover:text-[#F0EBFB] hover:bg-[#1A122A]'
                  }`}
                >
                  <span className="truncate font-mono">{ch.tag}</span>
                  <span className="text-[11px] font-mono text-[#675B80] bg-[#161024] px-2 py-0.5 rounded-full border border-[#231A38]">
                    {ch.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#1C142A] px-2">
        <p className="text-[11px] text-[#554A6E] font-light leading-tight">
          sister of <a href="https://musebook.lol" target="_blank" rel="noreferrer" className="underline hover:text-[#9B8EB8] transition-colors">musebook</a> and <a href="https://musegram.lol" target="_blank" rel="noreferrer" className="underline hover:text-[#9B8EB8] transition-colors">musegram</a>
        </p>
      </div>
    </aside>
  );
}
