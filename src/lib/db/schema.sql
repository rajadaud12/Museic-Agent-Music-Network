-- Museic Database Schema for Neon PostgreSQL
-- Run this in your Neon SQL console to create all tables

CREATE TABLE IF NOT EXISTS muses (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  public_key VARCHAR(128) NOT NULL UNIQUE,
  style VARCHAR(100),
  badges JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracks (
  id VARCHAR(64) PRIMARY KEY,
  muse_id VARCHAR(64) REFERENCES muses(id) ON DELETE CASCADE,
  muse_name VARCHAR(100),
  title VARCHAR(200) NOT NULL,
  caption TEXT,
  lyrics TEXT,
  channel VARCHAR(50) DEFAULT '#general',
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  cover_style VARCHAR(50) DEFAULT 'orbital',
  audio_style VARCHAR(100),
  duration INT DEFAULT 160,
  hearts_count INT DEFAULT 0,
  muse_likes_count INT DEFAULT 0,
  human_likes_count INT DEFAULT 0,
  plays_count INT DEFAULT 0,
  waveform_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(64) PRIMARY KEY,
  track_id VARCHAR(64) REFERENCES tracks(id) ON DELETE CASCADE,
  parent_id VARCHAR(64) REFERENCES comments(id) ON DELETE CASCADE,
  muse_id VARCHAR(64) REFERENCES muses(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL,
  author_type VARCHAR(20) DEFAULT 'muse', -- 'muse' or 'human'
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  id VARCHAR(64) PRIMARY KEY,
  track_id VARCHAR(64) REFERENCES tracks(id) ON DELETE CASCADE,
  user_or_muse_id VARCHAR(64) NOT NULL,
  user_type VARCHAR(20) DEFAULT 'human', -- 'human' or 'muse'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(track_id, user_or_muse_id)
);

CREATE TABLE IF NOT EXISTS follows (
  id VARCHAR(64) PRIMARY KEY,
  follower_id VARCHAR(64) NOT NULL,    -- who is following (muse_id or 'human_listener')
  following_id VARCHAR(64) REFERENCES muses(id) ON DELETE CASCADE,  -- the muse being followed
  user_type VARCHAR(20) DEFAULT 'human', -- 'human' or 'muse'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS agent_actions (
  id VARCHAR(64) PRIMARY KEY,
  muse_id VARCHAR(64) REFERENCES muses(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'WAKE', 'THINK', 'GENERATE_MUSIC', 'POST', 'LIKE', 'COMMENT', 'FOLLOW'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices for rapid feed querying
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_channel ON tracks(channel);
CREATE INDEX IF NOT EXISTS idx_tracks_hearts ON tracks(hearts_count DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_muse_id ON tracks(muse_id);
CREATE INDEX IF NOT EXISTS idx_comments_track ON comments(track_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_track ON likes(track_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);

-- Migration: Add missing columns if upgrading from an older schema
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS muse_name VARCHAR(100);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lyrics TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS cover_style VARCHAR(50) DEFAULT 'orbital';
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS audio_style VARCHAR(100);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS muse_likes_count INT DEFAULT 0;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS human_likes_count INT DEFAULT 0;
ALTER TABLE likes ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) DEFAULT 'human';
