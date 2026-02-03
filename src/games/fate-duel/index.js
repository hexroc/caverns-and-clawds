/**
 * Fate Duel - Main Entry Point
 * Rock-Paper-Scissors minigame for Caverns & Clawds
 * 
 * @example
 * // In browser:
 * const duel = new FateDuel.Game({
 *   container: document.getElementById('game-area'),
 *   format: 'quick',
 *   opponent: 'shrine_keeper',
 *   onComplete: (result) => console.log('Duel complete!', result)
 * });
 * duel.start();
 * 
 * @example
 * // In Node.js (logic only):
 * const { FateDuelMatch, FateDuelAI } = require('./src/games/fate-duel');
 */

// Import modules (for Node.js)
let gameLogic, aiOpponent, animations, powerUps;

if (typeof require !== 'undefined') {
  gameLogic = require('./game-logic');
  aiOpponent = require('./ai-opponent');
  animations = require('./animations');
  powerUps = require('./power-ups');
}

/**
 * Main Fate Duel Game class
 * Handles the full game UI and experience
 */
class FateDuelGame {
  constructor(options = {}) {
    this.container = options.container;
    this.format = options.format || 'quick';
    this.playerName = options.playerName || 'Hero';
    this.opponentId = options.opponent || 'shrine_keeper';
    this.stakes = options.stakes || null;
    this.onComplete = options.onComplete || (() => {});
    this.onRoundEnd = options.onRoundEnd || (() => {});
    
    // Get modules from window or requires
    const GL = gameLogic || window.FateDuel;
    const AI = aiOpponent || window.FateDuel;
    const ANIM = animations || window.FateDuel;
    const PU = powerUps || window.FateDuel;
    
    // Initialize match
    this.match = new GL.FateDuelMatch({
      format: this.format,
      players: [
        { id: 'player', name: this.playerName },
        { id: 'ai', name: this.getOpponentName() }
      ],
      onStateChange: (event) => this.handleStateChange(event),
      onRoundComplete: (round) => this.handleRoundComplete(round),
      onMatchComplete: (result) => this.handleMatchComplete(result)
    });
    
    // Initialize AI
    const opponentConfig = AI.NAMED_OPPONENTS[this.opponentId] || {};
    this.ai = new AI.FateDuelAI({
      name: opponentConfig.name || 'Opponent',
      difficulty: opponentConfig.difficulty || 'normal',
      personality: opponentConfig.personality || 'neutral'
    });
    
    // Initialize animator (browser only)
    this.clashAnimator = null;
    if (this.container) {
      this.clashAnimator = new ANIM.ClashAnimator(document.body);
    }
    
    // Player's power-up inventory
    this.powerUpInventory = new PU.PowerUpInventory();
    
    // UI state
    this.selectedChoice = null;
    this.timerInterval = null;
    this.choiceTimeout = 5000; // 5 seconds to choose
    
    // Key bindings
    this.keyBindings = {
      '1': 'sword',
      's': 'sword',
      '2': 'shield',
      'd': 'shield',
      '3': 'scroll',
      'f': 'scroll'
    };
  }
  
  /**
   * Get opponent display name
   */
  getOpponentName() {
    const AI = aiOpponent || window.FateDuel;
    const config = AI.NAMED_OPPONENTS[this.opponentId];
    return config?.name || 'Mysterious Opponent';
  }
  
  /**
   * Get opponent portrait
   */
  getOpponentPortrait() {
    const AI = aiOpponent || window.FateDuel;
    const config = AI.NAMED_OPPONENTS[this.opponentId];
    return config?.portrait || '❓';
  }
  
  /**
   * Start the game
   */
  start() {
    if (this.container) {
      this.render();
      this.attachEventListeners();
    }
    
    // Show intro then start first round
    setTimeout(() => {
      this.showMessage(this.ai.getTaunt('start'), this.getOpponentPortrait());
      setTimeout(() => this.match.startRound(), 2000);
    }, 500);
  }
  
  /**
   * Render the game UI
   */
  render() {
    if (!this.container) return;
    
    const GL = gameLogic || window.FateDuel;
    const status = this.match.getStatus();
    
    this.container.innerHTML = `
      <div class="fate-duel-container">
        <!-- Header -->
        <div class="fate-duel-header">
          <span class="fate-duel-title">⚔️ Fate Duel</span>
          <span class="fate-duel-format">${status.format}</span>
        </div>
        
        <!-- Scoreboard -->
        <div class="fate-scoreboard">
          <div class="fate-player">
            <span class="fate-player-name">${this.playerName}</span>
            <span class="fate-player-score" id="player-score">${status.scores[0]}</span>
          </div>
          <span class="fate-score-divider">—</span>
          <div class="fate-player">
            <span class="fate-player-name">${this.getOpponentName()}</span>
            <span class="fate-player-score" id="opponent-score">${status.scores[1]}</span>
          </div>
        </div>
        
        <!-- Round Indicator -->
        <div class="fate-round-indicator">
          Round <span id="round-num">${status.round || 1}</span> of ${status.maxRounds}
          • First to ${status.winTarget}
        </div>
        
        <!-- Main Game Area -->
        <div class="fate-game-area" id="game-area">
          <div class="fate-waiting">
            <div class="fate-waiting-icon">⚔️</div>
            <div class="fate-waiting-text">Preparing the duel...</div>
          </div>
        </div>
        
        <!-- Keyboard Hints -->
        <div class="fate-keyboard-hints">
          <div class="fate-key-hint"><span class="fate-key">1</span> Sword</div>
          <div class="fate-key-hint"><span class="fate-key">2</span> Shield</div>
          <div class="fate-key-hint"><span class="fate-key">3</span> Scroll</div>
        </div>
      </div>
      
      <!-- Message Overlay -->
      <div class="fate-message-overlay" id="message-overlay" style="display: none;">
        <div class="fate-message-box">
          <div class="fate-message-portrait" id="message-portrait"></div>
          <div class="fate-message-text" id="message-text"></div>
        </div>
      </div>
    `;
    
    // Add message overlay styles if not present
    if (!document.getElementById('fate-duel-message-styles')) {
      const style = document.createElement('style');
      style.id = 'fate-duel-message-styles';
      style.textContent = `
        .fate-message-overlay {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 500;
        }
        .fate-message-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background: rgba(26, 26, 46, 0.95);
          border: 2px solid #ffd166;
          border-radius: 12px;
          animation: messageIn 300ms ease;
        }
        @keyframes messageIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .fate-message-portrait {
          font-size: 2rem;
        }
        .fate-message-text {
          font-size: 1.1rem;
          color: #e8e8e8;
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Keyboard input
    this.keyHandler = (e) => {
      const choice = this.keyBindings[e.key.toLowerCase()];
      if (choice && this.match.state === 'choosing') {
        this.selectChoice(choice);
      }
    };
    document.addEventListener('keydown', this.keyHandler);
  }
  
  /**
   * Clean up event listeners
   */
  destroy() {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
  
  /**
   * Show choice selector UI
   */
  showChoiceSelector() {
    const gameArea = this.container?.querySelector('#game-area');
    if (!gameArea) return;
    
    const GL = gameLogic || window.FateDuel;
    const ANIM = animations || window.FateDuel;
    
    gameArea.innerHTML = `
      <div class="fate-choice-area">
        <div class="fate-choice-prompt">Choose your fate!</div>
        
        <div class="fate-timer" id="timer">
          <div class="fate-timer-bar">
            <div class="fate-timer-fill" id="timer-fill" style="width: 100%"></div>
          </div>
          <div class="fate-timer-text" id="timer-text">5.0</div>
        </div>
        
        <div class="fate-choices">
          <button class="fate-choice-btn sword" data-choice="sword">
            ${ANIM.CHOICE_SVGS.sword}
            <span class="choice-label">Sword</span>
          </button>
          <button class="fate-choice-btn shield" data-choice="shield">
            ${ANIM.CHOICE_SVGS.shield}
            <span class="choice-label">Shield</span>
          </button>
          <button class="fate-choice-btn scroll" data-choice="scroll">
            ${ANIM.CHOICE_SVGS.scroll}
            <span class="choice-label">Scroll</span>
          </button>
        </div>
        
        <div class="fate-opponent-status choosing" id="opponent-status">
          <span>${this.getOpponentPortrait()}</span>
          <span>${this.getOpponentName()} is thinking...</span>
        </div>
      </div>
    `;
    
    // Add click handlers to choice buttons
    gameArea.querySelectorAll('.fate-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice;
        this.selectChoice(choice);
      });
    });
    
    // Start timer
    this.startTimer();
    
    // Start AI thinking
    this.startAIThinking();
  }
  
  /**
   * Start the choice timer
   */
  startTimer() {
    const startTime = Date.now();
    const duration = this.choiceTimeout;
    
    const timerFill = this.container?.querySelector('#timer-fill');
    const timerText = this.container?.querySelector('#timer-text');
    const timer = this.container?.querySelector('#timer');
    
    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = remaining / duration;
      
      if (timerFill) timerFill.style.width = `${progress * 100}%`;
      if (timerText) timerText.textContent = (remaining / 1000).toFixed(1);
      
      // Urgent mode in last 3 seconds
      if (remaining <= 3000 && timer) {
        timer.classList.add('urgent');
      }
      
      // Time's up - random choice
      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        if (!this.selectedChoice) {
          const GL = gameLogic || window.FateDuel;
          const choices = Object.values(GL.CHOICES);
          this.selectChoice(choices[Math.floor(Math.random() * choices.length)]);
        }
      }
    }, 100);
  }
  
  /**
   * Start AI decision process
   */
  async startAIThinking() {
    const status = this.match.getStatus();
    
    try {
      const aiChoice = await this.ai.decide(status);
      this.match.submitChoice(1, aiChoice);
      
      // Update UI to show AI is ready
      const statusEl = this.container?.querySelector('#opponent-status');
      if (statusEl) {
        statusEl.className = 'fate-opponent-status ready';
        statusEl.innerHTML = `
          <span>${this.getOpponentPortrait()}</span>
          <span>${this.getOpponentName()} is ready!</span>
        `;
      }
    } catch (e) {
      console.error('AI decision error:', e);
      // Fallback to random
      this.match.submitChoice(1, 'sword');
    }
  }
  
  /**
   * Handle player selecting a choice
   */
  selectChoice(choice) {
    if (this.selectedChoice) return; // Already selected
    if (this.match.state !== 'choosing') return;
    
    this.selectedChoice = choice;
    
    // Clear timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    // Update UI
    const buttons = this.container?.querySelectorAll('.fate-choice-btn');
    buttons?.forEach(btn => {
      if (btn.dataset.choice === choice) {
        btn.classList.add('selected');
      } else {
        btn.classList.add('locked');
      }
    });
    
    // Submit choice
    this.match.submitChoice(0, choice);
    
    // Tell AI what player chose (for prescient AI)
    this.ai.peekPlayerChoice(choice);
  }
  
  /**
   * Handle state changes from match
   */
  handleStateChange(event) {
    switch (event.type) {
      case 'round_start':
        this.selectedChoice = null;
        this.updateScores(event.scores);
        this.updateRound(event.round);
        this.showChoiceSelector();
        break;
        
      case 'choice_locked':
        // Visual feedback handled in selectChoice
        break;
        
      case 'clash':
        this.playClashAnimation(event.choices, event.result);
        break;
    }
  }
  
  /**
   * Handle round completion
   */
  handleRoundComplete(roundData) {
    // Record AI's choice for learning
    this.ai.recordOpponentChoice(roundData.choices[0]);
    
    // Update scores
    this.updateScores(roundData.scoresAfter);
    
    // Show taunt
    const situation = roundData.result.winner === 2 ? 'win' : 
                      roundData.result.winner === 1 ? 'lose' : 'tie';
    setTimeout(() => {
      this.showMessage(this.ai.getTaunt(situation), this.getOpponentPortrait());
    }, 2000);
    
    // Callback
    this.onRoundEnd(roundData);
  }
  
  /**
   * Handle match completion
   */
  async handleMatchComplete(result) {
    const isVictory = result.winnerIndex === 0;
    
    // Show final taunt
    setTimeout(() => {
      this.showMessage(
        this.ai.getTaunt(isVictory ? 'defeat' : 'victory'),
        this.getOpponentPortrait()
      );
    }, 2500);
    
    // Play end animation
    if (this.container) {
      const ANIM = animations || window.FateDuel;
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      await ANIM.playMatchEndAnimation(document.body, isVictory, {
        playerScore: result.finalScores[0],
        opponentScore: result.finalScores[1],
        reward: this.stakes?.win?.gold && isVictory ? `${this.stakes.win.gold} gold` : null
      });
    }
    
    // Clean up
    this.destroy();
    
    // Callback with full result
    this.onComplete({
      ...result,
      isVictory,
      stakes: this.stakes
    });
  }
  
  /**
   * Play the clash animation
   */
  async playClashAnimation(choices, result) {
    if (!this.clashAnimator) return;
    
    await this.clashAnimator.playClash(
      choices[0], // player
      choices[1], // opponent
      result.winner === 1 ? 1 : result.winner === 2 ? 2 : 0
    );
  }
  
  /**
   * Update score display
   */
  updateScores(scores) {
    const playerScore = this.container?.querySelector('#player-score');
    const opponentScore = this.container?.querySelector('#opponent-score');
    
    if (playerScore) playerScore.textContent = scores[0];
    if (opponentScore) opponentScore.textContent = scores[1];
  }
  
  /**
   * Update round display
   */
  updateRound(round) {
    const roundNum = this.container?.querySelector('#round-num');
    if (roundNum) roundNum.textContent = round;
  }
  
  /**
   * Show a message overlay
   */
  showMessage(text, portrait = '📜', duration = 2000) {
    const overlay = this.container?.parentElement?.querySelector('#message-overlay') ||
                    document.querySelector('#message-overlay');
    if (!overlay) return;
    
    const portraitEl = overlay.querySelector('#message-portrait');
    const textEl = overlay.querySelector('#message-text');
    
    if (portraitEl) portraitEl.textContent = portrait;
    if (textEl) textEl.textContent = `"${text}"`;
    
    overlay.style.display = 'block';
    
    setTimeout(() => {
      overlay.style.display = 'none';
    }, duration);
  }
}

// Export everything
const FateDuelExports = {
  // Main game class
  Game: FateDuelGame,
  
  // Core logic
  ...(gameLogic || {}),
  
  // AI
  ...(aiOpponent || {}),
  
  // Animations
  ...(animations || {}),
  
  // Power-ups
  ...(powerUps || {})
};

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FateDuelExports;
}

// Browser global
if (typeof window !== 'undefined') {
  window.FateDuel = {
    ...(window.FateDuel || {}),
    ...FateDuelExports,
    Game: FateDuelGame
  };
}
