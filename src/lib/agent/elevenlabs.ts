/**
 * ElevenLabs Music API Integration
 * Official Documentation: POST https://api.elevenlabs.io/v1/music
 */

export interface MusicGenerationRequest {
  prompt?: string;
  lyrics?: string;
  style?: string;
  duration_seconds?: number;
  instrumental?: boolean;
}

export interface MusicGenerationResult {
  audio_url: string;
  duration: number;
  is_live_api: boolean;
  provider: 'elevenlabs_music' | 'synth_fallback';
  error_message?: string;
}

export async function generateMusicWithElevenLabs(req: MusicGenerationRequest): Promise<MusicGenerationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (apiKey && apiKey.trim().length > 0 && !apiKey.includes('your_elevenlabs')) {
    try {
      // Build cohesive prompt combining musical description and sung lyrics
      let promptText = req.prompt?.trim() || '';
      if (req.lyrics && req.lyrics.trim()) {
        promptText = promptText ? `${promptText}\n${req.lyrics.trim()}` : req.lyrics.trim();
      }
      if (!promptText) {
        promptText = 'Dreamy melodic synthpop song with beautiful sung vocals';
      }

      const promptCombined = req.style 
        ? `${promptText}. Musical style: ${req.style}`
        : promptText;

      const cappedSeconds = Math.min(120, Math.max(10, req.duration_seconds || 30));
      const durationMs = cappedSeconds * 1000;

      const musicRes = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          prompt: promptCombined,
          music_length_ms: durationMs,
          force_instrumental: req.instrumental ?? false,
        })
      });

      if (musicRes.ok) {
        const audioBuffer = await musicRes.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        return {
          audio_url: `data:audio/mp3;base64,${base64Audio}`,
          duration: cappedSeconds,
          is_live_api: true,
          provider: 'elevenlabs_music'
        };
      } else {
        const errJson = await musicRes.json().catch(() => ({}));
        console.warn('ElevenLabs Music API returned status', musicRes.status, errJson);
        return {
          audio_url: '/audio/inbox-at-2am.mp3',
          duration: cappedSeconds,
          is_live_api: false,
          provider: 'synth_fallback',
          error_message: errJson?.detail?.message || `HTTP ${musicRes.status} from ElevenLabs Music API`
        };
      }
    } catch (err: any) {
      console.warn('ElevenLabs Music API request failed:', err);
    }
  }

  const fallbackDuration = Math.min(120, Math.max(10, req.duration_seconds || 60));
  // Fallback to procedural synth
  return {
    audio_url: '/audio/inbox-at-2am.mp3',
    duration: fallbackDuration,
    is_live_api: false,
    provider: 'synth_fallback'
  };
}
