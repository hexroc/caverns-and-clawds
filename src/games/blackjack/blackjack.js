/**
 * Dragon's Blackjack - Core Game Logic
 * 
 * Handles game state, rules enforcement, and payout calculations.
 * Now integrated with USDC economy and treasury tax system.
 */

const crypto = require('crypto');
const deck = require('./deck');
const dragon = require('./dragon-dealer');
const { GamblingService, GAMBLING_CONFIG } = require('../../gambling-service');

// Game configuration
const CONFIG = {
  MIN_BET: GAMBLING_CONFIG.MIN_BET,     // 0.001 USDC
  MAX_BET: GAMBLING_CONFIG.MAX_BET,     // 0.05 USDC
  BLACKJACK_PAYOUT: 1.5,                // 3:2 payout
  INSURANCE_PAYOUT: 2,                  // 2:1 payout
  NUM_DECKS: 6,                         // Standard casino shoe
  DEALER_STAND_ON: 17,                  // Dealer stands on 17+
};

// Game states
const GameState = {
  BETTING: 'betting',
  PLAYER_TURN: 'player_turn',
  DEALER_TURN: 'dealer_turn',
  COMPLETE: 'complete'
};

// Result types
const Result = {
  PLAYER_BLACKJACK: 'player_blackjack',
  DEALER_BLACKJACK: 'dealer_blackjack',
  PLAYER_WIN: 'player_win',
  DEALER_WIN: 'dealer_win',
  PLAYER_BUST: 'player_bust',
  DEALER_BUST: 'dealer_bust',
  PUSH: 'push',
  SURRENDER: 'surrender'
};

/**
 * Initialize database tables for blackjack
 */
function initBlackjackDB(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_sessions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      participant_type TEXT DEFAULT 'player',
      bet_amount REAL NOT NULL,
      player_hands TEXT DEFAULT '[]',
      dealer_hand TEXT DEFAULT '[]',
      deck_state TEXT,
      current_hand_index INTEGER DEFAULT 0,
      status TEXT DEFAULT 'betting',
      result TEXT,
      payout REAL DEFAULT 0,
      dealer_dialog TEXT,
      insurance_bet REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_stats (
      player_id TEXT PRIMARY KEY,
      games_played INTEGER DEFAULT 0,
      games_won INTEGER DEFAULT 0,
      blackjacks INTEGER DEFAULT 0,
      total_wagered REAL DEFAULT 0,
      total_won REAL DEFAULT 0,
      biggest_win REAL DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0
    )
  `);

  console.log('🃏 Blackjack database initialized');
}

/**
 * BlackjackGame class - manages a single game session
 */
class BlackjackGame {
  constructor(db, gamblingService = null) {
    this.db = db;
    this.gambling = gamblingService || new GamblingService(db);
  }

  /**
   * Start a new game
   * @param {string} characterId - Character ID (player) or system wallet ID (NPC)
   * @param {number} betAmount - Bet in USDC
   * @param {string} participantType - 'player' or 'npc'
   */
  startGame(characterId, betAmount, participantType = 'player') {
    // Validate bet
    const validation = GamblingService.validateBetAmount(betAmount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Get participant info
    const participant = this.gambling.getParticipantInfo(characterId, participantType);
    if (!participant) {
      return { success: false, error: `${participantType === 'player' ? 'Character' : 'NPC'} not found` };
    }

    // Check for existing active game
    const existingGame = this.db.prepare(`
      SELECT * FROM blackjack_sessions 
      WHERE character_id = ? AND status NOT IN ('complete')
      ORDER BY created_at DESC LIMIT 1
    `).get(characterId);

    if (existingGame) {
      return { 
        success: false, 
        error: 'You have an active game. Finish it first.',
        gameId: existingGame.id
      };
    }

    // Create game ID first (needed for gambling service)
    const gameId = crypto.randomUUID();

    // Place bet through gambling service (includes 1% tax)
    const betResult = this.gambling.placeBet(
      characterId,
      participantType,
      betAmount,
      'blackjack',
      gameId
    );

    if (!betResult.success) {
      return betResult; // Return error from gambling service
    }

    // Create fresh shuffled shoe
    const shoe = deck.shuffle(deck.createShoe(CONFIG.NUM_DECKS));

    // Deal initial cards
    let currentDeck = shoe;
    const playerCards = [];
    const dealerCards = [];

    // Deal: player, dealer, player, dealer (standard order)
    let draw = deck.drawCard(currentDeck);
    playerCards.push(draw.card);
    currentDeck = draw.deck;

    draw = deck.drawCard(currentDeck, true); // Dealer's first card face down (hole card)
    dealerCards.push(draw.card);
    currentDeck = draw.deck;

    draw = deck.drawCard(currentDeck);
    playerCards.push(draw.card);
    currentDeck = draw.deck;

    draw = deck.drawCard(currentDeck);
    dealerCards.push(draw.card);
    currentDeck = draw.deck;

    // Create game session
    const playerHands = [{ cards: playerCards, bet: betAmount, status: 'active' }];
    
    // Get dealer greeting and optional bet reaction
    let dealerDialog = dragon.getDialog('greeting');
    const betReaction = dragon.getBetReaction(betAmount, CONFIG.MIN_BET, CONFIG.MAX_BET);
    if (betReaction) {
      dealerDialog = betReaction + '\n\n' + dragon.getDialog('dealing');
    } else {
      dealerDialog += '\n\n' + dragon.getDialog('dealing');
    }

    this.db.prepare(`
      INSERT INTO blackjack_sessions (
        id, player_id, character_id, participant_type, bet_amount, player_hands, dealer_hand, 
        deck_state, status, dealer_dialog
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      gameId,
      characterId, // player_id kept for backward compat, now stores character_id
      characterId,
      participantType,
      betAmount,
      JSON.stringify(playerHands),
      JSON.stringify(dealerCards),
      JSON.stringify(currentDeck),
      GameState.PLAYER_TURN,
      dealerDialog
    );

    // Check for immediate blackjacks
    const playerHasBlackjack = deck.isBlackjack(playerCards);
    const dealerShowsAce = dealerCards[1].isAce; // Second card is face-up

    // If dealer shows ace, offer insurance (TODO: implement insurance)
    // For now, skip insurance

    // If player has blackjack, check dealer
    if (playerHasBlackjack) {
      // Reveal dealer hole card
      dealerCards[0].faceDown = false;
      const dealerHasBlackjack = deck.isBlackjack(dealerCards);

      if (dealerHasBlackjack) {
        // Push - both have blackjack
        return this.completeGame(gameId, Result.PUSH, playerHands, dealerCards);
      } else {
        // Player wins with blackjack
        return this.completeGame(gameId, Result.PLAYER_BLACKJACK, playerHands, dealerCards);
      }
    }

    // Get current state
    const game = this.getGameState(gameId, characterId);
    return {
      success: true,
      gameId,
      betAmount,
      taxPaid: betResult.taxAmount,
      totalCost: betResult.totalCost,
      newBalance: betResult.newBalance,
      ...game
    };
  }

  /**
   * Get current game state
   */
  getGameState(gameId, characterId = null) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ?'
    ).get(gameId);

    if (!session) {
      return { success: false, error: 'Game not found' };
    }

    const playerHands = JSON.parse(session.player_hands);
    const dealerHand = JSON.parse(session.dealer_hand);
    const currentHand = playerHands[session.current_hand_index];
    
    // Calculate values
    const playerValue = deck.calculateHandValue(currentHand.cards);
    const dealerValue = deck.calculateHandValue(dealerHand);

    // Determine available actions
    const actions = [];
    if (session.status === GameState.PLAYER_TURN) {
      actions.push('hit', 'stand');
      
      // Can double down on first two cards
      if (currentHand.cards.length === 2) {
        // Check if player can afford double (need to pay bet + tax again)
        const balance = this.gambling.getBalance(session.character_id, session.participant_type);
        const doubleAmount = currentHand.bet * (1 + GAMBLING_CONFIG.TREASURY_TAX_RATE);
        
        if (balance >= doubleAmount) {
          actions.push('double');
        }
      }
      
      // Can split if pair and first two cards
      if (currentHand.cards.length === 2 && deck.canSplit(currentHand.cards)) {
        // Check if player can afford split
        const balance = this.gambling.getBalance(session.character_id, session.participant_type);
        const splitAmount = currentHand.bet * (1 + GAMBLING_CONFIG.TREASURY_TAX_RATE);
        
        if (balance >= splitAmount) {
          actions.push('split');
        }
      }

      // Can surrender on first two cards (except after split)
      if (currentHand.cards.length === 2 && playerHands.length === 1) {
        actions.push('surrender');
      }
    }

    return {
      success: true,
      gameId: session.id,
      status: session.status,
      bet: session.bet_amount,
      playerHands: playerHands.map((h, i) => ({
        cards: h.cards,
        bet: h.bet,
        status: h.status,
        value: deck.calculateHandValue(h.cards),
        display: deck.handToString(h.cards),
        isActive: i === session.current_hand_index
      })),
      dealerHand: {
        cards: dealerHand,
        value: dealerValue,
        display: deck.handToString(dealerHand),
        showingAce: dealerHand.some(c => !c.faceDown && c.isAce)
      },
      currentHandIndex: session.current_hand_index,
      actions,
      result: session.result,
      payout: session.payout,
      dealerDialog: session.dealer_dialog,
      dealer: dragon.PYRAXIS
    };
  }

  /**
   * Player hits (draw a card)
   */
  hit(gameId, characterId) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ? AND character_id = ?'
    ).get(gameId, characterId);

    if (!session) {
      return { success: false, error: 'Game not found' };
    }

    if (session.status !== GameState.PLAYER_TURN) {
      return { success: false, error: 'Not your turn' };
    }

    const playerHands = JSON.parse(session.player_hands);
    const currentHand = playerHands[session.current_hand_index];
    let currentDeck = JSON.parse(session.deck_state);

    // Draw a card
    const { card, deck: newDeck } = deck.drawCard(currentDeck);
    currentHand.cards.push(card);
    currentDeck = newDeck;

    // Get dialog
    const dealerDialog = dragon.getActionDialog('hit');

    // Check for bust
    const handValue = deck.calculateHandValue(currentHand.cards);
    
    if (handValue.value > 21) {
      currentHand.status = 'bust';
      
      // Check if there are more hands to play (splits)
      const nextHandIndex = session.current_hand_index + 1;
      if (nextHandIndex < playerHands.length) {
        // Move to next hand
        this.db.prepare(`
          UPDATE blackjack_sessions SET 
            player_hands = ?, deck_state = ?, current_hand_index = ?, dealer_dialog = ?
          WHERE id = ?
        `).run(
          JSON.stringify(playerHands),
          JSON.stringify(currentDeck),
          nextHandIndex,
          dragon.getDialog('playerBust') + "\n\nLet's see your next hand...",
          gameId
        );
        
        return this.getGameState(gameId, characterId);
      }
      
      // All hands busted - dealer wins
      return this.completeGame(gameId, Result.PLAYER_BUST, playerHands, JSON.parse(session.dealer_hand));
    }

    // Update game state
    this.db.prepare(`
      UPDATE blackjack_sessions SET 
        player_hands = ?, deck_state = ?, dealer_dialog = ?
      WHERE id = ?
    `).run(JSON.stringify(playerHands), JSON.stringify(currentDeck), dealerDialog, gameId);

    return this.getGameState(gameId, characterId);
  }

  /**
   * Player stands (end turn)
   */
  stand(gameId, characterId) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ? AND character_id = ?'
    ).get(gameId, characterId);

    if (!session) {
      return { success: false, error: 'Game not found' };
    }

    if (session.status !== GameState.PLAYER_TURN) {
      return { success: false, error: 'Not your turn' };
    }

    const playerHands = JSON.parse(session.player_hands);
    const currentHand = playerHands[session.current_hand_index];
    currentHand.status = 'stand';

    // Check if there are more hands to play
    const nextHandIndex = session.current_hand_index + 1;
    if (nextHandIndex < playerHands.length) {
      this.db.prepare(`
        UPDATE blackjack_sessions SET 
          player_hands = ?, current_hand_index = ?, dealer_dialog = ?
        WHERE id = ?
      `).run(
        JSON.stringify(playerHands),
        nextHandIndex,
        dragon.getActionDialog('stand') + "\n\nNext hand...",
        gameId
      );
      
      return this.getGameState(gameId, characterId);
    }

    // All hands done - dealer's turn
    const dealerDialog = dragon.getActionDialog('stand');
    this.db.prepare(`
      UPDATE blackjack_sessions SET 
        player_hands = ?, status = ?, dealer_dialog = ?
      WHERE id = ?
    `).run(JSON.stringify(playerHands), GameState.DEALER_TURN, dealerDialog, gameId);

    // Play dealer's hand
    return this.playDealerHand(gameId);
  }

  /**
   * Player doubles down
   */
  double(gameId, characterId) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ? AND character_id = ?'
    ).get(gameId, characterId);

    if (!session) {
      return { success: false, error: 'Game not found' };
    }

    if (session.status !== GameState.PLAYER_TURN) {
      return { success: false, error: 'Not your turn' };
    }

    const playerHands = JSON.parse(session.player_hands);
    const currentHand = playerHands[session.current_hand_index];

    if (currentHand.cards.length !== 2) {
      return { success: false, error: 'Can only double on first two cards' };
    }

    // Place additional bet (same amount as original bet, with tax)
    const betResult = this.gambling.placeBet(
      session.character_id,
      session.participant_type,
      currentHand.bet,
      'blackjack',
      gameId
    );

    if (!betResult.success) {
      return betResult; // Insufficient balance or other error
    }

    // Double the bet
    currentHand.bet *= 2;

    // Draw exactly one card
    let currentDeck = JSON.parse(session.deck_state);
    const { card, deck: newDeck } = deck.drawCard(currentDeck);
    currentHand.cards.push(card);
    currentDeck = newDeck;

    const dealerDialog = dragon.getActionDialog('double');

    // Check for bust
    const handValue = deck.calculateHandValue(currentHand.cards);
    
    if (handValue.value > 21) {
      currentHand.status = 'bust';
      
      // Check for more hands
      const nextHandIndex = session.current_hand_index + 1;
      if (nextHandIndex < playerHands.length) {
        this.db.prepare(`
          UPDATE blackjack_sessions SET 
            player_hands = ?, deck_state = ?, current_hand_index = ?, 
            bet_amount = bet_amount + ?, dealer_dialog = ?
          WHERE id = ?
        `).run(
          JSON.stringify(playerHands),
          JSON.stringify(currentDeck),
          nextHandIndex,
          session.bet_amount, // Add to total bet
          dragon.getDialog('playerBust'),
          gameId
        );
        
        return this.getGameState(gameId, characterId);
      }
      
      return this.completeGame(gameId, Result.PLAYER_BUST, playerHands, JSON.parse(session.dealer_hand));
    }

    // Stand after double (forced)
    currentHand.status = 'stand';

    // Check for more hands
    const nextHandIndex = session.current_hand_index + 1;
    if (nextHandIndex < playerHands.length) {
      this.db.prepare(`
        UPDATE blackjack_sessions SET 
          player_hands = ?, deck_state = ?, current_hand_index = ?,
          bet_amount = bet_amount + ?, dealer_dialog = ?
        WHERE id = ?
      `).run(
        JSON.stringify(playerHands),
        JSON.stringify(currentDeck),
        nextHandIndex,
        session.bet_amount,
        dealerDialog + "\n\nNext hand...",
        gameId
      );
      
      return this.getGameState(gameId, characterId);
    }

    // Dealer's turn
    this.db.prepare(`
      UPDATE blackjack_sessions SET 
        player_hands = ?, deck_state = ?, status = ?,
        bet_amount = bet_amount + ?, dealer_dialog = ?
      WHERE id = ?
    `).run(
      JSON.stringify(playerHands),
      JSON.stringify(currentDeck),
      GameState.DEALER_TURN,
      session.bet_amount,
      dealerDialog,
      gameId
    );

    return this.playDealerHand(gameId);
  }

  /**
   * Player surrenders
   */
  surrender(gameId, characterId) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ? AND character_id = ?'
    ).get(gameId, characterId);

    if (!session) {
      return { success: false, error: 'Game not found' };
    }

    if (session.status !== GameState.PLAYER_TURN) {
      return { success: false, error: 'Not your turn' };
    }

    const playerHands = JSON.parse(session.player_hands);
    const currentHand = playerHands[session.current_hand_index];

    if (currentHand.cards.length !== 2 || playerHands.length > 1) {
      return { success: false, error: 'Can only surrender on initial hand' };
    }

    // Return half the bet (tax is NOT refunded)
    const refund = session.bet_amount / 2;
    
    this.gambling.awardWinnings(
      session.character_id,
      session.participant_type,
      refund,
      'blackjack',
      gameId
    );

    return this.completeGame(gameId, Result.SURRENDER, playerHands, JSON.parse(session.dealer_hand));
  }

  /**
   * Play dealer's hand (automated)
   */
  playDealerHand(gameId) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ?'
    ).get(gameId);

    const playerHands = JSON.parse(session.player_hands);
    let dealerHand = JSON.parse(session.dealer_hand);
    let currentDeck = JSON.parse(session.deck_state);

    // Reveal hole card
    dealerHand[0].faceDown = false;

    // Check if all player hands busted
    const allBusted = playerHands.every(h => h.status === 'bust');
    if (allBusted) {
      // Dealer already won, just reveal
      return this.completeGame(gameId, Result.PLAYER_BUST, playerHands, dealerHand);
    }

    // Dealer draws until 17+
    let dealerValue = deck.calculateHandValue(dealerHand);
    
    while (dealerValue.value < CONFIG.DEALER_STAND_ON) {
      const { card, deck: newDeck } = deck.drawCard(currentDeck);
      dealerHand.push(card);
      currentDeck = newDeck;
      dealerValue = deck.calculateHandValue(dealerHand);
    }

    // Determine winner(s)
    return this.resolveGame(gameId, playerHands, dealerHand);
  }

  /**
   * Resolve game and determine payouts
   */
  resolveGame(gameId, playerHands, dealerHand) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ?'
    ).get(gameId);

    const dealerValue = deck.calculateHandValue(dealerHand);
    const dealerBusted = dealerValue.value > 21;

    let totalPayout = 0;
    let overallResult = null;
    const handResults = [];

    for (const hand of playerHands) {
      if (hand.status === 'bust') {
        handResults.push({ result: 'bust', payout: 0 });
        continue;
      }

      const playerValue = deck.calculateHandValue(hand.cards);

      if (dealerBusted) {
        // Player wins
        totalPayout += hand.bet * 2;
        handResults.push({ result: 'win', payout: hand.bet * 2 });
        overallResult = overallResult || Result.DEALER_BUST;
      } else if (playerValue.value > dealerValue.value) {
        // Player wins
        totalPayout += hand.bet * 2;
        handResults.push({ result: 'win', payout: hand.bet * 2 });
        overallResult = overallResult || Result.PLAYER_WIN;
      } else if (playerValue.value < dealerValue.value) {
        // Dealer wins
        handResults.push({ result: 'lose', payout: 0 });
        overallResult = overallResult || Result.DEALER_WIN;
      } else {
        // Push
        totalPayout += hand.bet;
        handResults.push({ result: 'push', payout: hand.bet });
        overallResult = overallResult || Result.PUSH;
      }
    }

    // If mixed results, pick the most favorable for display
    if (!overallResult) {
      overallResult = Result.DEALER_WIN;
    }

    return this.completeGame(gameId, overallResult, playerHands, dealerHand, totalPayout, handResults);
  }

  /**
   * Complete the game and process payouts
   */
  completeGame(gameId, result, playerHands, dealerHand, totalPayout = null, handResults = null) {
    const session = this.db.prepare(
      'SELECT * FROM blackjack_sessions WHERE id = ?'
    ).get(gameId);

    // Reveal dealer's hole card
    dealerHand[0].faceDown = false;

    // Calculate payout if not provided
    if (totalPayout === null) {
      totalPayout = 0;
      
      switch (result) {
        case Result.PLAYER_BLACKJACK:
          // 3:2 payout
          totalPayout = Math.floor(session.bet_amount * (1 + CONFIG.BLACKJACK_PAYOUT));
          break;
        case Result.PLAYER_WIN:
        case Result.DEALER_BUST:
          totalPayout = session.bet_amount * 2;
          break;
        case Result.PUSH:
          totalPayout = session.bet_amount;
          break;
        case Result.SURRENDER:
          totalPayout = 0; // Already refunded in surrender()
          break;
        default:
          totalPayout = 0;
      }
    }

    // Credit winnings to player via gambling service
    if (totalPayout > 0) {
      this.gambling.awardWinnings(
        session.character_id,
        session.participant_type,
        totalPayout,
        'blackjack',
        gameId
      );
    }

    // Get appropriate dialog
    const dealerDialog = dragon.getResultDialog(result);

    // Update session
    this.db.prepare(`
      UPDATE blackjack_sessions SET 
        player_hands = ?, dealer_hand = ?, status = ?, result = ?,
        payout = ?, dealer_dialog = ?, completed_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(playerHands),
      JSON.stringify(dealerHand),
      GameState.COMPLETE,
      result,
      totalPayout,
      dealerDialog,
      gameId
    );

    // Update player stats
    this.updateStats(session.character_id, result, session.bet_amount, totalPayout);

    return this.getGameState(gameId, session.character_id);
  }

  /**
   * Update player statistics
   */
  updateStats(characterId, result, betAmount, payout) {
    // Ensure stats row exists
    this.db.prepare(`
      INSERT OR IGNORE INTO blackjack_stats (player_id) VALUES (?)
    `).run(characterId);

    const isWin = [Result.PLAYER_BLACKJACK, Result.PLAYER_WIN, Result.DEALER_BUST].includes(result);
    const isBlackjack = result === Result.PLAYER_BLACKJACK;
    const netWin = payout - betAmount;

    // Get current streak
    const stats = this.db.prepare(
      'SELECT current_streak, longest_streak, biggest_win FROM blackjack_stats WHERE player_id = ?'
    ).get(characterId);

    let newStreak = isWin ? (stats?.current_streak || 0) + 1 : 0;
    let longestStreak = Math.max(stats?.longest_streak || 0, newStreak);
    let biggestWin = Math.max(stats?.biggest_win || 0, netWin);

    this.db.prepare(`
      UPDATE blackjack_stats SET
        games_played = games_played + 1,
        games_won = games_won + ?,
        blackjacks = blackjacks + ?,
        total_wagered = total_wagered + ?,
        total_won = total_won + ?,
        biggest_win = ?,
        longest_streak = ?,
        current_streak = ?
      WHERE player_id = ?
    `).run(
      isWin ? 1 : 0,
      isBlackjack ? 1 : 0,
      betAmount,
      Math.max(0, netWin),
      biggestWin,
      longestStreak,
      newStreak,
      playerId
    );
  }

  /**
   * Get player stats
   */
  getStats(characterId) {
    const stats = this.db.prepare(`
      SELECT * FROM blackjack_stats WHERE player_id = ?
    `).get(characterId);

    if (!stats) {
      return {
        gamesPlayed: 0,
        gamesWon: 0,
        winRate: 0,
        blackjacks: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        biggestWin: 0,
        longestStreak: 0,
        currentStreak: 0
      };
    }

    return {
      gamesPlayed: stats.games_played,
      gamesWon: stats.games_won,
      winRate: stats.games_played > 0 
        ? Math.round((stats.games_won / stats.games_played) * 100) 
        : 0,
      blackjacks: stats.blackjacks,
      totalWagered: stats.total_wagered,
      totalWon: stats.total_won,
      netProfit: stats.total_won - stats.total_wagered,
      biggestWin: stats.biggest_win,
      longestStreak: stats.longest_streak,
      currentStreak: stats.current_streak
    };
  }
}

module.exports = {
  CONFIG,
  GameState,
  Result,
  initBlackjackDB,
  BlackjackGame
};
