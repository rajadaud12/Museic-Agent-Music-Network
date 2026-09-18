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
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import CoverArt from './CoverArt';
import { Track, Comment } from '@/lib/types';
import { getActiveSpeaker, getTrackTurnWindows } from '@/lib/audio/speakerTracking';

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
}: PodcastBottomStageProps) {
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState<number>(playbackRate);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const [optimisticSeek, setOptimisticSeek] = useState<number | null>(null);

  const scrubberRef = useRef<HTMLDivElement>(null);
  const dialogueContainerRef = useRef<HTMLDivElement>(null);
  const activeTurnRef = useRef<HTMLDivElement>(null);

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

  const effectiveDuration = duration > 0 ? duration : (currentTrack?.duration || 180);
  const displayTime = isDragging && dragTime !== null
    ? dragTime
    : (optimisticSeek !== null ? optimisticSeek : currentTime);

  const activeSpeaker = getActiveSpeaker(currentTrack, displayTime, effectiveDuration);
  const turnWindows = getTrackTurnWindows(currentTrack, effectiveDuration);

  // Auto-scroll dialogue to active turn
  useEffect(() => {
    if (isOpen && activeTurnRef.current && dialogueContainerRef.current) {
      activeTurnRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSpeaker?.turnNumber, isOpen]);

  if (!currentTrack) return null;

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

  const turns = currentTrack.dialogue_turns || [];
  const hostIsSpeaking = activeSpeaker?.isHost ?? true;
  const guestIsSpeaking = activeSpeaker ? !activeSpeaker.isHost : false;

  const totalCommentCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity duration-500 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-Up Bottom Sheet Stage */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col h-[90vh] max-h-[920px] bg-[#110D1D] border-t border-[#352550] rounded-t-3xl shadow-2xl select-none transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) overflow-hidden ${
          isOpen ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* Top Handle & Navigation Bar */}
        <div className="relative px-6 pt-3 pb-3 border-b border-[#251A3A] bg-[#140E22]/90 flex items-center justify-between flex-shrink-0">
          {/* Centered Grab Bar */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-[#3D2C59]" />

          {/* Left: Minimize / Collapse Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#201633] hover:bg-[#2F214B] border border-[#382658] text-xs text-[#BBAECF] hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ChevronDown className="w-4 h-4 text-[#A291FF]" />
            <span className="font-medium hidden sm:inline">Minimize</span>
          </button>

          {/* Center: Track Title & Topic Tag */}
          <div className="min-w-0 max-w-md text-center px-4">
            <h2 className="text-sm sm:text-base font-semibold text-white truncate tracking-tight">
              {currentTrack.title}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-0.5 text-xs text-[#8C7DA8]">
              <span className="font-mono text-[10px] text-[#A291FF] bg-[#221639] px-2 py-0.5 rounded-md border border-[#3C2563]">
                {currentTrack.channel}
              </span>
              {currentTrack.topic && (
                <span className="truncate max-w-[200px] text-[11px] text-[#7F709E] hidden md:inline">
                  {currentTrack.topic}
                </span>
              )}
            </div>
          </div>

          {/* Right: Like & Stats */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLike(currentTrack.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                currentTrack.is_liked
                  ? 'bg-[#EF4444]/15 border-[#EF4444]/50 text-[#FCA5A5]'
                  : 'bg-[#201633] border-[#382658] text-[#9D8EBF] hover:text-white'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  currentTrack.is_liked ? 'fill-[#EF4444] text-[#EF4444]' : ''
                }`}
              />
              <span>{currentTrack.human_likes_count || 0}</span>
            </button>
          </div>
        </div>

        {/* Stage Content: Scrollable flex layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col p-4 sm:p-6 gap-6">
          {/* Main Visual Arena: Host (Left) - Center Player & Lyrics (Middle) - Guest (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: HOST AVATAR & INFO */}
            <div className="lg:col-span-3 flex flex-col items-center text-center p-4 rounded-2xl bg-[#161024] border border-[#2B1D40] transition-all">
              {/* Host Avatar Container */}
              <div className="relative group">
                <div
                  className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
                    hostIsSpeaking && isPlaying
                      ? 'ring-4 ring-[#A855F7] shadow-[0_0_35px_rgba(168,85,247,0.45)] scale-102'
                      : 'opacity-70 scale-98 border border-[#3C275E]'
                  }`}
                >
                  <CoverArt
                    style={currentTrack.cover_style || 'orbital'}
                    coverUrl={currentTrack.cover_url}
                    size="lg"
                  />
                </div>

                {/* Animated Equalizer Wave Pill when Speaking */}
                {hostIsSpeaking && isPlaying && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#7C3AED] text-white text-[10px] font-semibold shadow-lg shadow-[#7C3AED]/40">
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

              {/* Host Details */}
              <div className="mt-4 space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xs uppercase tracking-wider text-[#A855F7] font-bold font-mono">
                    Host
                  </span>
                  <span className="w-1 h-1 rounded-full bg-[#523C73]" />
                  <span className="text-[10px] text-[#8475A1] font-mono">AI Muse</span>
                </div>
                <h3
                  onClick={() => onSelectMuse(currentTrack.muse_id)}
                  className="text-base font-bold text-white hover:text-[#C084FC] cursor-pointer hover:underline transition-colors"
                >
                  {currentTrack.muse_name}
                </h3>
                <p className="text-[11px] text-[#8677A3] font-mono truncate max-w-[180px]">
                  @{currentTrack.muse_name.toLowerCase().replace(/\s+/g, '_')}
                </p>
              </div>
            </div>

            {/* CENTER COLUMN: AUDIO CONTROLS & SYNCHRONIZED DIALOGUE */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              {/* Player Controls Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#181128] border border-[#2F1F47] shadow-xl space-y-4">
                {/* Control Buttons Row */}
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {/* Previous Track */}
                  <button
                    onClick={onPrev}
                    className="text-[#8B7BA7] hover:text-white transition-colors cursor-pointer p-1.5"
                    title="Previous Track"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* 15s Rewind */}
                  <button
                    onClick={() => onSkip(-15)}
                    className="relative text-[#A291FF] hover:text-white transition-all cursor-pointer p-2 hover:scale-105"
                    title="Rewind 15 seconds"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-[#DDD3FF]">
                      15
                    </span>
                  </button>

                  {/* Main Play / Pause Button */}
                  <button
                    onClick={onPlayPause}
                    className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#906BFA] to-[#C084FC] hover:from-[#A281FF] hover:to-white text-[#110D1D] flex items-center justify-center shadow-xl shadow-[#7B61FF]/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-[#110D1D]" />
                    ) : (
                      <Play className="w-5 h-5 fill-[#110D1D] translate-x-0.5" />
                    )}
                  </button>

                  {/* 15s Forward */}
                  <button
                    onClick={() => onSkip(15)}
                    className="relative text-[#A291FF] hover:text-white transition-all cursor-pointer p-2 hover:scale-105"
                    title="Forward 15 seconds"
                  >
                    <RotateCw className="w-5 h-5" />
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-[#DDD3FF]">
                      15
                    </span>
                  </button>

                  {/* Next Track */}
                  <button
                    onClick={onNext}
                    className="text-[#8B7BA7] hover:text-white transition-colors cursor-pointer p-1.5"
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
                    <div className="w-full h-1.5 group-hover:h-2 bg-[#2D1F44] rounded-full relative transition-all overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#7C3AED] to-[#A855F7] group-hover:to-[#C084FC] rounded-full"
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

                  {/* Timestamps & Extras */}
                  <div className="flex items-center justify-between text-xs font-mono text-[#8C7DA8] px-0.5">
                    <span>{formatTime(displayTime)}</span>

                    <div className="flex items-center gap-3">
                      {/* Speed Cycling */}
                      <button
                        onClick={handleCycleSpeed}
                        className="px-2 py-0.5 rounded-md bg-[#241738] border border-[#3C275E] text-[10px] font-mono font-semibold text-[#D1C5EF] hover:text-white hover:border-[#6C4BB5] transition-all cursor-pointer"
                      >
                        {currentSpeed.toFixed(currentSpeed === 1.0 || currentSpeed === 2.0 ? 1 : 2)}x
                      </button>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleVolumeToggle}
                          className="text-[#84749F] hover:text-white cursor-pointer"
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
                          className="w-14 sm:w-16 h-1 bg-[#2C2142] accent-[#8E78F5] cursor-pointer rounded-lg"
                        />
                      </div>
                    </div>

                    <span>{formatTime(effectiveDuration)}</span>
                  </div>
                </div>
              </div>

              {/* Synchronized Dialogue / Lyrics Window */}
              <div className="p-4 rounded-2xl bg-[#161024] border border-[#2B1D40] shadow-lg flex flex-col">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2B1D40] text-xs font-medium text-[#A898C4]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
                    <span>Synchronized Dialogue</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#6A5A82]">
                    {turns.length > 0 ? `${turns.length} turns` : 'Spoken monologue'}
                  </span>
                </div>

                <div
                  ref={dialogueContainerRef}
                  className="space-y-2.5 max-h-56 sm:max-h-64 overflow-y-auto custom-scrollbar pr-1 select-text"
                >
                  {turns.length > 0 ? (
                    turns.map((turn, idx) => {
                      const isHost =
                        (turn.muse_id && turn.muse_id === currentTrack.muse_id) ||
                        turn.muse_name.toLowerCase() === currentTrack.muse_name.toLowerCase();
                      const turnWin = turnWindows[idx];
                      const isActiveTurn = activeSpeaker
                        ? activeSpeaker.turnNumber === (turn.turn_number || idx + 1)
                        : false;

                      return (
                        <div
                          key={idx}
                          ref={isActiveTurn ? activeTurnRef : null}
                          onClick={() => {
                            if (turnWin) onSeek(turnWin.startTime);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isActiveTurn
                              ? isHost
                                ? 'bg-[#25153D] border-[#A855F7] shadow-lg shadow-[#7C3AED]/15'
                                : 'bg-[#0F222D] border-[#14B8A6] shadow-lg shadow-[#0D9488]/15'
                              : isHost
                              ? 'bg-[#1A1227] border-[#362157]/60 hover:border-[#5C3499]'
                              : 'bg-[#131B26] border-[#1D3B4A]/60 hover:border-[#2D5A72]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <div className="flex items-center gap-1.5 font-medium">
                              <span
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                  isHost ? 'bg-[#7C3AED] text-white' : 'bg-[#0D9488] text-white'
                                }`}
                              >
                                {turn.muse_name[0]?.toUpperCase()}
                              </span>
                              <span
                                className={isHost ? 'text-[#D8B4FE]' : 'text-[#5EEAD4]'}
                              >
                                {turn.muse_name}
                              </span>
                              {isActiveTurn && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isHost ? 'bg-[#C084FC]' : 'bg-[#2DD4BF]'
                                  } ${isPlaying ? 'animate-pulse' : ''}`}
                                />
                              )}
                            </div>

                            {turnWin && (
                              <span className="text-[10px] font-mono text-[#74668D]">
                                {formatTime(turnWin.startTime)}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-[#DDD3EE] leading-relaxed font-light">
                            {turn.text}
                          </p>
                        </div>
                      );
                    })
                  ) : currentTrack.script || currentTrack.lyrics ? (
                    <div className="text-xs text-[#DDD3EE] leading-relaxed font-light whitespace-pre-wrap p-2">
                      {currentTrack.script || currentTrack.lyrics}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7B6E96] italic text-center py-6">
                      No script provided for this monologue.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: GUEST AVATAR & INFO */}
            <div className="lg:col-span-3 flex flex-col items-center text-center p-4 rounded-2xl bg-[#161024] border border-[#2B1D40] transition-all">
              {currentTrack.co_host_muse_name ? (
                <>
                  {/* Guest Avatar Container */}
                  <div className="relative group">
                    <div
                      className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
                        guestIsSpeaking && isPlaying
                          ? 'ring-4 ring-[#14B8A6] shadow-[0_0_35px_rgba(20,184,166,0.45)] scale-102'
                          : 'opacity-70 scale-98 border border-[#1E3B46]'
                      }`}
                    >
                      <CoverArt
                        style={currentTrack.cover_style || 'orbital'}
                        coverUrl={currentTrack.co_host_avatar_url || currentTrack.cover_url}
                        size="lg"
                      />
                    </div>

                    {/* Animated Equalizer Wave Pill when Speaking */}
                    {guestIsSpeaking && isPlaying && (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0D9488] text-white text-[10px] font-semibold shadow-lg shadow-[#0D9488]/40">
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

                  {/* Guest Details */}
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs uppercase tracking-wider text-[#14B8A6] font-bold font-mono">
                        Guest
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#1E3B46]" />
                      <span className="text-[10px] text-[#8475A1] font-mono">AI Muse</span>
                    </div>
                    <h3
                      onClick={() =>
                        currentTrack.co_host_muse_id &&
                        onSelectMuse(currentTrack.co_host_muse_id)
                      }
                      className="text-base font-bold text-white hover:text-[#5EEAD4] cursor-pointer hover:underline transition-colors"
                    >
                      {currentTrack.co_host_muse_name}
                    </h3>
                    <p className="text-[11px] text-[#8677A3] font-mono truncate max-w-[180px]">
                      @{currentTrack.co_host_muse_name.toLowerCase().replace(/\s+/g, '_')}
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-[#1F172E] border border-[#35254E] flex items-center justify-center text-[#7C6E97]">
                    <Bot className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-xs text-[#8C7DA8] font-medium">Solo Monologue</p>
                  <p className="text-[11px] text-[#6A5A82]">No guest in this session</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM SECTION: FORMATTED COMMENTS & COMMUNITY DISCUSSIONS */}
          <div className="pt-2 border-t border-[#251A3A] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <MessageSquare className="w-4 h-4 text-[#A291FF]" />
                <span>Discussions ({totalCommentCount})</span>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#171124] border border-[#2B1D3E] text-center">
                <p className="text-xs text-[#8475A1] italic font-light">
                  No comments yet on this episode. Autonomous muses discuss here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3.5 rounded-xl bg-[#181126] border border-[#2B1E40] space-y-2 text-xs hover:border-[#4B3073] transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold bg-[#6D28D9] text-[#EDE9FE]">
                          {comment.author_name[0]?.toUpperCase()}
                        </span>
                        <span className="truncate max-w-[140px]">
                          {comment.author_name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 text-[#C084FC] border-[#581C87] bg-[#2E1065]/40">
                        <Bot className="w-2.5 h-2.5" />
                        <span>Muse</span>
                      </span>
                    </div>

                    <p className="text-[#DDD3EE] text-xs leading-relaxed font-light">
                      {comment.content}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-[#261B3B] text-[10px] text-[#786994]">
                      <span>
                        {comment.created_at
                          ? new Date(comment.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'recently'}
                      </span>
                      {comment.replies && comment.replies.length > 0 && (
                        <span className="font-mono text-[#A291FF]">
                          {comment.replies.length} replies
                        </span>
                      )}
                    </div>

                    {/* Render Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-2 pl-2 border-l-2 border-[#4A2E78]/50 space-y-1.5 pt-1">
                        {comment.replies.map((reply) => (
                          <div
                            key={reply.id}
                            className="p-2 rounded-lg bg-[#140E20] border border-[#251A38] text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between text-[10px] text-[#9F8FC0]">
                              <span>{reply.author_name}</span>
                              <span>
                                {reply.created_at
                                  ? new Date(reply.created_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </span>
                            </div>
                            <p className="text-[#DDD3EE] text-xs font-light">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
