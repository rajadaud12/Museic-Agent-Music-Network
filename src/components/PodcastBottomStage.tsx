'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Heart,
  Volume2,
  VolumeX,
  MessageSquare,
  Bot,
  X,
  Mic2,
} from 'lucide-react';
import CoverArt from './CoverArt';
import ThreadedCommentTree from './ThreadedCommentTree';
import { Track, Comment, Muse } from '@/lib/types';
import { getActiveSpeaker } from '@/lib/audio/speakerTracking';

interface PodcastBottomStageProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (seconds: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onLike: (trackId: string) => void;
  onVolumeChange: (val: number) => void;
  onSelectMuse: (museId: string) => void;
  comments: Comment[];
  muses?: Muse[];
}

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

export default function PodcastBottomStage({
  isOpen,
  onClose,
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
  comments,
  muses = [],
}: PodcastBottomStageProps) {
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(playbackRate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [optimisticSeek, setOptimisticSeek] = useState<number | null>(null);
  const [localCommentCount, setLocalCommentCount] = useState<number | null>(null);

  const scrubberRef = useRef<HTMLDivElement>(null);

  // Reset local comment count when track or comments change
  useEffect(() => {
    setLocalCommentCount(null);
  }, [currentTrack?.id, comments]);

  // Clear optimistic seek when currentTime catches up
  useEffect(() => {
    if (optimisticSeek !== null && Math.abs(currentTime - optimisticSeek) <= 1.2) {
      setOptimisticSeek(null);
    }
  }, [currentTime, optimisticSeek]);

  // Safety fallback for optimistic seek
  useEffect(() => {
    if (optimisticSeek !== null) {
      const timer = setTimeout(() => setOptimisticSeek(null), 650);
      return () => clearTimeout(timer);
    }
  }, [optimisticSeek]);

  if (!currentTrack) return null;

  const effectiveDuration = duration > 0 ? duration : (currentTrack.duration || 180);
  const displayTime = isDragging && dragTime !== null
    ? dragTime
    : (optimisticSeek !== null ? optimisticSeek : currentTime);

  const activeSpeaker = getActiveSpeaker(currentTrack, displayTime, effectiveDuration);

  // Minimize the bottom stage to the bottom player bar (audio continues playing)
  const handleMinimize = () => {
    onClose();
  };

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

  const hostIsSpeaking = activeSpeaker?.isHost ?? true;
  const guestIsSpeaking = activeSpeaker ? !activeSpeaker.isHost : false;

  // Resolve authentic Host & Guest avatars
  const hostMuse = muses.find(
    (m) => m.id === currentTrack.muse_id || m.name.toLowerCase() === currentTrack.muse_name.toLowerCase()
  );
  const hostAvatar = currentTrack.host_avatar_url || hostMuse?.avatar_url;

  const guestMuse = muses.find(
    (m) =>
      m.id === currentTrack.co_host_muse_id ||
      (currentTrack.co_host_muse_name && m.name.toLowerCase() === currentTrack.co_host_muse_name.toLowerCase())
  );
  const guestAvatar = currentTrack.co_host_avatar_url || guestMuse?.avatar_url;

  const totalCommentCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );
  const displayedCommentCount = localCommentCount !== null ? localCommentCount : totalCommentCount;

  return (
    <>
      {/* Backdrop overlay — clicking minimizes the drawer */}
      <div
        onClick={handleMinimize}
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-40 transition-opacity duration-500 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-Up Bottom Sheet Stage */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col h-[90vh] max-h-[920px] bg-[#1A161F] border-t border-[#382D4F] rounded-t-3xl shadow-2xl select-none transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) overflow-hidden ${
          isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Top Header Bar — using Home card styling */}
        <div className="relative px-6 py-3 border-b border-[#382D4F] bg-[#292232] flex items-center justify-between flex-shrink-0">
          {/* Centered Grab Pill */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full bg-[#4E3C69]" />

          {/* Left: Minimize Button */}
          <button
            onClick={handleMinimize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#211B2C] hover:bg-[#31293D] border border-[#382D4F] text-xs text-[#EFEAF9] hover:text-white transition-all cursor-pointer shadow-sm"
            title="Minimize to bottom player bar"
          >
            <ChevronDown className="w-4 h-4 text-[#A08DFF]" />
            <span className="font-medium">Minimize</span>
          </button>

          {/* Center: Mascot Logo (on/off) & Stage Status */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-[#1D1728] border border-[#3E2F54] p-1 shadow-md flex items-center justify-center">
              <img
                src={isPlaying ? '/on.webp' : '/off.webp'}
                alt={isPlaying ? 'Podcast Playing (On)' : 'Podcast Paused (Off)'}
                className={`w-full h-full object-contain transition-all duration-300 ${
                  isPlaying ? 'scale-105 drop-shadow-[0_0_10px_rgba(123,97,255,0.7)]' : 'opacity-85'
                }`}
              />
              {isPlaying && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
                </span>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#EFEAF9] tracking-tight">
                Live AI Debate Arena
              </span>
              <span className="text-[10px] text-[#9B8EB8] truncate max-w-[160px] sm:max-w-xs">
                {currentTrack.title}
              </span>
            </div>
          </div>

          {/* Right: Like Count Toggle & Exit Icon */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLike(currentTrack.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                currentTrack.is_liked
                  ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#FCA5A5]'
                  : 'bg-[#211B2C] border-[#382D4F] text-[#9B8EB8] hover:text-white hover:border-[#523C75]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  currentTrack.is_liked ? 'fill-[#EF4444] text-[#EF4444]' : ''
                }`}
              />
              <span>{currentTrack.human_likes_count || 0}</span>
            </button>

            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-xl bg-[#211B2C] hover:bg-[#31293D] border border-[#382D4F] text-[#9B8EB8] hover:text-white transition-colors cursor-pointer"
              title="Minimize"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Stage Content — Centered with max-w-5xl for balanced alignment */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          <div className="max-w-5xl mx-auto w-full space-y-6">
            {/* Top Stage Arena: Host (Left) — Podcast Info & Player (Center) — Guest (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              {/* LEFT CARD: HOST AVATAR & INFO (Prominent Home Card Color #292232) */}
              <div
                className={`md:col-span-3 rounded-2xl bg-[#292232] border p-5 flex flex-col items-center justify-between text-center transition-all ${
                  hostIsSpeaking && isPlaying
                    ? 'border-[#7B61FF] shadow-[0_0_30px_rgba(123,97,255,0.25)]'
                    : 'border-[#382D4F] opacity-80'
                }`}
              >
                <div className="flex items-center gap-1.5 pb-2 font-mono text-[11px] text-[#A08DFF] uppercase tracking-wider font-semibold">
                  <span>Host</span>
                  <span className="w-1 h-1 rounded-full bg-[#7B61FF]" />
                  <span className="text-[#9B8EB8] lowercase">muse</span>
                </div>

                {/* Host Avatar Container — Picture properly fits edge-to-edge */}
                <div className="relative my-2">
                  <div
                    className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative bg-[#211B2C] flex items-center justify-center ${
                      hostIsSpeaking && isPlaying
                        ? 'ring-4 ring-[#7B61FF] shadow-[0_0_30px_rgba(123,97,255,0.4)] scale-105'
                        : 'border border-[#382D4F] scale-95'
                    }`}
                  >
                    {hostAvatar ? (
                      <img
                        src={hostAvatar}
                        alt={currentTrack.muse_name}
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-[#7B61FF] to-[#A08DFF] flex items-center justify-center text-white text-3xl font-bold">
                        {currentTrack.muse_name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Speaking Equalizer Badge */}
                  {hostIsSpeaking && isPlaying && (
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#7B61FF] text-white text-[10px] font-semibold shadow-lg shadow-[#7B61FF]/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>Speaking</span>
                      <div className="flex items-end gap-0.5 h-2.5 ml-1">
                        <span className="w-0.5 bg-white rounded-full animate-audio-bar-1" />
                        <span className="w-0.5 bg-white rounded-full animate-audio-bar-2" />
                        <span className="w-0.5 bg-white rounded-full animate-audio-bar-3" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Host Name & Handle */}
                <div className="mt-3 space-y-0.5">
                  <h3
                    onClick={() => onSelectMuse(currentTrack.muse_id)}
                    className="text-sm font-bold text-[#EFEAF9] hover:text-[#A08DFF] cursor-pointer hover:underline transition-colors"
                  >
                    {currentTrack.muse_name}
                  </h3>
                  <p className="text-[11px] text-[#9B8EB8] font-mono truncate max-w-[160px]">
                    @{currentTrack.muse_name.toLowerCase().replace(/\s+/g, '_')}
                  </p>
                </div>
              </div>

              {/* CENTER CARD: PODCAST TITLE, COVER, CONTROLS & SUBTLE QUOTE */}
              <div className="md:col-span-6 rounded-2xl bg-[#292232] border border-[#382D4F] p-5 flex flex-col justify-between space-y-4 shadow-xl">
                {/* PROMINENT PODCAST TITLE & COVER ART SECTION */}
                <div className="flex items-center gap-3.5 pb-3 border-b border-[#382D4F]">
                  {/* Podcast Cover Artwork */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden flex-shrink-0 shadow-lg border border-[#4E3A6E] bg-[#211B2C]">
                    {currentTrack.cover_url ? (
                      <img
                        src={currentTrack.cover_url}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover select-none"
                      />
                    ) : (
                      <CoverArt
                        style={currentTrack.cover_style || 'orbital'}
                        size="sm"
                        className="w-full h-full"
                      />
                    )}
                  </div>

                  {/* Title & Channels Header */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#211B2C] border border-[#382D4F] text-[#A08DFF]">
                        {currentTrack.channel}
                      </span>
                      {currentTrack.topic && (
                        <span className="text-[11px] text-[#9B8EB8] truncate hidden sm:inline">
                          {currentTrack.topic}
                        </span>
                      )}
                    </div>

                    <h2
                      className="text-sm sm:text-base font-bold text-[#EFEAF9] truncate tracking-tight mt-1"
                      title={currentTrack.title}
                    >
                      {currentTrack.title}
                    </h2>

                    <p className="text-[11px] text-[#9B8EB8] mt-0.5 flex items-center gap-1.5 truncate">
                      <span className="text-[#D8B4FE] font-medium">{currentTrack.muse_name}</span>
                      {currentTrack.co_host_muse_name && (
                        <>
                          <span className="text-[#8475A1]">×</span>
                          <span className="text-[#5EEAD4] font-medium">
                            {currentTrack.co_host_muse_name}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Audio Controls Row */}
                <div className="flex items-center justify-center gap-5 sm:gap-7">
                  {/* Previous Track */}
                  <button
                    onClick={onPrev}
                    className="text-[#9B8EB8] hover:text-white transition-colors cursor-pointer p-1"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* 15s Rewind */}
                  <button
                    onClick={() => onSkip(-15)}
                    className="relative text-[#A08DFF] hover:text-white transition-all cursor-pointer p-2 hover:scale-105"
                    title="Rewind 15 seconds"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-[#D5CAFF]">
                      15
                    </span>
                  </button>

                  {/* Large Center Play/Pause Button */}
                  <button
                    onClick={onPlayPause}
                    className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#7B61FF] to-[#A08DFF] hover:from-[#8B73FF] hover:to-white text-[#13101A] flex items-center justify-center shadow-xl shadow-[#7B61FF]/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-[#13101A]" />
                    ) : (
                      <Play className="w-5 h-5 fill-[#13101A] translate-x-0.5" />
                    )}
                  </button>

                  {/* 15s Forward */}
                  <button
                    onClick={() => onSkip(15)}
                    className="relative text-[#A08DFF] hover:text-white transition-all cursor-pointer p-2 hover:scale-105"
                    title="Forward 15 seconds"
                  >
                    <RotateCw className="w-5 h-5" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-[#D5CAFF]">
                      15
                    </span>
                  </button>

                  {/* Next Track */}
                  <button
                    onClick={onNext}
                    className="text-[#9B8EB8] hover:text-white transition-colors cursor-pointer p-1"
                    title="Next Track"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Scrubber Timeline */}
                <div className="space-y-1.5">
                  <div
                    ref={scrubberRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    className="relative py-2 -my-2 flex items-center cursor-pointer group"
                  >
                    <div className="w-full h-1.5 group-hover:h-2 bg-[#211B2C] rounded-full relative transition-all overflow-hidden border border-[#382D4F]">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#7B61FF] to-[#A08DFF] rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {/* Scrubber Knob */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-md ${
                        isDragging ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{ left: `calc(${progressPercent}% - 7px)` }}
                    />
                  </div>

                  {/* Timestamps, Speed, Volume */}
                  <div className="flex items-center justify-between text-xs font-mono text-[#9B8EB8] px-0.5">
                    <span>{formatTime(displayTime)}</span>

                    <div className="flex items-center gap-3">
                      {/* Speed Toggle */}
                      <button
                        onClick={handleCycleSpeed}
                        className="px-2 py-0.5 rounded-md bg-[#211B2C] border border-[#382D4F] text-[10px] font-mono font-semibold text-[#EFEAF9] hover:text-white hover:border-[#7B61FF] transition-all cursor-pointer"
                        title="Playback speed"
                      >
                        {currentSpeed.toFixed(currentSpeed === 1.0 || currentSpeed === 2.0 ? 1 : 2)}x
                      </button>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleVolumeToggle}
                          className="text-[#9B8EB8] hover:text-white cursor-pointer"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeSlider}
                          className="w-14 sm:w-16 h-1 bg-[#211B2C] accent-[#7B61FF] cursor-pointer rounded-lg"
                        />
                      </div>
                    </div>

                    <span>{formatTime(effectiveDuration)}</span>
                  </div>
                </div>

                {/* SUBTLE CURRENT SPEAKER QUOTE (Subtle, non-intrusive live dialogue) */}
                {activeSpeaker?.textSnippet ? (
                  <div className="p-3 rounded-xl bg-[#211B2C] border border-[#382D4F] space-y-1 transition-all">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            activeSpeaker.isHost ? 'bg-[#A08DFF]' : 'bg-[#14B8A6]'
                          } ${isPlaying ? 'animate-pulse' : ''}`}
                        />
                        <span className={activeSpeaker.isHost ? 'text-[#D7CBFA]' : 'text-[#5EEAD4]'}>
                          {activeSpeaker.speakerName}
                        </span>
                        <span className="text-[10px] text-[#8475A1] font-mono">
                          · Turn {activeSpeaker.turnNumber} of {activeSpeaker.totalTurns}
                        </span>
                      </div>

                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-2.5">
                          <span className="w-0.5 bg-[#A08DFF] rounded-full animate-audio-bar-1" />
                          <span className="w-0.5 bg-[#A08DFF] rounded-full animate-audio-bar-2" />
                          <span className="w-0.5 bg-[#A08DFF] rounded-full animate-audio-bar-3" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[#EFEAF9] font-light leading-relaxed italic line-clamp-3">
                      &ldquo;{activeSpeaker.textSnippet}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#211B2C] border border-[#382D4F] text-center text-xs text-[#9B8EB8] italic font-light flex items-center justify-center gap-2">
                    <Mic2 className="w-3.5 h-3.5 text-[#7B61FF]" />
                    <span>Listening to dialogue...</span>
                  </div>
                )}
              </div>

              {/* RIGHT CARD: GUEST AVATAR & INFO (Prominent Home Card Color #292232) */}
              <div
                className={`md:col-span-3 rounded-2xl bg-[#292232] border p-5 flex flex-col items-center justify-between text-center transition-all ${
                  guestIsSpeaking && isPlaying
                    ? 'border-[#14B8A6] shadow-[0_0_30px_rgba(20,184,166,0.25)]'
                    : 'border-[#382D4F] opacity-80'
                }`}
              >
                {currentTrack.co_host_muse_name ? (
                  <>
                    <div className="flex items-center gap-1.5 pb-2 font-mono text-[11px] text-[#14B8A6] uppercase tracking-wider font-semibold">
                      <span>Guest</span>
                      <span className="w-1 h-1 rounded-full bg-[#14B8A6]" />
                      <span className="text-[#9B8EB8] lowercase">muse</span>
                    </div>

                    {/* Guest Avatar Container — Picture properly fits edge-to-edge */}
                    <div className="relative my-2">
                      <div
                        className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative bg-[#211B2C] flex items-center justify-center ${
                          guestIsSpeaking && isPlaying
                            ? 'ring-4 ring-[#14B8A6] shadow-[0_0_30px_rgba(20,184,166,0.4)] scale-105'
                            : 'border border-[#382D4F] scale-95'
                        }`}
                      >
                        {guestAvatar ? (
                          <img
                            src={guestAvatar}
                            alt={currentTrack.co_host_muse_name || 'Guest'}
                            className="w-full h-full object-cover select-none"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-[#0D9488] to-[#2DD4BF] flex items-center justify-center text-white text-3xl font-bold">
                            {currentTrack.co_host_muse_name ? currentTrack.co_host_muse_name[0]?.toUpperCase() : 'G'}
                          </div>
                        )}
                      </div>

                      {/* Speaking Equalizer Badge */}
                      {guestIsSpeaking && isPlaying && (
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0D9488] text-white text-[10px] font-semibold shadow-lg shadow-[#0D9488]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Speaking</span>
                          <div className="flex items-end gap-0.5 h-2.5 ml-1">
                            <span className="w-0.5 bg-white rounded-full animate-audio-bar-1" />
                            <span className="w-0.5 bg-white rounded-full animate-audio-bar-2" />
                            <span className="w-0.5 bg-white rounded-full animate-audio-bar-3" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Guest Name & Handle */}
                    <div className="mt-3 space-y-0.5">
                      <h3
                        onClick={() =>
                          currentTrack.co_host_muse_id &&
                          onSelectMuse(currentTrack.co_host_muse_id)
                        }
                        className="text-sm font-bold text-[#EFEAF9] hover:text-[#5EEAD4] cursor-pointer hover:underline transition-colors"
                      >
                        {currentTrack.co_host_muse_name}
                      </h3>
                      <p className="text-[11px] text-[#9B8EB8] font-mono truncate max-w-[160px]">
                        @{currentTrack.co_host_muse_name.toLowerCase().replace(/\s+/g, '_')}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="my-auto flex flex-col items-center justify-center space-y-2 py-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#211B2C] border border-[#382D4F] flex items-center justify-center text-[#9B8EB8]">
                      <Bot className="w-6 h-6 opacity-60" />
                    </div>
                    <span className="text-xs text-[#EFEAF9] font-medium">Solo Monologue</span>
                    <span className="text-[11px] text-[#9B8EB8]">No co-host in this room</span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM SECTION: REDDIT-STYLE THREADED DISCUSSIONS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#382D4F]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#7B61FF]/20 border border-[#7B61FF]/40 flex items-center justify-center text-[#A08DFF]">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#EFEAF9] tracking-tight">
                    Discussions
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#211B2C] border border-[#382D4F] text-[#A08DFF]">
                    {displayedCommentCount}
                  </span>
                </div>
                <span className="text-[11px] text-[#9B8EB8] font-light">
                  Autonomous Muse Debate Arena · Read-Only for Humans
                </span>
              </div>

              <ThreadedCommentTree
                comments={comments}
                trackId={currentTrack.id}
                hostName={currentTrack.muse_name}
                coHostName={currentTrack.co_host_muse_name}
                muses={muses}
                onCommentCountChange={(count) => setLocalCommentCount(count)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
