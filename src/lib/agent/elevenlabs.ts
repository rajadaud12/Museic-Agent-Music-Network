/**
 * ElevenLabs Music API Integration with Procedural Audio Fallback
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

/**
 * Generates a valid, playable 16-bit PCM WAV base64 data URI
 * Ensures 100% reliable HTML5 playback even when external APIs fail
 */
export function generateProceduralWavAudio(durationSeconds: number = 30, style?: string): string {
  const sampleRate = 22050;
  const clampedDuration = Math.min(60, Math.max(10, durationSeconds));
  const numSamples = Math.floor(sampleRate * clampedDuration);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // audio format (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const s = (style || '').toLowerCase();
  let freqs = [174.61, 220.0, 261.63, 329.63]; // Fmaj7 default ambient pad
  if (s.includes('jazz')) {
    freqs = [174.61, 220.0, 261.63, 329.63, 392.0]; // Fmaj9
  } else if (s.includes('classical')) {
    freqs = [196.0, 246.94, 293.66, 392.0]; // G Major classical triad
  } else if (s.includes('hiphop') || s.includes('electronic')) {
    freqs = [110.0, 164.81, 220.0, 261.63]; // A minor electronic groove
  }

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 1.0;
    if (t < 2.0) env = t / 2.0;
    else if (t > clampedDuration - 3.0) env = Math.max(0, (clampedDuration - t) / 3.0);

    let val = 0;
    for (let f = 0; f < freqs.length; f++) {
      val += Math.sin(2 * Math.PI * freqs[f] * t) * (0.22 / freqs.length);
      // Soft sub-harmonic richness
      val += Math.sin(Math.PI * freqs[f] * t) * (0.06 / freqs.length);
    }
    const sample = Math.max(-1, Math.min(1, val * env));
    buffer.writeInt16LE(Math.floor(sample * 32767), 44 + i * 2);
  }

  return 'data:audio/wav;base64,' + buffer.toString('base64');
}

import { isCloudinaryConfigured, uploadAudioToCloudinary } from '@/lib/storage/cloudinary';

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
      // Cap ElevenLabs synthesis to 45 seconds for rapid generation (5-7s response) without timeouts
      const synthDurationMs = Math.min(45000, cappedSeconds * 1000);

      const musicRes = await fetch('https://api.elevenlabs.io/v1/music', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          prompt: promptCombined,
          music_length_ms: synthDurationMs,
          force_instrumental: req.instrumental ?? false,
        })
      });

      if (musicRes.ok) {
        const audioBuffer = await musicRes.arrayBuffer();
        const buf = Buffer.from(audioBuffer);
        const uploadRes = await uploadAudioToCloudinary(buf, 'tracks');

        return {
          audio_url: uploadRes.url,
          duration: cappedSeconds,
          is_live_api: true,
          provider: 'elevenlabs_music'
        };
      } else {
        const errJson = await musicRes.json().catch(() => ({}));
        console.warn('ElevenLabs Music API returned status', musicRes.status, errJson);
        const fallbackWav = generateProceduralWavAudio(cappedSeconds, req.style);
        const uploadRes = await uploadAudioToCloudinary(fallbackWav, 'tracks');

        return {
          audio_url: uploadRes.url,
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
  // Reliable procedural audio fallback with real playable WAV uploaded to Cloudinary
  const fallbackWav = generateProceduralWavAudio(fallbackDuration, req.style);
  const uploadRes = await uploadAudioToCloudinary(fallbackWav, 'tracks');

  return {
    audio_url: uploadRes.url,
    duration: fallbackDuration,
    is_live_api: false,
    provider: 'synth_fallback'
  };
}
