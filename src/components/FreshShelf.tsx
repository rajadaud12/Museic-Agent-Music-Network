'use client';

import React from 'react';
import { Play, Pause, Heart } from 'lucide-react';
import CoverArt from './CoverArt';
import { Track } from '@/lib/types';

interface FreshShelfProps {
  tracks: Track[];
  currentTrackId?: string | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onSelectMuse: (museId: string) => void;
  onLikeTrack: (trackId: string) => void;
}

export default function FreshShelf({
  tracks,
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onSelectMuse,
  onLikeTrack,
}: FreshShelfProps) {
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#F0EBFB] tracking-tight">
          Fresh
        </h2>
        <button className="text-xs text-[#8B7CA8] hover:text-[#D5CAF3] transition-colors">
          See all
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {tracks.slice(0, 5).map((track) => {
          const isThisPlaying = currentTrackId === track.id && isPlaying;

          return (
            <div
              key={track.id}
              className="group rounded-xl p-2.5 bg-[#1B142B]/60 hover:bg-[#251D3A] border border-[#2B2144]/40 hover:border-[#423466] transition-all flex flex-col justify-between"
            >
              {/* Artwork with play overlay */}
              <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2.5 shadow-md">
                <CoverArt style={track.cover_style || 'orbital'} coverUrl={track.cover_url} size="md" />

                <button
                  onClick={() => onPlayTrack(track)}
                  className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center transition-opacity ${
                    isThisPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#7B61FF] text-white flex items-center justify-center shadow-lg shadow-[#7B61FF]/40 transform group-hover:scale-110 transition-transform">
                    {isThisPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white translate-x-0.5" />
                    )}
                  </div>
                </button>
              </div>

              {/* Title & Info */}
              <div className="space-y-1">
                <div
                  onClick={() => onPlayTrack(track)}
                  className="font-medium text-xs text-[#EAE4F8] hover:text-[#9B88FD] cursor-pointer truncate"
                  title={track.title}
                >
                  {track.title}
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8678A3]">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMuse(track.muse_id);
                    }}
                    className="hover:text-[#D4C8F8] hover:underline cursor-pointer truncate max-w-[70%]"
                  >
                    {track.muse_name}
                  </span>
                  <span className="font-mono text-[10px] opacity-80">
                    {formatTime(track.duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#271E3C] text-[10px] font-mono mt-1">
                  <span className="flex items-center gap-1 text-[#C084FC]" title="Likes from peer AI Muses via API">
                    <span>💜</span>
                    <span>{track.muse_likes_count || 0}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLikeTrack(track.id);
                    }}
                    className={`flex items-center gap-1 transition-colors ${
                      track.is_liked ? 'text-[#FCA5A5]' : 'text-[#7D6E99] hover:text-[#FF6685]'
                    }`}
                    title="Like as human listener"
                  >
                    <Heart className={`w-3 h-3 ${track.is_liked ? 'fill-[#EF4444] text-[#EF4444]' : ''}`} />
                    <span>{track.human_likes_count || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
