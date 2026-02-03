/**
 * Fate Duel - Core Game Logic
 * Rock-Paper-Scissors themed as Sword > Scroll > Shield > Sword
 */

// The Three Choices
const CHOICES = {
  SWORD: 'sword',
  SHIELD: 'shield',
  SCROLL: 'scroll'
};

// Display info for each choice
const CHOICE_INFO = {
  sword: {
    name: 'Sword',
    emoji: '⚔️',
    icon: 'sword',
    color: '#e63946',
    beats: 'scroll',
    losesTo: 'shield',
    beatVerb: 'cuts through',
    loseVerb: 'deflected by'
  },
  shield: {
    name: 'Shield',
    emoji: '🛡️',
    icon: 'shield',
    color: '#457b9d',
    beats: 'sword',
    losesTo: 'scroll',
    beatVerb: 'deflects',
    loseVerb: 'pierced by'
  },
  scroll: {
    name: 'Scroll',
    emoji: '📜',
    icon: 'scroll',
    color: '#9b5de5',
    beats: 'shield',
    losesTo: 'sword',
    beatVerb: 'pierces through',
    loseVerb: 'cut by'
  }
};

// Match formats
const FORMATS = {
  TRIAL: { name: 'Trial by Fate', winTarget: 1, maxRounds: 1 },
  QUICK: { name: 'Quick Duel', winTarget: 2, maxRounds: 3 },
  GRAND: { name: 'Grand Duel', winTarget: 3, maxRounds: 5 }
};

/**
 * Determine the winner of a single round
 * @param {string} choice1 - First player's choice
 * @param {string} choice2 - Second player's choice
 * @returns {object} - Result with winner (1, 2, or 0 for tie)
 */
function resolveRound(choice1, choice2) {
  if (choice1 === choice2) {
    return {
      winner: 0,
      result: 'tie',
      narration: `Both chose ${CHOICE_INFO[choice1].name}! The fates are balanced.`
    };
  }
  
  const info1 = CHOICE_INFO[choice1];
  const info2 = CHOICE_INFO[choice2];
  
  if (info1.beats === choice2) {
    return {
      winner: 1,
      result: 'win',
      narration: `${info1.emoji} ${info1.name} ${info1.beatVerb} ${info2.emoji} ${info2.name}!`,
      winningChoice: choice1,
      losingChoice: choice2
    };
  } else {
    return {
      winner: 2,
      result: 'lose',
      narration: `${info2.emoji} ${info2.name} ${info2.beatVerb} ${info1.emoji} ${info1.name}!`,
      winningChoice: choice2,
      losingChoice: choice1
    };
  }
}

/**
 * Full match state manager
 */
class FateDuelMatch {
  constructor(options = {}) {
    this.format = FORMATS[options.format?.toUpperCase()] || FORMATS.QUICK;
    this.players = options.players || [
      { id: 'p1', name: 'Player 1' },
      { id: 'p2', name: 'Player 2' }
    ];
    
    this.scores = [0, 0];
    this.rounds = [];
    this.currentRound = 0;
    this.choices = [null, null];
    this.state = 'waiting'; // waiting, choosing, revealing, complete
    this.winner = null;
    
    // Power-ups in play
    this.powerUps = [null, null];
    
    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onRoundComplete = options.onRoundComplete || (() => {});
    this.onMatchComplete = options.onMatchComplete || (() => {});
  }
  
  /**
   * Start a new round
   */
  startRound() {
    this.currentRound++;
    this.choices = [null, null];
    this.state = 'choosing';
    this.onStateChange({ 
      type: 'round_start', 
      round: this.currentRound,
      scores: [...this.scores]
    });
  }
  
  /**
   * Submit a player's choice
   * @param {number} playerIndex - 0 or 1
   * @param {string} choice - sword, shield, or scroll
   */
  submitChoice(playerIndex, choice) {
    if (this.state !== 'choosing') return false;
    if (!Object.values(CHOICES).includes(choice)) return false;
    if (this.choices[playerIndex] !== null) return false;
    
    this.choices[playerIndex] = choice;
    
    this.onStateChange({
      type: 'choice_locked',
      playerIndex,
      playerName: this.players[playerIndex].name
    });
    
    // Check if both players have chosen
    if (this.choices[0] !== null && this.choices[1] !== null) {
      this.resolveClash();
    }
    
    return true;
  }
  
  /**
   * Apply power-up for a player
   * @param {number} playerIndex - 0 or 1
   * @param {string} powerUpId - ID of the power-up
   */
  usePowerUp(playerIndex, powerUpId) {
    this.powerUps[playerIndex] = powerUpId;
    this.onStateChange({
      type: 'powerup_used',
      playerIndex,
      powerUpId
    });
  }
  
  /**
   * Resolve the clash between choices
   */
  resolveClash() {
    this.state = 'revealing';
    
    const result = resolveRound(this.choices[0], this.choices[1]);
    
    // Apply power-up effects
    const modifiedResult = this.applyPowerUps(result);
    
    // Record the round
    const roundData = {
      round: this.currentRound,
      choices: [...this.choices],
      result: modifiedResult,
      scores: [...this.scores]
    };
    
    // Update scores
    if (modifiedResult.winner === 1) {
      this.scores[0]++;
    } else if (modifiedResult.winner === 2) {
      this.scores[1]++;
    }
    
    roundData.scoresAfter = [...this.scores];
    this.rounds.push(roundData);
    
    // Notify round complete
    this.onRoundComplete(roundData);
    
    this.onStateChange({
      type: 'clash',
      choices: [...this.choices],
      result: modifiedResult
    });
    
    // Check for match end
    if (this.checkMatchEnd()) {
      this.state = 'complete';
      this.onMatchComplete({
        winner: this.winner,
        winnerIndex: this.scores[0] >= this.format.winTarget ? 0 : 1,
        finalScores: [...this.scores],
        rounds: this.rounds
      });
    } else {
      // Ready for next round after a delay
      setTimeout(() => {
        if (this.state !== 'complete') {
          this.startRound();
        }
      }, 2500);
    }
    
    // Clear power-ups after use
    this.powerUps = [null, null];
  }
  
  /**
   * Apply power-up modifications to result
   */
  applyPowerUps(result) {
    let modifiedResult = { ...result };
    
    // Mirror Shield: lose becomes tie
    for (let i = 0; i < 2; i++) {
      if (this.powerUps[i] === 'mirror_shield') {
        const playerNum = i + 1;
        const opponentNum = i === 0 ? 2 : 1;
        if (modifiedResult.winner === opponentNum) {
          modifiedResult = {
            winner: 0,
            result: 'tie',
            narration: `🪞 Mirror Shield activates! The defeat is reflected into a tie!`,
            powerUpUsed: 'mirror_shield'
          };
        }
      }
    }
    
    // Lucky Charm: win ties
    for (let i = 0; i < 2; i++) {
      if (this.powerUps[i] === 'lucky_charm' && modifiedResult.winner === 0) {
        const playerNum = i + 1;
        modifiedResult = {
          winner: playerNum,
          result: 'win',
          narration: `🍀 Lucky Charm glows! ${this.players[i].name} wins the tie!`,
          powerUpUsed: 'lucky_charm'
        };
        break;
      }
    }
    
    // Double or Nothing: double the point value
    for (let i = 0; i < 2; i++) {
      if (this.powerUps[i] === 'double_or_nothing') {
        modifiedResult.doublePoints = i;
      }
    }
    
    return modifiedResult;
  }
  
  /**
   * Check if the match is over
   */
  checkMatchEnd() {
    // Someone reached win target
    if (this.scores[0] >= this.format.winTarget) {
      this.winner = this.players[0];
      return true;
    }
    if (this.scores[1] >= this.format.winTarget) {
      this.winner = this.players[1];
      return true;
    }
    
    // Maximum rounds reached
    if (this.currentRound >= this.format.maxRounds) {
      // Higher score wins, or tie if equal
      if (this.scores[0] > this.scores[1]) {
        this.winner = this.players[0];
      } else if (this.scores[1] > this.scores[0]) {
        this.winner = this.players[1];
      } else {
        this.winner = null; // Tie match
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current match status
   */
  getStatus() {
    return {
      format: this.format.name,
      round: this.currentRound,
      maxRounds: this.format.maxRounds,
      scores: [...this.scores],
      winTarget: this.format.winTarget,
      state: this.state,
      players: this.players.map((p, i) => ({
        ...p,
        score: this.scores[i],
        hasChosen: this.choices[i] !== null
      }))
    };
  }
  
  /**
   * Reset for a new match
   */
  reset() {
    this.scores = [0, 0];
    this.rounds = [];
    this.currentRound = 0;
    this.choices = [null, null];
    this.state = 'waiting';
    this.winner = null;
    this.powerUps = [null, null];
  }
}

// Export for Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHOICES,
    CHOICE_INFO,
    FORMATS,
    resolveRound,
    FateDuelMatch
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.FateDuel = window.FateDuel || {};
  window.FateDuel.CHOICES = CHOICES;
  window.FateDuel.CHOICE_INFO = CHOICE_INFO;
  window.FateDuel.FORMATS = FORMATS;
  window.FateDuel.resolveRound = resolveRound;
  window.FateDuel.FateDuelMatch = FateDuelMatch;
}
