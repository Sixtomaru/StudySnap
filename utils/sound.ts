// Simple synth sound manager using Web Audio API

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private globalVolume: number = 0.3; // Increased base volume

  constructor() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContext();
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  private init() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol: number = 0.3, startTime: number = 0) {
    if (!this.enabled || !this.ctx) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    
    // Envelope
    const effectiveVol = vol * 2.5; // BOOST VOLUME
    gain.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gain.gain.linearRampToValueAtTime(effectiveVol, this.ctx.currentTime + startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  // New noise generator for rocks
  playNoise(duration: number) {
      if (!this.enabled || !this.ctx) return;
      this.init();
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime); // Louder noise
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
  }

  playMatch(combo: number) {
    if (!this.enabled || !this.ctx) return;
    this.init();
    const baseFreq = 523.25 + (combo * 50);
    this.playTone(baseFreq, 'sine', 0.4, 0.2);
  }

  playSwap() {
    this.playTone(300, 'triangle', 0.1, 0.15);
  }

  playBeam() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    
    // Sci-fi charging beam sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.4); // Pitch up
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  playWin() {
    if (!this.enabled || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;

    // PLEASANT SURPRISE CHIME (Ascending Major Arpeggio + High Sparkle)
    // C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        // Sine for pure bell tone, Triangle for body
        osc.type = i === notes.length - 1 ? 'sine' : 'triangle'; 
        osc.frequency.setValueAtTime(freq, t + (i * 0.08)); // Staggered start (Arpeggio)

        gain.gain.setValueAtTime(0, t + (i * 0.08));
        gain.gain.linearRampToValueAtTime(0.3, t + (i * 0.08) + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + (i * 0.08) + 0.8); // Long sustain

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(t + (i * 0.08));
        osc.stop(t + (i * 0.08) + 1.0);
    });

    // Add a high "Sparkle" at the end
    const sparkleOsc = this.ctx.createOscillator();
    const sparkleGain = this.ctx.createGain();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(2093.00, t + 0.4); // C7
    sparkleGain.gain.setValueAtTime(0, t + 0.4);
    sparkleGain.gain.linearRampToValueAtTime(0.1, t + 0.45);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    
    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(this.ctx.destination);
    sparkleOsc.start(t + 0.4);
    sparkleOsc.stop(t + 0.8);
  }

  playLose() {
    [400, 350, 300].forEach((freq, i) => {
      this.playTone(freq, 'triangle', 0.6, 0.2, i * 0.3);
    });
  }
  
  playCaptureSuccess() {
      // Pleasant, grave success sound
      // G3 Major Triad (G3, B3, D4)
      [196.00, 246.94, 293.66].forEach((freq, i) => {
        this.playTone(freq, 'sine', 0.3, 0.3, i * 0.15);
      });
      // Final resolving note
      this.playTone(392.00, 'sine', 0.6, 0.3, 0.45); 
  }

  playShake() {
      this.playTone(150, 'sawtooth', 0.1, 0.1);
  }

  playRockBreak() {
      this.playNoise(0.3);
  }

  playIceBreak() {
      if (!this.enabled || !this.ctx) return;
      this.init();
      [2000, 2500, 3000].forEach((freq, i) => {
          this.playTone(freq, 'sine', 0.1, 0.1, i * 0.05);
      });
  }

  playThrow() {
      if (!this.enabled || !this.ctx) return;
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
  }

  playButton() {
      this.playTone(800, 'sine', 0.05, 0.2);
  }
}

export const soundManager = new SoundManager();