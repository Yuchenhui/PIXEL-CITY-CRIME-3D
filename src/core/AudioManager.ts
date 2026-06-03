import { SoundType } from '@game/index';

/**
 * Web Audio API manager: generates procedural sound effects.
 *
 * All sounds are synthesised at runtime using oscillators and noise buffers
 * — no audio files are loaded, keeping the bundle size minimal.
 *
 * Sound design notes:
 * - Shoot:    square wave pitch sweep (800–1200 → 100 Hz over 80 ms) for a punchy gunshot
 * - Hit:      short white-noise burst (40 ms) with fast exponential decay — meaty impact
 * - Explosion: long noise buffer (600 ms) with slow decay + boosted gain for bass rumble
 * - Pickup:   sine wave two-note chime (600 → 900 Hz) — positive feedback
 * - Reload:   triangle wave two-note click (300 → 500 Hz) — mechanical feel
 * - Damage:   sawtooth wave descending sweep (200 → 80 Hz) — harsh, alarming
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume = 1;
  private _muted = false;

  /** Initialize AudioContext (must be called from user gesture) */
  init(): void {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = this._volume;
      } catch {
        // Audio not supported
      }
    }
  }

  /** Set master volume (0–1). Does not affect muted state. */
  setVolume(vol: number): void {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this._muted) {
      this.masterGain.gain.value = this._volume;
    }
  }

  /** Get current volume (0–1) */
  getVolume(): number {
    return this._volume;
  }

  /** Toggle or set mute state. When muted, gain is 0 regardless of volume. */
  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
    }
  }

  /** Check if currently muted */
  isMuted(): boolean {
    return this._muted;
  }

  /** Play a procedural sound effect */
  playSound(type: SoundType, vol = 0.3): void {
    if (!this.ctx || this._muted) return;
    try {
      const now = this.ctx.currentTime;
      const g = this.ctx.createGain();
      g.connect(this.masterGain ?? this.ctx.destination);
      g.gain.setValueAtTime(vol, now);

      switch (type) {
        case SoundType.Shoot:
          this.playShoot(g, now);
          break;
        case SoundType.Hit:
          this.playHit(g, now);
          break;
        case SoundType.Explosion:
          this.playExplosion(g, now, vol);
          break;
        case SoundType.Pickup:
          this.playPickup(g, now);
          break;
        case SoundType.Reload:
          this.playReload(g, now);
          break;
        case SoundType.Damage:
          this.playDamage(g, now);
          break;
      }
    } catch {
      // Silently ignore audio errors
    }
  }

  /**
   * Gunshot — square wave with fast pitch sweep.
   * Randomised start frequency (800–1200 Hz) avoids repetition;
   * exponential drop to 100 Hz over 80 ms gives a punchy "crack".
   * Total duration: 100 ms.
   */
  private playShoot(g: GainNode, now: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(800 + Math.random() * 400, now);
    o.frequency.exponentialRampToValueAtTime(100, now + 0.08);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    o.start(now);
    o.stop(now + 0.1);
  }

  /**
   * Bullet hit — short white-noise burst.
   * 40 ms of noise with exponential decay factor of 6
   * produces a tight, meaty "thwack" without low-end rumble.
   */
  private playHit(g: GainNode, now: number): void {
    const b = this.ctx!.createBuffer(1, this.ctx!.sampleRate * 0.04, this.ctx!.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      // White noise shaped by exponential envelope (factor 6 = fast decay)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 6);
    }
    const s = this.ctx!.createBufferSource();
    s.buffer = b;
    s.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    s.start(now);
  }

  /**
   * Explosion — long noise buffer with slow decay.
   * Decay factor 2 (vs hit's 6) keeps the noise audible for the full 600 ms,
   * producing a sustained bass rumble. Gain is doubled (vol × 2) for impact.
   */
  private playExplosion(g: GainNode, now: number, vol: number): void {
    const b = this.ctx!.createBuffer(1, this.ctx!.sampleRate * 0.6, this.ctx!.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      // White noise with slow exponential decay (factor 2 = sustained rumble)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 2);
    }
    const s = this.ctx!.createBufferSource();
    s.buffer = b;
    s.connect(g);
    g.gain.setValueAtTime(vol * 2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    s.start(now);
  }

  /**
   * Pickup collected — two-note sine chime (600 → 900 Hz).
   * Ascending pitch conveys positive feedback / reward.
   * Total duration: 150 ms with gentle fade.
   */
  private playPickup(g: GainNode, now: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(600, now);
    o.frequency.setValueAtTime(900, now + 0.08);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.start(now);
    o.stop(now + 0.15);
  }

  /**
   * Weapon reload — triangle wave two-note click (300 → 500 Hz).
   * Triangle wave is softer than square, giving a mechanical "click-clack" feel.
   * Total duration: 180 ms.
   */
  private playReload(g: GainNode, now: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, now);
    o.frequency.setValueAtTime(500, now + 0.12);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    o.start(now);
    o.stop(now + 0.18);
  }

  /**
   * Player damaged — sawtooth wave descending sweep (200 → 80 Hz).
   * Sawtooth is the harshest waveform, and the descending pitch
   * creates an alarming "power-down" sensation. Duration: 120 ms.
   */
  private playDamage(g: GainNode, now: number): void {
    const o = this.ctx!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    o.connect(g);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.start(now);
    o.stop(now + 0.12);
  }
}
