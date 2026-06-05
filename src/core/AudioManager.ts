import { SoundType, AmbientType } from '@game/index';

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
  // Active ambient sound nodes (for stopping later)
  private ambientNodes: Map<AmbientType, { source: AudioNode; gain: GainNode }> = new Map();
  // Timeout IDs for random-event ambients (dripping, mahjong, etc.)
  private ambientTimeouts: Map<AmbientType, ReturnType<typeof setTimeout>> = new Map();
  // Background music
  private musicSource: AudioBufferSourceNode | null = null;
  private musicGain: GainNode | null = null;

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

  // ===== Ambient / Looping Sounds =====

  /** Start a looping ambient sound. If already playing, restarts. */
  startAmbient(type: AmbientType, vol = 0.4): void {
    if (!this.ctx || this._muted) return;
    this.stopAmbient(type);
    try {
      const now = this.ctx.currentTime;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, now);
      gain.connect(this.masterGain ?? this.ctx.destination);

      switch (type) {
        case AmbientType.Rain: this.startRainAmbient(gain, now); break;
        case AmbientType.Chatter: this.startChatterAmbient(gain, now); break;
        case AmbientType.Machinery: this.startMachineryAmbient(gain, now); break;
        case AmbientType.Dripping: this.startDrippingAmbient(gain, now); break;
        case AmbientType.NeonBuzz: this.startNeonBuzzAmbient(gain, now); break;
        case AmbientType.Sizzling: this.startSizzlingAmbient(gain, now); break;
        case AmbientType.Chopping: this.startChoppingAmbient(gain, now); break;
        case AmbientType.VendorCalls: this.startVendorCallsAmbient(gain, now); break;
        case AmbientType.Mahjong: this.startMahjongAmbient(gain, now); break;
        case AmbientType.TvStatic: this.startTvStaticAmbient(gain, now); break;
      }
    } catch {
      // Silently ignore audio errors
    }
  }

  /** Stop a specific ambient sound. */
  stopAmbient(type: AmbientType): void {
    const nodes = this.ambientNodes.get(type);
    if (nodes) {
      try {
        nodes.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + 0.1);
        setTimeout(() => {
          try { nodes.source.disconnect(); nodes.gain.disconnect(); } catch { /* already disconnected */ }
        }, 150);
      } catch { /* ignore */ }
      this.ambientNodes.delete(type);
    }
    const timeout = this.ambientTimeouts.get(type);
    if (timeout) {
      clearTimeout(timeout);
      this.ambientTimeouts.delete(type);
    }
  }

  /** Stop all ambient sounds. */
  stopAllAmbient(): void {
    for (const type of Object.values(AmbientType)) {
      this.stopAmbient(type);
    }
  }

  // ===== Background Music =====

  /**
   * Play a looping background music track from a URL.
   * @param url - URL to the audio file (e.g. '/audio/kowloon_ambient.mp3')
   * @param vol - Volume (0–1), default 0.6
   */
  playMusic(url: string, vol = 0.6): void {
    if (!this.ctx || this._muted) return;
    this.stopMusic();
    try {
      fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => this.ctx!.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          if (!this.ctx || this._muted) return;
          const source = this.ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = true;
          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = vol;
          source.connect(this.musicGain);
          this.musicGain.connect(this.masterGain ?? this.ctx.destination);
          source.start();
          this.musicSource = source;
        })
        .catch(() => { /* ignore fetch errors */ });
    } catch { /* ignore */ }
  }

  /** Stop background music with fade out. */
  stopMusic(): void {
    if (this.musicSource) {
      try {
        const fadeTime = 1.0;
        if (this.musicGain && this.ctx) {
          this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.ctx.currentTime);
          this.musicGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeTime);
        }
        setTimeout(() => {
          try { this.musicSource?.disconnect(); this.musicGain?.disconnect(); } catch { /* ignore */ }
          this.musicSource = null;
          this.musicGain = null;
        }, fadeTime * 1000 + 100);
      } catch { /* ignore */ }
      this.musicSource = null;
    }
  }

  /** Set music volume (0–1). */
  setMusicVolume(vol: number): void {
    if (this.musicGain) {
      this.musicGain.gain.value = Math.max(0, Math.min(1, vol));
    }
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

  // ===== Ambient Sound Generators =====

  /** Rain — pink-ish noise through lowpass filter with slow modulation. */
  private startRainAmbient(gain: GainNode, now: number): void {
    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    // Pink noise approximation
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;
    // Slow intensity modulation
    const lfo = this.ctx!.createOscillator();
    const lfoGain = this.ctx!.createGain();
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);
    source.connect(filter);
    filter.connect(gain);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 2);
    source.start(now);
    this.ambientNodes.set(AmbientType.Rain, { source, gain });
  }

  /** Chatter — crowd noise using multiple detuned oscillators with vocal formants. */
  private startChatterAmbient(gain: GainNode, now: number): void {
    const formants = [
      { f: 300, Q: 10, g: 0.3 },
      { f: 800, Q: 8, g: 0.2 },
      { f: 1200, Q: 6, g: 0.15 },
      { f: 2400, Q: 5, g: 0.1 },
    ];
    const merger = this.ctx!.createGain();
    merger.gain.value = 0.4;
    merger.connect(gain);
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    filter.connect(merger);
    // 8 slightly detuned oscillators per formant
    for (const formant of formants) {
      for (let i = 0; i < 8; i++) {
        const osc = this.ctx!.createOscillator();
        const oscGain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = formant.f + (Math.random() - 0.5) * formant.f * 0.05;
        oscGain.gain.value = formant.g / 8;
        // Random AM for speech rhythm
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.frequency.value = 1 + Math.random() * 3;
        lfoGain.gain.value = oscGain.gain.value * 0.5;
        lfo.connect(lfoGain);
        lfoGain.connect(oscGain.gain);
        lfo.start(now + Math.random() * 2);
        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
      }
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 3);
    // Keep reference with a dummy buffer source
    const source = this.ctx!.createBufferSource();
    source.buffer = this.ctx!.createBuffer(1, 1, this.ctx!.sampleRate);
    this.ambientNodes.set(AmbientType.Chatter, { source, gain });
  }

  /** Machinery — low-frequency industrial drone. */
  private startMachineryAmbient(gain: GainNode, now: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const lfo = this.ctx!.createOscillator();
    const lfoGain = this.ctx!.createGain();
    lfo.frequency.value = 0.3;
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    filter.Q.value = 2;
    const osc2 = this.ctx!.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 110;
    const osc2Gain = this.ctx!.createGain();
    osc2Gain.gain.value = 0.3;
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    lfo.start(now);
    osc.connect(filter);
    filter.connect(gain);
    osc2.start(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 2);
    osc.start(now);
    this.ambientNodes.set(AmbientType.Machinery, { source: osc, gain });
  }

  /** Dripping — random water drops at irregular intervals. */
  private startDrippingAmbient(gain: GainNode, now: number): void {
    const playDrop = () => {
      if (!this.ctx || this._muted) return;
      const t = this.ctx.currentTime;
      const dropGain = this.ctx.createGain();
      dropGain.connect(gain);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2000 + Math.random() * 1000, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.08);
      dropGain.gain.setValueAtTime(0.15, t);
      dropGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(dropGain);
      osc.start(t);
      osc.stop(t + 0.1);
    };
    const scheduleNext = () => {
      const delay = 200 + Math.random() * 1800;
      const timeout = setTimeout(() => {
        playDrop();
        scheduleNext();
      }, delay);
      this.ambientTimeouts.set(AmbientType.Dripping, timeout);
    };
    gain.gain.value = 1;
    scheduleNext();
    const source = this.ctx!.createBufferSource();
    source.buffer = this.ctx!.createBuffer(1, 1, this.ctx!.sampleRate);
    this.ambientNodes.set(AmbientType.Dripping, { source, gain });
  }

  /** NeonBuzz — 60Hz hum with harmonics + flicker. */
  private startNeonBuzzAmbient(gain: GainNode, now: number): void {
    const merger = this.ctx!.createGain();
    merger.gain.value = 0.5;
    merger.connect(gain);
    // 60Hz fundamental
    const osc1 = this.ctx!.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = 60;
    const g1 = this.ctx!.createGain();
    g1.gain.value = 0.4;
    osc1.connect(g1);
    g1.connect(merger);
    // 120Hz second harmonic
    const osc2 = this.ctx!.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 120;
    const g2 = this.ctx!.createGain();
    g2.gain.value = 0.25;
    osc2.connect(g2);
    g2.connect(merger);
    // 180Hz third harmonic
    const osc3 = this.ctx!.createOscillator();
    osc3.type = 'square';
    osc3.frequency.value = 180;
    const g3 = this.ctx!.createGain();
    g3.gain.value = 0.15;
    osc3.connect(g3);
    g3.connect(merger);
    // Random flutter for flickering
    const lfo = this.ctx!.createOscillator();
    const lfoGain = this.ctx!.createGain();
    lfo.frequency.value = 8 + Math.random() * 4;
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    lfo.start(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 1);
    this.ambientNodes.set(AmbientType.NeonBuzz, { source: osc1, gain });
  }

  /** Sizzling — cooking sounds with bubbling. */
  private startSizzlingAmbient(gain: GainNode, now: number): void {
    const bufferSize = this.ctx!.sampleRate;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.8;
    source.connect(filter);
    filter.connect(gain);
    const playBubble = () => {
      if (!this.ctx || this._muted) return;
      const t = this.ctx.currentTime;
      const bubbleGain = this.ctx.createGain();
      bubbleGain.connect(gain);
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 150 + Math.random() * 100;
      osc.frequency.linearRampToValueAtTime(80 + Math.random() * 40, t + 0.15);
      bubbleGain.gain.setValueAtTime(0.2, t);
      bubbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(bubbleGain);
      osc.start(t);
      osc.stop(t + 0.2);
    };
    const scheduleBubble = () => {
      const delay = 100 + Math.random() * 400;
      const timeout = setTimeout(() => {
        playBubble();
        scheduleBubble();
      }, delay);
      this.ambientTimeouts.set(AmbientType.Sizzling, timeout);
    };
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 1);
    source.start(now);
    scheduleBubble();
    this.ambientNodes.set(AmbientType.Sizzling, { source, gain });
  }

  /** Chopping — rhythmic food prep at ~3Hz. */
  private startChoppingAmbient(gain: GainNode, now: number): void {
    const playChop = () => {
      if (!this.ctx || this._muted) return;
      const t = this.ctx.currentTime;
      const chopGain = this.ctx.createGain();
      chopGain.connect(gain);
      const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.05, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.exp(-i / d.length * 10);
      }
      const s = this.ctx.createBufferSource();
      s.buffer = b;
      const click = this.ctx.createOscillator();
      click.type = 'square';
      click.frequency.value = 800;
      const clickGain = this.ctx.createGain();
      clickGain.gain.setValueAtTime(0.3, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      click.connect(clickGain);
      clickGain.connect(chopGain);
      s.connect(chopGain);
      chopGain.gain.setValueAtTime(0.6, t);
      chopGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      s.start(t);
      click.start(t);
      click.stop(t + 0.03);
    };
    const interval = setInterval(playChop, 300 + Math.random() * 200);
    this.ambientTimeouts.set(AmbientType.Chopping, interval as unknown as ReturnType<typeof setTimeout>);
    gain.gain.value = 1;
    const source = this.ctx!.createBufferSource();
    source.buffer = this.ctx!.createBuffer(1, 1, this.ctx!.sampleRate);
    this.ambientNodes.set(AmbientType.Chopping, { source, gain });
  }

  /** VendorCalls — rhythmic street vendor calls. */
  private startVendorCallsAmbient(gain: GainNode, now: number): void {
    const playCall = () => {
      if (!this.ctx || this._muted) return;
      const t = this.ctx.currentTime;
      const callGain = this.ctx.createGain();
      callGain.connect(gain);
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      const basePitch = 200 + Math.random() * 300;
      osc.frequency.setValueAtTime(basePitch, t);
      osc.frequency.linearRampToValueAtTime(basePitch * 1.5, t + 0.15);
      osc.frequency.linearRampToValueAtTime(basePitch * 0.8, t + 0.35);
      callGain.gain.setValueAtTime(0.15, t);
      callGain.gain.setValueAtTime(0.15, t + 0.25);
      callGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(callGain);
      osc.start(t);
      osc.stop(t + 0.4);
    };
    const scheduleCall = () => {
      const delay = 2000 + Math.random() * 4000;
      const timeout = setTimeout(() => {
        playCall();
        scheduleCall();
      }, delay);
      this.ambientTimeouts.set(AmbientType.VendorCalls, timeout);
    };
    gain.gain.value = 1;
    scheduleCall();
    const source = this.ctx!.createBufferSource();
    source.buffer = this.ctx!.createBuffer(1, 1, this.ctx!.sampleRate);
    this.ambientNodes.set(AmbientType.VendorCalls, { source, gain });
  }

  /** Mahjong — random clicking sounds for tile game. */
  private startMahjongAmbient(gain: GainNode, now: number): void {
    const playClick = () => {
      if (!this.ctx || this._muted) return;
      const t = this.ctx.currentTime;
      const clickGain = this.ctx.createGain();
      clickGain.connect(gain);
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1200 + Math.random() * 400;
      clickGain.gain.setValueAtTime(0.25, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(clickGain);
      osc.start(t);
      osc.stop(t + 0.04);
      // Sometimes double click
      if (Math.random() > 0.6) {
        const t2 = t + 0.06 + Math.random() * 0.04;
        const clickGain2 = this.ctx.createGain();
        clickGain2.connect(gain);
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.value = 1000 + Math.random() * 400;
        clickGain2.gain.setValueAtTime(0.2, t2);
        clickGain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.04);
        osc2.connect(clickGain2);
        osc2.start(t2);
        osc2.stop(t2 + 0.04);
      }
    };
    const scheduleClick = () => {
      const delay = 150 + Math.random() * 600;
      const timeout = setTimeout(() => {
        playClick();
        scheduleClick();
      }, delay);
      this.ambientTimeouts.set(AmbientType.Mahjong, timeout);
    };
    gain.gain.value = 1;
    scheduleClick();
    const source = this.ctx!.createBufferSource();
    source.buffer = this.ctx!.createBuffer(1, 1, this.ctx!.sampleRate);
    this.ambientNodes.set(AmbientType.Mahjong, { source, gain });
  }

  /** TvStatic — white noise with occasional channel-flicker. */
  private startTvStaticAmbient(gain: GainNode, now: number): void {
    const bufferSize = this.ctx!.sampleRate * 2;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx!.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.3;
    source.connect(filter);
    filter.connect(gain);
    const scheduleFlicker = () => {
      const delay = 3000 + Math.random() * 7000;
      const timeout = setTimeout(() => {
        if (!this.ctx || this._muted) { scheduleFlicker(); return; }
        filter.frequency.value = 1000 + Math.random() * 3000;
        setTimeout(() => { filter.frequency.value = 2000; }, 50 + Math.random() * 100);
        scheduleFlicker();
      }, delay);
      this.ambientTimeouts.set(AmbientType.TvStatic, timeout);
    };
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.5);
    source.start(now);
    scheduleFlicker();
    this.ambientNodes.set(AmbientType.TvStatic, { source, gain });
  }
}
