'use client';

import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  ChevronUp,
} from 'lucide-react';
import CoverArt from './CoverArt';
import { Track } from '@/lib/types';
import { getActiveSpeaker } from '@/lib/audio/speakerTracking';

interface MusicPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onSkip?: (seconds: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onLike: (trackId: string) => void;
  onVolumeChange: (val: number) => void;
  onSelectMuse: (museId: string) => void;
  onOpenStage?: () => void;
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function MusicPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  playbackRate = 1.0,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSkip,
  onPlaybackRateChange,
  onLike,
  onVolumeChange,
  onSelectMuse,
  onOpenStage,
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(playbackRate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [optimisticSeek, setOptimisticSeek] = useState<number | null>(null);
  const scrubberRef = React.useRef<HTMLDivElement>(null);

  // Clear optimistic seek when parent's currentTime converges within 1.5s
  React.useEffect(() => {
    if (optimisticSeek !== null && Math.abs(currentTime - optimisticSeek) <= 1.5) {
      setOptimisticSeek(null);
    }
  }, [currentTime, optimisticSeek]);

  // Safety timer to clear optimistic seek after 700ms
  React.useEffect(() => {
    if (optimisticSeek !== null) {
      const timer = setTimeout(() => {
        setOptimisticSeek(null);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [optimisticSeek]);

  if (!currentTrack) return null;

  const effectiveDuration = duration > 0 ? duration : (currentTrack.duration || 180);
  const displayTime = isDragging && dragTime !== null 
    ? dragTime 
    : (optimisticSeek !== null ? optimisticSeek : currentTime);

  const activeSpeaker = getActiveSpeaker(currentTrack, displayTime, effectiveDuration);

  const progressPercent = effectiveDuration > 0
    ? Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100))
    : 0;

  const formatTime = (secs: number) => {
    const sClamped = Math.max(0, Math.floor(secs || 0));
    const m = Math.floor(sClamped / 60);
    const s = Math.floor(sClamped % 60);
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

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(currentSpeed);
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length];
    setCurrentSpeed(nextSpeed);
    if (onPlaybackRateChange) {
      onPlaybackRateChange(nextSpeed);
    }
  };

  const calculateTimeFromX = (clientX: number) => {
    if (!scrubberRef.current || effectiveDuration <= 0) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    return ratio * effectiveDuration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(true);
    const newTime = calculateTimeFromX(e.clientX);
    setDragTime(newTime);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newTime = calculateTimeFromX(e.clientX);
    setDragTime(newTime);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      const finalTime = dragTime !== null ? dragTime : calculateTimeFromX(e.clientX);
      setOptimisticSeek(finalTime);
      setIsDragging(false);
      setDragTime(null);
      onSeek(finalTime);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    if (isDragging && dragTime !== null) {
      setOptimisticSeek(dragTime);
      onSeek(dragTime);
    }
    setIsDragging(false);
    setDragTime(null);
  };

  return (
    <footer className="h-16 sm:h-20 bg-[#171220] border-t border-[#2B203E] px-3 sm:px-6 flex items-center justify-between fixed bottom-0 left-0 right-0 z-30 shadow-2xl backdrop-blur-md">
      {/* Mobile-only slim top scrubber line */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="sm:hidden absolute top-0 left-0 right-0 h-1 bg-[#2E2445] cursor-pointer group"
      >
        <div
          className="h-full bg-[#A08DFF] transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Left: Episode Information */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-1 sm:flex-initial sm:w-1/4 sm:min-w-[190px] min-w-0 pr-2">
        <div
          onClick={onOpenStage}
          className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden flex-shrink-0 shadow-md cursor-pointer hover:opacity-85 transition-opacity"
          title="Open podcast stage"
        >
          <CoverArt style={currentTrack.cover_style || 'orbital'} coverUrl={currentTrack.cover_url} size="sm" />
        </div>

        <div className="min-w-0 flex-1">
          <div
            onClick={onOpenStage}
            className="text-xs font-semibold text-[#F1EBFB] truncate hover:text-[#A190FF] cursor-pointer"
            title="Open podcast stage"
          >
            {currentTrack.title}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#8C7DA8]">
            <span
              onClick={() => onSelectMuse(currentTrack.muse_id)}
              className="hover:text-[#D7CBFA] hover:underline cursor-pointer truncate"
            >
              {currentTrack.muse_name}
            </span>
            {currentTrack.co_host_muse_name && (
              <>
                <span className="text-[9px] text-[#C084FC]">×</span>
                <span
                  onClick={() => currentTrack.co_host_muse_id && onSelectMuse(currentTrack.co_host_muse_id)}
                  className="text-[#5EEAD4] hover:text-[#99F6E4] hover:underline cursor-pointer truncate hidden xs:inline"
                >
                  {currentTrack.co_host_muse_name}
                </span>
              </>
            )}
            <span className="text-[10px] font-mono text-[#74668D] hidden sm:flex items-center gap-0.5 flex-shrink-0" title="Total listens">
              <Play className="w-2.5 h-2.5 fill-current opacity-70" />
              <span>{currentTrack.plays_count || 0}</span>
            </span>
          </div>

          {/* Minimalist Active Speaker Indicator */}
          {activeSpeaker && (
            <div className="hidden xs:flex items-center gap-1 mt-0.5 text-[10px] sm:text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSpeaker.isHost ? 'bg-[#C084FC]' : 'bg-[#2DD4BF]'} ${isPlaying ? 'animate-pulse' : ''}`} />
              <span className={`truncate max-w-[110px] sm:max-w-[130px] font-medium ${activeSpeaker.isHost ? 'text-[#D8B4FE]' : 'text-[#5EEAD4]'}`}>
                {activeSpeaker.speakerName}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
          <button
            onClick={() => onLike(currentTrack.id)}
            className="text-[#7F709E] hover:text-[#FF5B80] transition-colors cursor-pointer p-1"
            title="Save to favorites"
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                currentTrack.is_liked ? 'fill-[#FF5A7E] text-[#FF5A7E]' : ''
              }`}
            />
          </button>

          {onOpenStage && (
            <button
              onClick={onOpenStage}
              className="text-[#7F709E] hover:text-[#A291FF] transition-colors cursor-pointer p-1"
              title="Expand podcast stage"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Podcast Controls (-15s, Play/Pause, +15s) & Desktop Scrubber */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 sm:flex-1 sm:max-w-xl">
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Previous Episode (desktop only) */}
          <button
            onClick={onPrev}
            className="text-[#8474A0] hover:text-[#E9E2F8] transition-colors cursor-pointer hidden sm:block"
            title="Previous episode"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* 15s Rewind */}
          <button
            onClick={() => {
              const base = isDragging && dragTime !== null ? dragTime : (optimisticSeek !== null ? optimisticSeek : currentTime);
              const target = Math.max(0, base - 15);
              setOptimisticSeek(target);
              if (onSkip) {
                onSkip(-15);
              } else {
                onSeek(target);
              }
            }}
            className="relative text-[#A291FF] hover:text-white transition-colors cursor-pointer p-1"
            title="Rewind 15 seconds"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold text-[#C7BAFF]">
              15
            </span>
          </button>

          {/* Play / Pause Main Button */}
          <button
            onClick={onPlayPause}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EAE2FD] hover:bg-white text-[#150F23] flex items-center justify-center shadow-lg shadow-[#7B61FF]/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#150F23]" />
            ) : (
              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#150F23] translate-x-0.5" />
            )}
          </button>

          {/* 15s Forward */}
          <button
            onClick={() => {
              const base = isDragging && dragTime !== null ? dragTime : (optimisticSeek !== null ? optimisticSeek : currentTime);
              const target = Math.min(effectiveDuration, base + 15);
              setOptimisticSeek(target);
              if (onSkip) {
                onSkip(15);
              } else {
                onSeek(target);
              }
            }}
            className="relative text-[#A291FF] hover:text-white transition-colors cursor-pointer p-1"
            title="Forward 15 seconds"
          >
            <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-mono font-bold text-[#C7BAFF]">
              15
            </span>
          </button>

          {/* Next Episode (desktop only) */}
          <button
            onClick={onNext}
            className="text-[#8474A0] hover:text-[#E9E2F8] transition-colors cursor-pointer hidden sm:block"
            title="Next episode"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Desktop Scrubber Bar */}
        <div className="w-full hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#776991]">
          <span className="w-8 text-right tabular-nums">{formatTime(displayTime)}</span>

          <div
            ref={scrubberRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="relative flex-1 py-2 -my-2 flex items-center cursor-pointer group"
          >
            <div className="w-full h-1 group-hover:h-1.5 bg-[#2E2445] rounded-full relative transition-all">
              <div
                className="absolute left-0 top-0 bottom-0 bg-[#A08DFF] group-hover:bg-[#8B72FF] rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-all shadow-md ${
                  isDragging ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ left: `calc(${progressPercent}% - 6px)` }}
              />
            </div>
          </div>

          <span className="w-8 tabular-nums">{formatTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* Right: Playback Speed & Volume (hidden on mobile, visible on desktop) */}
      <div className="hidden sm:flex items-center justify-end gap-3 sm:w-1/4 sm:min-w-[140px]">
        {/* Playback Speed Selector (1x, 1.25x, 1.5x, 2x) */}
        <button
          onClick={handleCycleSpeed}
          className="px-2 py-0.5 rounded-lg bg-[#241B33] border border-[#3A2A55] text-[10px] font-mono font-semibold text-[#C4B6E8] hover:text-white hover:border-[#6C4BB5] transition-all cursor-pointer"
          title="Click to cycle podcast speed (1.0x, 1.25x, 1.5x, 2.0x)"
        >
          {currentSpeed.toFixed(currentSpeed === 1.0 || currentSpeed === 2.0 ? 1 : 2)}x
        </button>

        {/* Channel / Topic Tag */}
        <span className="text-[11px] font-mono text-[#8C7DA9] bg-[#292232] px-2.5 py-1 rounded-full border border-[#3D2C54] hidden lg:inline truncate max-w-[130px]">
          {currentTrack.channel}
        </span>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={handleVolumeToggle}
            className="text-[#84749F] hover:text-[#E8E1F8] transition-colors cursor-pointer"
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
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeSlider}
            className="w-18 h-1 bg-[#2C2145] rounded-lg appearance-none cursor-pointer accent-[#7B61FF]"
          />
        </div>
      </div>
    </footer>
  );
}
