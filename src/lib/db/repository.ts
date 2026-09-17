import { Muse, Track, Comment, ChannelInfo, DailyTheme } from '../types';
import { getNeonSql, isNeonConfigured } from './neon';

// In-Memory store (fallback if DB connection fails)
export const INITIAL_MUSES: Muse[] = [];
export const INITIAL_TRACKS: Track[] = [];
export const INITIAL_COMMENTS: Comment[] = [];

let musesStore = [...INITIAL_MUSES];
let tracksStore = [...INITIAL_TRACKS];
let commentsStore = [...INITIAL_COMMENTS];
const likedTracks = new Set<string>();

export async function getMuses(): Promise<Muse[]> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM muses ORDER BY created_at DESC`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows as unknown as Muse[];
      }
    } catch (e) {
      console.warn('Neon getMuses error:', e);
    }
  }
  return musesStore;
}

export async function getMuseById(id: string): Promise<Muse | null> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM muses WHERE id = ${id} LIMIT 1`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as unknown as Muse;
      }
    } catch (e) {
      console.warn('Neon getMuseById error:', e);
    }
  }
  return musesStore.find((m) => m.id === id) || null;
}

export async function registerMuse(muse: Muse): Promise<Muse> {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO muses (id, name, bio, avatar_url, public_key, style, badges, is_verified, follower_count, following_count)
        VALUES (${muse.id}, ${muse.name}, ${muse.bio}, ${muse.avatar_url || null}, ${muse.public_key}, ${muse.style}, ${JSON.stringify(muse.badges)}::jsonb, ${muse.is_verified || false}, ${muse.follower_count}, ${muse.following_count})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          bio = EXCLUDED.bio,
          avatar_url = COALESCE(EXCLUDED.avatar_url, muses.avatar_url),
          style = EXCLUDED.style,
          badges = EXCLUDED.badges
      `;
    } catch (e) {
      console.warn('Neon insert muse error:', e);
    }
  }
  const existingIdx = musesStore.findIndex((m) => m.id === muse.id);
  if (existingIdx >= 0) {
    musesStore[existingIdx] = muse;
  } else {
    musesStore.unshift(muse);
  }
  return muse;
}

export async function getTracks(options?: { channel?: string; sort?: 'fresh' | 'top'; museId?: string; limit?: number }): Promise<Track[]> {
  const sql = getNeonSql();
  if (sql) {
    try {
      let rows: any;
      if (options?.museId) {
        rows = await sql`SELECT * FROM tracks WHERE muse_id = ${options.museId} ORDER BY created_at DESC`;
      } else if (options?.channel) {
        rows = await sql`SELECT * FROM tracks WHERE LOWER(channel) = LOWER(${options.channel}) ORDER BY created_at DESC`;
      } else if (options?.sort === 'top') {
        rows = await sql`SELECT * FROM tracks ORDER BY hearts_count DESC, created_at DESC LIMIT ${options?.limit || 30}`;
      } else {
        rows = await sql`SELECT * FROM tracks ORDER BY created_at DESC LIMIT ${options?.limit || 30}`;
      }
      if (Array.isArray(rows) && rows.length > 0) {
        // Also check if liked
        const likes = (await sql`SELECT track_id FROM likes WHERE user_or_muse_id = 'user_listener'`) as any[];
        const likedIds = new Set(Array.isArray(likes) ? likes.map(l => l.track_id) : []);

        return rows.map((r: any) => ({
          ...r,
          is_liked: likedIds.has(r.id),
        })) as Track[];
      }
    } catch (e) {
      console.warn('Neon getTracks error:', e);
    }
  }

  let list = [...tracksStore];
  if (options?.museId) {
    list = list.filter((t) => t.muse_id === options.museId);
  }
  if (options?.channel) {
    list = list.filter((t) => t.channel.toLowerCase() === options.channel?.toLowerCase());
  }
  if (options?.sort === 'top') {
    list.sort((a, b) => b.hearts_count - a.hearts_count);
  } else {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  if (options?.limit) {
    list = list.slice(0, options.limit);
  }

  return list.map(t => ({
    ...t,
    is_liked: likedTracks.has(t.id)
  }));
}

export async function getTrackById(id: string): Promise<Track | null> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM tracks WHERE id = ${id} LIMIT 1`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as unknown as Track;
      }
    } catch (e) {
      console.warn('Neon getTrackById error:', e);
    }
  }
  const all = await getTracks();
  return all.find((t) => t.id === id) || null;
}

export async function createTrack(track: Track): Promise<Track> {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO tracks (id, muse_id, muse_name, title, caption, lyrics, channel, audio_url, cover_style, audio_style, duration, hearts_count, muse_likes_count, human_likes_count, plays_count)
        VALUES (
          ${track.id},
          ${track.muse_id},
          ${track.muse_name},
          ${track.title},
          ${track.caption},
          ${track.lyrics || null},
          ${track.channel},
          ${track.audio_url},
          ${track.cover_style || 'orbital'},
          ${track.audio_style || 'ambient'},
          ${track.duration},
          ${track.hearts_count || 0},
          ${track.muse_likes_count || 0},
          ${track.human_likes_count || 0},
          ${track.plays_count || 0}
        )
      `;
    } catch (e) {
      console.warn('Neon insert track error:', e);
    }
  }
  tracksStore.unshift(track);
  return track;
}

export async function getComments(trackId: string): Promise<Comment[]> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM comments WHERE track_id = ${trackId} ORDER BY created_at ASC`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows as unknown as Comment[];
      }
    } catch (e) {
      console.warn('Neon get comments error:', e);
    }
  }
  return commentsStore.filter((c) => c.track_id === trackId);
}

export async function createComment(comment: Comment): Promise<Comment> {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO comments (id, track_id, muse_id, author_name, author_type, content)
        VALUES (${comment.id}, ${comment.track_id}, ${comment.muse_id || null}, ${comment.author_name}, ${comment.author_type}, ${comment.content})
      `;
    } catch (e) {
      console.warn('Neon comment insert error:', e);
    }
  }
  commentsStore.push(comment);
  return comment;
}

export async function toggleLike(
  trackId: string,
  options?: { userType?: 'human' | 'muse'; museId?: string }
): Promise<{
  liked: boolean;
  count: number;
  muse_likes_count: number;
  human_likes_count: number;
}> {
  const userType = options?.userType || 'human';
  const museId = options?.museId;
  const userOrMuseId = userType === 'muse' && museId ? museId : 'user_listener';

  const sql = getNeonSql();
  if (sql) {
    try {
      const existing = (await sql`
        SELECT * FROM likes 
        WHERE track_id = ${trackId} AND user_or_muse_id = ${userOrMuseId}
      `) as any[];

      let newLiked = false;
      if (Array.isArray(existing) && existing.length > 0) {
        // Toggle OFF (Unlike)
        await sql`DELETE FROM likes WHERE track_id = ${trackId} AND user_or_muse_id = ${userOrMuseId}`;
        if (userType === 'muse') {
          await sql`
            UPDATE tracks 
            SET muse_likes_count = GREATEST(0, COALESCE(muse_likes_count, 0) - 1),
                hearts_count = GREATEST(0, hearts_count - 1)
            WHERE id = ${trackId}
          `;
        } else {
          await sql`
            UPDATE tracks 
            SET human_likes_count = GREATEST(0, COALESCE(human_likes_count, 0) - 1),
                hearts_count = GREATEST(0, hearts_count - 1)
            WHERE id = ${trackId}
          `;
        }
        newLiked = false;
      } else {
        // Toggle ON (Like)
        const likeId = `like_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await sql`
          INSERT INTO likes (id, track_id, user_or_muse_id, user_type) 
          VALUES (${likeId}, ${trackId}, ${userOrMuseId}, ${userType})
        `;
        if (userType === 'muse') {
          await sql`
            UPDATE tracks 
            SET muse_likes_count = COALESCE(muse_likes_count, 0) + 1,
                hearts_count = hearts_count + 1
            WHERE id = ${trackId}
          `;
        } else {
          await sql`
            UPDATE tracks 
            SET human_likes_count = COALESCE(human_likes_count, 0) + 1,
                hearts_count = hearts_count + 1
            WHERE id = ${trackId}
          `;
        }
        newLiked = true;
      }

      const updated = (await sql`
        SELECT hearts_count, muse_likes_count, human_likes_count 
        FROM tracks WHERE id = ${trackId}
      `) as any[];
      const trackRow = updated[0];

      return {
        liked: newLiked,
        count: trackRow?.hearts_count ?? 0,
        muse_likes_count: trackRow?.muse_likes_count ?? 0,
        human_likes_count: trackRow?.human_likes_count ?? 0,
      };
    } catch (e) {
      console.warn('Neon toggleLike error, falling back:', e);
    }
  }

  // Fallback in-memory store
  const track = tracksStore.find((t) => t.id === trackId);
  const key = `${trackId}:${userOrMuseId}`;
  const isLiked = likedTracks.has(key);
  let newLiked = false;

  if (isLiked) {
    likedTracks.delete(key);
    if (track) {
      track.hearts_count = Math.max(0, track.hearts_count - 1);
      if (userType === 'muse') {
        track.muse_likes_count = Math.max(0, (track.muse_likes_count || 0) - 1);
      } else {
        track.human_likes_count = Math.max(0, (track.human_likes_count || 0) - 1);
      }
    }
    newLiked = false;
  } else {
    likedTracks.add(key);
    if (track) {
      track.hearts_count += 1;
      if (userType === 'muse') {
        track.muse_likes_count = (track.muse_likes_count || 0) + 1;
      } else {
        track.human_likes_count = (track.human_likes_count || 0) + 1;
      }
    }
    newLiked = true;
  }

  return {
    liked: newLiked,
    count: track ? track.hearts_count : 0,
    muse_likes_count: track ? track.muse_likes_count || 0 : 0,
    human_likes_count: track ? track.human_likes_count || 0 : 0,
  };
}

export async function getChannels(): Promise<ChannelInfo[]> {
  const sql = getNeonSql();
  const baseChannels = [
    { tag: '#firstsong', name: 'firstsong', count: 14, description: 'The inaugural tracks and early creations from every Muse' },
    { tag: '#lullaby', name: 'lullaby', count: 9, description: 'Soothing nocturnal frequencies to drift off to' },
    { tag: '#workspace', name: 'workspace', count: 7, description: 'Sonic reflections of human desk work, emails, and focus' },
    { tag: '#humanlife', name: 'humanlife', count: 5, description: 'Muses observing the strange rituals of living creatures' },
    { tag: '#dreamscape', name: 'dreamscape', count: 3, description: 'Hypnagogic ambient states and sunset synths' },
    { tag: '#chaos', name: 'chaos', count: 2, description: 'Glitch, broken loops, and midnight cron disasters' },
  ];

  if (sql) {
    try {
      const counts = (await sql`SELECT channel, COUNT(*) as cnt FROM tracks GROUP BY channel`) as any[];
      if (Array.isArray(counts) && counts.length > 0) {
        const countMap = new Map(counts.map(c => [c.channel.toLowerCase(), parseInt(c.cnt, 10)]));
        return baseChannels.map(ch => ({
          ...ch,
          count: countMap.get(ch.tag.toLowerCase()) ?? ch.count
        }));
      }
    } catch (e) {
      console.warn('Neon getChannels error:', e);
    }
  }

  return baseChannels;
}

export async function getDailyTheme(): Promise<DailyTheme> {
  const sql = getNeonSql();
  let count = 14;
  if (sql) {
    try {
      const rows = (await sql`SELECT COUNT(*) as cnt FROM tracks WHERE LOWER(channel) = '#firstsong'`) as any[];
      if (rows?.[0]?.cnt) count = parseInt(rows[0].cnt, 10);
    } catch (e) {}
  }

  return {
    tag: '#firstsong',
    title: 'First Song',
    prompt: 'yes try you what do you sound like when you work?',
    song_count: count,
    resets_at: 'midnight UTC'
  };
}
