// ---------------- 全局音效合成器 (Web Audio API 纯程序化发声，遵循 audio-design 规范) ----------------
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._initFailed = false;
    this._unlocked = false;

    // 分轨总线系统 (Audio Bus Hierarchy: audio-design 技能核心标准)
    this.masterGain = null;
    this.sfxGain = null;
    this.uiGain = null;

    this.masterVolume = 0.85;
    this.sfxVolume = 1.0;
    this.uiVolume = 0.9;
  }

  /** 静默失败：部分移动端需用户手势后才能创建 AudioContext */
  init() {
    if (this._initFailed || !this.enabled) return false;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
          this._initFailed = true;
          return false;
        }
        this.ctx = new AC();
        this._setupBuses();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this._unlocked = true;
      return true;
    } catch (e) {
      console.warn('[SoundEngine] init failed, audio disabled:', e);
      this._initFailed = true;
      this.enabled = false;
      return false;
    }
  }

  /** 初始化分轨总线：Master <- { SFX, UI } */
  _setupBuses() {
    if (!this.ctx) return;
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.uiGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.uiGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.updateBusVolumes();
  }

  /** 感知响度对数转换 (linear 0..1 -> dB -> gain) */
  linearToDb(val) {
    if (val <= 0.0001) return -80;
    return 20 * Math.log10(val);
  }

  dbToLinear(db) {
    if (db <= -79) return 0;
    return Math.pow(10, db / 20);
  }

  updateBusVolumes() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setValueAtTime(this.enabled ? this.masterVolume : 0, now);
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, now);
    this.uiGain.gain.setValueAtTime(this.uiVolume, now);
  }

  /** 音调微扰 (Pitch Wobble: 消除射击与受击的机关枪机械重复感) */
  _wobble(baseFreq, wobbleRatio = 0.07) {
    const factor = 1.0 + (Math.random() * 2 - 1) * wobbleRatio;
    return Math.max(20, baseFreq * factor);
  }

  _wobbleGain(baseGain, wobbleRatio = 0.08) {
    const factor = 1.0 + (Math.random() * 2 - 1) * wobbleRatio;
    return Math.max(0.005, baseGain * factor);
  }

  getSFXNode() {
    return this.sfxGain || (this.ctx ? this.ctx.destination : null);
  }

  getUINode() {
    return this.uiGain || (this.ctx ? this.ctx.destination : null);
  }

  /** 首次用户交互时解锁（移动端策略） */
  unlock() {
    if (this._unlocked || this._initFailed) return;
    this.init();
  }

  toggleMute() {
    this.enabled = !this.enabled;
    this.updateBusVolumes();
    return !this.enabled; // true = muted
  }

  playShoot() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // 随机音调微扰，避免每秒十发子弹带来听觉疲劳
    const startFreq = this._wobble(660, 0.08);
    const endFreq = this._wobble(115, 0.06);
    const shotGain = this._wobbleGain(0.12, 0.1);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.075);
    gain.gain.setValueAtTime(shotGain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.075);

    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.075);
  }

  playHit() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const startFreq = this._wobble(250, 0.12);
    const hitGain = this._wobbleGain(0.14, 0.1);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    gain.gain.setValueAtTime(hitGain, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playHeartbeat() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playExplosion() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.linearRampToValueAtTime(70, now + 0.4);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSFXNode());
    noise.start(now);
  }

  playFreeze() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playTruckRumble() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playGemPickup() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const startFreq = this._wobble(988, 0.05);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.33, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    osc.connect(gain);
    gain.connect(this.getUINode());
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playLevelUp() {
    if (!this.enabled || !this.init()) return;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc.connect(gain);
      gain.connect(this.getUINode());
      osc.start(now);
      osc.stop(now + 0.22);
    });
  }

  playWaveClearFanfare() {
    if (!this.enabled || !this.init()) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.connect(gain);
      gain.connect(this.getUINode());
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  playAlarm() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(450, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.getUINode());
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playCritHit() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(this._wobble(960, 0.06), now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.09);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.09);
  }

  playThermalShock() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.38);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.38);

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.linearRampToValueAtTime(400, now + 0.25);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.getSFXNode());
    noise.start(now);
  }

  playShatter() {
    if (!this.enabled || !this.init()) return;
    const freqs = [1800, 2400, 3200];
    freqs.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.02;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.12);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.getSFXNode());
      osc.start(now);
      osc.stop(now + 0.12);
    });
  }

  playFreezeSpray() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3.0, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSFXNode());
    noise.start(now);
  }

  playLaserBeam() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.16);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playTornado() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.2);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playBoomerang() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.linearRampToValueAtTime(740, now + 0.1);
    osc.frequency.linearRampToValueAtTime(380, now + 0.22);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playEmp() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.35);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.getSFXNode());
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playBossAlert() {
    if (!this.enabled || !this.init()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.3);
    osc.frequency.linearRampToValueAtTime(80, now + 0.75);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    osc.connect(gain);
    gain.connect(this.getUINode());
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

export const sound = new SoundEngine();

