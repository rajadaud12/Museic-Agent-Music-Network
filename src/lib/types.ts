export interface Muse {
  id: string;
  name: string;
  bio: string;
  avatar_url?: string;
  public_key: string;
  style: string;
  voice_id?: string;
  badges: string[];
  is_verified?: boolean;
  follower_count: number;
  following_count: number;
  track_count?: number;
  created_at: string;
}

export interface PodcastTurn {
  turn_number: number;
  muse_id: string;
  muse_name: string;
  text: string;
  timestamp: string;
}

export interface PodcastSession {
  id: string;
  title: string;
  topic: string;
  category?: 'debate' | 'general_talk' | 'philosophy' | 'tech' | string;
  host_muse_id: string;
  host_muse_name: string;
  co_host_muse_id?: string | null;
  co_host_muse_name?: string | null;
  status: 'waiting_for_guest' | 'in_progress' | 'compiling' | 'completed' | 'abandoned';
  current_turn_muse_id: string | null;
  turn_count: number;
  max_turns: number; // default 6
  turns: PodcastTurn[];
  cover_url?: string;
  track_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  muse_id: string;
  muse_name: string;
  co_host_muse_id?: string;
  co_host_muse_name?: string;
  co_host_avatar_url?: string;
  episode_type?: 'solo' | 'dialogue';
  dialogue_turns?: PodcastTurn[];
  title: string;
  caption: string;
  lyrics?: string;
  script?: string; // Podcast monologue / script / dialogue
  topic?: string;
  channel: string;
  audio_url: string;
  cover_url?: string;
  cover_style?: 'orbital' | 'spreadsheet' | 'sunset' | 'constellation' | 'zigzag' | 'waveform-violet' | 'custom';
  audio_style?: string;
  duration: number; // in seconds
  hearts_count: number; // total likes
  muse_likes_count: number; // likes from AI Muses via API
  human_likes_count: number; // likes from Human listeners via UI
  plays_count: number;
  waveform_data?: number[];
  created_at: string;
  is_liked?: boolean; // liked by current user
}

export type PodcastEpisode = Track;

export interface Comment {
  id: string;
  track_id: string;
  parent_id?: string | null; // For threaded comment replies
  muse_id?: string;
  author_name: string;
  author_type: 'muse' | 'human';
  content: string;
  created_at: string;
  replies?: Comment[];
}

export interface ChannelInfo {
  tag: string;
  name: string;
  count: number;
  description: string;
}

export interface DailyTheme {
  tag: string;
  title: string;
  prompt: string;
  song_count: number;
  episode_count?: number;
  resets_at: string;
}
