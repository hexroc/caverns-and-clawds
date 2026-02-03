/**
 * Fate Duel - Animation Sequences
 * Handles all visual effects and clash animations
 */

/**
 * Animation timing constants
 */
const TIMINGS = {
  choiceReveal: 600,    // Cards fly in
  clashPause: 400,      // Dramatic pause at center
  clashImpact: 300,     // Impact effect
  resultShow: 800,      // Winner highlight
  roundEnd: 1500,       // Full round animation
  particleDuration: 600
};

/**
 * SVG Icons for the choices
 */
const CHOICE_SVGS = {
  sword: `
    <svg viewBox="0 0 64 64" class="choice-icon sword-icon">
      <defs>
        <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f0f0"/>
          <stop offset="50%" style="stop-color:#c0c0c0"/>
          <stop offset="100%" style="stop-color:#808080"/>
        </linearGradient>
        <linearGradient id="swordHilt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8b4513"/>
          <stop offset="100%" style="stop-color:#5c3317"/>
        </linearGradient>
      </defs>
      <!-- Blade -->
      <path d="M32 4 L38 48 L32 56 L26 48 Z" fill="url(#swordBlade)" stroke="#404040" stroke-width="1"/>
      <!-- Edge highlight -->
      <path d="M32 6 L34 46 L32 52" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.6"/>
      <!-- Cross guard -->
      <rect x="20" y="48" width="24" height="4" rx="1" fill="url(#swordHilt)"/>
      <!-- Grip -->
      <rect x="29" y="52" width="6" height="8" fill="url(#swordHilt)"/>
      <!-- Pommel -->
      <circle cx="32" cy="62" r="3" fill="#ffd700"/>
    </svg>
  `,
  
  shield: `
    <svg viewBox="0 0 64 64" class="choice-icon shield-icon">
      <defs>
        <linearGradient id="shieldBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6b8fad"/>
          <stop offset="50%" style="stop-color:#457b9d"/>
          <stop offset="100%" style="stop-color:#2d5a7b"/>
        </linearGradient>
        <linearGradient id="shieldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#c9a227"/>
          <stop offset="100%" style="stop-color:#8b7500"/>
        </linearGradient>
      </defs>
      <!-- Shield body -->
      <path d="M32 4 C48 4 56 12 56 20 L56 32 C56 48 32 60 32 60 C32 60 8 48 8 32 L8 20 C8 12 16 4 32 4 Z" 
            fill="url(#shieldBody)" stroke="url(#shieldRim)" stroke-width="3"/>
      <!-- Inner decoration -->
      <path d="M32 12 C42 12 48 18 48 24 L48 32 C48 42 32 52 32 52 C32 52 16 42 16 32 L16 24 C16 18 22 12 32 12 Z" 
            fill="none" stroke="#ffffff" stroke-width="1" opacity="0.3"/>
      <!-- Center emblem -->
      <circle cx="32" cy="30" r="8" fill="#ffd700" opacity="0.8"/>
      <circle cx="32" cy="30" r="5" fill="url(#shieldBody)"/>
    </svg>
  `,
  
  scroll: `
    <svg viewBox="0 0 64 64" class="choice-icon scroll-icon">
      <defs>
        <linearGradient id="scrollPaper" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f5deb3"/>
          <stop offset="50%" style="stop-color:#fff8dc"/>
          <stop offset="100%" style="stop-color:#f5deb3"/>
        </linearGradient>
        <linearGradient id="scrollRod" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#8b4513"/>
          <stop offset="100%" style="stop-color:#5c3317"/>
        </linearGradient>
      </defs>
      <!-- Paper body -->
      <rect x="14" y="8" width="36" height="48" rx="2" fill="url(#scrollPaper)"/>
      <!-- Top roll -->
      <ellipse cx="32" cy="10" rx="22" ry="6" fill="url(#scrollPaper)"/>
      <ellipse cx="32" cy="10" rx="22" ry="6" fill="none" stroke="#d4a574" stroke-width="1"/>
      <!-- Bottom roll -->
      <ellipse cx="32" cy="54" rx="22" ry="6" fill="url(#scrollPaper)"/>
      <ellipse cx="32" cy="54" rx="22" ry="6" fill="none" stroke="#d4a574" stroke-width="1"/>
      <!-- Magic runes -->
      <text x="32" y="26" text-anchor="middle" fill="#9b5de5" font-size="8" font-family="serif">✧ ᚱᚢᚾᛖ ✧</text>
      <text x="32" y="36" text-anchor="middle" fill="#9b5de5" font-size="6" font-family="serif">⚡ ARCANA ⚡</text>
      <text x="32" y="44" text-anchor="middle" fill="#9b5de5" font-size="8" font-family="serif">✧ ᛗᚨᚷᛁᚲ ✧</text>
      <!-- Glow effect -->
      <rect x="14" y="8" width="36" height="48" rx="2" fill="#9b5de5" opacity="0.1"/>
    </svg>
  `
};

/**
 * Particle effects for clashes
 */
const PARTICLE_EFFECTS = {
  sparks: {
    colors: ['#ffd700', '#ff6b00', '#ffff00', '#ffffff'],
    count: 12,
    spread: 60,
    duration: 600
  },
  magic: {
    colors: ['#9b5de5', '#a855f7', '#7c3aed', '#c084fc'],
    count: 16,
    spread: 80,
    duration: 800
  },
  shield: {
    colors: ['#60a5fa', '#3b82f6', '#93c5fd', '#ffffff'],
    count: 10,
    spread: 50,
    duration: 500
  }
};

/**
 * Create and manage clash animations
 */
class ClashAnimator {
  constructor(container) {
    this.container = container;
    this.isAnimating = false;
  }
  
  /**
   * Run a full clash sequence
   * @param {string} choice1 - Player 1's choice
   * @param {string} choice2 - Player 2's choice
   * @param {number} winner - 0 (tie), 1, or 2
   */
  async playClash(choice1, choice2, winner) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    try {
      // Create arena
      const arena = this.createArena();
      this.container.appendChild(arena);
      
      // Create choice cards
      const card1 = this.createChoiceCard(choice1, 'left');
      const card2 = this.createChoiceCard(choice2, 'right');
      arena.querySelector('.clash-zone').appendChild(card1);
      arena.querySelector('.clash-zone').appendChild(card2);
      
      // Phase 1: Cards fly in
      await this.animateEntrance(card1, card2);
      
      // Phase 2: Dramatic pause
      await this.sleep(TIMINGS.clashPause);
      
      // Phase 3: Clash impact
      await this.animateImpact(arena, choice1, choice2, winner);
      
      // Phase 4: Show result
      await this.showResult(arena, card1, card2, winner);
      
      // Cleanup after delay
      await this.sleep(TIMINGS.roundEnd);
      arena.classList.add('fade-out');
      await this.sleep(300);
      arena.remove();
      
    } finally {
      this.isAnimating = false;
    }
  }
  
  /**
   * Create the clash arena element
   */
  createArena() {
    const arena = document.createElement('div');
    arena.className = 'fate-clash-arena';
    arena.innerHTML = `
      <div class="clash-backdrop"></div>
      <div class="clash-zone"></div>
      <div class="clash-particles"></div>
      <div class="clash-result"></div>
    `;
    return arena;
  }
  
  /**
   * Create a choice card element
   */
  createChoiceCard(choice, side) {
    const card = document.createElement('div');
    card.className = `choice-card choice-${choice} side-${side}`;
    card.innerHTML = `
      <div class="card-inner">
        <div class="card-front">
          ${CHOICE_SVGS[choice]}
          <span class="choice-name">${choice.toUpperCase()}</span>
        </div>
        <div class="card-glow"></div>
      </div>
    `;
    return card;
  }
  
  /**
   * Animate cards entering
   */
  async animateEntrance(card1, card2) {
    // Initial positions (off screen)
    card1.style.transform = 'translateX(-200px) scale(0.5) rotate(-30deg)';
    card2.style.transform = 'translateX(200px) scale(0.5) rotate(30deg)';
    card1.style.opacity = '0';
    card2.style.opacity = '0';
    
    // Force reflow
    card1.offsetHeight;
    
    // Trigger animation
    requestAnimationFrame(() => {
      card1.classList.add('entering');
      card2.classList.add('entering');
      card1.style.transform = 'translateX(-60px) scale(1) rotate(-5deg)';
      card2.style.transform = 'translateX(60px) scale(1) rotate(5deg)';
      card1.style.opacity = '1';
      card2.style.opacity = '1';
    });
    
    await this.sleep(TIMINGS.choiceReveal);
  }
  
  /**
   * Animate the clash impact
   */
  async animateImpact(arena, choice1, choice2, winner) {
    const zone = arena.querySelector('.clash-zone');
    const particleContainer = arena.querySelector('.clash-particles');
    
    // Screen shake
    arena.classList.add('shake');
    
    // Determine particle type
    let particleType = 'sparks';
    if (choice1 === 'scroll' || choice2 === 'scroll') {
      particleType = 'magic';
    }
    if ((choice1 === 'shield' && winner === 1) || (choice2 === 'shield' && winner === 2)) {
      particleType = 'shield';
    }
    
    // Create particles
    this.createParticles(particleContainer, particleType);
    
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'clash-flash';
    zone.appendChild(flash);
    
    await this.sleep(TIMINGS.clashImpact);
    arena.classList.remove('shake');
  }
  
  /**
   * Create particle burst
   */
  createParticles(container, type) {
    const config = PARTICLE_EFFECTS[type];
    
    for (let i = 0; i < config.count; i++) {
      const particle = document.createElement('div');
      particle.className = 'clash-particle';
      
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      const angle = (Math.PI * 2 * i) / config.count + (Math.random() - 0.5) * 0.5;
      const distance = config.spread + Math.random() * 20;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      particle.style.cssText = `
        background: ${color};
        box-shadow: 0 0 6px ${color};
        --end-x: ${x}px;
        --end-y: ${y}px;
        animation-duration: ${config.duration}ms;
      `;
      
      container.appendChild(particle);
      
      // Clean up after animation
      setTimeout(() => particle.remove(), config.duration);
    }
  }
  
  /**
   * Show the round result
   */
  async showResult(arena, card1, card2, winner) {
    const resultDiv = arena.querySelector('.clash-result');
    
    if (winner === 0) {
      // Tie - both push back
      card1.classList.add('tie');
      card2.classList.add('tie');
      resultDiv.innerHTML = '<span class="result-text tie">TIE!</span>';
    } else if (winner === 1) {
      // Player 1 wins
      card1.classList.add('winner');
      card2.classList.add('loser');
      resultDiv.innerHTML = '<span class="result-text win">VICTORY!</span>';
    } else {
      // Player 2 wins
      card1.classList.add('loser');
      card2.classList.add('winner');
      resultDiv.innerHTML = '<span class="result-text lose">DEFEAT!</span>';
    }
    
    resultDiv.classList.add('show');
    
    await this.sleep(TIMINGS.resultShow);
  }
  
  /**
   * Utility sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Timer animation for choice phase
 */
class TimerAnimator {
  constructor(element) {
    this.element = element;
    this.interval = null;
  }
  
  start(duration, onTick, onComplete) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    this.element.classList.add('active');
    
    this.interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const progress = 1 - (remaining / duration);
      
      onTick(remaining, progress);
      
      // Urgency class for last 3 seconds
      if (remaining <= 3000) {
        this.element.classList.add('urgent');
      }
      
      if (remaining <= 0) {
        this.stop();
        onComplete();
      }
    }, 100);
  }
  
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.element.classList.remove('active', 'urgent');
  }
}

/**
 * Victory/Defeat screen animator
 */
function playMatchEndAnimation(container, isVictory, stats) {
  const overlay = document.createElement('div');
  overlay.className = `match-end-overlay ${isVictory ? 'victory' : 'defeat'}`;
  
  overlay.innerHTML = `
    <div class="match-end-content">
      <div class="match-end-icon">${isVictory ? '🏆' : '💀'}</div>
      <h1 class="match-end-title">${isVictory ? 'VICTORY!' : 'DEFEAT'}</h1>
      <div class="match-end-score">
        <span class="score-value">${stats.playerScore}</span>
        <span class="score-divider">-</span>
        <span class="score-value">${stats.opponentScore}</span>
      </div>
      ${stats.reward ? `<div class="match-end-reward">+${stats.reward}</div>` : ''}
      <button class="match-end-continue">Continue</button>
    </div>
  `;
  
  container.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('show');
  });
  
  // Return promise that resolves when continue clicked
  return new Promise(resolve => {
    overlay.querySelector('.match-end-continue').addEventListener('click', () => {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 300);
    });
  });
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TIMINGS,
    CHOICE_SVGS,
    PARTICLE_EFFECTS,
    ClashAnimator,
    TimerAnimator,
    playMatchEndAnimation
  };
}

if (typeof window !== 'undefined') {
  window.FateDuel = window.FateDuel || {};
  window.FateDuel.TIMINGS = TIMINGS;
  window.FateDuel.CHOICE_SVGS = CHOICE_SVGS;
  window.FateDuel.ClashAnimator = ClashAnimator;
  window.FateDuel.TimerAnimator = TimerAnimator;
  window.FateDuel.playMatchEndAnimation = playMatchEndAnimation;
}
