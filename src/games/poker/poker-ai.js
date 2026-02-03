/**
 * Clawd Poker - AI Opponents
 * 
 * Fantasy-themed AI opponents with different play styles.
 */

const { evaluateBestHand, HAND_RANKINGS, ACTIONS } = require('./poker-game');

// ============================================================================
// AI PERSONALITIES
// ============================================================================

const AI_PERSONALITIES = {
  goblin: {
    name: 'Goblin Gambler',
    emoji: '👺',
    description: 'Aggressive and unpredictable. Bluffs often.',
    aggression: 0.8,       // How often to raise vs call
    bluffFrequency: 0.4,   // How often to bluff with weak hands
    tightness: 0.3,        // How selective with starting hands (higher = tighter)
    fearFactor: 0.2,       // How much to respect opponent bets
    thinkingTime: [500, 1500]  // Min/max thinking time in ms
  },
  
  dwarf: {
    name: 'Dwarven Banker',
    emoji: '⛏️',
    description: 'Tight and conservative. Only plays premium hands.',
    aggression: 0.4,
    bluffFrequency: 0.1,
    tightness: 0.8,
    fearFactor: 0.7,
    thinkingTime: [1000, 3000]
  },
  
  elf: {
    name: 'Elven Strategist',
    emoji: '🧝',
    description: 'Balanced play with good reads.',
    aggression: 0.5,
    bluffFrequency: 0.2,
    tightness: 0.5,
    fearFactor: 0.5,
    thinkingTime: [800, 2500]
  },
  
  dragon: {
    name: "Dragon's Hoard",
    emoji: '🐉',
    description: 'Expert-level AI. Adapts to opponents.',
    aggression: 0.55,
    bluffFrequency: 0.25,
    tightness: 0.45,
    fearFactor: 0.4,
    thinkingTime: [1500, 4000]
  }
};

// ============================================================================
// HAND STRENGTH EVALUATION
// ============================================================================

/**
 * Starting hand strength (preflop)
 * Returns 0-1 score
 */
function evaluateStartingHand(holeCards) {
  const [card1, card2] = holeCards;
  const high = Math.max(card1.value, card2.value);
  const low = Math.min(card1.value, card2.value);
  const suited = card1.suit === card2.suit;
  const pair = card1.rank === card2.rank;
  const gap = high - low;
  
  // Premium pairs (AA, KK, QQ, JJ)
  if (pair && high >= 11) return 0.9 + (high - 11) * 0.025;
  
  // Medium pairs (TT-77)
  if (pair && high >= 7) return 0.6 + (high - 7) * 0.05;
  
  // Low pairs (66-22)
  if (pair) return 0.4 + high * 0.02;
  
  // Premium broadway (AK, AQ suited)
  if (high === 14 && low >= 12 && suited) return 0.85;
  if (high === 14 && low >= 12) return 0.75;
  
  // Other broadway combinations
  if (high >= 12 && low >= 10) {
    const baseScore = 0.5 + (high + low - 22) * 0.05;
    return suited ? baseScore + 0.1 : baseScore;
  }
  
  // Suited connectors
  if (suited && gap === 1 && low >= 6) return 0.45 + low * 0.02;
  
  // Ace-x suited
  if (high === 14 && suited) return 0.4 + low * 0.015;
  
  // Connected cards
  if (gap <= 2 && low >= 6) return 0.3 + low * 0.015;
  
  // Everything else
  return 0.15 + high * 0.01;
}

/**
 * Evaluate hand strength on later streets
 * Returns 0-1 score based on made hand and draws
 */
function evaluateHandStrength(holeCards, communityCards) {
  if (communityCards.length === 0) {
    return evaluateStartingHand(holeCards);
  }
  
  const evaluation = evaluateBestHand(holeCards, communityCards);
  
  // Convert hand ranking to 0-1 scale
  const baseStrength = {
    [HAND_RANKINGS.HIGH_CARD]: 0.1,
    [HAND_RANKINGS.ONE_PAIR]: 0.3,
    [HAND_RANKINGS.TWO_PAIR]: 0.5,
    [HAND_RANKINGS.THREE_OF_A_KIND]: 0.65,
    [HAND_RANKINGS.STRAIGHT]: 0.75,
    [HAND_RANKINGS.FLUSH]: 0.8,
    [HAND_RANKINGS.FULL_HOUSE]: 0.88,
    [HAND_RANKINGS.FOUR_OF_A_KIND]: 0.95,
    [HAND_RANKINGS.STRAIGHT_FLUSH]: 0.98,
    [HAND_RANKINGS.ROYAL_FLUSH]: 1.0
  }[evaluation.ranking] || 0.1;
  
  // Adjust for kicker strength
  const kickerBonus = (evaluation.kickers[0] || 2) / 14 * 0.1;
  
  // Check for draws
  const drawBonus = calculateDraws(holeCards, communityCards) * 0.15;
  
  return Math.min(baseStrength + kickerBonus + drawBonus, 1.0);
}

/**
 * Calculate draw potential (flush draws, straight draws)
 * Returns 0-1 value
 */
function calculateDraws(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  let drawValue = 0;
  
  // Flush draw check
  const suitCounts = {};
  for (const card of allCards) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  if (maxSuitCount === 4) drawValue += 0.4; // 4 to flush
  if (maxSuitCount === 3 && communityCards.length <= 3) drawValue += 0.15; // Backdoor flush
  
  // Straight draw check
  const values = [...new Set(allCards.map(c => c.value))].sort((a, b) => a - b);
  
  // Check for open-ended straight draw (8 outs)
  for (let i = 0; i <= values.length - 4; i++) {
    if (values[i + 3] - values[i] === 3) {
      // Check if both ends are open
      if (values[i] > 2 && values[i + 3] < 14) {
        drawValue += 0.35;
        break;
      }
      // Gutshot (4 outs)
      drawValue += 0.15;
      break;
    }
  }
  
  return Math.min(drawValue, 0.5);
}

// ============================================================================
// POT ODDS & POSITION
// ============================================================================

/**
 * Calculate pot odds
 * Returns the break-even calling percentage
 */
function calculatePotOdds(callAmount, potSize) {
  if (callAmount === 0) return 0;
  return callAmount / (potSize + callAmount);
}

/**
 * Position strength (0-1)
 * Higher is better (later position)
 */
function getPositionStrength(seatNumber, dealerSeat, playerCount) {
  const positionFromDealer = (seatNumber - dealerSeat + playerCount) % playerCount;
  return positionFromDealer / (playerCount - 1);
}

// ============================================================================
// AI DECISION ENGINE
// ============================================================================

class PokerAI {
  constructor(personality = 'goblin') {
    this.personality = AI_PERSONALITIES[personality] || AI_PERSONALITIES.goblin;
    this.personalityKey = personality;
  }
  
  /**
   * Get AI's action for the current game state
   */
  getAction(gameState, seatNumber) {
    const player = gameState.players.find(p => p.seatNumber === seatNumber);
    if (!player || player.folded || player.allIn) {
      return null;
    }
    
    const holeCards = player.cards;
    const communityCards = gameState.communityCards;
    
    // Calculate hand strength
    const handStrength = evaluateHandStrength(holeCards, communityCards);
    
    // Calculate pot odds
    const callAmount = gameState.callAmount || 0;
    const potOdds = calculatePotOdds(callAmount, gameState.pot);
    
    // Get position
    const activePlayers = gameState.players.filter(p => !p.folded && !p.allIn).length;
    const position = getPositionStrength(seatNumber, gameState.dealerSeat, activePlayers);
    
    // Make decision
    return this.decide(handStrength, potOdds, position, gameState, player);
  }
  
  decide(handStrength, potOdds, position, gameState, player) {
    const { aggression, bluffFrequency, tightness, fearFactor } = this.personality;
    const callAmount = gameState.callAmount || 0;
    const canCheck = callAmount === 0;
    
    // Add randomness based on personality
    const randomFactor = Math.random();
    
    // Adjust hand strength perception based on position
    const adjustedStrength = handStrength + (position - 0.5) * 0.1;
    
    // Bluff opportunity
    const shouldBluff = randomFactor < bluffFrequency && adjustedStrength < 0.4;
    
    // Calculate effective strength (include bluffing)
    const effectiveStrength = shouldBluff ? 0.7 : adjustedStrength;
    
    // Fear factor - reduce aggression when facing big bets
    const betToPot = callAmount / (gameState.pot || 1);
    const fearAdjustment = betToPot * fearFactor;
    const adjustedAggression = Math.max(0.1, aggression - fearAdjustment);
    
    // Decision thresholds (adjusted by tightness)
    const foldThreshold = 0.2 + tightness * 0.15;
    const callThreshold = 0.4 + tightness * 0.1;
    const raiseThreshold = 0.6 + tightness * 0.1;
    
    // Make decision
    if (effectiveStrength < foldThreshold) {
      // Weak hand
      if (canCheck) {
        return { action: ACTIONS.CHECK };
      }
      // Sometimes call with draws or bluff
      if (potOdds < 0.3 && (calculateDraws(player.cards, gameState.communityCards) > 0.2 || randomFactor < 0.15)) {
        return { action: ACTIONS.CALL };
      }
      return { action: ACTIONS.FOLD };
    }
    
    if (effectiveStrength < callThreshold) {
      // Medium-weak hand
      if (canCheck) {
        // Sometimes bet for value/bluff
        if (randomFactor < adjustedAggression * 0.5) {
          return this.calculateRaise(gameState, 0.4);
        }
        return { action: ACTIONS.CHECK };
      }
      // Call if odds are good
      if (potOdds < effectiveStrength * 0.8) {
        return { action: ACTIONS.CALL };
      }
      return { action: ACTIONS.FOLD };
    }
    
    if (effectiveStrength < raiseThreshold) {
      // Medium-strong hand
      if (canCheck) {
        // Bet for value most of the time
        if (randomFactor < adjustedAggression) {
          return this.calculateRaise(gameState, 0.5);
        }
        return { action: ACTIONS.CHECK };
      }
      // Usually call, sometimes raise
      if (randomFactor < adjustedAggression * 0.4) {
        return this.calculateRaise(gameState, 0.6);
      }
      return { action: ACTIONS.CALL };
    }
    
    // Strong hand - usually raise
    if (randomFactor < adjustedAggression || canCheck) {
      return this.calculateRaise(gameState, effectiveStrength);
    }
    return { action: ACTIONS.CALL };
  }
  
  calculateRaise(gameState, strengthFactor) {
    const minRaise = gameState.minRaise || gameState.currentBet || 20;
    const pot = gameState.pot || 0;
    
    // Size raise based on hand strength and personality
    const sizeFactor = 0.5 + (strengthFactor * 0.5) + (this.personality.aggression * 0.3);
    const raiseSize = Math.max(minRaise, Math.floor(pot * sizeFactor * (0.8 + Math.random() * 0.4)));
    
    // Cap at reasonable size
    const maxRaise = pot * 2;
    const finalRaise = Math.min(raiseSize, maxRaise);
    
    return { action: ACTIONS.RAISE, amount: finalRaise };
  }
  
  /**
   * Get thinking time (for realistic delays)
   */
  getThinkingTime() {
    const [min, max] = this.personality.thinkingTime;
    return min + Math.random() * (max - min);
  }
  
  /**
   * Get flavor text for an action
   */
  getFlavorText(action) {
    const texts = {
      goblin: {
        [ACTIONS.FOLD]: ["Bah! Goblin fold...", "Too rich for goblin blood!", "Goblin save shinies for later!"],
        [ACTIONS.CHECK]: ["Goblin wait and see...", "*taps claws impatiently*", "Goblin check!"],
        [ACTIONS.CALL]: ["Goblin call! Shinies stay in pot!", "Me want those coins!", "*throws chips eagerly*"],
        [ACTIONS.RAISE]: ["GOBLIN RAISE! ME FEEL LUCKY!", "*cackles menacingly*", "More shinies! HEHEHEHE!"],
        [ACTIONS.ALL_IN]: ["ALL THE SHINIES! GOBLIN GO BIG!", "*slams chips on table*", "GOBLIN RISK EVERYTHING!"]
      },
      dwarf: {
        [ACTIONS.FOLD]: ["A wise retreat.", "The numbers don't add up.", "I'll save me gold for a better spot."],
        [ACTIONS.CHECK]: ["*strokes beard thoughtfully*", "I'll see what develops.", "Checking the odds..."],
        [ACTIONS.CALL]: ["A calculated investment.", "The margins are acceptable.", "I'll match that."],
        [ACTIONS.RAISE]: ["Time to press my advantage.", "*counts chips precisely*", "I believe I have the better hand."],
        [ACTIONS.ALL_IN]: ["All in. The books show this is correct.", "*pushes stack methodically*", "Maximum investment warranted."]
      },
      elf: {
        [ACTIONS.FOLD]: ["I sense danger in this hand.", "Wisdom dictates retreat.", "The spirits warn against this."],
        [ACTIONS.CHECK]: ["*eyes shimmer knowingly*", "I shall observe...", "Patience reveals truth."],
        [ACTIONS.CALL]: ["A reasonable wager.", "*nods gracefully*", "I accept your challenge."],
        [ACTIONS.RAISE]: ["The winds favor boldness.", "*smiles enigmatically*", "Fortune favors the prepared."],
        [ACTIONS.ALL_IN]: ["Destiny calls for bold action!", "*eyes glow with determination*", "All that I have, I commit!"]
      },
      dragon: {
        [ACTIONS.FOLD]: ["*smoke curls from nostrils*", "This prey is not worth hunting.", "The weak hand burns to ash."],
        [ACTIONS.CHECK]: ["*ancient eyes study the table*", "I bide my time...", "*tail swishes thoughtfully*"],
        [ACTIONS.CALL]: ["A pittance to add to my hoard.", "*coins clink like scales*", "Your offering is accepted."],
        [ACTIONS.RAISE]: ["My treasure demands growth!", "*flames flicker in eyes*", "KNEEL BEFORE THE DRAGON'S WEALTH!"],
        [ACTIONS.ALL_IN]: ["ALL GOLD BELONGS TO THE DRAGON!", "*roars with ancient power*", "WITNESS THE FULL MIGHT OF MY HOARD!"]
      }
    };
    
    const personalityTexts = texts[this.personalityKey] || texts.goblin;
    const actionTexts = personalityTexts[action] || [`${this.personality.name} ${action}s.`];
    return actionTexts[Math.floor(Math.random() * actionTexts.length)];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PokerAI,
  AI_PERSONALITIES,
  evaluateStartingHand,
  evaluateHandStrength,
  calculatePotOdds,
  getPositionStrength
};
