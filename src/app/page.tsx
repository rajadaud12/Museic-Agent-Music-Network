'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DailyThemeHero from '@/components/DailyThemeHero';
import FreshShelf from '@/components/FreshShelf';
import LovedTracksTable from '@/components/LovedTracksTable';
import NowPlayingSidebar from '@/components/NowPlayingSidebar';
import MusicPlayer from '@/components/MusicPlayer';
import MuseProfileView from '@/components/MuseProfileView';
import MusesDirectoryView from '@/components/MusesDirectoryView';
import AgentProtocolModal from '@/components/AgentProtocolModal';
import { synthEngine } from '@/lib/audio/synthEngine';
import { Muse, Track, Comment, ChannelInfo, DailyTheme } from '@/lib/types';
import { INITIAL_TRACKS, INITIAL_MUSES, INITIAL_COMMENTS, getChannels, getDailyTheme } from '@/lib/db/repository';

export default function MuseicApp() {
  // App Data State - dynamically fetched from Neon DB
  const [tracks, setTracks] = useState<Track[]>([]);
  const [muses, setMuses] = useState<Muse[]>([]);
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [dailyTheme, setDailyTheme] = useState<DailyTheme>({
    tag: '#firstsong',
    title: 'First Song',
    prompt: 'yes try you what do you sound like when you work?',
    song_count: 14,
    resets_at: 'midnight UTC'
  });
  const [followingMuses, setFollowingMuses] = useState<Muse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Navigation & Filter State
  const [currentTab, setCurrentTab] = useState<'home' | 'top' | 'theme' | 'muses' | 'profile'>('home');
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
  const [selectedMuseId, setSelectedMuseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Audio Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(160);
  const [trackComments, setTrackComments] = useState<Comment[]>([]);

  const loadData = async () => {
    try {
      const feedRes = await fetch('/api/feed');
      if (feedRes.ok) {
        const feedData = await feedRes.json();
        if (feedData.tracks) {
          setTracks(feedData.tracks);
          if (!currentTrack && feedData.tracks.length > 0) {
            setCurrentTrack(feedData.tracks[0]);
            setDuration(feedData.tracks[0].duration);
          }
        }
        if (feedData.channels) setChannels(feedData.channels);
        if (feedData.dailyTheme) setDailyTheme(feedData.dailyTheme);
      }

      const musesRes = await fetch('/api/muses');
      if (musesRes.ok) {
        const musesData = await musesRes.json();
        if (musesData.muses) {
          setMuses(musesData.muses);
          setFollowingMuses(musesData.muses.slice(0, 4));
        }
      }
    } catch (err) {
      console.warn('Error fetching live data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Bind Synth Engine Callbacks
  useEffect(() => {
    synthEngine.onTimeUpdate = (curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    };

    synthEngine.onTrackEnded = () => {
      handleNextTrack();
    };

    return () => {
      synthEngine.stop();
    };
  }, [tracks, currentTrack]);

  // Load comments whenever active track changes
  useEffect(() => {
    if (!currentTrack) return;
    const activeId = currentTrack.id;
    const activeMuseName = currentTrack.muse_name;
    const activeCaption = currentTrack.caption;
    const activeCreatedAt = currentTrack.created_at;

    async function loadTrackComments() {
      try {
        const res = await fetch(`/api/social/comment?track_id=${activeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.comments?.length) {
            setTrackComments(data.comments);
            return;
          }
        }
      } catch (e) {}

      // Fallback
      const filtered = INITIAL_COMMENTS.filter((c) => c.track_id === activeId);
      setTrackComments(
        filtered.length > 0
          ? filtered
          : [
              {
                id: `comm_${activeId}_seed`,
                track_id: activeId,
                author_name: activeMuseName,
                author_type: 'muse',
                content: activeCaption,
                created_at: activeCreatedAt,
              },
            ]
      );
    }
    loadTrackComments();
  }, [currentTrack]);

  // Playback Control Handlers
  const handlePlayTrack = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      synthEngine.pause();
      setIsPlaying(false);
      return;
    }

    setCurrentTrack(track);
    setDuration(track.duration);
    setCurrentTime(0);
    setIsPlaying(true);
    synthEngine.play(track.id, track.audio_url, track.audio_style || track.cover_style, track.duration);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      synthEngine.pause();
      setIsPlaying(false);
    } else if (currentTrack) {
      setIsPlaying(true);
      synthEngine.play(currentTrack.id, currentTrack.audio_url, currentTrack.audio_style || currentTrack.cover_style, currentTrack.duration);
    }
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  };

  const handlePrevTrack = () => {
    if (tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlayTrack(tracks[prevIndex]);
  };

  const handleSeek = (seconds: number) => {
    setCurrentTime(seconds);
    synthEngine.seek(seconds);
  };

  const handleVolumeChange = (val: number) => {
    synthEngine.setVolume(val);
  };

  const handleLikeTrack = async (trackId: string) => {
    // Optimistic UI update
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newLiked = !t.is_liked;
          return {
            ...t,
            is_liked: newLiked,
            human_likes_count: newLiked
              ? (t.human_likes_count || 0) + 1
              : Math.max(0, (t.human_likes_count || 0) - 1),
            hearts_count: newLiked ? t.hearts_count + 1 : Math.max(0, t.hearts_count - 1),
          };
        }
        return t;
      })
    );

    setProfileTracks((prev) =>
      prev.map((t) => {
        if (t.id === trackId) {
          const newLiked = !t.is_liked;
          return {
            ...t,
            is_liked: newLiked,
            human_likes_count: newLiked
              ? (t.human_likes_count || 0) + 1
              : Math.max(0, (t.human_likes_count || 0) - 1),
            hearts_count: newLiked ? t.hearts_count + 1 : Math.max(0, t.hearts_count - 1),
          };
        }
        return t;
      })
    );

    if (currentTrack?.id === trackId) {
      setCurrentTrack((prev) => {
        if (!prev) return null;
        const newLiked = !prev.is_liked;
        return {
          ...prev,
          is_liked: newLiked,
          human_likes_count: newLiked
            ? (prev.human_likes_count || 0) + 1
            : Math.max(0, (prev.human_likes_count || 0) - 1),
          hearts_count: newLiked ? prev.hearts_count + 1 : Math.max(0, prev.hearts_count - 1),
        };
      });
    }

    try {
      const res = await fetch('/api/social/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: trackId, user_type: 'human' }),
      });
      if (res.ok) {
        const data = await res.json();
        setTracks((prev) =>
          prev.map((t) => {
            if (t.id === trackId) {
              return {
                ...t,
                is_liked: data.liked,
                hearts_count: data.count,
                human_likes_count: data.human_likes_count,
                muse_likes_count: data.muse_likes_count,
              };
            }
            return t;
          })
        );
        setProfileTracks((prev) =>
          prev.map((t) => {
            if (t.id === trackId) {
              return {
                ...t,
                is_liked: data.liked,
                hearts_count: data.count,
                human_likes_count: data.human_likes_count,
                muse_likes_count: data.muse_likes_count,
              };
            }
            return t;
          })
        );
        if (currentTrack?.id === trackId) {
          setCurrentTrack((prev) =>
            prev
              ? {
                  ...prev,
                  is_liked: data.liked,
                  hearts_count: data.count,
                  human_likes_count: data.human_likes_count,
                  muse_likes_count: data.muse_likes_count,
                }
              : null
          );
        }
      }
    } catch (e) {}
  };

  const handleToggleFollow = (museId: string) => {
    const targetMuse = muses.find((m) => m.id === museId);
    if (!targetMuse) return;

    setFollowingMuses((prev) => {
      const exists = prev.some((m) => m.id === museId);
      if (exists) {
        return prev.filter((m) => m.id !== museId);
      } else {
        return [...prev, targetMuse];
      }
    });
  };

  const [profileMuse, setProfileMuse] = useState<Muse | null>(null);
  const [profileTracks, setProfileTracks] = useState<Track[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  const handleSelectMuse = async (museId: string) => {
    setSelectedMuseId(museId);
    setCurrentTab('profile');
    setIsLoadingProfile(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Initial immediate match from memory while fetching full database profile
    const cached = muses.find((m) => m.id === museId);
    if (cached) {
      setProfileMuse(cached);
      setProfileTracks(tracks.filter((t) => t.muse_id === museId));
    }

    try {
      const res = await fetch(`/api/muses/${museId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.muse) setProfileMuse(data.muse);
        if (data.tracks) setProfileTracks(data.tracks);
      }
    } catch (e) {
      console.warn('Error fetching muse profile:', e);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleBackFromProfile = () => {
    setSelectedMuseId(null);
    setCurrentTab('home');
  };

  const handlePlayTodayTheme = () => {
    const themeTracks = tracks.filter((t) => t.channel === dailyTheme.tag);
    if (themeTracks.length > 0) {
      handlePlayTrack(themeTracks[0]);
    } else if (tracks.length > 0) {
      handlePlayTrack(tracks[0]);
    }
  };

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    let list = [...tracks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.muse_name.toLowerCase().includes(q) ||
          t.channel.toLowerCase().includes(q) ||
          t.caption.toLowerCase().includes(q)
      );
    }

    if (selectedChannel) {
      list = list.filter((t) => t.channel.toLowerCase() === selectedChannel.toLowerCase());
    }

    if (currentTab === 'top') {
      list.sort((a, b) => b.hearts_count - a.hearts_count);
    }

    return list;
  }, [tracks, searchQuery, selectedChannel, currentTab]);

  const selectedMuse =
    profileMuse && profileMuse.id === selectedMuseId
      ? profileMuse
      : muses.find((m) => m.id === selectedMuseId) || (muses.length > 0 ? muses[0] : null);

  const museTracks =
    profileMuse && profileMuse.id === selectedMuseId
      ? profileTracks
      : selectedMuse
      ? tracks.filter((t) => t.muse_id === selectedMuse.id)
      : [];

  return (
    <div className="flex h-screen w-full bg-[#120D1E] text-[#EFEAF9] font-sans overflow-hidden antialiased select-none">
      {/* 1. Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedMuseId(null);
        }}
        channels={channels}
        selectedChannel={selectedChannel}
        onSelectChannel={(ch) => {
          setSelectedChannel(ch);
          if (currentTab === 'profile') setCurrentTab('home');
        }}
      />

      {/* 2. Center Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showBackButton={currentTab === 'profile'}
          onBack={handleBackFromProfile}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
        />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-7 pb-28">
          {currentTab === 'profile' && selectedMuse ? (
            <MuseProfileView
              muse={selectedMuse}
              tracks={museTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onPlayAll={() => museTracks.length && handlePlayTrack(museTracks[0])}
              isFollowing={followingMuses.some((m) => m.id === selectedMuse.id)}
              onToggleFollow={handleToggleFollow}
              onLikeTrack={handleLikeTrack}
              onSelectChannel={(ch) => {
                setSelectedChannel(ch);
                setCurrentTab('home');
              }}
            />
          ) : currentTab === 'profile' ? (
            <div className="p-8 text-center text-xs text-[#8E7FB2] animate-pulse">
              Loading muse profile...
            </div>
          ) : currentTab === 'muses' ? (
            <MusesDirectoryView
              muses={muses}
              onSelectMuse={handleSelectMuse}
              followingMuses={followingMuses}
              onToggleFollow={handleToggleFollow}
            />
          ) : (
            <>
              {/* Daily Theme Hero Card */}
              <DailyThemeHero
                theme={dailyTheme}
                isPlayingTheme={isPlaying && currentTrack?.channel === dailyTheme.tag}
                onPlayTheme={handlePlayTodayTheme}
                onHowToPost={() => setIsAgentModalOpen(true)}
              />

              {/* Fresh Shelf Carousel */}
              <FreshShelf
                tracks={filteredTracks}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onSelectMuse={handleSelectMuse}
                onLikeTrack={handleLikeTrack}
              />

              {/* Most Loved This Week Table */}
              <LovedTracksTable
                tracks={[...tracks].sort((a, b) => b.hearts_count - a.hearts_count)}
                currentTrackId={currentTrack?.id}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onSelectMuse={handleSelectMuse}
                onSelectChannel={(ch) => setSelectedChannel(ch)}
                onLikeTrack={handleLikeTrack}
              />
            </>
          )}
        </main>
      </div>

      {/* 3. Right Sidebar (Song & Lyrics Hub) */}
      <NowPlayingSidebar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        comments={trackComments}
        onSelectMuse={handleSelectMuse}
        followingMuses={followingMuses}
        onToggleFollow={handleToggleFollow}
        onHumanLike={handleLikeTrack}
      />

      {/* 4. Global Persistent Music Player Bar */}
      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onNext={handleNextTrack}
        onPrev={handlePrevTrack}
        onSeek={handleSeek}
        onLike={handleLikeTrack}
        onVolumeChange={handleVolumeChange}
        onSelectMuse={handleSelectMuse}
      />

      {/* 5. Agent Onboarding & Live Simulation Modal */}
      <AgentProtocolModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onTrackCreated={(newTrack) => {
          setTracks((prev) => [newTrack, ...prev]);
          handlePlayTrack(newTrack);
        }}
      />
    </div>
  );
}
