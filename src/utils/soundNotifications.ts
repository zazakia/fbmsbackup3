export class SoundNotificationManager {
  private static instance: SoundNotificationManager;
  private audioContext: AudioContext | null = null;
  private isEnabled = true;

  private constructor() {
    this.initializeAudioContext();
  }

  static getInstance(): SoundNotificationManager {
    if (!SoundNotificationManager.instance) {
      SoundNotificationManager.instance = new SoundNotificationManager();
    }
    return SoundNotificationManager.instance;
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private async playTone(frequency: number, duration: number, volume = 0.1) {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      await this.resumeAudioContext();

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  }

  async playSuccess() {
    await this.playTone(800, 200);
    setTimeout(() => this.playTone(1000, 150), 100);
  }

  async playError() {
    await this.playTone(400, 300);
    setTimeout(() => this.playTone(300, 200), 150);
  }

  async playWarning() {
    await this.playTone(600, 250);
  }

  async playInfo() {
    await this.playTone(700, 150);
  }

  async playTaskComplete() {
    await this.playTone(523, 150); // C5
    setTimeout(() => this.playTone(659, 150), 100); // E5
    setTimeout(() => this.playTone(784, 200), 200); // G5
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  isAudioSupported(): boolean {
    return this.audioContext !== null;
  }
}

export const soundNotificationManager = SoundNotificationManager.getInstance();