(function () {
  'use strict';
  class Sound {
    constructor() {
      this.ctx = null;
      this.effects = true;
      this.music = false;
      this.effectsVolume = 80;
      this.musicVolume = 75;
      this.timer = null;
      this.step = 0;
      document.addEventListener('visibilitychange', () => this.schedule());
    }
    unlock() {
      try {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.limiter = this.ctx.createDynamicsCompressor();
          this.limiter.threshold.value = -10;
          this.limiter.knee.value = 18;
          this.limiter.ratio.value = 8;
          this.limiter.attack.value = 0.003;
          this.limiter.release.value = 0.2;
          this.limiter.connect(this.ctx.destination);
          this.musicBus = this.ctx.createGain();
          this.effectsBus = this.ctx.createGain();
          this.musicBus.connect(this.limiter);
          this.effectsBus.connect(this.limiter);
          this.applyVolumes();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        if (!this.timer) this.schedule();
      } catch (_) {}
    }
    configure(effects, music, effectsVolume = 80, musicVolume = 75) {
      const changed = music !== this.music;
      this.effects = effects;
      this.music = music;
      this.effectsVolume = Number.isFinite(effectsVolume)
        ? Math.max(0, Math.min(100, effectsVolume))
        : 80;
      this.musicVolume = Number.isFinite(musicVolume)
        ? Math.max(0, Math.min(100, musicVolume))
        : 75;
      this.applyVolumes();
      if (changed) this.schedule();
    }
    applyVolumes() {
      if (!this.ctx) return;
      this.musicBus.gain.setTargetAtTime(
        this.music ? (this.musicVolume / 100) * 10 : 0,
        this.ctx.currentTime,
        0.025,
      );
      this.effectsBus.gain.setTargetAtTime(
        this.effects ? (this.effectsVolume / 100) * 6 : 0,
        this.ctx.currentTime,
        0.025,
      );
    }
    tone(frequency, duration, volume = 0.025, type = 'sine', delay = 0, musicTone = false) {
      if (!this.ctx || this.ctx.state !== 'running' || document.hidden) return;
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain(),
        t = this.ctx.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(frequency, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g);
      g.connect(musicTone ? this.musicBus : this.effectsBus);
      o.start(t);
      o.stop(t + duration + 0.02);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    noise(duration, volume, low, delay = 0) {
      if (!this.ctx || this.ctx.state !== 'running' || document.hidden) return;
      const c = this.ctx,
        b = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate),
        data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * Math.exp((-i / data.length) * 5);
      const s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = b;
      f.type = 'lowpass';
      f.frequency.value = low;
      g.gain.value = volume;
      s.connect(f);
      f.connect(g);
      g.connect(this.effectsBus);
      s.start(c.currentTime + delay);
      s.onended = () => {
        s.disconnect();
        f.disconnect();
        g.disconnect();
      };
    }
    play(kind, variant = 0) {
      if (!this.effects) return;
      if (kind === 'sneeze') {
        this.noise(0.13, 0.04, 500);
        this.noise(0.26, 0.085, 3000, 0.1);
        this.tone(95, 0.17, 0.014, 'sawtooth', 0.1);
      }
      if (kind === 'snore') {
        this.noise(0.6, 0.05, 280);
        this.tone(88, 0.55, 0.026, 'triangle');
      }
      if (kind === 'whistle') {
        this.tone(880, 0.22, 0.026);
        this.tone(1174, 0.3, 0.022, 'sine', 0.22);
        this.tone(988, 0.3, 0.02, 'sine', 0.52);
      }
      if (kind === 'return') {
        this.tone(360, 0.13, 0.025, 'triangle');
        this.tone(550, 0.18, 0.018, 'triangle', 0.08);
      }
      if (kind === 'peck') {
        this.noise(0.055, 0.045, 2200);
        this.tone(650, 0.05, 0.01);
      }
      if (kind === 'poof') this.noise(0.2, 0.07, 2700);
      if (kind === 'chirp') {
        this.tone(1800, 0.09, 0.025, 'sine');
        this.tone(2400, 0.12, 0.018, 'sine', 0.13);
      }
      if (kind === 'crow') {
        this.noise(0.25, 0.035, 1600);
        this.tone(310, 0.23, 0.015, 'sawtooth');
      }
      if (kind === 'fart') this.fart(variant);
      if (kind === 'dig') {
        this.noise(0.1, 0.07, 1600);
        this.tone(180, 0.08, 0.012);
      }
      if (kind === 'pet') {
        this.noise(0.25, 0.04, 350);
        this.tone(90, 0.18, 0.02);
      }
      if (kind === 'scratch') this.noise(0.23, 0.025, 900);
      if (kind === 'buy') {
        this.tone(440, 0.25, 0.025);
        this.tone(660, 0.35, 0.018, 'sine', 0.09);
      }
      if (kind === 'gold') {
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.45, 0.025, 'sine', i * 0.09));
      }
    }
    fart(variant) {
      if (!this.ctx || this.ctx.state !== 'running' || document.hidden) return;
      const duration = [0.19, 0.42, 0.78, 1.12][variant % 4],
        c = this.ctx,
        t = c.currentTime,
        o = c.createOscillator(),
        g = c.createGain(),
        filter = c.createBiquadFilter(),
        v = c.createOscillator(),
        vg = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime([110, 88, 75, 120][variant % 4], t);
      o.frequency.exponentialRampToValueAtTime(38, t + duration);
      v.frequency.value = [18, 9, 14, 6][variant % 4];
      vg.gain.value = 18;
      v.connect(vg);
      vg.connect(o.frequency);
      filter.type = 'lowpass';
      filter.frequency.value = 550;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.032, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(filter);
      filter.connect(g);
      g.connect(this.effectsBus);
      o.start();
      v.start();
      o.stop(t + duration);
      v.stop(t + duration);
      o.onended = () => {
        o.disconnect();
        v.disconnect();
        vg.disconnect();
        filter.disconnect();
        g.disconnect();
      };
    }
    schedule() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      if (!this.music || !this.ctx || document.hidden) return;
      const notes = [
        196, 0, 293.66, 0, 246.94, 0, 293.66, 0, 220, 0, 329.63, 0, 246.94, 0, 293.66, 0,
      ];
      this.timer = setInterval(() => {
        const f = notes[this.step++ % notes.length];
        if (f) this.tone(f, 1.7, 0.012, 'sine', 0, true);
        if (this.step % 8 === 1) this.tone(98, 2.8, 0.008, 'sine', 0, true);
      }, 440);
    }
  }
  window.PugSound = Sound;
})();
