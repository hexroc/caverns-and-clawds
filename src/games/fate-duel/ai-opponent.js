/**
 * Fate Duel - AI Opponent
 * Various difficulty levels and behavior patterns
 */

const CHOICES_ARRAY = ['sword', 'shield', 'scroll'];

// What beats what (for counter-picking)
const COUNTERS = {
  sword: 'shield',
  shield: 'scroll',
  scroll: 'sword'
};

// What loses to what
const LOSES_TO = {
  sword: 'scroll',
  shield: 'sword',
  scroll: 'shield'
};

/**
 * AI Difficulty configurations
 */
const AI_DIFFICULTY = {
  easy: {
    name: 'Easy',
    thinkTimeMin: 1500,
    thinkTimeMax: 3000,
    pattern: 'random',
    description: 'Makes random choices'
  },
  normal: {
    name: 'Normal',
    thinkTimeMin: 800,
    thinkTimeMax: 2000,
    pattern: 'adaptive',
    adaptWeight: 0.3, // 30% chance to counter player's most used
    description: 'Adapts to your patterns'
  },
  hard: {
    name: 'Hard',
    thinkTimeMin: 400,
    thinkTimeMax: 1200,
    pattern: 'predictive',
    predictWeight: 0.5, // 50% chance to predict
    description: 'Predicts your moves'
  },
  boss: {
    name: 'Boss',
    thinkTimeMin: 100,
    thinkTimeMax: 600,
    pattern: 'prescient',
    cheatsOdds: 0.25, // 25% chance to "read" player input
    description: 'Sees into your soul'
  }
};

/**
 * AI Player class
 */
class FateDuelAI {
  constructor(options = {}) {
    this.difficulty = AI_DIFFICULTY[options.difficulty] || AI_DIFFICULTY.normal;
    this.name = options.name || 'Opponent';
    this.personality = options.personality || 'neutral';
    
    // Track opponent (player) history for pattern recognition
    this.opponentHistory = [];
    this.ownHistory = [];
    
    // Pending choice (for cheating mechanics)
    this.pendingPlayerChoice = null;
  }
  
  /**
   * Main method: decide what to play
   * @param {object} matchState - Current match status
   * @returns {Promise<string>} - The chosen move
   */
  async decide(matchState) {
    // Simulate thinking time
    const thinkTime = this.getThinkTime();
    await this.sleep(thinkTime);
    
    let choice;
    
    switch (this.difficulty.pattern) {
      case 'random':
        choice = this.randomChoice();
        break;
      case 'adaptive':
        choice = this.adaptiveChoice();
        break;
      case 'predictive':
        choice = this.predictiveChoice(matchState);
        break;
      case 'prescient':
        choice = this.prescientChoice(matchState);
        break;
      default:
        choice = this.randomChoice();
    }
    
    this.ownHistory.push(choice);
    return choice;
  }
  
  /**
   * Record what the opponent played (for learning)
   */
  recordOpponentChoice(choice) {
    this.opponentHistory.push(choice);
    this.pendingPlayerChoice = null;
  }
  
  /**
   * For prescient AI: peek at player's choice before deciding
   */
  peekPlayerChoice(choice) {
    this.pendingPlayerChoice = choice;
  }
  
  /**
   * Random choice - equal probability
   */
  randomChoice() {
    return CHOICES_ARRAY[Math.floor(Math.random() * 3)];
  }
  
  /**
   * Adaptive choice - counter most common player move
   */
  adaptiveChoice() {
    if (this.opponentHistory.length < 2 || Math.random() > this.difficulty.adaptWeight) {
      return this.randomChoice();
    }
    
    // Count opponent's choices
    const counts = { sword: 0, shield: 0, scroll: 0 };
    for (const choice of this.opponentHistory) {
      counts[choice]++;
    }
    
    // Find most common
    let mostCommon = 'sword';
    let maxCount = 0;
    for (const [choice, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = choice;
      }
    }
    
    // Counter it
    return COUNTERS[mostCommon];
  }
  
  /**
   * Predictive choice - analyze patterns
   */
  predictiveChoice(matchState) {
    if (Math.random() > this.difficulty.predictWeight) {
      return this.adaptiveChoice();
    }
    
    // Look for streaks
    if (this.opponentHistory.length >= 2) {
      const last = this.opponentHistory[this.opponentHistory.length - 1];
      const secondLast = this.opponentHistory[this.opponentHistory.length - 2];
      
      // If player played same thing twice, they might switch
      if (last === secondLast) {
        // Predict they'll play what beats their current choice
        const predictedSwitch = COUNTERS[last];
        return COUNTERS[predictedSwitch];
      }
      
      // If player is cycling, predict next in cycle
      const lastIndex = CHOICES_ARRAY.indexOf(last);
      const secondLastIndex = CHOICES_ARRAY.indexOf(secondLast);
      const direction = (lastIndex - secondLastIndex + 3) % 3;
      
      if (direction === 1 || direction === 2) {
        const predictedNext = CHOICES_ARRAY[(lastIndex + direction) % 3];
        return COUNTERS[predictedNext];
      }
    }
    
    // Check if player tends to counter AI's last move
    if (this.ownHistory.length >= 1 && this.opponentHistory.length >= 1) {
      const myLast = this.ownHistory[this.ownHistory.length - 1];
      const theirLast = this.opponentHistory[this.opponentHistory.length - 1];
      
      // If they countered us last time, they might do it again
      if (COUNTERS[myLast] === theirLast) {
        const predictedCounter = COUNTERS[this.ownHistory[this.ownHistory.length - 1]];
        return COUNTERS[predictedCounter];
      }
    }
    
    return this.adaptiveChoice();
  }
  
  /**
   * Prescient choice - sometimes "cheats" by knowing player's choice
   */
  prescientChoice(matchState) {
    // Check if we should cheat
    if (this.pendingPlayerChoice && Math.random() < this.difficulty.cheatsOdds) {
      // Counter the player's known choice
      return COUNTERS[this.pendingPlayerChoice];
    }
    
    // Otherwise use predictive
    return this.predictiveChoice(matchState);
  }
  
  /**
   * Get randomized think time
   */
  getThinkTime() {
    const range = this.difficulty.thinkTimeMax - this.difficulty.thinkTimeMin;
    return this.difficulty.thinkTimeMin + Math.random() * range;
  }
  
  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Reset history for new match
   */
  reset() {
    this.opponentHistory = [];
    this.ownHistory = [];
    this.pendingPlayerChoice = null;
  }
  
  /**
   * Get taunt message based on game state
   */
  getTaunt(situation) {
    const taunts = {
      win: [
        'The fates favor me!',
        'Too predictable.',
        'Better luck next time.',
        'I saw that coming.',
        'Fate is on my side.'
      ],
      lose: [
        'Lucky strike!',
        'You won\'t be so fortunate again.',
        'Hmm, interesting choice.',
        'The winds shift...',
        'A momentary setback.'
      ],
      tie: [
        'Great minds think alike.',
        'Balanced, as fate intended.',
        'Neither yields!',
        'A stalemate!',
        'The powers are equal.'
      ],
      start: [
        'Let the duel begin!',
        'May fate decide!',
        'Show me your resolve!',
        'The shrine awaits your choice.',
        'Choose wisely...'
      ],
      victory: [
        'The duel is mine!',
        'Fate has spoken!',
        'I am victorious!',
        'You fought well, but not well enough.',
        'The outcome was never in doubt.'
      ],
      defeat: [
        'You have bested me... this time.',
        'Well played, challenger.',
        'The fates have chosen you.',
        'I underestimated you.',
        'Victory is yours.'
      ]
    };
    
    const options = taunts[situation] || taunts.start;
    return options[Math.floor(Math.random() * options.length)];
  }
}

/**
 * Named AI opponents with personalities
 */
const NAMED_OPPONENTS = {
  shrine_keeper: {
    name: 'Keeper of the Shrine',
    difficulty: 'normal',
    personality: 'wise',
    portrait: '🧙',
    description: 'An ancient guardian who has witnessed countless duels.'
  },
  goblin_gambler: {
    name: 'Grix the Gambler',
    difficulty: 'easy',
    personality: 'mischievous',
    portrait: '👺',
    description: 'A sneaky goblin who loves games of chance.'
  },
  knight_champion: {
    name: 'Sir Valoris',
    difficulty: 'hard',
    personality: 'honorable',
    portrait: '🛡️',
    description: 'A knight who has never lost a duel of fate.'
  },
  fate_weaver: {
    name: 'The Fate Weaver',
    difficulty: 'boss',
    personality: 'mysterious',
    portrait: '👁️',
    description: 'A being who claims to see all possible futures.'
  },
  tavern_drunk: {
    name: 'Old Barley',
    difficulty: 'easy',
    personality: 'jovial',
    portrait: '🍺',
    description: 'A tipsy regular who challenges anyone to a duel.'
  },
  merchant_sharp: {
    name: 'Silvas the Sharp',
    difficulty: 'normal',
    personality: 'cunning',
    portrait: '💰',
    description: 'A merchant who never makes a deal without a duel.'
  }
};

/**
 * Create a named AI opponent
 */
function createNamedOpponent(id) {
  const config = NAMED_OPPONENTS[id];
  if (!config) {
    return new FateDuelAI({ name: 'Unknown Opponent', difficulty: 'normal' });
  }
  
  return new FateDuelAI({
    name: config.name,
    difficulty: config.difficulty,
    personality: config.personality
  });
}

// Exports
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    AI_DIFFICULTY,
    FateDuelAI,
    NAMED_OPPONENTS,
    createNamedOpponent,
    COUNTERS,
    LOSES_TO
  };
}

if (typeof window !== 'undefined') {
  window.FateDuel = window.FateDuel || {};
  window.FateDuel.AI_DIFFICULTY = AI_DIFFICULTY;
  window.FateDuel.FateDuelAI = FateDuelAI;
  window.FateDuel.NAMED_OPPONENTS = NAMED_OPPONENTS;
  window.FateDuel.createNamedOpponent = createNamedOpponent;
}
