/**
 * AuDHD Life Dashboard - Audio Synthesizer (Web Audio API)
 * 100% self-contained, offline, procedural sound effects.
 * Gentle, non-jarring acoustic & harmonic synthesis.
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.5;
    this.soundPack = 'cozy'; // 'cozy', 'playful', 'subtle', 'chime'
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSettings(settings) {
    this.enabled = settings.soundEnabled ?? true;
    this.volume = Math.max(0, Math.min(1, (settings.soundVolume ?? 50) / 100));
    this.soundPack = settings.soundPack || 'cozy';
  }

  play(soundName) {
    if (!this.enabled || this.volume <= 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      switch (soundName) {
        case 'click':
          this.playClick();
          break;
        case 'complete':
          this.playComplete();
          break;
        case 'xp':
          this.playXp();
          break;
        case 'levelup':
          this.playLevelUp();
          break;
        case 'start':
          this.playStart();
          break;
        case 'timer':
          this.playTimerComplete();
          break;
        case 'woosh':
          this.playWoosh();
          break;
        case 'calm':
          this.playCalmChord();
          break;
        case 'stuck':
          this.playStuckRelief();
          break;
        default:
          this.playClick();
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playClick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.04);

    gain.gain.setValueAtTime(0.12 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playComplete() {
    const t = this.ctx.currentTime;
    // Pleasant 2-note chime (F5 -> A5 or C5 -> G5)
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.07;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }

  playXp() {
    const t = this.ctx.currentTime;
    // Subtle sparkle glitter (3 high pure sines)
    const freqs = [880, 1174.66, 1479.98]; // A5, D6, F#6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });
  }

  playLevelUp() {
    const t = this.ctx.currentTime;
    // Triumphant, warm chord fanfare (C5, E5, G5, C6)
    const notes = [
      { f: 523.25, d: 0.0 },
      { f: 659.25, d: 0.1 },
      { f: 783.99, d: 0.2 },
      { f: 1046.50, d: 0.35, len: 0.8 }
    ];

    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + n.d;
      const duration = n.len || 0.45;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, startTime);

      gain.gain.setValueAtTime(0.22 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  playStart() {
    const t = this.ctx.currentTime;
    // Cozy activation swell
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(261.63, t); // C4
    osc.frequency.exponentialRampToValueAtTime(523.25, t + 0.18); // C5

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.18 * this.volume, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  playTimerComplete() {
    const t = this.ctx.currentTime;
    // Gentle singing bowl harmonic ring
    [440, 880, 1320].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const amp = (0.15 / (idx + 1)) * this.volume;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.25);
    });
  }

  playWoosh() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(320, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);

    gain.gain.setValueAtTime(0.08 * this.volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCalmChord() {
    const t = this.ctx.currentTime;
    // Grounding, peaceful major 7th chord (F4, A4, C5, E5)
    [349.23, 440.0, 523.25, 659.25].forEach((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.06 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 1.05);
    });
  }

  playStuckRelief() {
    const t = this.ctx.currentTime;
    // Soft soothing 2-step harmonic exhale (D4 -> G4)
    [293.66, 392.0].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = t + idx * 0.15;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.12 * this.volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }
}

window.soundSynth = new SoundSynthesizer();
