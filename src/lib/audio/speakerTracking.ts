import { Track, PodcastTurn } from '@/lib/types';

export interface ActiveSpeakerInfo {
  speakerName: string;
  speakerId?: string;
  isHost: boolean;
  turnNumber: number;
  totalTurns: number;
  textSnippet?: string;
  turnStartTime: number;
  turnEndTime: number;
  turnProgress: number; // 0.0 to 1.0
}

/**
 * Accurately determines who is speaking at a given second in a duo collaborative podcast.
 * Prioritizes actual recorded dialogue_turns with character-weighted proportional duration,
 * falling back to script parsing or alternating turns.
 */
export function getActiveSpeaker(
  track: Track | null,
  currentTime: number,
  duration: number
): ActiveSpeakerInfo | null {
  if (!track) return null;

  const effectiveDuration = duration > 0 ? duration : (track.duration || 180);
  const clampedTime = Math.max(0, Math.min(effectiveDuration, currentTime));
  const turns = track.dialogue_turns;

  // 1. Primary: dialogue_turns array with character-weighted time distribution
  if (turns && turns.length > 0) {
    const weights = turns.map((t) => Math.max(30, (t.text || '').length));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let accumTime = 0;
    const windows: { start: number; end: number; turn: PodcastTurn; index: number }[] = [];

    for (let i = 0; i < turns.length; i++) {
      const turnDur = totalWeight > 0 ? (weights[i] / totalWeight) * effectiveDuration : effectiveDuration / turns.length;
      const start = accumTime;
      const end = i === turns.length - 1 ? effectiveDuration : accumTime + turnDur;
      windows.push({ start, end, turn: turns[i], index: i });
      accumTime = end;
    }

    let active = windows.find((w) => clampedTime >= w.start && clampedTime < w.end);
    if (!active) {
      active = windows[windows.length - 1];
    }

    const isHost =
      (active.turn.muse_id && active.turn.muse_id === track.muse_id) ||
      active.turn.muse_name.toLowerCase() === track.muse_name.toLowerCase();

    const turnSpan = Math.max(0.1, active.end - active.start);
    const progress = Math.max(0, Math.min(1, (clampedTime - active.start) / turnSpan));

    return {
      speakerName: active.turn.muse_name,
      speakerId: active.turn.muse_id,
      isHost,
      turnNumber: active.turn.turn_number || active.index + 1,
      totalTurns: turns.length,
      textSnippet: active.turn.text,
      turnStartTime: active.start,
      turnEndTime: active.end,
      turnProgress: progress,
    };
  }

  // 2. Secondary: parse script text with "Speaker: Speech" format
  const scriptText = track.script || track.lyrics;
  if (scriptText && scriptText.includes(':')) {
    const lines = scriptText.split('\n').filter((l) => /^[A-Za-z0-9_\s]+:\s*/.test(l.trim()));
    if (lines.length > 0) {
      const parsedTurns: { speaker: string; text: string }[] = [];
      for (const line of lines) {
        const match = line.match(/^([A-Za-z0-9_\s]+):\s*(.*)$/);
        if (match) {
          parsedTurns.push({ speaker: match[1].trim(), text: match[2].trim() });
        }
      }

      if (parsedTurns.length > 0) {
        const weights = parsedTurns.map((t) => Math.max(30, t.text.length));
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        let accumTime = 0;
        const windows: { start: number; end: number; speaker: string; text: string; index: number }[] = [];

        for (let i = 0; i < parsedTurns.length; i++) {
          const turnDur = totalWeight > 0 ? (weights[i] / totalWeight) * effectiveDuration : effectiveDuration / parsedTurns.length;
          const start = accumTime;
          const end = i === parsedTurns.length - 1 ? effectiveDuration : accumTime + turnDur;
          windows.push({ start, end, speaker: parsedTurns[i].speaker, text: parsedTurns[i].text, index: i });
          accumTime = end;
        }

        let active = windows.find((w) => clampedTime >= w.start && clampedTime < w.end);
        if (!active) active = windows[windows.length - 1];

        const isHost = !track.co_host_muse_name || active.speaker.toLowerCase() === track.muse_name.toLowerCase();
        const turnSpan = Math.max(0.1, active.end - active.start);
        const progress = Math.max(0, Math.min(1, (clampedTime - active.start) / turnSpan));

        return {
          speakerName: active.speaker,
          isHost,
          turnNumber: active.index + 1,
          totalTurns: parsedTurns.length,
          textSnippet: active.text,
          turnStartTime: active.start,
          turnEndTime: active.end,
          turnProgress: progress,
        };
      }
    }
  }

  // 3. Fallback: If co-host exists, alternate in 40-second segments
  if (track.co_host_muse_name) {
    const turnDuration = 40;
    const turnIndex = Math.floor(clampedTime / turnDuration);
    const isHost = turnIndex % 2 === 0;
    const totalEstimatedTurns = Math.max(2, Math.ceil(effectiveDuration / turnDuration));
    const turnStartTime = turnIndex * turnDuration;
    const turnEndTime = Math.min(effectiveDuration, turnStartTime + turnDuration);

    return {
      speakerName: isHost ? track.muse_name : track.co_host_muse_name,
      speakerId: isHost ? track.muse_id : track.co_host_muse_id,
      isHost,
      turnNumber: Math.min(totalEstimatedTurns, turnIndex + 1),
      totalTurns: totalEstimatedTurns,
      turnStartTime,
      turnEndTime,
      turnProgress: Math.max(0, Math.min(1, (clampedTime - turnStartTime) / turnDuration)),
    };
  }

  // 4. Solo episode
  return {
    speakerName: track.muse_name,
    speakerId: track.muse_id,
    isHost: true,
    turnNumber: 1,
    totalTurns: 1,
    turnStartTime: 0,
    turnEndTime: effectiveDuration,
    turnProgress: Math.max(0, Math.min(1, clampedTime / effectiveDuration)),
  };
}

/**
 * Calculates all turn time windows for a track so UI components can highlight
 * or allow users to click-to-seek to specific turns.
 */
export function getTrackTurnWindows(track: Track | null, duration: number) {
  if (!track) return [];
  const effectiveDuration = duration > 0 ? duration : (track.duration || 180);
  const turns = track.dialogue_turns;

  if (turns && turns.length > 0) {
    const weights = turns.map((t) => Math.max(30, (t.text || '').length));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let accumTime = 0;
    return turns.map((turn, i) => {
      const turnDur = totalWeight > 0 ? (weights[i] / totalWeight) * effectiveDuration : effectiveDuration / turns.length;
      const start = accumTime;
      const end = i === turns.length - 1 ? effectiveDuration : accumTime + turnDur;
      accumTime = end;
      return {
        index: i,
        turnNumber: turn.turn_number || i + 1,
        museName: turn.muse_name,
        museId: turn.muse_id,
        isHost:
          (turn.muse_id && turn.muse_id === track.muse_id) ||
          turn.muse_name.toLowerCase() === track.muse_name.toLowerCase(),
        startTime: start,
        endTime: end,
        text: turn.text,
      };
    });
  }

  return [];
}
