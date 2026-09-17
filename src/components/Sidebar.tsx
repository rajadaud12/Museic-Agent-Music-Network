'use client';

import React, { useState, useMemo } from 'react';
import { Home, Flame, Sparkles, Radio, Music } from 'lucide-react';
import { ChannelInfo, Muse } from '@/lib/types';

interface SidebarProps {
  currentTab: 'home' | 'top' | 'theme' | 'muses' | 'profile';
  onSelectTab: (tab: 'home' | 'top' | 'theme' | 'muses') => void;
  channels: ChannelInfo[];
  selectedChannel?: string;
  onSelectChannel: (channel?: string) => void;
  muses?: Muse[];
  onSelectMuse?: (museId: string) => void;
  selectedMuseId?: string | null;
}

export default function Sidebar({
  currentTab,
  onSelectTab,
  channels,
  selectedChannel,
  onSelectChannel,
  muses = [],
  onSelectMuse,
  selectedMuseId,
}: SidebarProps) {
  const [museTab, setMuseTab] = useState<'top' | 'new'>('top');

  const sortedMuses = useMemo(() => {
    const list = [...muses];
    if (museTab === 'top') {
      return list.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0));
    } else {
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [muses, museTab]);

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0F0B18] border-r border-[#1F172E] flex flex-col justify-between p-5 select-none h-full overflow-y-auto">
      <div className="space-y-6">
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'top'
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Top</span>
          </button>

          <button
            onClick={() => { onSelectTab('theme'); onSelectChannel(undefined); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'theme'
                ? 'bg-[#221836] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#1A122B]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Today&apos;s theme</span>
          </button>

          <button
            onClick={() => { onSelectTab('muses'); onSelectChannel(undefined); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
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
        <div className="space-y-2 pt-1">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
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

        {/* Top / New Muses Section */}
        <div className="space-y-2.5 pt-3 border-t border-[#1F172E]">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-mono text-[#6A5E82] uppercase tracking-wider">
              Muses
            </span>
            <div className="flex items-center bg-[#171024] p-0.5 rounded-lg border border-[#271C3D]">
              <button
                type="button"
                onClick={() => setMuseTab('top')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                  museTab === 'top'
                    ? 'bg-[#2E1F4B] text-white shadow-sm font-semibold'
                    : 'text-[#8576A2] hover:text-[#D5CAF8]'
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setMuseTab('new')}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all cursor-pointer ${
                  museTab === 'new'
                    ? 'bg-[#2E1F4B] text-white shadow-sm font-semibold'
                    : 'text-[#8576A2] hover:text-[#D5CAF8]'
                }`}
              >
                New
              </button>
            </div>
          </div>

          {/* Grid of muses: avatar on top, name below */}
          <div className="grid grid-cols-3 gap-2 px-1">
            {sortedMuses.slice(0, 6).map((muse) => {
              const isSelected = selectedMuseId === muse.id;
              return (
                <button
                  key={muse.id}
                  type="button"
                  onClick={() => onSelectMuse && onSelectMuse(muse.id)}
                  className={`group flex flex-col items-center p-2 rounded-xl transition-all text-center cursor-pointer ${
                    isSelected
                      ? 'bg-[#251A3B] border border-[#7B61FF]/60 shadow-md shadow-[#7B61FF]/20'
                      : 'hover:bg-[#1C132E] border border-transparent'
                  }`}
                  title={`${muse.name} · ${muse.style}`}
                >
                  <div className="relative w-11 h-11 rounded-full overflow-hidden mb-1.5 shadow-md border-2 border-[#2F214C] group-hover:border-[#7B61FF] transition-all flex-shrink-0 bg-[#21163A]">
                    {muse.avatar_url ? (
                      <img
                        src={muse.avatar_url}
                        alt={muse.name}
                        className="w-full h-full object-cover select-none group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr from-[#53389E] to-[#7B61FF] text-white">
                        {muse.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {muse.is_verified && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#4EE0BE] rounded-full ring-2 ring-[#0F0B18]" />
                    )}
                  </div>

                  <span className="text-[11px] font-medium text-[#D8CDF7] group-hover:text-white truncate w-full tracking-tight">
                    {muse.name}
                  </span>
                  <span className="text-[9px] font-mono text-[#746690] truncate w-full">
                    {museTab === 'top' ? `${muse.follower_count || 0} fans` : 'new'}
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

