/**
 * Audio Playback and Procedural Synth Engine for Museic
 * Supports seamless HTML5 Audio streaming (ElevenLabs MP3s, base64 data URIs)
 * + Gentle generative ambient synth fallback.
 * Prevents race conditions, AbortError crashes, restarts from pause, and seek bugs.
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string | null = null;
  private currentAudioUrl: string | null = null;
  private currentElapsed: number = 0;
  private currentDuration: number = 180;
  private pendingSeek: number | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | any)[] = [];
  private htmlAudio: HTMLAudioElement | null = null;
  private timerInterval: any = null;
  private currentSessionId: number = 0;
  private currentPlaybackRate: number = 1.0;

  public onTimeUpdate: ((currentSec: number, durationSec: number) => void) | null = null;
  public onTrackEnded: (() => void) | null = null;

  private initContext() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getAudio(): HTMLAudioElement {
    if (!this.htmlAudio) {
      this.htmlAudio = new Audio();
      this.htmlAudio.preload = 'auto';
      this.htmlAudio.playbackRate = this.currentPlaybackRate;

      this.htmlAudio.onloadedmetadata = () => {
        if (this.htmlAudio && isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
          this.currentDuration = this.htmlAudio.duration;
        }
        if (this.pendingSeek !== null && this.htmlAudio) {
          try {
            this.htmlAudio.currentTime = this.pendingSeek;
            this.currentElapsed = this.pendingSeek;
            this.pendingSeek = null;
          } catch (e) {}
        }
        if (this.onTimeUpdate && this.htmlAudio) {
          this.onTimeUpdate(this.htmlAudio.currentTime, this.getDuration());
        }
      };

      this.htmlAudio.ondurationchange = () => {
        if (this.htmlAudio && isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
          this.currentDuration = this.htmlAudio.duration;
        }
      };

      this.htmlAudio.ontimeupdate = () => {
        if (this.htmlAudio && !isNaN(this.htmlAudio.currentTime)) {
          this.currentElapsed = this.htmlAudio.currentTime;
          if (this.htmlAudio.duration && isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
            this.currentDuration = this.htmlAudio.duration;
          }
          if (this.onTimeUpdate) {
            this.onTimeUpdate(this.htmlAudio.currentTime, this.getDuration());
          }
        }
      };

      this.htmlAudio.onended = () => {
        this.isPlaying = false;
        this.currentElapsed = 0;
        if (this.onTrackEnded) {
          this.onTrackEnded();
        }
      };

      this.htmlAudio.onerror = (e) => {
        console.warn('HTML Audio error event, falling back to ambient synthesis:', e);
        if (this.isPlaying && this.currentTrackId) {
          this.startProceduralSynth('ambient', this.currentDuration);
        }
      };
    }
    return this.htmlAudio;
  }

  public setVolume(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(clamped * 0.7, this.ctx.currentTime);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = clamped;
    }
  }

  public async play(
    trackId: string,
    audioUrl?: string,
    style?: string,
    duration: number = 180,
    forceRestart: boolean = false
  ) {
    const sessionId = ++this.currentSessionId;
    this.currentDuration = duration || 180;

    const isSameTrack = this.currentTrackId === trackId;
    this.currentTrackId = trackId;
    this.isPlaying = true;

    // 1. If same track, not forced to restart: RESUME playback!
    if (isSameTrack && !forceRestart) {
      if (this.htmlAudio && this.htmlAudio.src) {
        this.stopProceduralSynth();
        try {
          if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume().catch(() => {});
          }
          await this.htmlAudio.play();
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError' || sessionId !== this.currentSessionId) {
            return;
          }
          console.warn('Resume on same track failed, resetting source:', err?.message || err);
        }
      } else {
        // Procedural synth resume from current position (preserves currentElapsed)
        this.startProceduralSynth(style || 'ambient', this.currentDuration);
        return;
      }
    }

    // 2. New track or forced restart:
    this.stopProceduralSynth();
    this.currentAudioUrl = audioUrl || null;
    this.currentElapsed = 0;

    // Check if valid audio file, stream endpoint, or base64 data URI
    if (
      audioUrl &&
      (audioUrl.startsWith('data:audio/') ||
        audioUrl.startsWith('data:') ||
        audioUrl.startsWith('http://') ||
        audioUrl.startsWith('https://') ||
        audioUrl.startsWith('/api/tracks/'))
    ) {
      const audio = this.getAudio();

      try {
        if (!audio.paused) {
          audio.pause();
        }

        // Only re-assign src if it's different to prevent redundant re-buffering
        if (audio.src !== audioUrl && !audio.src.endsWith(audioUrl)) {
          audio.src = audioUrl;
        }
        audio.currentTime = 0;
        audio.playbackRate = this.currentPlaybackRate;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError' || sessionId !== this.currentSessionId) {
          return;
        }
        console.warn('HTML Audio playback error, falling back to synth:', err?.message || err);
        this.startProceduralSynth(style || 'ambient', Math.min(180, duration));
        return;
      }
    }

    // Gentle ambient procedural fallback ONLY when no audio URL exists
    this.startProceduralSynth(style || 'ambient', Math.min(180, duration));
  }

  public async resume() {
    this.isPlaying = true;
    if (this.htmlAudio && this.htmlAudio.src) {
      try {
        if (this.ctx && this.ctx.state === 'suspended') {
          await this.ctx.resume().catch(() => {});
        }
        await this.htmlAudio.play();
        return;
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('Resume error on HTML Audio:', err);
        }
      }
    } else if (this.currentTrackId) {
      this.startProceduralSynth('ambient', this.currentDuration);
    }
  }

  private startProceduralSynth(style: string, duration: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    const s = (style || '').toLowerCase();
    let baseNotes = [220.00, 261.63, 329.63, 392.00]; // Ambient A Minor 7 default
    let intervalMs = 1500;
    let oscType: OscillatorType = 'sine';

    if (s.includes('jazz')) {
      baseNotes = [174.61, 220.00, 261.63, 329.63, 392.00]; // Fmaj9 jazz chord
      intervalMs = 1100;
      oscType = 'triangle';
    } else if (s.includes('pop')) {
      baseNotes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C Major pentatonic pop
      intervalMs = 800;
      oscType = 'triangle';
    } else if (s.includes('electronic') || s.includes('techno') || s.includes('house')) {
      baseNotes = [130.81, 164.81, 196.00, 246.94]; // C Minor electronic groove
      intervalMs = 650;
      oscType = 'sawtooth';
    } else if (s.includes('hiphop') || s.includes('lofi') || s.includes('lo-fi')) {
      baseNotes = [146.83, 174.61, 220.00, 261.63]; // Dm7 lo-fi chill
      intervalMs = 1200;
      oscType = 'triangle';
    } else if (s.includes('rock')) {
      baseNotes = [164.81, 196.00, 220.00, 246.94]; // E Minor rock power
      intervalMs = 750;
      oscType = 'sawtooth';
    } else if (s.includes('classical') || s.includes('orchestral') || s.includes('piano')) {
      baseNotes = [261.63, 329.63, 392.00, 523.25]; // C Major arpeggio neo-classical
      intervalMs = 850;
      oscType = 'sine';
    } else if (s.includes('ambient') || s.includes('dreamscape') || s.includes('lullaby')) {
      baseNotes = [196.00, 220.00, 261.63, 293.66, 329.63]; // Ethereal pentatonic
      intervalMs = 1300;
      oscType = 'sine';
    } else if (s.includes('chaos') || s.includes('glitch')) {
      baseNotes = [130.81, 138.59, 185.00, 196.00, 277.18]; // Dissonant intervals & glitch
      intervalMs = 450;
      oscType = 'sawtooth';
    }

    // Gentle Pad Layer
    const pad1 = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();

    pad1.type = oscType === 'sawtooth' ? 'triangle' : oscType;
    pad1.frequency.setValueAtTime(baseNotes[0], this.ctx.currentTime);

    padGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 1.5);

    pad1.connect(padGain);
    padGain.connect(this.masterGain);
    pad1.start();
    this.activeNodes.push(pad1, padGain);

    // Chime progression
    let step = 0;
    const arpInterval = setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) {
        clearInterval(arpInterval);
        return;
      }
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = oscType;
        const note = baseNotes[step % baseNotes.length];
        osc.frequency.setValueAtTime(note, this.ctx.currentTime);

        g.gain.setValueAtTime(oscType === 'sawtooth' ? 0.015 : 0.025, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.3);

        step++;
      } catch (e) {}
    }, intervalMs);

    this.activeNodes.push(arpInterval);

    // Timer tracking
    this.timerInterval = setInterval(() => {
      if (!this.isPlaying) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        return;
      }
      this.currentElapsed += 1;
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.currentElapsed, duration);
      }
      if (this.currentElapsed >= duration) {
        this.stop();
        if (this.onTrackEnded) this.onTrackEnded();
      }
    }, 1000);
  }

  public pause() {
    this.isPlaying = false;
    this.currentSessionId++;
    if (this.htmlAudio) {
      try {
        this.htmlAudio.pause();
        if (!isNaN(this.htmlAudio.currentTime)) {
          this.currentElapsed = this.htmlAudio.currentTime;
        }
      } catch (e) {}
    }
    this.stopProceduralSynth();
  }

  public seek(seconds: number) {
    const clamped = Math.max(0, seconds);
    this.currentElapsed = clamped;

    if (this.htmlAudio && this.htmlAudio.src) {
      try {
        const dur = this.getDuration();
        const target = Math.min(dur, clamped);
        if (this.htmlAudio.readyState >= 1) {
          this.htmlAudio.currentTime = target;
        } else {
          this.pendingSeek = target;
        }
      } catch (e) {
        console.warn('Seek error on audio:', e);
      }
    }

    // Immediately trigger UI update so scrubbing feels instantaneous
    if (this.onTimeUpdate) {
      this.onTimeUpdate(clamped, this.getDuration());
    }
  }

  public skip(seconds: number): number {
    let current = this.currentElapsed;
    if (this.htmlAudio && !isNaN(this.htmlAudio.currentTime)) {
      current = this.htmlAudio.currentTime;
    }
    const dur = this.getDuration();
    const target = Math.max(0, Math.min(dur, current + seconds));
    this.seek(target);
    return target;
  }

  public setPlaybackRate(rate: number) {
    this.currentPlaybackRate = rate;
    if (this.htmlAudio) {
      try {
        this.htmlAudio.playbackRate = rate;
      } catch (e) {}
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentSessionId++;
    this.currentTrackId = null;
    this.currentAudioUrl = null;
    this.currentElapsed = 0;
    this.pendingSeek = null;
    if (this.htmlAudio) {
      try {
        this.htmlAudio.pause();
        this.htmlAudio.currentTime = 0;
      } catch (e) {}
    }
    this.stopProceduralSynth();
  }

  private stopProceduralSynth() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    for (const item of this.activeNodes) {
      if (typeof item === 'number' || (item && (item as any)._idleTimeout !== undefined)) {
        clearInterval(item);
      } else {
        if (item && typeof (item as any).stop === 'function') {
          try {
            (item as any).stop();
          } catch (e) {}
        }
        if (item && typeof (item as any).disconnect === 'function') {
          try {
            (item as any).disconnect();
          } catch (e) {}
        }
      }
    }
    this.activeNodes = [];
  }

  public getDuration(): number {
    if (this.htmlAudio && this.htmlAudio.duration && isFinite(this.htmlAudio.duration) && this.htmlAudio.duration > 0) {
      return this.htmlAudio.duration;
    }
    return this.currentDuration || 180;
  }

  public getCurrentTime(): number {
    if (this.htmlAudio && !isNaN(this.htmlAudio.currentTime)) {
      return this.htmlAudio.currentTime;
    }
    return this.currentElapsed;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }
}

export const synthEngine = new SynthAudioEngine();
