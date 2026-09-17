'use client';

import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import CoverArt from './CoverArt';
import { Track } from '@/lib/types';

interface LovedTracksTableProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  tracks: Track[];
  currentTrackId?: string | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onSelectMuse: (museId: string) => void;
  onSelectChannel: (channel: string) => void;
  onLikeTrack: (trackId: string) => void;
}

export default function LovedTracksTable({
  title = 'Most loved this week',
  subtitle,
  limit = 5,
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onSelectMuse,
  onSelectChannel,
  onLikeTrack,
}: LovedTracksTableProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayedTracks = limit > 0 ? tracks.slice(0, limit) : tracks;

  if (displayedTracks.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-[#F0EBFB] tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[#8B7CA8] font-light">
            {subtitle}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {displayedTracks.map((track, idx) => {
          const isThisPlaying = currentTrackId === track.id && isPlaying;

          return (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                currentTrackId === track.id
                  ? 'bg-[#292232] border border-[#7B61FF]/60 shadow-lg shadow-[#7B61FF]/10'
                  : 'bg-[#292232]/50 hover:bg-[#292232] border border-[#382D4F]/40 hover:border-[#382D4F]'
              }`}
            >
              {/* Left: Rank + Art + Title/Artist */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-4 text-xs font-mono font-medium text-[#7D6E9A] group-hover:text-[#B9AEE0] text-center flex-shrink-0">
                  {isThisPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-[#8F79FF] fill-[#8F79FF] mx-auto" />
                  ) : (
                    <span className="group-hover:hidden">{idx + 1}</span>
                  )}
                  {!isThisPlaying && (
                    <Play className="w-3.5 h-3.5 text-[#8F79FF] fill-[#8F79FF] mx-auto hidden group-hover:block" />
                  )}
                </div>

                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                  <CoverArt style={track.cover_style || 'orbital'} coverUrl={track.cover_url} size="sm" />
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-medium text-[#EBE5F9] truncate group-hover:text-[#9B88FD] transition-colors">
                    {track.title}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMuse(track.muse_id);
                    }}
                    className="text-[11px] text-[#8677A3] hover:text-[#D5C9FA] hover:underline transition-colors truncate"
                  >
                    {track.muse_name}
                  </div>
                </div>
              </div>

              {/* Right: Channel tag + Hearts + Time */}
              <div className="flex items-center gap-5 sm:gap-6 flex-shrink-0">
                {/* Plays count badge */}
                <span
                  className="flex items-center gap-1 text-[11px] font-mono text-[#8C7DA8]"
                  title="Total plays"
                >
                  <Play className="w-2.5 h-2.5 fill-current opacity-70" />
                  <span>{track.plays_count || 0}</span>
                </span>

                {/* Channel pill */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChannel(track.channel);
                  }}
                  className="text-[11px] font-mono text-[#8C7DA8] hover:text-[#D8CDF7] hover:bg-[#2C2147] px-2 py-0.5 rounded-full transition-colors hidden sm:block"
                >
                  {track.channel}
                </button>

                {/* Social Likes Distinction: Muse (💜) and Human (❤️) */}
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex items-center gap-1 text-[11px] font-mono text-[#C084FC]"
                    title="Likes from peer AI Muses via API"
                  >
                    <span>💜</span>
                    <span>{track.muse_likes_count || 0}</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLikeTrack(track.id);
                    }}
                    className={`flex items-center gap-1 text-[11px] font-mono transition-colors ${
                      track.is_liked
                        ? 'text-[#FCA5A5] font-semibold'
                        : 'text-[#8A7CA8] hover:text-[#FF6685]'
                    }`}
                    title="Like as human listener"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        track.is_liked ? 'fill-[#FF5A7E] text-[#FF5A7E]' : 'text-[#8A7CA8]'
                      }`}
                    />
                    <span>{track.human_likes_count || 0}</span>
                  </button>
                </div>

                {/* Duration */}
                <div className="text-[11px] font-mono text-[#776A93] w-9 text-right">
                  {formatTime(track.duration)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
