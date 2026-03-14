import { EQ_BANDS } from "./constants";

/**
 * Singleton Web Audio API engine for the Player tab.
 * Never destroyed — mounted once for the lifetime of the app.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private fadeGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];

  private startTime = 0;      // ctx.currentTime when playback started
  private startOffset = 0;    // audio offset in seconds when playback started
  private _isPlaying = false;
  private _volume = 1.0;

  private rafId: number | null = null;
  private onTimeUpdate: ((t: number) => void) | null = null;
  private onEnded: (() => void) | null = null;

  get isPlaying() { return this._isPlaying; }
  get volume() { return this._volume; }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.buildGraph();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private buildGraph() {
    const ctx = this.ctx!;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this._volume;

    this.filters = EQ_BANDS.map(band => {
      const f = ctx.createBiquadFilter();
      f.type = band.type;
      f.frequency.value = band.frequency;
      f.Q.value = band.Q;
      f.gain.value = 0;
      return f;
    });

    // Chain: filters[0] → filters[1] → ... → masterGain → destination
    let prev: AudioNode = this.filters[0];
    for (let i = 1; i < this.filters.length; i++) {
      prev.connect(this.filters[i]);
      prev = this.filters[i];
    }
    prev.connect(this.masterGain);
    this.masterGain.connect(ctx.destination);

    this.fadeGain = ctx.createGain();
    // fadeGain feeds into the filter chain
    this.fadeGain.connect(this.filters[0]);
  }

  async loadFile(url: string): Promise<number> {
    const ctx = this.ensureContext();
    const resp = await fetch(url);
    const arrayBuffer = await resp.arrayBuffer();
    this.buffer = await ctx.decodeAudioData(arrayBuffer);
    return this.buffer.duration;
  }

  play(offset = 0) {
    const ctx = this.ensureContext();
    if (!this.buffer) return;

    this.stopSource();

    this.source = ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.fadeGain!);
    this.source.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.onEnded?.();
      }
    };

    const safeOffset = Math.max(0, Math.min(offset, this.buffer.duration - 0.01));
    this.source.start(0, safeOffset);
    this.startOffset = safeOffset;
    this.startTime = ctx.currentTime;
    this._isPlaying = true;
    this.startRaf();
  }

  pause() {
    if (!this._isPlaying) return;
    this.startOffset = this.currentTime;
    this.stopSource();
    this._isPlaying = false;
    this.stopRaf();
  }

  stop() {
    this.stopSource();
    this._isPlaying = false;
    this.startOffset = 0;
    this.stopRaf();
    this.onTimeUpdate?.(0);
  }

  seek(seconds: number) {
    const wasPlaying = this._isPlaying;
    this.stopSource();
    this.startOffset = seconds;
    if (wasPlaying) {
      this.play(seconds);
    } else {
      this.onTimeUpdate?.(seconds);
    }
  }

  get currentTime(): number {
    if (!this.ctx) return 0;
    if (!this._isPlaying) return this.startOffset;
    return this.ctx.currentTime - this.startTime + this.startOffset;
  }

  setVolume(v: number) {
    this._volume = v;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.01);
    }
  }

  setEqBand(index: number, gainDb: number) {
    const filter = this.filters[index];
    if (filter && this.ctx) {
      filter.gain.setTargetAtTime(gainDb, this.ctx.currentTime, 0.01);
    }
  }

  setAllEqBands(gains: number[]) {
    gains.forEach((g, i) => this.setEqBand(i, g));
  }

  /** 300ms crossfade then call play(0) with the new buffer pre-loaded */
  async crossfadeTo(url: string, onLoaded: (duration: number) => void) {
    const ctx = this.ensureContext();
    if (this._isPlaying && this.fadeGain) {
      this.fadeGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      await new Promise(r => setTimeout(r, 300));
    }
    const duration = await this.loadFile(url);
    onLoaded(duration);
    if (this.fadeGain) {
      this.fadeGain.gain.setValueAtTime(0, ctx.currentTime);
      this.fadeGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.3);
    }
    this.play(0);
  }

  onTimeUpdateCallback(cb: (t: number) => void) { this.onTimeUpdate = cb; }
  onEndedCallback(cb: () => void) { this.onEnded = cb; }

  private stopSource() {
    if (this.source) {
      try { this.source.stop(); } catch {}
      this.source.disconnect();
      this.source = null;
    }
  }

  private startRaf() {
    const tick = () => {
      this.onTimeUpdate?.(this.currentTime);
      this.rafId = requestAnimationFrame(tick);
    };
    this.stopRaf();
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRaf() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Resume AudioContext on first user gesture (browser autoplay policy) */
  resumeOnInteraction() {
    document.addEventListener("click", () => {
      this.ctx?.resume();
    }, { once: true });
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
