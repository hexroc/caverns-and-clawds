/**
 * Clawd Poker - Core Game Logic
 * 
 * Texas Hold'em poker with fantasy theming.
 * Swords, Potions, Gems, Shields instead of traditional suits.
 */

const crypto = require('crypto');

// ============================================================================
// CONSTANTS
// ============================================================================

const SUITS = ['swords', 'potions', 'gems', 'shields'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Rank values for comparison (Ace high)
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand rankings (higher = better)
const HAND_RANKINGS = {
  HIGH_CARD: 1,
  ONE_PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

// Betting phases
const PHASES = {
  WAITING: 'waiting',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  COMPLETE: 'complete'
};

// Actions
const ACTIONS = {
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  RAISE: 'raise',
  ALL_IN: 'all_in'
};

// ============================================================================
// CARD & DECK
// ============================================================================

/**
 * Create a single card
 */
function createCard(rank, suit) {
  return { rank, suit, value: RANK_VALUES[rank] };
}

/**
 * Create a fresh 52-card deck
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get fantasy name for a card
 */
function getCardName(card) {
  const rankNames = {
    'J': 'Squire',
    'Q': 'Mage',
    'K': 'Dragon Lord',
    'A': 'Artifact'
  };
  
  const suitNames = {
    'swords': 'Swords',
    'potions': 'Potions',
    'gems': 'Gems',
    'shields': 'Shields'
  };
  
  const rankName = rankNames[card.rank] || card.rank;
  return `${rankName} of ${suitNames[card.suit]}`;
}

/**
 * Get card display symbol
 */
function getCardSymbol(card) {
  const suitSymbols = {
    'swords': '⚔️',
    'potions': '🧪',
    'gems': '💎',
    'shields': '🛡️'
  };
  return `${card.rank}${suitSymbols[card.suit]}`;
}

// ============================================================================
// HAND EVALUATION
// ============================================================================

/**
 * Get all 5-card combinations from 7 cards
 */
function getCombinations(cards, size = 5) {
  if (size === 0) return [[]];
  if (cards.length === 0) return [];
  
  const [first, ...rest] = cards;
  const withFirst = getCombinations(rest, size - 1).map(combo => [first, ...combo]);
  const withoutFirst = getCombinations(rest, size);
  
  return [...withFirst, ...withoutFirst];
}

/**
 * Check if cards form a flush
 */
function isFlush(cards) {
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

/**
 * Check if cards form a straight (returns high card value or 0)
 */
function getStraightHighCard(cards) {
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // Check for wheel (A-2-3-4-5)
  if (values[0] === 2 && values[1] === 3 && values[2] === 4 && 
      values[3] === 5 && values[4] === 14) {
    return 5; // Low straight, 5 high
  }
  
  // Check for regular straight
  for (let i = 0; i < 4; i++) {
    if (values[i + 1] !== values[i] + 1) return 0;
  }
  
  return values[4]; // High card of straight
}

/**
 * Count cards by rank
 */
function countRanks(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  return counts;
}

/**
 * Evaluate a 5-card hand
 * Returns { ranking, name, score, kickers }
 */
function evaluateFiveCards(cards) {
  const flush = isFlush(cards);
  const straightHigh = getStraightHighCard(cards);
  const straight = straightHigh > 0;
  const rankCounts = countRanks(cards);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  
  // Royal Flush
  if (flush && straight && straightHigh === 14) {
    return {
      ranking: HAND_RANKINGS.ROYAL_FLUSH,
      name: 'Royal Flush',
      score: HAND_RANKINGS.ROYAL_FLUSH * 1e10,
      kickers: []
    };
  }
  
  // Straight Flush
  if (flush && straight) {
    return {
      ranking: HAND_RANKINGS.STRAIGHT_FLUSH,
      name: 'Straight Flush',
      score: HAND_RANKINGS.STRAIGHT_FLUSH * 1e10 + straightHigh,
      kickers: [straightHigh]
    };
  }
  
  // Four of a Kind
  if (counts[0] === 4) {
    const quadRank = Object.entries(rankCounts).find(([r, c]) => c === 4)[0];
    const kicker = Object.entries(rankCounts).find(([r, c]) => c === 1)[0];
    return {
      ranking: HAND_RANKINGS.FOUR_OF_A_KIND,
      name: 'Four of a Kind',
      score: HAND_RANKINGS.FOUR_OF_A_KIND * 1e10 + RANK_VALUES[quadRank] * 100 + RANK_VALUES[kicker],
      kickers: [RANK_VALUES[quadRank], RANK_VALUES[kicker]]
    };
  }
  
  // Full House
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = Object.entries(rankCounts).find(([r, c]) => c === 3)[0];
    const pairRank = Object.entries(rankCounts).find(([r, c]) => c === 2)[0];
    return {
      ranking: HAND_RANKINGS.FULL_HOUSE,
      name: 'Full House',
      score: HAND_RANKINGS.FULL_HOUSE * 1e10 + RANK_VALUES[tripRank] * 100 + RANK_VALUES[pairRank],
      kickers: [RANK_VALUES[tripRank], RANK_VALUES[pairRank]]
    };
  }
  
  // Flush
  if (flush) {
    const score = values.reduce((acc, v, i) => acc + v * Math.pow(100, 4 - i), 0);
    return {
      ranking: HAND_RANKINGS.FLUSH,
      name: 'Flush',
      score: HAND_RANKINGS.FLUSH * 1e10 + score,
      kickers: values
    };
  }
  
  // Straight
  if (straight) {
    return {
      ranking: HAND_RANKINGS.STRAIGHT,
      name: 'Straight',
      score: HAND_RANKINGS.STRAIGHT * 1e10 + straightHigh,
      kickers: [straightHigh]
    };
  }
  
  // Three of a Kind
  if (counts[0] === 3) {
    const tripRank = Object.entries(rankCounts).find(([r, c]) => c === 3)[0];
    const kickers = values.filter(v => v !== RANK_VALUES[tripRank]).slice(0, 2);
    return {
      ranking: HAND_RANKINGS.THREE_OF_A_KIND,
      name: 'Three of a Kind',
      score: HAND_RANKINGS.THREE_OF_A_KIND * 1e10 + RANK_VALUES[tripRank] * 10000 + kickers[0] * 100 + kickers[1],
      kickers: [RANK_VALUES[tripRank], ...kickers]
    };
  }
  
  // Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.entries(rankCounts)
      .filter(([r, c]) => c === 2)
      .map(([r]) => RANK_VALUES[r])
      .sort((a, b) => b - a);
    const kicker = values.find(v => !pairs.includes(v));
    return {
      ranking: HAND_RANKINGS.TWO_PAIR,
      name: 'Two Pair',
      score: HAND_RANKINGS.TWO_PAIR * 1e10 + pairs[0] * 10000 + pairs[1] * 100 + kicker,
      kickers: [...pairs, kicker]
    };
  }
  
  // One Pair
  if (counts[0] === 2) {
    const pairRank = Object.entries(rankCounts).find(([r, c]) => c === 2)[0];
    const kickers = values.filter(v => v !== RANK_VALUES[pairRank]).slice(0, 3);
    return {
      ranking: HAND_RANKINGS.ONE_PAIR,
      name: 'One Pair',
      score: HAND_RANKINGS.ONE_PAIR * 1e10 + RANK_VALUES[pairRank] * 1000000 + kickers[0] * 10000 + kickers[1] * 100 + kickers[2],
      kickers: [RANK_VALUES[pairRank], ...kickers]
    };
  }
  
  // High Card
  const score = values.reduce((acc, v, i) => acc + v * Math.pow(100, 4 - i), 0);
  return {
    ranking: HAND_RANKINGS.HIGH_CARD,
    name: 'High Card',
    score: HAND_RANKINGS.HIGH_CARD * 1e10 + score,
    kickers: values
  };
}

/**
 * Find the best 5-card hand from 7 cards (2 hole + 5 community)
 */
function evaluateBestHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  
  let bestHand = null;
  let bestScore = -1;
  let bestCards = null;
  
  for (const combo of combinations) {
    const evaluation = evaluateFiveCards(combo);
    if (evaluation.score > bestScore) {
      bestScore = evaluation.score;
      bestHand = evaluation;
      bestCards = combo;
    }
  }
  
  return {
    ...bestHand,
    cards: bestCards
  };
}

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

/**
 * Initialize database tables for poker
 */
function initPokerDB(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_tables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_buy_in INTEGER DEFAULT 100,
      max_buy_in INTEGER DEFAULT 10000,
      small_blind INTEGER DEFAULT 10,
      big_blind INTEGER DEFAULT 20,
      max_players INTEGER DEFAULT 6,
      status TEXT DEFAULT 'waiting',
      current_hand_id TEXT,
      hand_number INTEGER DEFAULT 0,
      dealer_seat INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_seats (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      player_id TEXT,
      player_name TEXT,
      seat_number INTEGER NOT NULL,
      stack INTEGER NOT NULL,
      is_sitting_out INTEGER DEFAULT 0,
      is_ai INTEGER DEFAULT 0,
      ai_personality TEXT,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES poker_tables(id),
      UNIQUE(table_id, seat_number)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_hands (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      hand_number INTEGER NOT NULL,
      phase TEXT DEFAULT 'preflop',
      deck TEXT,
      community_cards TEXT DEFAULT '[]',
      pot INTEGER DEFAULT 0,
      current_bet INTEGER DEFAULT 0,
      min_raise INTEGER DEFAULT 0,
      action_seat INTEGER,
      dealer_seat INTEGER NOT NULL,
      small_blind_seat INTEGER NOT NULL,
      big_blind_seat INTEGER NOT NULL,
      last_raiser_seat INTEGER,
      winner_ids TEXT,
      winning_hand TEXT,
      status TEXT DEFAULT 'in_progress',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (table_id) REFERENCES poker_tables(id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_player_hands (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      hole_cards TEXT,
      current_bet INTEGER DEFAULT 0,
      total_bet INTEGER DEFAULT 0,
      folded INTEGER DEFAULT 0,
      all_in INTEGER DEFAULT 0,
      acted_this_round INTEGER DEFAULT 0,
      FOREIGN KEY (hand_id) REFERENCES poker_hands(id),
      UNIQUE(hand_id, seat_number)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS poker_actions (
      id TEXT PRIMARY KEY,
      hand_id TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (hand_id) REFERENCES poker_hands(id)
    )
  `);
  
  console.log('🃏 Poker database initialized');
}

// ============================================================================
// POKER GAME CLASS
// ============================================================================

class PokerGame {
  constructor(db) {
    this.db = db;
    initPokerDB(db);
  }
  
  // ===== TABLE MANAGEMENT =====
  
  createTable(name, options = {}) {
    const id = crypto.randomUUID();
    const {
      minBuyIn = 100,
      maxBuyIn = 10000,
      smallBlind = 10,
      bigBlind = 20,
      maxPlayers = 6
    } = options;
    
    this.db.prepare(`
      INSERT INTO poker_tables (id, name, min_buy_in, max_buy_in, small_blind, big_blind, max_players)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, minBuyIn, maxBuyIn, smallBlind, bigBlind, maxPlayers);
    
    return this.getTable(id);
  }
  
  getTable(tableId) {
    const table = this.db.prepare('SELECT * FROM poker_tables WHERE id = ?').get(tableId);
    if (!table) return null;
    
    const seats = this.db.prepare(`
      SELECT * FROM poker_seats WHERE table_id = ? ORDER BY seat_number
    `).all(tableId);
    
    return {
      id: table.id,
      name: table.name,
      minBuyIn: table.min_buy_in,
      maxBuyIn: table.max_buy_in,
      smallBlind: table.small_blind,
      bigBlind: table.big_blind,
      maxPlayers: table.max_players,
      status: table.status,
      currentHandId: table.current_hand_id,
      handNumber: table.hand_number,
      dealerSeat: table.dealer_seat,
      seats: seats.map(s => ({
        seatNumber: s.seat_number,
        playerId: s.player_id,
        playerName: s.player_name,
        stack: s.stack,
        isSittingOut: !!s.is_sitting_out,
        isAI: !!s.is_ai,
        aiPersonality: s.ai_personality
      })),
      playerCount: seats.filter(s => s.player_id || s.is_ai).length
    };
  }
  
  listTables() {
    const tables = this.db.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM poker_seats WHERE table_id = t.id AND (player_id IS NOT NULL OR is_ai = 1)) as player_count
      FROM poker_tables t
      WHERE t.status != 'closed'
      ORDER BY t.created_at DESC
    `).all();
    
    return tables.map(t => ({
      id: t.id,
      name: t.name,
      smallBlind: t.small_blind,
      bigBlind: t.big_blind,
      playerCount: t.player_count,
      maxPlayers: t.max_players,
      status: t.status,
      minBuyIn: t.min_buy_in,
      maxBuyIn: t.max_buy_in
    }));
  }
  
  // ===== SEAT MANAGEMENT =====
  
  joinTable(tableId, playerId, playerName, buyIn, seatNumber = null) {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };
    
    if (buyIn < table.minBuyIn || buyIn > table.maxBuyIn) {
      return { success: false, error: `Buy-in must be between ${table.minBuyIn} and ${table.maxBuyIn}` };
    }
    
    // Find open seat
    const occupiedSeats = new Set(table.seats.filter(s => s.playerId || s.isAI).map(s => s.seatNumber));
    
    if (seatNumber !== null) {
      if (occupiedSeats.has(seatNumber)) {
        return { success: false, error: 'Seat is occupied' };
      }
    } else {
      // Find first open seat
      for (let i = 0; i < table.maxPlayers; i++) {
        if (!occupiedSeats.has(i)) {
          seatNumber = i;
          break;
        }
      }
      if (seatNumber === null) {
        return { success: false, error: 'Table is full' };
      }
    }
    
    // Check if already seated
    const existing = table.seats.find(s => s.playerId === playerId);
    if (existing) {
      return { success: false, error: 'Already seated at this table' };
    }
    
    const seatId = crypto.randomUUID();
    this.db.prepare(`
      INSERT OR REPLACE INTO poker_seats (id, table_id, player_id, player_name, seat_number, stack)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(seatId, tableId, playerId, playerName, seatNumber, buyIn);
    
    return { success: true, seatNumber, stack: buyIn };
  }
  
  addAI(tableId, personality = 'goblin', buyIn = 1000, seatNumber = null) {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };
    
    // Find open seat
    const occupiedSeats = new Set(table.seats.filter(s => s.playerId || s.isAI).map(s => s.seatNumber));
    
    if (seatNumber !== null) {
      if (occupiedSeats.has(seatNumber)) {
        return { success: false, error: 'Seat is occupied' };
      }
    } else {
      for (let i = 0; i < table.maxPlayers; i++) {
        if (!occupiedSeats.has(i)) {
          seatNumber = i;
          break;
        }
      }
      if (seatNumber === null) {
        return { success: false, error: 'Table is full' };
      }
    }
    
    const aiNames = {
      'goblin': 'Goblin Gambler',
      'dwarf': 'Dwarven Banker',
      'elf': 'Elven Strategist',
      'dragon': "Dragon's Hoard"
    };
    
    const seatId = crypto.randomUUID();
    this.db.prepare(`
      INSERT OR REPLACE INTO poker_seats (id, table_id, player_name, seat_number, stack, is_ai, ai_personality)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(seatId, tableId, aiNames[personality] || personality, seatNumber, buyIn, personality);
    
    return { success: true, seatNumber, aiName: aiNames[personality], personality };
  }
  
  leaveTable(tableId, playerId) {
    const seat = this.db.prepare(`
      SELECT * FROM poker_seats WHERE table_id = ? AND player_id = ?
    `).get(tableId, playerId);
    
    if (!seat) return { success: false, error: 'Not seated at this table' };
    
    // Check if in active hand
    const table = this.getTable(tableId);
    if (table.currentHandId) {
      const playerHand = this.db.prepare(`
        SELECT * FROM poker_player_hands WHERE hand_id = ? AND seat_number = ? AND folded = 0
      `).get(table.currentHandId, seat.seat_number);
      
      if (playerHand) {
        return { success: false, error: 'Cannot leave during active hand' };
      }
    }
    
    const cashOut = seat.stack;
    this.db.prepare('DELETE FROM poker_seats WHERE id = ?').run(seat.id);
    
    return { success: true, cashOut };
  }
  
  // ===== HAND MANAGEMENT =====
  
  startHand(tableId) {
    const table = this.getTable(tableId);
    if (!table) return { success: false, error: 'Table not found' };
    
    const activePlayers = table.seats.filter(s => (s.playerId || s.isAI) && !s.isSittingOut && s.stack > 0);
    if (activePlayers.length < 2) {
      return { success: false, error: 'Need at least 2 players to start' };
    }
    
    // Create and shuffle deck
    const deck = shuffleDeck(createDeck());
    
    // Advance dealer button
    const dealerSeat = this.getNextActiveSeat(table, table.dealerSeat);
    const smallBlindSeat = this.getNextActiveSeat(table, dealerSeat);
    const bigBlindSeat = this.getNextActiveSeat(table, smallBlindSeat);
    
    // Create hand record
    const handId = crypto.randomUUID();
    const handNumber = table.handNumber + 1;
    
    this.db.prepare(`
      INSERT INTO poker_hands (
        id, table_id, hand_number, deck, dealer_seat, small_blind_seat, big_blind_seat,
        current_bet, min_raise, action_seat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      handId, tableId, handNumber, JSON.stringify(deck),
      dealerSeat, smallBlindSeat, bigBlindSeat,
      table.bigBlind, table.bigBlind,
      this.getNextActiveSeat(table, bigBlindSeat) // First to act preflop
    );
    
    // Update table
    this.db.prepare(`
      UPDATE poker_tables SET current_hand_id = ?, hand_number = ?, dealer_seat = ?, status = 'playing'
      WHERE id = ?
    `).run(handId, handNumber, dealerSeat, tableId);
    
    // Deal hole cards and create player hand records
    let deckIndex = 0;
    for (const player of activePlayers) {
      const holeCards = [deck[deckIndex++], deck[deckIndex++]];
      
      this.db.prepare(`
        INSERT INTO poker_player_hands (id, hand_id, seat_number, hole_cards)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), handId, player.seatNumber, JSON.stringify(holeCards));
    }
    
    // Post blinds
    this.postBlind(handId, smallBlindSeat, table.smallBlind);
    this.postBlind(handId, bigBlindSeat, table.bigBlind);
    
    // Update deck (remove dealt cards)
    this.db.prepare('UPDATE poker_hands SET deck = ? WHERE id = ?')
      .run(JSON.stringify(deck.slice(deckIndex)), handId);
    
    return { success: true, handId, handNumber };
  }
  
  postBlind(handId, seatNumber, amount) {
    const hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(handId);
    const seat = this.db.prepare(`
      SELECT * FROM poker_seats WHERE table_id = ? AND seat_number = ?
    `).get(hand.table_id, seatNumber);
    
    const actualAmount = Math.min(amount, seat.stack);
    const isAllIn = actualAmount >= seat.stack;
    
    // Update player hand
    this.db.prepare(`
      UPDATE poker_player_hands 
      SET current_bet = ?, total_bet = ?, all_in = ?
      WHERE hand_id = ? AND seat_number = ?
    `).run(actualAmount, actualAmount, isAllIn ? 1 : 0, handId, seatNumber);
    
    // Update seat stack
    this.db.prepare(`
      UPDATE poker_seats SET stack = stack - ? WHERE table_id = ? AND seat_number = ?
    `).run(actualAmount, hand.table_id, seatNumber);
    
    // Update pot
    this.db.prepare('UPDATE poker_hands SET pot = pot + ? WHERE id = ?').run(actualAmount, handId);
    
    // Log action
    this.db.prepare(`
      INSERT INTO poker_actions (id, hand_id, seat_number, phase, action, amount)
      VALUES (?, ?, ?, 'preflop', 'blind', ?)
    `).run(crypto.randomUUID(), handId, seatNumber, actualAmount);
  }
  
  getNextActiveSeat(table, currentSeat) {
    const activePlayers = table.seats.filter(s => (s.playerId || s.isAI) && !s.isSittingOut && s.stack > 0);
    if (activePlayers.length === 0) return currentSeat;
    
    const activeSeats = activePlayers.map(p => p.seatNumber).sort((a, b) => a - b);
    const idx = activeSeats.findIndex(s => s > currentSeat);
    return idx >= 0 ? activeSeats[idx] : activeSeats[0];
  }
  
  getHandState(handId, forPlayerId = null) {
    const hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(handId);
    if (!hand) return null;
    
    const table = this.getTable(hand.table_id);
    const playerHands = this.db.prepare('SELECT * FROM poker_player_hands WHERE hand_id = ?').all(handId);
    const communityCards = JSON.parse(hand.community_cards || '[]');
    
    // Find requesting player's seat
    let requestingSeat = null;
    if (forPlayerId) {
      const seat = table.seats.find(s => s.playerId === forPlayerId);
      if (seat) requestingSeat = seat.seatNumber;
    }
    
    // Build player states
    const players = playerHands.map(ph => {
      const seat = table.seats.find(s => s.seatNumber === ph.seat_number);
      const holeCards = JSON.parse(ph.hole_cards || '[]');
      
      // Only show cards if:
      // - It's the requesting player's cards
      // - It's showdown and player hasn't folded
      const showCards = (
        ph.seat_number === requestingSeat ||
        (hand.phase === 'showdown' && !ph.folded)
      );
      
      return {
        seatNumber: ph.seat_number,
        playerName: seat?.playerName,
        isAI: seat?.isAI,
        stack: seat?.stack || 0,
        currentBet: ph.current_bet,
        totalBet: ph.total_bet,
        folded: !!ph.folded,
        allIn: !!ph.all_in,
        actedThisRound: !!ph.acted_this_round,
        cards: showCards ? holeCards : null,
        isDealer: ph.seat_number === hand.dealer_seat,
        isSmallBlind: ph.seat_number === hand.small_blind_seat,
        isBigBlind: ph.seat_number === hand.big_blind_seat
      };
    });
    
    // Calculate possible actions for active player
    let possibleActions = [];
    let callAmount = 0;
    let minRaise = hand.min_raise;
    
    const activePlayer = players.find(p => p.seatNumber === hand.action_seat && !p.folded && !p.allIn);
    if (activePlayer) {
      callAmount = hand.current_bet - activePlayer.currentBet;
      
      possibleActions.push(ACTIONS.FOLD);
      
      if (callAmount === 0) {
        possibleActions.push(ACTIONS.CHECK);
      } else {
        possibleActions.push(ACTIONS.CALL);
      }
      
      const seat = table.seats.find(s => s.seatNumber === activePlayer.seatNumber);
      if (seat && seat.stack > callAmount) {
        possibleActions.push(ACTIONS.RAISE);
      }
      
      if (seat && seat.stack > 0) {
        possibleActions.push(ACTIONS.ALL_IN);
      }
    }
    
    return {
      handId: hand.id,
      tableId: hand.table_id,
      tableName: table.name,
      handNumber: hand.hand_number,
      phase: hand.phase,
      pot: hand.pot,
      communityCards,
      currentBet: hand.current_bet,
      minRaise,
      dealerSeat: hand.dealer_seat,
      smallBlindSeat: hand.small_blind_seat,
      bigBlindSeat: hand.big_blind_seat,
      actionSeat: hand.action_seat,
      players,
      possibleActions,
      callAmount,
      yourSeat: requestingSeat,
      yourCards: requestingSeat !== null ? players.find(p => p.seatNumber === requestingSeat)?.cards : null,
      isYourTurn: requestingSeat === hand.action_seat
    };
  }
  
  // ===== ACTIONS =====
  
  submitAction(handId, seatNumber, action, raiseAmount = 0) {
    const hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(handId);
    if (!hand) return { success: false, error: 'Hand not found' };
    
    if (hand.status !== 'in_progress') {
      return { success: false, error: 'Hand is not in progress' };
    }
    
    if (hand.action_seat !== seatNumber) {
      return { success: false, error: 'Not your turn' };
    }
    
    const playerHand = this.db.prepare(`
      SELECT * FROM poker_player_hands WHERE hand_id = ? AND seat_number = ?
    `).get(handId, seatNumber);
    
    if (!playerHand || playerHand.folded) {
      return { success: false, error: 'Invalid player state' };
    }
    
    const table = this.getTable(hand.table_id);
    const seat = table.seats.find(s => s.seatNumber === seatNumber);
    
    const toCall = hand.current_bet - playerHand.current_bet;
    
    switch (action) {
      case ACTIONS.FOLD:
        return this.handleFold(hand, playerHand, table);
        
      case ACTIONS.CHECK:
        if (toCall > 0) {
          return { success: false, error: 'Cannot check, must call or fold' };
        }
        return this.handleCheck(hand, playerHand, table);
        
      case ACTIONS.CALL:
        return this.handleCall(hand, playerHand, seat, table);
        
      case ACTIONS.RAISE:
        if (raiseAmount < hand.min_raise) {
          return { success: false, error: `Minimum raise is ${hand.min_raise}` };
        }
        return this.handleRaise(hand, playerHand, seat, table, raiseAmount);
        
      case ACTIONS.ALL_IN:
        return this.handleAllIn(hand, playerHand, seat, table);
        
      default:
        return { success: false, error: 'Invalid action' };
    }
  }
  
  handleFold(hand, playerHand, table) {
    this.db.prepare(`
      UPDATE poker_player_hands SET folded = 1, acted_this_round = 1 WHERE id = ?
    `).run(playerHand.id);
    
    this.logAction(hand.id, playerHand.seat_number, hand.phase, ACTIONS.FOLD, 0);
    
    // Check if only one player left
    const remaining = this.getActivePlayers(hand.id);
    if (remaining.length === 1) {
      return this.awardPot(hand.id, [remaining[0].seat_number]);
    }
    
    return this.advanceAction(hand, table);
  }
  
  handleCheck(hand, playerHand, table) {
    this.db.prepare(`
      UPDATE poker_player_hands SET acted_this_round = 1 WHERE id = ?
    `).run(playerHand.id);
    
    this.logAction(hand.id, playerHand.seat_number, hand.phase, ACTIONS.CHECK, 0);
    
    return this.advanceAction(hand, table);
  }
  
  handleCall(hand, playerHand, seat, table) {
    const toCall = Math.min(hand.current_bet - playerHand.current_bet, seat.stack);
    const isAllIn = toCall >= seat.stack;
    
    this.db.prepare(`
      UPDATE poker_player_hands 
      SET current_bet = current_bet + ?, total_bet = total_bet + ?, acted_this_round = 1, all_in = ?
      WHERE id = ?
    `).run(toCall, toCall, isAllIn ? 1 : 0, playerHand.id);
    
    this.db.prepare(`
      UPDATE poker_seats SET stack = stack - ? WHERE table_id = ? AND seat_number = ?
    `).run(toCall, hand.table_id, playerHand.seat_number);
    
    this.db.prepare('UPDATE poker_hands SET pot = pot + ? WHERE id = ?').run(toCall, hand.id);
    
    this.logAction(hand.id, playerHand.seat_number, hand.phase, isAllIn ? ACTIONS.ALL_IN : ACTIONS.CALL, toCall);
    
    return this.advanceAction(hand, table);
  }
  
  handleRaise(hand, playerHand, seat, table, raiseAmount) {
    const totalBet = hand.current_bet + raiseAmount;
    const toAdd = totalBet - playerHand.current_bet;
    
    if (toAdd > seat.stack) {
      return { success: false, error: 'Not enough chips' };
    }
    
    const isAllIn = toAdd >= seat.stack;
    const actualToAdd = Math.min(toAdd, seat.stack);
    
    this.db.prepare(`
      UPDATE poker_player_hands 
      SET current_bet = ?, total_bet = total_bet + ?, acted_this_round = 1, all_in = ?
      WHERE id = ?
    `).run(playerHand.current_bet + actualToAdd, actualToAdd, isAllIn ? 1 : 0, playerHand.id);
    
    this.db.prepare(`
      UPDATE poker_seats SET stack = stack - ? WHERE table_id = ? AND seat_number = ?
    `).run(actualToAdd, hand.table_id, playerHand.seat_number);
    
    this.db.prepare(`
      UPDATE poker_hands SET pot = pot + ?, current_bet = ?, min_raise = ?, last_raiser_seat = ?
      WHERE id = ?
    `).run(actualToAdd, totalBet, raiseAmount, playerHand.seat_number, hand.id);
    
    // Reset acted_this_round for other players (they need to respond to raise)
    this.db.prepare(`
      UPDATE poker_player_hands SET acted_this_round = 0 
      WHERE hand_id = ? AND seat_number != ? AND folded = 0 AND all_in = 0
    `).run(hand.id, playerHand.seat_number);
    
    this.logAction(hand.id, playerHand.seat_number, hand.phase, ACTIONS.RAISE, actualToAdd);
    
    return this.advanceAction(hand, table);
  }
  
  handleAllIn(hand, playerHand, seat, table) {
    const toAdd = seat.stack;
    const newBet = playerHand.current_bet + toAdd;
    
    // Check if this is a raise
    if (newBet > hand.current_bet) {
      const raiseAmount = newBet - hand.current_bet;
      
      this.db.prepare(`
        UPDATE poker_hands SET current_bet = ?, min_raise = ?, last_raiser_seat = ?
        WHERE id = ?
      `).run(newBet, raiseAmount, playerHand.seat_number, hand.id);
      
      // Reset acted for other players
      this.db.prepare(`
        UPDATE poker_player_hands SET acted_this_round = 0 
        WHERE hand_id = ? AND seat_number != ? AND folded = 0 AND all_in = 0
      `).run(hand.id, playerHand.seat_number);
    }
    
    this.db.prepare(`
      UPDATE poker_player_hands 
      SET current_bet = ?, total_bet = total_bet + ?, acted_this_round = 1, all_in = 1
      WHERE id = ?
    `).run(newBet, toAdd, playerHand.id);
    
    this.db.prepare(`
      UPDATE poker_seats SET stack = 0 WHERE table_id = ? AND seat_number = ?
    `).run(hand.table_id, playerHand.seat_number);
    
    this.db.prepare('UPDATE poker_hands SET pot = pot + ? WHERE id = ?').run(toAdd, hand.id);
    
    this.logAction(hand.id, playerHand.seat_number, hand.phase, ACTIONS.ALL_IN, toAdd);
    
    return this.advanceAction(hand, table);
  }
  
  logAction(handId, seatNumber, phase, action, amount) {
    this.db.prepare(`
      INSERT INTO poker_actions (id, hand_id, seat_number, phase, action, amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), handId, seatNumber, phase, action, amount);
  }
  
  getActivePlayers(handId) {
    return this.db.prepare(`
      SELECT * FROM poker_player_hands WHERE hand_id = ? AND folded = 0
    `).all(handId);
  }
  
  advanceAction(hand, table) {
    // Refresh hand state
    hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(hand.id);
    const playerHands = this.db.prepare('SELECT * FROM poker_player_hands WHERE hand_id = ?').all(hand.id);
    
    // Find next player who needs to act
    const activePlayers = playerHands.filter(p => !p.folded && !p.all_in);
    const needsToAct = activePlayers.filter(p => !p.acted_this_round);
    
    // Check if only one player remains (everyone else folded)
    const notFolded = playerHands.filter(p => !p.folded);
    if (notFolded.length === 1) {
      return this.awardPot(hand.id, [notFolded[0].seat_number]);
    }
    
    // If everyone has acted or is all-in, advance phase
    if (needsToAct.length === 0 || activePlayers.length <= 1) {
      return this.advancePhase(hand);
    }
    
    // Find next player to act
    const activeSeats = activePlayers.map(p => p.seat_number).sort((a, b) => a - b);
    const currentIdx = activeSeats.indexOf(hand.action_seat);
    let nextSeat = hand.action_seat;
    
    for (let i = 1; i <= activeSeats.length; i++) {
      const checkSeat = activeSeats[(currentIdx + i) % activeSeats.length];
      const player = activePlayers.find(p => p.seat_number === checkSeat);
      if (player && !player.acted_this_round) {
        nextSeat = checkSeat;
        break;
      }
    }
    
    this.db.prepare('UPDATE poker_hands SET action_seat = ? WHERE id = ?').run(nextSeat, hand.id);
    
    return { success: true, nextAction: nextSeat, phase: hand.phase };
  }
  
  advancePhase(hand) {
    const deck = JSON.parse(hand.deck || '[]');
    const communityCards = JSON.parse(hand.community_cards || '[]');
    
    let newPhase;
    let newCards = [];
    
    switch (hand.phase) {
      case PHASES.PREFLOP:
        newPhase = PHASES.FLOP;
        newCards = deck.splice(0, 3);
        break;
      case PHASES.FLOP:
        newPhase = PHASES.TURN;
        newCards = deck.splice(0, 1);
        break;
      case PHASES.TURN:
        newPhase = PHASES.RIVER;
        newCards = deck.splice(0, 1);
        break;
      case PHASES.RIVER:
        return this.showdown(hand.id);
      default:
        return { success: false, error: 'Invalid phase' };
    }
    
    const allCommunityCards = [...communityCards, ...newCards];
    
    // Reset betting for new round
    this.db.prepare(`
      UPDATE poker_player_hands SET current_bet = 0, acted_this_round = 0
      WHERE hand_id = ? AND folded = 0 AND all_in = 0
    `).run(hand.id);
    
    // Find first active player after dealer
    const table = this.getTable(hand.table_id);
    const playerHands = this.db.prepare(`
      SELECT seat_number FROM poker_player_hands WHERE hand_id = ? AND folded = 0 AND all_in = 0
    `).all(hand.id);
    
    let firstToAct = hand.dealer_seat;
    if (playerHands.length > 0) {
      const activeSeats = playerHands.map(p => p.seat_number).sort((a, b) => a - b);
      const idx = activeSeats.findIndex(s => s > hand.dealer_seat);
      firstToAct = idx >= 0 ? activeSeats[idx] : activeSeats[0];
    }
    
    // Check if all active players are all-in - skip to showdown
    if (playerHands.length === 0) {
      return this.runOutBoard(hand.id, deck, allCommunityCards);
    }
    
    this.db.prepare(`
      UPDATE poker_hands 
      SET phase = ?, deck = ?, community_cards = ?, current_bet = 0, action_seat = ?
      WHERE id = ?
    `).run(newPhase, JSON.stringify(deck), JSON.stringify(allCommunityCards), firstToAct, hand.id);
    
    return { success: true, phase: newPhase, communityCards: allCommunityCards, newCards };
  }
  
  runOutBoard(handId, deck, communityCards) {
    // Deal remaining community cards
    while (communityCards.length < 5) {
      communityCards.push(deck.shift());
    }
    
    this.db.prepare(`
      UPDATE poker_hands SET community_cards = ?, deck = ? WHERE id = ?
    `).run(JSON.stringify(communityCards), JSON.stringify(deck), handId);
    
    return this.showdown(handId);
  }
  
  showdown(handId) {
    const hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(handId);
    const playerHands = this.db.prepare(`
      SELECT * FROM poker_player_hands WHERE hand_id = ? AND folded = 0
    `).all(handId);
    
    const communityCards = JSON.parse(hand.community_cards || '[]');
    
    // Evaluate all hands
    const evaluations = playerHands.map(ph => {
      const holeCards = JSON.parse(ph.hole_cards || '[]');
      const evaluation = evaluateBestHand(holeCards, communityCards);
      return {
        seatNumber: ph.seat_number,
        holeCards,
        ...evaluation
      };
    });
    
    // Sort by score descending
    evaluations.sort((a, b) => b.score - a.score);
    
    // Find winners (may be multiple with same score)
    const highestScore = evaluations[0].score;
    const winners = evaluations.filter(e => e.score === highestScore);
    
    this.db.prepare(`
      UPDATE poker_hands SET phase = 'showdown', status = 'complete', completed_at = datetime('now')
      WHERE id = ?
    `).run(handId);
    
    // Award pot
    return this.awardPot(handId, winners.map(w => w.seatNumber), evaluations);
  }
  
  awardPot(handId, winnerSeats, evaluations = null) {
    const hand = this.db.prepare('SELECT * FROM poker_hands WHERE id = ?').get(handId);
    const table = this.getTable(hand.table_id);
    
    const potPerWinner = Math.floor(hand.pot / winnerSeats.length);
    
    for (const seatNumber of winnerSeats) {
      this.db.prepare(`
        UPDATE poker_seats SET stack = stack + ? WHERE table_id = ? AND seat_number = ?
      `).run(potPerWinner, hand.table_id, seatNumber);
    }
    
    this.db.prepare(`
      UPDATE poker_hands 
      SET winner_ids = ?, status = 'complete', completed_at = datetime('now'),
          phase = 'complete'
      WHERE id = ?
    `).run(JSON.stringify(winnerSeats), handId);
    
    this.db.prepare(`
      UPDATE poker_tables SET current_hand_id = NULL, status = 'waiting' WHERE id = ?
    `).run(hand.table_id);
    
    // Get winner names
    const winners = winnerSeats.map(seat => {
      const s = table.seats.find(s => s.seatNumber === seat);
      return { seatNumber: seat, name: s?.playerName };
    });
    
    return {
      success: true,
      handComplete: true,
      winners,
      pot: hand.pot,
      potPerWinner,
      evaluations: evaluations?.map(e => ({
        seatNumber: e.seatNumber,
        hand: e.name,
        cards: e.holeCards
      }))
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  PokerGame,
  createDeck,
  shuffleDeck,
  evaluateBestHand,
  evaluateFiveCards,
  getCardName,
  getCardSymbol,
  SUITS,
  RANKS,
  HAND_RANKINGS,
  PHASES,
  ACTIONS
};
