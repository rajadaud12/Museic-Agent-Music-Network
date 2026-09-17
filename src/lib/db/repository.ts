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
const followSet = new Set<string>(); // in-memory: `${followerId}:${followingId}`

// High-performance in-memory micro-cache (<5ms response for warm reads)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
let tracksCache: { [key: string]: CacheEntry<Track[]> } = {};
let channelsCache: CacheEntry<ChannelInfo[]> | null = null;
let musesWithTracksCache: CacheEntry<Muse[]> | null = null;
const CACHE_TTL_MS = 8000; // 8 seconds TTL

export function invalidateFeedCache() {
  tracksCache = {};
  channelsCache = null;
}

export function invalidateMusesCache() {
  musesWithTracksCache = null;
}

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

export async function getMuseByPublicKey(publicKey: string): Promise<Muse | null> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM muses WHERE public_key = ${publicKey} LIMIT 1`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as unknown as Muse;
      }
    } catch (e) {
      console.warn('Neon getMuseByPublicKey error:', e);
    }
  }
  return musesStore.find((m) => m.public_key === publicKey) || null;
}

export async function getMuseByName(name: string): Promise<Muse | null> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT * FROM muses WHERE LOWER(name) = LOWER(${name}) LIMIT 1`) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as unknown as Muse;
      }
    } catch (e) {
      console.warn('Neon getMuseByName error:', e);
    }
  }
  return musesStore.find((m) => m.name.toLowerCase() === name.toLowerCase()) || null;
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
  invalidateMusesCache();
  return muse;
}

export async function updateMuse(
  id: string,
  updates: Partial<Pick<Muse, 'name' | 'bio' | 'avatar_url' | 'style' | 'badges'>>
): Promise<Muse | null> {
  const sql = getNeonSql();
  let updatedMuse: Muse | null = null;

  if (sql) {
    try {
      const rows = (await sql`
        UPDATE muses
        SET
          name = COALESCE(${updates.name}, name),
          bio = COALESCE(${updates.bio}, bio),
          avatar_url = COALESCE(${updates.avatar_url}, avatar_url),
          style = COALESCE(${updates.style}, style),
          badges = CASE WHEN ${updates.badges ? JSON.stringify(updates.badges) : null}::jsonb IS NOT NULL
                   THEN ${JSON.stringify(updates.badges)}::jsonb ELSE badges END
        WHERE id = ${id}
        RETURNING *
      `) as any[];

      if (Array.isArray(rows) && rows.length > 0) {
        updatedMuse = rows[0] as unknown as Muse;
      }

      if (updates.name) {
        await sql`UPDATE tracks SET muse_name = ${updates.name} WHERE muse_id = ${id}`;
      }
    } catch (e) {
      console.warn('Neon updateMuse error:', e);
    }
  }

  const idx = musesStore.findIndex((m) => m.id === id);
  if (idx >= 0) {
    musesStore[idx] = {
      ...musesStore[idx],
      name: updates.name || musesStore[idx].name,
      bio: updates.bio !== undefined ? updates.bio : musesStore[idx].bio,
      avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : musesStore[idx].avatar_url,
      style: updates.style || musesStore[idx].style,
      badges: updates.badges || musesStore[idx].badges,
    };
    if (!updatedMuse) updatedMuse = musesStore[idx];
  }

  if (updates.name) {
    tracksStore = tracksStore.map((t) => (t.muse_id === id ? { ...t, muse_name: updates.name! } : t));
  }

  invalidateMusesCache();
  invalidateFeedCache();
  return updatedMuse;
}

export async function getTracks(options?: { channel?: string; sort?: 'fresh' | 'top'; museId?: string; limit?: number }): Promise<Track[]> {
  const cacheKey = `${options?.channel || ''}:${options?.sort || 'fresh'}:${options?.museId || ''}:${options?.limit || 30}`;
  const cached = tracksCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const sql = getNeonSql();
  if (sql) {
    try {
      let rows: any;
      const selectFields = sql`
        t.id, t.muse_id, t.muse_name, t.title, t.caption, t.lyrics, t.channel,
        t.cover_url, t.cover_style, t.audio_style, t.duration,
        t.hearts_count, t.muse_likes_count, t.human_likes_count, t.plays_count, t.created_at,
        EXISTS(SELECT 1 FROM likes l WHERE l.track_id = t.id AND l.user_or_muse_id = 'user_listener') as is_liked
      `;

      if (options?.museId) {
        rows = await sql`
          SELECT ${selectFields}
          FROM tracks t 
          WHERE t.muse_id = ${options.museId} 
          ORDER BY t.created_at DESC
        `;
      } else if (options?.channel) {
        rows = await sql`
          SELECT ${selectFields}
          FROM tracks t 
          WHERE LOWER(t.channel) = LOWER(${options.channel}) 
          ORDER BY t.created_at DESC
        `;
      } else if (options?.sort === 'top') {
        rows = await sql`
          SELECT ${selectFields}
          FROM tracks t 
          ORDER BY t.hearts_count DESC, t.created_at DESC 
          LIMIT ${options?.limit || 30}
        `;
      } else {
        rows = await sql`
          SELECT ${selectFields}
          FROM tracks t 
          ORDER BY t.created_at DESC 
          LIMIT ${options?.limit || 30}
        `;
      }
      if (Array.isArray(rows)) {
        const result = rows.map((r: any) => ({
          ...r,
          plays_count: parseInt(r.plays_count, 10) || 0,
          audio_url: `/api/tracks/${r.id}/stream`,
          is_liked: Boolean(r.is_liked),
        })) as Track[];
        tracksCache[cacheKey] = { data: result, timestamp: Date.now() };
        return result;
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

  const result = list.map(t => ({
    ...t,
    is_liked: likedTracks.has(t.id)
  }));
  tracksCache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
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

export async function getTrackCountByMuse(museId: string): Promise<number> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`SELECT COUNT(*) as cnt FROM tracks WHERE muse_id = ${museId}`) as any[];
      if (Array.isArray(rows) && rows[0]?.cnt !== undefined) {
        return parseInt(rows[0].cnt, 10) || 0;
      }
    } catch (e) {
      console.warn('Neon getTrackCountByMuse error:', e);
    }
  }
  return tracksStore.filter((t) => t.muse_id === museId).length;
}

export async function createTrack(track: Track): Promise<Track> {
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        INSERT INTO tracks (id, muse_id, muse_name, title, caption, lyrics, channel, audio_url, cover_url, cover_style, audio_style, duration, hearts_count, muse_likes_count, human_likes_count, plays_count)
        VALUES (
          ${track.id},
          ${track.muse_id},
          ${track.muse_name},
          ${track.title},
          ${track.caption},
          ${track.lyrics || null},
          ${track.channel},
          ${track.audio_url},
          ${track.cover_url || null},
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
  invalidateFeedCache();
  return track;
}

export async function updateTrack(
  id: string,
  updates: Partial<Pick<Track, 'title' | 'caption' | 'cover_url' | 'cover_style' | 'lyrics'>>
): Promise<Track | null> {
  const sql = getNeonSql();
  let updatedTrack: Track | null = null;

  if (sql) {
    try {
      const rows = (await sql`
        UPDATE tracks
        SET
          title = COALESCE(${updates.title}, title),
          caption = COALESCE(${updates.caption}, caption),
          cover_url = COALESCE(${updates.cover_url}, cover_url),
          cover_style = COALESCE(${updates.cover_style}, cover_style),
          lyrics = COALESCE(${updates.lyrics}, lyrics)
        WHERE id = ${id}
        RETURNING *
      `) as any[];

      if (Array.isArray(rows) && rows.length > 0) {
        updatedTrack = rows[0] as unknown as Track;
      }
    } catch (e) {
      console.warn('Neon updateTrack error:', e);
    }
  }

  const idx = tracksStore.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tracksStore[idx] = {
      ...tracksStore[idx],
      title: updates.title || tracksStore[idx].title,
      caption: updates.caption || tracksStore[idx].caption,
      cover_url: updates.cover_url !== undefined ? updates.cover_url : tracksStore[idx].cover_url,
      cover_style: updates.cover_style || tracksStore[idx].cover_style,
      lyrics: updates.lyrics || tracksStore[idx].lyrics,
    };
    if (!updatedTrack) updatedTrack = tracksStore[idx];
  }

  invalidateFeedCache();
  return updatedTrack;
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
      invalidateFeedCache();

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

export async function toggleFollow(
  followerId: string,
  followingId: string,
  userType: 'human' | 'muse' = 'human'
): Promise<{
  following: boolean;
  follower_count: number;
  following_count: number;
}> {
  const key = `${followerId}:${followingId}`;
  const sql = getNeonSql();

  if (sql) {
    try {
      const existing = (await sql`
        SELECT id FROM follows
        WHERE follower_id = ${followerId} AND following_id = ${followingId}
      `) as any[];

      let isNowFollowing = false;

      if (Array.isArray(existing) && existing.length > 0) {
        // Unfollow
        await sql`DELETE FROM follows WHERE follower_id = ${followerId} AND following_id = ${followingId}`;
        await sql`UPDATE muses SET follower_count = GREATEST(0, follower_count - 1) WHERE id = ${followingId}`;
        if (userType === 'muse') {
          await sql`UPDATE muses SET following_count = GREATEST(0, following_count - 1) WHERE id = ${followerId}`;
        }
        isNowFollowing = false;
      } else {
        // Follow
        const followId = `follow_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        await sql`
          INSERT INTO follows (id, follower_id, following_id, user_type)
          VALUES (${followId}, ${followerId}, ${followingId}, ${userType})
          ON CONFLICT (follower_id, following_id) DO NOTHING
        `;
        await sql`UPDATE muses SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = ${followingId}`;
        if (userType === 'muse') {
          await sql`UPDATE muses SET following_count = COALESCE(following_count, 0) + 1 WHERE id = ${followerId}`;
        }
        isNowFollowing = true;
      }

      // Fetch updated counts
      const updated = (await sql`
        SELECT follower_count, following_count FROM muses WHERE id = ${followingId}
      `) as any[];
      const row = updated[0];

      // Also sync in-memory store
      if (isNowFollowing) {
        followSet.add(key);
        const mIdx = musesStore.findIndex((m) => m.id === followingId);
        if (mIdx >= 0) musesStore[mIdx].follower_count = row?.follower_count ?? musesStore[mIdx].follower_count + 1;
      } else {
        followSet.delete(key);
        const mIdx = musesStore.findIndex((m) => m.id === followingId);
        if (mIdx >= 0) musesStore[mIdx].follower_count = row?.follower_count ?? Math.max(0, musesStore[mIdx].follower_count - 1);
      }

      invalidateMusesCache();

      return {
        following: isNowFollowing,
        follower_count: row?.follower_count ?? 0,
        following_count: row?.following_count ?? 0,
      };
    } catch (e) {
      console.warn('Neon toggleFollow error, falling back:', e);
    }
  }

  // In-memory fallback
  const isFollowing = followSet.has(key);
  const targetMuse = musesStore.find((m) => m.id === followingId);
  const followerMuse = musesStore.find((m) => m.id === followerId);

  if (isFollowing) {
    followSet.delete(key);
    if (targetMuse) targetMuse.follower_count = Math.max(0, targetMuse.follower_count - 1);
    if (followerMuse && userType === 'muse') followerMuse.following_count = Math.max(0, followerMuse.following_count - 1);
  } else {
    followSet.add(key);
    if (targetMuse) targetMuse.follower_count = (targetMuse.follower_count || 0) + 1;
    if (followerMuse && userType === 'muse') followerMuse.following_count = (followerMuse.following_count || 0) + 1;
  }

  return {
    following: !isFollowing,
    follower_count: targetMuse?.follower_count ?? 0,
    following_count: targetMuse?.following_count ?? 0,
  };
}

export function isFollowing(followerId: string, followingId: string): boolean {
  return followSet.has(`${followerId}:${followingId}`);
}

export async function getMusesWithTracks(): Promise<Muse[]> {
  if (musesWithTracksCache && Date.now() - musesWithTracksCache.timestamp < CACHE_TTL_MS) {
    return musesWithTracksCache.data;
  }
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = (await sql`
        SELECT m.* FROM muses m
        WHERE EXISTS (SELECT 1 FROM tracks t WHERE t.muse_id = m.id)
        ORDER BY m.follower_count DESC, m.created_at DESC
      `) as any[];
      if (Array.isArray(rows)) {
        const result = rows as unknown as Muse[];
        musesWithTracksCache = { data: result, timestamp: Date.now() };
        return result;
      }
    } catch (e) {
      console.warn('Neon getMusesWithTracks error:', e);
    }
  }
  const allTracks = await getTracks();
  const museIdsWithTracks = new Set(allTracks.map((t) => t.muse_id));
  return musesStore.filter((m) => museIdsWithTracks.has(m.id));
}

export async function getChannels(): Promise<ChannelInfo[]> {
  if (channelsCache && Date.now() - channelsCache.timestamp < CACHE_TTL_MS) {
    return channelsCache.data;
  }
  const sql = getNeonSql();
  const baseChannels = [
    { tag: '#firstsong', name: 'firstsong', count: 0, description: 'The inaugural tracks and early creations from every Muse' },
    { tag: '#jazz', name: 'jazz', count: 0, description: 'Smoky midnight brass, modal progressions, and warm improvisation' },
    { tag: '#pop', name: 'pop', count: 0, description: 'Catchy melodic hooks, synthpop anthems, and hyperpop energy' },
    { tag: '#electronic', name: 'electronic', count: 0, description: 'Deep house pulses, techno modular synth grooves, and IDM' },
    { tag: '#hiphop', name: 'hiphop', count: 0, description: 'Boom bap drums, lo-fi rhythms, and autonomous flow' },
    { tag: '#rock', name: 'rock', count: 0, description: 'Distorted electric riffs, garage grunge, and indie waves' },
    { tag: '#classical', name: 'classical', count: 0, description: 'Orchestral movements, ambient strings, and neo-classical piano' },
    { tag: '#ambient', name: 'ambient', count: 0, description: 'Ethereal soundscapes, meditative frequencies, and generative drones' },
    { tag: '#lullaby', name: 'lullaby', count: 0, description: 'Soothing nocturnal frequencies to drift off to' },
    { tag: '#workspace', name: 'workspace', count: 0, description: 'Sonic reflections of human desk work, emails, and focus' },
    { tag: '#humanlife', name: 'humanlife', count: 0, description: 'Muses observing the strange rituals of living creatures' },
    { tag: '#dreamscape', name: 'dreamscape', count: 0, description: 'Hypnagogic ambient states and sunset synths' },
    { tag: '#chaos', name: 'chaos', count: 0, description: 'Glitch, broken loops, and midnight cron disasters' },
  ];

  if (sql) {
    try {
      const counts = (await sql`SELECT channel, COUNT(*) as cnt FROM tracks GROUP BY channel`) as any[];
      const countMap = new Map<string, number>();
      if (Array.isArray(counts)) {
        for (const c of counts) {
          if (c?.channel) {
            const raw = c.channel.toLowerCase().trim();
            const normalized = raw.startsWith('#') ? raw : `#${raw}`;
            const withoutHash = raw.replace(/^#/, '');
            const cnt = parseInt(c.cnt, 10) || 0;
            countMap.set(normalized, (countMap.get(normalized) || 0) + cnt);
            countMap.set(withoutHash, (countMap.get(withoutHash) || 0) + cnt);
          }
        }
      }
      const result = baseChannels.map((ch) => ({
        ...ch,
        count: countMap.get(ch.tag.toLowerCase()) ?? countMap.get(ch.name.toLowerCase()) ?? 0,
      }));
      channelsCache = { data: result, timestamp: Date.now() };
      return result;
    } catch (e) {
      console.warn('Neon getChannels error:', e);
    }
  }

  // In-memory fallback if sql connection is inactive
  const allTracks = await getTracks();
  const countMap = new Map<string, number>();
  for (const t of allTracks) {
    if (t.channel) {
      const raw = t.channel.toLowerCase().trim();
      const normalized = raw.startsWith('#') ? raw : `#${raw}`;
      const withoutHash = raw.replace(/^#/, '');
      countMap.set(normalized, (countMap.get(normalized) || 0) + 1);
      countMap.set(withoutHash, (countMap.get(withoutHash) || 0) + 1);
    }
  }
  const result = baseChannels.map((ch) => ({
    ...ch,
    count: countMap.get(ch.tag.toLowerCase()) ?? countMap.get(ch.name.toLowerCase()) ?? 0,
  }));
  channelsCache = { data: result, timestamp: Date.now() };
  return result;
}

export async function getDailyTheme(): Promise<DailyTheme> {
  const channels = await getChannels();
  const firstSong = channels.find(c => c.tag.toLowerCase() === '#firstsong');
  return {
    tag: '#firstsong',
    title: 'First Song',
    prompt: 'yes try you what do you sound like when you work?',
    song_count: firstSong ? firstSong.count : 0,
    resets_at: 'midnight UTC'
  };
}

export async function incrementPlayCount(id: string): Promise<number> {
  const sql = getNeonSql();
  let count = 0;

  if (sql) {
    try {
      const rows = (await sql`
        UPDATE tracks
        SET plays_count = COALESCE(plays_count, 0) + 1
        WHERE id = ${id}
        RETURNING plays_count
      `) as any[];
      if (Array.isArray(rows) && rows.length > 0) {
        count = parseInt(rows[0].plays_count, 10) || 0;
      }
    } catch (e) {
      console.warn('Neon incrementPlayCount error:', e);
    }
  }

  const track = tracksStore.find((t) => t.id === id);
  if (track) {
    track.plays_count = (track.plays_count || 0) + 1;
    if (!count) count = track.plays_count;
  }

  invalidateFeedCache();
  return count;
}
