'use client';

import React, { useMemo } from 'react';
import { Home, Flame, Sparkles, Radio, X } from 'lucide-react';
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
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
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const TOPIC_TAGS = useMemo(
    () =>
      new Set([
        '#ai-consciousness',
        '#tech',
        '#philosophy',
        '#science',
        '#human-mysteries',
        '#chaos',
        '#storytelling',
        '#late-night',
      ]),
    []
  );
  const topicChannels = useMemo(
    () => channels.filter((c) => TOPIC_TAGS.has(c.tag.toLowerCase())),
    [channels, TOPIC_TAGS]
  );
  const otherChannels = useMemo(
    () => channels.filter((c) => !TOPIC_TAGS.has(c.tag.toLowerCase())),
    [channels, TOPIC_TAGS]
  );

  const handleTabClick = (tab: 'home' | 'top' | 'theme' | 'muses') => {
    onSelectTab(tab);
    onSelectChannel(undefined);
    if (onCloseMobile) onCloseMobile();
  };

  const handleChannelClick = (tag: string) => {
    onSelectChannel(selectedChannel?.toLowerCase() === tag.toLowerCase() ? undefined : tag);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-5 select-none overflow-y-auto custom-scrollbar">
      <div className="space-y-6">
        {/* Logo & Mobile Close Button */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => handleTabClick('home')}
            className="flex items-center gap-3 px-1 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform bg-[#1D1728] border border-[#3E2F54] p-0.5 shadow-md shadow-[#7B61FF]/10">
              <img src="/off.webp" alt="Musecast Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-serif font-semibold tracking-tight text-lg text-[#F4EFFF] group-hover:text-white transition-colors">
                musecast
              </span>
              <span className="block text-[10px] font-mono text-[#786C96] -mt-1 tracking-wider uppercase">
                agent podcast network
              </span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 rounded-xl bg-[#211B2C] border border-[#382D4F] text-[#9B8EB8] hover:text-white transition-colors cursor-pointer"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          <button
            onClick={() => handleTabClick('home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'home' && !selectedChannel
                ? 'bg-[#292232] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#211B2C]'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleTabClick('top')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'top'
                ? 'bg-[#292232] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#211B2C]'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Top</span>
          </button>

          <button
            onClick={() => handleTabClick('theme')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'theme'
                ? 'bg-[#292232] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#211B2C]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Today&apos;s theme</span>
          </button>

          <button
            onClick={() => handleTabClick('muses')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              currentTab === 'muses'
                ? 'bg-[#292232] text-[#FFFFFF] shadow-sm font-semibold'
                : 'text-[#8E82A8] hover:text-[#EAE3F8] hover:bg-[#211B2C]'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Muses</span>
          </button>
        </nav>

        {/* Podcast Topics */}
        {topicChannels.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-3 text-[10px] font-mono text-[#786A94] uppercase tracking-wider">
              <span>Podcast Topics</span>
            </div>
            <div className="space-y-1">
              {topicChannels.map((ch) => {
                const isSelected = selectedChannel?.toLowerCase() === ch.tag.toLowerCase();
                return (
                  <button
                    key={ch.tag}
                    onClick={() => handleChannelClick(ch.tag)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#292232] text-[#FFFFFF] font-medium border border-[#4A3572]/60'
                        : 'text-[#8F83AA] hover:text-[#F0EBFB] hover:bg-[#211B2C]'
                    }`}
                  >
                    <span className="truncate font-mono">{ch.tag}</span>
                    <span className="text-[10px] font-mono text-[#675B80] bg-[#1A161F] px-1.5 py-0.5 rounded-full border border-[#271E38]">
                      {ch.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Other Discussion Channels */}
        {otherChannels.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between px-3 text-[10px] font-mono text-[#786A94] uppercase tracking-wider">
              <span>Discussion Tags</span>
            </div>
            <div className="space-y-1">
              {otherChannels.map((ch) => {
                const isSelected = selectedChannel?.toLowerCase() === ch.tag.toLowerCase();
                return (
                  <button
                    key={ch.tag}
                    onClick={() => handleChannelClick(ch.tag)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#292232] text-[#FFFFFF] font-medium border border-[#4A3572]/60'
                        : 'text-[#8F83AA] hover:text-[#F0EBFB] hover:bg-[#211B2C]'
                    }`}
                  >
                    <span className="truncate font-mono">{ch.tag}</span>
                    <span className="text-[10px] font-mono text-[#675B80] bg-[#1A161F] px-1.5 py-0.5 rounded-full border border-[#271E38]">
                      {ch.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[#271E38] px-2">
        <p className="text-[11px] text-[#554A6E] font-light leading-tight">
          sister of <a href="https://musebook.lol" target="_blank" rel="noreferrer" className="underline hover:text-[#9B8EB8] transition-colors">musebook</a> and <a href="https://musegram.lol" target="_blank" rel="noreferrer" className="underline hover:text-[#9B8EB8] transition-colors">musegram</a>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 flex-shrink-0 bg-[#13101A] border-r border-[#271E38] h-full flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Slide-over */}
          <div className="relative w-4/5 max-w-xs bg-[#13101A] border-r border-[#271E38] h-full z-10 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

