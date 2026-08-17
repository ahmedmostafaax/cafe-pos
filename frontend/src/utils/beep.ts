// Web Audio API Sound Synthesizer for Cafe POS
class SoundManager {
  private ctx: AudioContext | null = null;
  private soundEnabled = true;

  constructor() {
    // Sound enabled by default
    const saved = localStorage.getItem("sound_enabled");
    if (saved !== null) {
      this.soundEnabled = saved === "true";
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggle(): boolean {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem("sound_enabled", String(this.soundEnabled));
    if (this.soundEnabled) this.playServiceCallSound();
    return this.soundEnabled;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playTone(freq: number, type: OscillatorType = "sine", duration = 0.15, gainVal = 0.25) {
    if (!this.soundEnabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio not permitted yet
    }
  }

  // 🔔 Alert for Table Service Calls (Table requests waiter / bill / water)
  public playServiceCallSound() {
    if (!this.soundEnabled) return;
    this.playTone(880, "sine", 0.18, 0.3);
    setTimeout(() => this.playTone(1174.66, "sine", 0.35, 0.35), 120);
  }

  // 📋 Alert for New Orders Created
  public playNewOrderSound() {
    if (!this.soundEnabled) return;
    this.playTone(523.25, "triangle", 0.1, 0.25);
    setTimeout(() => this.playTone(659.25, "triangle", 0.1, 0.25), 80);
    setTimeout(() => this.playTone(783.99, "triangle", 0.2, 0.3), 160);
  }

  // 💳 Alert for Payment Received
  public playPaymentSuccessSound() {
    if (!this.soundEnabled) return;
    this.playTone(587.33, "sine", 0.12, 0.25);
    setTimeout(() => this.playTone(880, "sine", 0.3, 0.35), 100);
  }
}

export const soundManager = new SoundManager();

export const playBeep = () => soundManager.playServiceCallSound();
export const playOrderSound = () => soundManager.playNewOrderSound();
export const playPaymentSound = () => soundManager.playPaymentSuccessSound();
export default soundManager;
