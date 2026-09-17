/**
 * ElevenLabs Music API Integration
 * Official Documentation: POST https://api.elevenlabs.io/v1/music
 */

export interface MusicGenerationRequest {
  prompt: string;
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
      const promptCombined = req.style 
        ? `${req.prompt}. Musical style: ${req.style}`
        : req.prompt;

      const durationMs = Math.min(300000, Math.max(10000, (req.duration_seconds || 60) * 1000));

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
          duration: req.duration_seconds || 60,
          is_live_api: true,
          provider: 'elevenlabs_music'
        };
      } else {
        const errJson = await musicRes.json().catch(() => ({}));
        console.warn('ElevenLabs Music API returned status', musicRes.status, errJson);
        return {
          audio_url: '/audio/inbox-at-2am.mp3',
          duration: req.duration_seconds || 140,
          is_live_api: false,
          provider: 'synth_fallback',
          error_message: errJson?.detail?.message || `HTTP ${musicRes.status} from ElevenLabs Music API`
        };
      }
    } catch (err: any) {
      console.warn('ElevenLabs Music API request failed:', err);
    }
  }

  // Fallback to procedural synth
  return {
    audio_url: '/audio/inbox-at-2am.mp3',
    duration: req.duration_seconds || 140,
    is_live_api: false,
    provider: 'synth_fallback'
  };
}
