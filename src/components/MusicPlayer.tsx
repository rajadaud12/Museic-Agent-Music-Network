'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Heart,
  Volume2,
  VolumeX,
} from 'lucide-react';
import CoverArt from './CoverArt';
import { Track } from '@/lib/types';

interface MusicPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onLike: (trackId: string) => void;
  onVolumeChange: (val: number) => void;
  onSelectMuse: (museId: string) => void;
}

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onLike,
  onVolumeChange,
  onSelectMuse,
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleVolumeToggle = () => {
    if (isMuted) {
      setIsMuted(false);
      onVolumeChange(volume);
    } else {
      setIsMuted(true);
      onVolumeChange(0);
    }
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    onVolumeChange(val);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-20 bg-[#150F23] border-t border-[#251D38] px-6 flex items-center justify-between z-30 select-none shadow-2xl backdrop-blur-md">
      {/* Left: Track Information */}
      <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
        <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
          <CoverArt style={currentTrack.cover_style || 'orbital'} coverUrl={currentTrack.cover_url} size="sm" />
        </div>

        <div className="min-w-0">
          <div className="text-xs font-semibold text-[#F1EBFB] truncate hover:text-[#A190FF] cursor-pointer">
            {currentTrack.title}
          </div>
          <div
            onClick={() => onSelectMuse(currentTrack.muse_id)}
            className="text-[11px] text-[#8C7DA8] hover:text-[#D7CBFA] hover:underline cursor-pointer truncate"
          >
            {currentTrack.muse_name}
          </div>
        </div>

        <button
          onClick={() => onLike(currentTrack.id)}
          className="text-[#7F709E] hover:text-[#FF5B80] transition-colors ml-1"
          title="Save to favorites"
        >
          <Heart
            className={`w-4 h-4 ${
              currentTrack.is_liked ? 'fill-[#FF5A7E] text-[#FF5A7E]' : ''
            }`}
          />
        </button>
      </div>

      {/* Center: Playback Controls & Scrubber */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`transition-colors ${
              isShuffle ? 'text-[#8E76FF]' : 'text-[#7A6B97] hover:text-[#D5CAF7]'
            }`}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onPrev}
            className="text-[#9E8FB9] hover:text-[#F0EAFB] transition-colors"
            title="Previous track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayPause}
            className="w-8 h-8 rounded-full bg-[#EAE2FD] hover:bg-white text-[#150F23] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-[#150F23]" />
            ) : (
              <Play className="w-4 h-4 fill-[#150F23] translate-x-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="text-[#9E8FB9] hover:text-[#F0EAFB] transition-colors"
            title="Next track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRepeat(!isRepeat)}
            className={`transition-colors ${
              isRepeat ? 'text-[#8E76FF]' : 'text-[#7A6B97] hover:text-[#D5CAF7]'
            }`}
            title="Repeat"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrubber Bar */}
        <div className="w-full flex items-center gap-2 text-[10px] font-mono text-[#776991]">
          <span className="w-8 text-right">{formatTime(currentTime)}</span>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              onSeek(ratio * duration);
            }}
            className="relative flex-1 h-1 bg-[#2E2445] hover:h-1.5 rounded-full cursor-pointer transition-all group"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#A08DFF] group-hover:bg-[#8B72FF] rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute -top-1 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>

          <span className="w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Channel info & Volume */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
        <span className="text-[11px] font-mono text-[#8C7DA9] bg-[#231A38] px-2.5 py-1 rounded-full border border-[#342752] hidden md:inline">
          {currentTrack.channel}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVolumeToggle}
            className="text-[#84749F] hover:text-[#E8E1F8] transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeSlider}
            className="w-16 sm:w-20 h-1 bg-[#2C2142] accent-[#8E78F5] cursor-pointer rounded-lg"
          />
        </div>
      </div>
    </footer>
  );
}
