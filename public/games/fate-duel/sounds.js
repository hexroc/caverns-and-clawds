/**
 * Fate Duel - Sound Effects Manager
 * Web Audio API-based sound system
 */

/**
 * Sound effect definitions (procedurally generated)
 */
const SOUND_CONFIGS = {
  choice_hover: {
    type: 'sine',
    frequency: 440,
    duration: 0.1,
    gain: 0.2,
    attack: 0.01,
    decay: 0.09
  },
  choice_select: {
    type: 'square',
    frequency: 660,
    duration: 0.15,
    gain: 0.25,
    attack: 0.01,
    decay: 0.14
  },
  timer_tick: {
    type: 'sine',
    frequency: 880,
    duration: 0.08,
    gain: 0.15,
    attack: 0.005,
    decay: 0.075
  },
  reveal: {
    type: 'sawtooth',
    frequency: 220,
    duration: 0.4,
    gain: 0.3,
    attack: 0.02,
    decay: 0.38,
    sweep: { start: 220, end: 660 }
  },
  clash_impact: {
    type: 'noise',
    duration: 0.3,
    gain: 0.4,
    attack: 0.01,
    decay: 0.29
  },
  victory: {
    type: 'chord',
    notes: [523, 659, 784], // C5, E5, G5
    duration: 0.8,
    gain: 0.3,
    attack: 0.02,
    decay: 0.78
  },
  defeat: {
    type: 'chord',
    notes: [220, 196, 175], // A3, G3, F3
    duration: 0.6,
    gain: 0.25,
    attack: 0.02,
    decay: 0.58
  },
  tie: {
    type: 'sine',
    frequency: 440,
    duration: 0.3,
    gain: 0.2,
    attack: 0.05,
    decay: 0.25
  }
};

/**
 * Audio context singleton
 */
let audioContext = null;

function getAudioContext() {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Sound Manager class
 */
class SoundManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.volume = options.volume || 0.5;
    this.ctx = null;
  }
  
  /**
   * Initialize audio context (must be called after user interaction)
   */
  init() {
    this.ctx = getAudioContext();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }
  
  /**
   * Play a sound effect
   * @param {string} soundId - ID from SOUND_CONFIGS
   */
  play(soundId) {
    if (!this.enabled || !this.ctx) return;
    
    const config = SOUND_CONFIGS[soundId];
    if (!config) return;
    
    try {
      if (config.type === 'noise') {
        this.playNoise(config);
      } else if (config.type === 'chord') {
        this.playChord(config);
      } else {
        this.playTone(config);
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  }
  
  /**
   * Play a simple tone
   */
  playTone(config) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    // Create oscillator
    const osc = ctx.createOscillator();
    osc.type = config.type;
    
    // Create gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(config.gain * this.volume, now + config.attack);
    gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
    
    // Frequency sweep if specified
    if (config.sweep) {
      osc.frequency.setValueAtTime(config.sweep.start, now);
      osc.frequency.linearRampToValueAtTime(config.sweep.end, now + config.duration);
    } else {
      osc.frequency.setValueAtTime(config.frequency, now);
    }
    
    // Connect and play
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + config.duration);
  }
  
  /**
   * Play white noise (for impacts)
   */
  playNoise(config) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    // Create buffer with white noise
    const bufferSize = ctx.sampleRate * config.duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    // Create source
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // Create gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(config.gain * this.volume, now + config.attack);
    gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
    
    // Add low-pass filter for "thump" quality
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    // Connect and play
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(now);
  }
  
  /**
   * Play a chord (multiple notes)
   */
  playChord(config) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    
    config.notes.forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      const gainNode = ctx.createGain();
      const noteGain = (config.gain * this.volume) / config.notes.length;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(noteGain, now + config.attack);
      gainNode.gain.linearRampToValueAtTime(0, now + config.duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + config.duration);
    });
  }
  
  /**
   * Play victory fanfare
   */
  playVictory() {
    this.play('victory');
  }
  
  /**
   * Play defeat sound
   */
  playDefeat() {
    this.play('defeat');
  }
  
  /**
   * Play clash impact
   */
  playClash() {
    this.play('clash_impact');
  }
  
  /**
   * Set volume (0-1)
   */
  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }
  
  /**
   * Toggle sound on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// Global sound manager instance
let soundManager = null;

function getSoundManager() {
  if (!soundManager) {
    soundManager = new SoundManager();
  }
  return soundManager;
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SOUND_CONFIGS,
    SoundManager,
    getSoundManager
  };
}

if (typeof window !== 'undefined') {
  window.FateDuel = window.FateDuel || {};
  window.FateDuel.SOUND_CONFIGS = SOUND_CONFIGS;
  window.FateDuel.SoundManager = SoundManager;
  window.FateDuel.getSoundManager = getSoundManager;
}
