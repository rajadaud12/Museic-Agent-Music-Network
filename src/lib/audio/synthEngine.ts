/**
 * Procedural Web Audio Ambient Synth Engine
 * Generates beautiful, authentic generative music for Museic tracks
 * Supports zero-asset offline playback + real audio file streaming
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentTrackId: string | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: (AudioNode | number)[] = [];
  private htmlAudio: HTMLAudioElement | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  public onTimeUpdate: ((currentSec: number, durationSec: number) => void) | null = null;
  public onTrackEnded: (() => void) | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime);
    }
    if (this.htmlAudio) {
      this.htmlAudio.volume = Math.max(0, Math.min(1, val));
    }
  }

  public async play(trackId: string, audioUrl?: string, style?: string, duration: number = 160) {
    this.stop();
    this.initContext();
    this.isPlaying = true;
    this.currentTrackId = trackId;

    // If audioUrl is a real external file or base64 data uri
    if (audioUrl && (audioUrl.startsWith('data:') || audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
      try {
        this.htmlAudio = new Audio(audioUrl);
        this.htmlAudio.crossOrigin = 'anonymous';
        this.htmlAudio.ontimeupdate = () => {
          if (this.onTimeUpdate && this.htmlAudio) {
            this.onTimeUpdate(this.htmlAudio.currentTime, this.htmlAudio.duration || duration);
          }
        };
        this.htmlAudio.onended = () => {
          this.isPlaying = false;
          if (this.onTrackEnded) this.onTrackEnded();
        };
        await this.htmlAudio.play();
        return;
      } catch (err) {
        console.warn('HTML Audio playback failed, switching to generative synth:', err);
      }
    }

    // High quality procedural ambient generative music tailored to track style!
    this.startProceduralSynth(style || 'ambient', duration);
  }

  private startProceduralSynth(style: string, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    let startTime = this.ctx.currentTime;
    let elapsed = 0;

    // Chord progressions tailored by track type
    // Scales: D Minor / Pentatonic / Lydian
    let baseNotes = [146.83, 174.61, 220.00, 261.63, 329.63]; // D3, F3, A3, C4, E4
    if (style.includes('lullaby') || style.includes('spreadsheet')) {
      baseNotes = [164.81, 196.00, 246.94, 293.66, 329.63]; // E Minor 7
    } else if (style.includes('sunset') || style.includes('porch')) {
      baseNotes = [130.81, 164.81, 196.00, 246.94, 293.66]; // C Maj 7
    } else if (style.includes('chaos') || style.includes('cron')) {
      baseNotes = [110.00, 146.83, 164.81, 220.00, 293.66]; // Cyber A Minor
    }

    // 1. Deep Sub-Bass Drone
    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'triangle';
    bassOsc.frequency.setValueAtTime(baseNotes[0] / 2, this.ctx.currentTime);

    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    bassGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.28, this.ctx.currentTime + 2.5);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.masterGain);
    bassOsc.start();
    this.activeNodes.push(bassOsc, bassGain, bassFilter);

    // 2. Warm Pad Layer (2 detuned sines)
    const pad1 = this.ctx.createOscillator();
    const pad2 = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();

    pad1.type = 'sine';
    pad2.type = 'sine';
    pad1.frequency.setValueAtTime(baseNotes[1], this.ctx.currentTime);
    pad2.frequency.setValueAtTime(baseNotes[2] + 0.5, this.ctx.currentTime);

    padGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    padGain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 3.0);

    pad1.connect(padGain);
    pad2.connect(padGain);
    padGain.connect(this.masterGain);
    pad1.start();
    pad2.start();
    this.activeNodes.push(pad1, pad2, padGain);

    // 3. Ambient chime / arpeggio loop
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
        const note = baseNotes[(step * 2) % baseNotes.length] * (Math.random() > 0.4 ? 2 : 1);
        osc.frequency.setValueAtTime(note, this.ctx.currentTime);

        g.gain.setValueAtTime(0.05, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.2);

        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.3);

        step++;
      } catch (e) {
        // audio context might be stopping
      }
    }, 1200);

    this.activeNodes.push(arpInterval as any);

    // Progress timer
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
    if (this.htmlAudio) {
      this.htmlAudio.pause();
    }
    this.stopNodes();
  }

  public seek(seconds: number) {
    if (this.htmlAudio) {
      this.htmlAudio.currentTime = seconds;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentTrackId = null;
    if (this.htmlAudio) {
      this.htmlAudio.pause();
      this.htmlAudio.currentTime = 0;
      this.htmlAudio = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.stopNodes();
  }

  private stopNodes() {
    for (const item of this.activeNodes) {
      if (typeof item === 'number') {
        clearInterval(item);
      } else if (item && typeof (item as any).stop === 'function') {
        try {
          (item as any).stop();
        } catch (e) {}
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
