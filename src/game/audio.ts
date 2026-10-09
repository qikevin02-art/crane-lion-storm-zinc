export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  muted = false;

  unlock() {
    const AC = window.AudioContext;
    if (!AC) return;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.35);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  shoot() {
    this.tone(720 + Math.random() * 90, 0.045, "square", 0.045, 240);
  }

  hit() {
    this.tone(180, 0.06, "triangle", 0.05, 90);
  }

  explode() {
    this.burst(0.22, 0.16, 420);
    this.tone(140, 0.18, "sawtooth", 0.05, 50);
  }

  hurt() {
    this.burst(0.16, 0.12, 240);
    this.tone(90, 0.2, "square", 0.06, 40);
  }

  pickup() {
    this.tone(520, 0.07, "square", 0.05);
    this.tone(780, 0.09, "square", 0.04);
  }

  shield() {
    this.tone(880, 0.08, "sine", 0.05, 1320);
  }

  wave() {
    this.tone(440, 0.1, "triangle", 0.05);
    this.tone(660, 0.14, "triangle", 0.045);
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    toFreq?: number,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (toFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(40, toFreq), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private burst(dur: number, gain: number, freq: number) {
    if (!this.ctx || !this.master || !this.noise || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, t);
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + dur);
  }
}

let shared: Sfx | null = null;

export function getSfx(): Sfx {
  if (!shared) shared = new Sfx();
  return shared;
}
