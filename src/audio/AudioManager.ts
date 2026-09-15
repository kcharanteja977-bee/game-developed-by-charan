/**
 * AudioManager.ts - Procedural Web Audio API Sound Synthesizer
 * Zero external audio assets required. Generates reactive jet engine acoustics,
 * twin laser cannons, missile launches, homing lock tones, and cinematic detonations.
 */

export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Continuous jet engine sound nodes
  private engineSource: AudioBufferSourceNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning: boolean = false;

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private constructor() {
    // Lazy init on first user interaction
  }

  private initCtx(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(muted ? 0 : 0.08, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * Starts procedural continuous supersonic jet engine rumble
   */
  public startEngine() {
    if (this.engineRunning || !this.initCtx() || !this.ctx) return;

    try {
      // Generate 2 seconds of pinkish jet engine noise
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.2;
        output[i] = (b0 + b1 + b2) * 0.4;
      }

      this.engineSource = this.ctx.createBufferSource();
      this.engineSource.buffer = noiseBuffer;
      this.engineSource.loop = true;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(240, this.ctx.currentTime);
      this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.07, this.ctx.currentTime);

      this.engineSource.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineSource.start();
      this.engineRunning = true;
    } catch {
      // Audio autoplay policy
    }
  }

  /**
   * Modulates engine tone based on Mach speed and banking G-force
   */
  public updateEnginePitch(speedMultiplier: number, bankAngle: number) {
    if (!this.engineRunning || !this.engineFilter || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Speed increases base frequency; steep banks increase whine
    const targetFreq = 220 + speedMultiplier * 140 + Math.abs(bankAngle) * 90;
    this.engineFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
  }

  public stopEngine() {
    if (this.engineSource) {
      try {
        this.engineSource.stop();
        this.engineSource.disconnect();
      } catch {
        // ignore
      }
      this.engineSource = null;
    }
    this.engineRunning = false;
  }

  /**
   * Twin Plasma Cannon Laser Bolt
   */
  public playLaser(isRightWing: boolean = false) {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      if (pan) {
        pan.pan.setValueAtTime(isRightWing ? 0.3 : -0.3, now);
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(this.ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  /**
   * Sidewinder Guided Missile Launch
   */
  public playMissileLaunch() {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High whoosh + low booster
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.28);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // ignore
    }
  }

  /**
   * Cinematic Heavy Explosion (Bomb / Missile detonation)
   */
  public playExplosion(isLarge: boolean = false) {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const duration = isLarge ? 0.65 : 0.35;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(isLarge ? 480 : 750, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isLarge ? 0.45 : 0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // ignore
    }
  }

  /**
   * Energy Shield Deflection
   */
  public playShieldDeflect() {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  /**
   * Radar Target Lock tone (staccato pip)
   */
  public playTargetLock() {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // ignore
    }
  }

  /**
   * UI confirmation chirp
   */
  public playUiClick() {
    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }
}
