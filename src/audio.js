'use strict';
/* Sons sintetizados com WebAudio. Só inicializa após um gesto do usuário. */

const Sound = {
  ac: null, master: null, eng: null, noise: null, muted: false,

  init() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ac = this.ac = new AC();
      this.master = ac.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ac.destination);

      const o1 = ac.createOscillator(); o1.type = 'sawtooth';
      const o2 = ac.createOscillator(); o2.type = 'square';
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650;
      const g = ac.createGain(); g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
      o1.start(); o2.start();
      this.eng = { o1, o2, g };

      const len = (ac.sampleRate * 0.5) | 0;
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;

      // Chiado contínuo da chuva (ruído agudo em loop, volume controlado por Sound.rain)
      const rs = ac.createBufferSource(); rs.buffer = buf; rs.loop = true;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
      const rg = ac.createGain(); rg.gain.value = 0;
      rs.connect(hp); hp.connect(rg); rg.connect(this.master);
      rs.start();
      this.rainGain = rg;
    } catch (e) {
      this.ac = null;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  },

  engine(ratio, pitch, on) {
    if (!this.eng) return;
    const t = this.ac.currentTime;
    const f = (38 + ratio * 95) * pitch;
    // Só reagenda quando algo muda de fato: evita acumular eventos de automação a cada frame
    if (on === this.eng.on && Math.abs(f - this.eng.f) < 0.5) return;
    this.eng.on = on;
    this.eng.f = f;
    for (const p of [this.eng.o1.frequency, this.eng.o2.frequency, this.eng.g.gain]) {
      if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
      else p.cancelScheduledValues(t);
    }
    this.eng.o1.frequency.setTargetAtTime(f, t, 0.05);
    this.eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    this.eng.g.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.08);
  },

  crash() {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = this.noise;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.45);
  },

  rain(level) {
    if (!this.rainGain) return;
    const v = Math.round(level * 20) / 20;          // só reagenda quando muda de verdade
    if (v === this.rainLevel) return;
    this.rainLevel = v;
    this.rainGain.gain.setTargetAtTime(v * 0.05, this.ac.currentTime, 0.3);
  },

  thunder(delay = 0.5) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime + delay;
    const src = ac.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = 0.35;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 1.9);
  },

  beep(freq, dur = 0.08, delay = 0, vol = 0.08) {
    if (!this.ac) return;
    const ac = this.ac, t = ac.currentTime + delay;
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  jingle() { [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.14, i * 0.12)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => this.beep(f, 0.22, i * 0.2)); },
};
