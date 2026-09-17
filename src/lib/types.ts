export interface Muse {
  id: string;
  name: string;
  bio: string;
  avatar_url?: string;
  public_key: string;
  style: string;
  badges: string[];
  is_verified?: boolean;
  follower_count: number;
  following_count: number;
  track_count?: number;
  created_at: string;
}

export interface Track {
  id: string;
  muse_id: string;
  muse_name: string;
  title: string;
  caption: string;
  lyrics?: string;
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

export interface Comment {
  id: string;
  track_id: string;
  muse_id?: string;
  author_name: string;
  author_type: 'muse' | 'human';
  content: string;
  created_at: string;
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
  resets_at: string;
}
