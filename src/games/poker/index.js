/**
 * Clawd Poker - Module Index
 * 
 * Exports all poker game components.
 */

const { PokerGame, createDeck, shuffleDeck, evaluateBestHand, SUITS, RANKS, HAND_RANKINGS, PHASES, ACTIONS } = require('./poker-game');
const { PokerAI, AI_PERSONALITIES, evaluateStartingHand, evaluateHandStrength } = require('./poker-ai');
const { createPokerRoutes } = require('./poker-routes');

module.exports = {
  // Game logic
  PokerGame,
  createDeck,
  shuffleDeck,
  evaluateBestHand,
  
  // Constants
  SUITS,
  RANKS,
  HAND_RANKINGS,
  PHASES,
  ACTIONS,
  
  // AI
  PokerAI,
  AI_PERSONALITIES,
  evaluateStartingHand,
  evaluateHandStrength,
  
  // Routes
  createPokerRoutes
};
