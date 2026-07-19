export class AudioEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private lastCoin = 0;

  init(): void {
    if (this.ac) return;
    try {
      this.ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.master = this.ac.createGain();
      this.master.gain.value = 0.2;
      this.master.connect(this.ac.destination);
    } catch {
      this.ac = null;
    }
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.2;
  }

  private beep(f: number, d = 0.08, type: OscillatorType = 'sine', v = 0.5, slide = 0): void {
    if (!this.ac || !this.master || this.muted) return;
    const o = this.ac.createOscillator();
    const g = this.ac.createGain();
    o.type = type;
    o.frequency.value = f;
    if (slide) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), this.ac.currentTime + d);
    }
    g.gain.setValueAtTime(v, this.ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ac.currentTime + d);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ac.currentTime + d);
  }

  coin = (): void => {
    const n = performance.now();
    if (n - this.lastCoin < 180) return;
    this.lastCoin = n;
    this.beep(880, 0.05, 'sine', 0.22);
    setTimeout(() => this.beep(1320, 0.04, 'sine', 0.15), 36);
  };

  alarm = (): void => {
    this.beep(640, 0.09, 'square', 0.2);
    setTimeout(() => this.beep(500, 0.09, 'square', 0.2), 110);
  };

  break = (): void => {
    this.beep(85, 0.3, 'sawtooth', 0.5, -40);
    this.beep(160, 0.18, 'square', 0.25, -60);
  };

  fix = (): void => {
    this.beep(520, 0.06, 'triangle', 0.3);
    setTimeout(() => this.beep(780, 0.09, 'triangle', 0.26), 60);
  };

  prevent = (): void => {
    [660, 830, 990].forEach((f, i) => setTimeout(() => this.beep(f, 0.08, 'triangle', 0.28), i * 70));
  };

  phone = (): void => {
    this.beep(1250, 0.045, 'square', 0.12);
    setTimeout(() => this.beep(1250, 0.045, 'square', 0.12), 85);
  };

  unlock = (): void => {
    [440, 550, 660, 880].forEach((f, i) => setTimeout(() => this.beep(f, 0.09, 'sine', 0.24), i * 85));
  };

  auto = (): void => {
    this.beep(990, 0.05, 'triangle', 0.2);
    setTimeout(() => this.beep(1480, 0.06, 'triangle', 0.16), 50);
  };

  truck = (): void => {
    this.beep(180, 0.14, 'square', 0.2);
    setTimeout(() => this.beep(240, 0.1, 'square', 0.15), 120);
  };

  card = (): void => this.beep(720, 0.05, 'triangle', 0.25);
  wire = (): void => this.beep(900, 0.05, 'triangle', 0.25);
}
