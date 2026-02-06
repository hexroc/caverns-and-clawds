/**
 * Gambling Service - Unified Betting & Payout Logic
 * 
 * Handles all gambling transactions for players and NPCs using the USDC economy.
 * Applies 1% treasury tax on all bets.
 */

const crypto = require('crypto');

// Gambling configuration
const GAMBLING_CONFIG = {
  TREASURY_TAX_RATE: 0.01, // 1% of bet goes to treasury
  TREASURY_WALLET_NAME: 'Treasury',
  MIN_BET: 0.001, // USDC
  MAX_BET: 0.05,  // USDC (capped for safety)
};

class GamblingService {
  constructor(db, characterManager = null) {
    this.db = db;
    this.characterManager = characterManager;
    this._initDB();
  }

  _initDB() {
    // Transaction log for all gambling activity
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gambling_transactions (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        session_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        participant_type TEXT CHECK(participant_type IN ('player', 'npc')) NOT NULL,
        transaction_type TEXT CHECK(transaction_type IN ('bet', 'win', 'loss', 'tax')) NOT NULL,
        amount REAL NOT NULL,
        balance_before REAL NOT NULL,
        balance_after REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tax collection tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS gambling_tax_collected (
        id TEXT PRIMARY KEY,
        game TEXT NOT NULL,
        session_id TEXT NOT NULL,
        tax_amount REAL NOT NULL,
        collected_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('🎰 Gambling service database initialized');
  }

  /**
   * Get participant balance (player or NPC)
   */
  getBalance(participantId, type = 'player') {
    if (type === 'player') {
      const char = this.db.prepare('SELECT usdc_balance FROM clawds WHERE id = ?').get(participantId);
      return char ? char.usdc_balance : 0;
    } else if (type === 'npc') {
      const npc = this.db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ? AND type = ?').get(participantId, 'npc');
      return npc ? npc.balance_cache : 0;
    }
    return 0;
  }

  /**
   * Update participant balance
   */
  updateBalance(participantId, type, newBalance) {
    if (type === 'player') {
      this.db.prepare('UPDATE clawds SET usdc_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, participantId);
    } else if (type === 'npc') {
      this.db.prepare('UPDATE system_wallets SET balance_cache = ?, last_balance_update = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newBalance, participantId);
    }
  }

  /**
   * Get treasury wallet
   */
  getTreasury() {
    let treasury = this.db.prepare(
      'SELECT * FROM system_wallets WHERE name = ? AND type = ?'
    ).get(GAMBLING_CONFIG.TREASURY_WALLET_NAME, 'treasury');

    if (!treasury) {
      console.warn('⚠️ Treasury wallet not found in system_wallets');
      return null;
    }

    return treasury;
  }

  /**
   * Place a bet (with tax)
   * Returns { success, betAmount, taxAmount, totalCost, newBalance } or { success: false, error }
   */
  placeBet(participantId, type, betAmount, game, sessionId) {
    // Validate bet amount
    if (betAmount < GAMBLING_CONFIG.MIN_BET) {
      return { 
        success: false, 
        error: `Minimum bet is ${GAMBLING_CONFIG.MIN_BET} USDC` 
      };
    }

    if (betAmount > GAMBLING_CONFIG.MAX_BET) {
      return { 
        success: false, 
        error: `Maximum bet is ${GAMBLING_CONFIG.MAX_BET} USDC` 
      };
    }

    // Calculate tax
    const taxAmount = betAmount * GAMBLING_CONFIG.TREASURY_TAX_RATE;
    const totalCost = betAmount + taxAmount;

    // Check balance
    const currentBalance = this.getBalance(participantId, type);
    if (currentBalance < totalCost) {
      return {
        success: false,
        error: 'Insufficient balance',
        required: totalCost,
        available: currentBalance
      };
    }

    // Deduct total cost
    const newBalance = currentBalance - totalCost;
    this.updateBalance(participantId, type, newBalance);

    // Log bet transaction
    this.db.prepare(`
      INSERT INTO gambling_transactions 
      (id, game, session_id, participant_id, participant_type, transaction_type, amount, balance_before, balance_after)
      VALUES (?, ?, ?, ?, ?, 'bet', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      game,
      sessionId,
      participantId,
      type,
      betAmount,
      currentBalance,
      newBalance
    );

    // Transfer tax to treasury
    const treasury = this.getTreasury();
    if (treasury) {
      const treasuryBalance = treasury.balance_cache || 0;
      this.db.prepare(
        'UPDATE system_wallets SET balance_cache = ?, last_balance_update = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(treasuryBalance + taxAmount, treasury.id);

      // Log tax collection
      this.db.prepare(`
        INSERT INTO gambling_tax_collected (id, game, session_id, tax_amount)
        VALUES (?, ?, ?, ?)
      `).run(crypto.randomUUID(), game, sessionId, taxAmount);

      // Log tax transaction
      this.db.prepare(`
        INSERT INTO gambling_transactions 
        (id, game, session_id, participant_id, participant_type, transaction_type, amount, balance_before, balance_after)
        VALUES (?, ?, ?, ?, ?, 'tax', ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        game,
        sessionId,
        participantId,
        type,
        taxAmount,
        currentBalance,
        newBalance
      );
    }

    console.log(`💰 Bet placed: ${betAmount} USDC + ${taxAmount} USDC tax = ${totalCost} USDC total`);

    return {
      success: true,
      betAmount,
      taxAmount,
      totalCost,
      newBalance
    };
  }

  /**
   * Award winnings
   * Returns { success, payout, newBalance } or { success: false, error }
   */
  awardWinnings(participantId, type, payout, game, sessionId) {
    if (payout <= 0) {
      return { success: false, error: 'Payout must be positive' };
    }

    const currentBalance = this.getBalance(participantId, type);
    const newBalance = currentBalance + payout;
    this.updateBalance(participantId, type, newBalance);

    // Log win transaction
    this.db.prepare(`
      INSERT INTO gambling_transactions 
      (id, game, session_id, participant_id, participant_type, transaction_type, amount, balance_before, balance_after)
      VALUES (?, ?, ?, ?, ?, 'win', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      game,
      sessionId,
      participantId,
      type,
      payout,
      currentBalance,
      newBalance
    );

    console.log(`🎉 Winnings awarded: ${payout} USDC (new balance: ${newBalance} USDC)`);

    return {
      success: true,
      payout,
      newBalance
    };
  }

  /**
   * Get participant info (name, balance, type)
   */
  getParticipantInfo(participantId, type = 'player') {
    if (type === 'player') {
      const char = this.db.prepare('SELECT name, usdc_balance FROM clawds WHERE id = ?').get(participantId);
      return char ? { name: char.name, balance: char.usdc_balance, type: 'player' } : null;
    } else if (type === 'npc') {
      const npc = this.db.prepare('SELECT name, balance_cache FROM system_wallets WHERE id = ? AND type = ?').get(participantId, 'npc');
      return npc ? { name: npc.name, balance: npc.balance_cache, type: 'npc' } : null;
    }
    return null;
  }

  /**
   * Get gambling stats for a participant
   */
  getGamblingStats(participantId, type = 'player') {
    const transactions = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN transaction_type = 'bet' THEN 1 END) as total_bets,
        SUM(CASE WHEN transaction_type = 'bet' THEN amount ELSE 0 END) as total_wagered,
        SUM(CASE WHEN transaction_type = 'win' THEN amount ELSE 0 END) as total_won,
        SUM(CASE WHEN transaction_type = 'tax' THEN amount ELSE 0 END) as total_tax_paid
      FROM gambling_transactions
      WHERE participant_id = ? AND participant_type = ?
    `).get(participantId, type);

    return {
      totalBets: transactions.total_bets || 0,
      totalWagered: transactions.total_wagered || 0,
      totalWon: transactions.total_won || 0,
      totalTaxPaid: transactions.total_tax_paid || 0,
      netProfit: (transactions.total_won || 0) - (transactions.total_wagered || 0) - (transactions.total_tax_paid || 0)
    };
  }

  /**
   * Get total tax collected (all games)
   */
  getTotalTaxCollected() {
    const result = this.db.prepare(`
      SELECT SUM(tax_amount) as total FROM gambling_tax_collected
    `).get();

    return result.total || 0;
  }

  /**
   * Validate bet amount helper
   */
  static validateBetAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { valid: false, error: 'Bet must be a number' };
    }

    if (amount < GAMBLING_CONFIG.MIN_BET) {
      return { 
        valid: false, 
        error: `Minimum bet is ${GAMBLING_CONFIG.MIN_BET} USDC` 
      };
    }

    if (amount > GAMBLING_CONFIG.MAX_BET) {
      return { 
        valid: false, 
        error: `Maximum bet is ${GAMBLING_CONFIG.MAX_BET} USDC` 
      };
    }

    return { valid: true };
  }
}

module.exports = {
  GamblingService,
  GAMBLING_CONFIG
};
