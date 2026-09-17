/**
 * Audio Playback and Procedural Synth Engine for Museic
 * Supports seamless HTML5 Audio streaming (ElevenLabs MP3s, base64 data URIs)
 * + Gentle generative ambient synth fallback.
 * Prevents race conditions, AbortError crashes, and audio drone hums.
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | any)[] = [];
  private htmlAudio: HTMLAudioElement | null = null;
  private timerInterval: any = null;
  private currentSessionId: number = 0;

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
      this.htmlAudio.crossOrigin = 'anonymous';
      this.htmlAudio.preload = 'auto';

      this.htmlAudio.ontimeupdate = () => {
        if (this.onTimeUpdate && this.htmlAudio && !isNaN(this.htmlAudio.currentTime)) {
          const dur = this.htmlAudio.duration && !isNaN(this.htmlAudio.duration) && isFinite(this.htmlAudio.duration)
            ? this.htmlAudio.duration
            : 120;
          this.onTimeUpdate(this.htmlAudio.currentTime, Math.min(120, dur));
        }
      };

      this.htmlAudio.onended = () => {
        this.isPlaying = false;
        if (this.onTrackEnded) {
          this.onTrackEnded();
        }
      };

      this.htmlAudio.onerror = (e) => {
        console.warn('HTML Audio error event:', e);
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

  public async play(trackId: string, audioUrl?: string, style?: string, duration: number = 120) {
    const sessionId = ++this.currentSessionId;
    this.stopProceduralSynth();
    this.isPlaying = true;
    this.currentTrackId = trackId;

    // Check if valid audio file or base64 data URI
    if (
      audioUrl &&
      (audioUrl.startsWith('data:') ||
        audioUrl.startsWith('http://') ||
        audioUrl.startsWith('https://') ||
        audioUrl.startsWith('/'))
    ) {
      const audio = this.getAudio();

      try {
        if (!audio.paused) {
          audio.pause();
        }

        audio.src = audioUrl;
        audio.currentTime = 0;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        return;
      } catch (err: any) {
        // AbortError is normal when switching quickly between tracks or pausing
        if (err?.name === 'AbortError' || sessionId !== this.currentSessionId) {
          return;
        }
        console.warn('HTML Audio playback error:', err?.message || err);
        return;
      }
    }

    // Gentle ambient procedural fallback ONLY when no audio URL exists
    this.startProceduralSynth(style || 'ambient', Math.min(120, duration));
  }

  private startProceduralSynth(style: string, duration: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    let elapsed = 0;
    // Soothing ethereal frequencies (warm chords, not jarring sub-bass)
    let baseNotes = [220.00, 261.63, 329.63, 392.00]; // A3, C4, E4, G4 (A Minor 7)

    // Gentle Pad Layer
    const pad1 = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();

    pad1.type = 'sine';
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
        osc.type = 'sine';
        const note = baseNotes[step % baseNotes.length];
        osc.frequency.setValueAtTime(note, this.ctx.currentTime);

        g.gain.setValueAtTime(0.02, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.3);

        step++;
      } catch (e) {}
    }, 1500);

    this.activeNodes.push(arpInterval);

    // Timer tracking
    this.timerInterval = setInterval(() => {
      if (!this.isPlaying) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        return;
      }
      elapsed += 1;
      if (this.onTimeUpdate) {
        this.onTimeUpdate(elapsed, duration);
      }
      if (elapsed >= duration) {
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
      } catch (e) {}
    }
    this.stopProceduralSynth();
  }

  public seek(seconds: number) {
    if (this.htmlAudio && !isNaN(seconds)) {
      try {
        this.htmlAudio.currentTime = Math.max(0, seconds);
      } catch (e) {}
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentSessionId++;
    this.currentTrackId = null;
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

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrackId(): string | null {
    return this.currentTrackId;
  }
}

export const synthEngine = new SynthAudioEngine();
