/**
 * 🐚 Shells — Premium Currency System
 * 
 * Shells are a non-withdrawable premium currency purchased with real USDC.
 * 100 Shells = $1 USDC. Minimum purchase: $1 (100 Shells).
 * 
 * Revenue goes 100% to the company wallet.
 * Shells can only be spent on premium items (gacha, cosmetics, etc.)
 * They CANNOT be withdrawn, P2P traded, or converted back to USDC.
 */

const crypto = require('crypto');

// ============================================================================
// CONSTANTS
// ============================================================================

const SHELLS_PER_USDC = 100;        // 100 Shells = $1 USDC
const MIN_PURCHASE_USDC = 1.0;      // $1 minimum purchase
const MIN_PURCHASE_SHELLS = 100;    // 100 Shells minimum

// Company wallet — receives 100% of USDC from Shell purchases
const COMPANY_WALLET = 'C9VxL3EF8qZdPVBy6GzSYborjozGRVBZC6goM6Ag2dHh';

// What Shells can buy (expand this list over time)
const SHELL_PRODUCTS = {
  henchman_pull: {
    id: 'henchman_pull',
    name: 'Henchman Pull',
    description: 'Pull a random henchman companion!',
    cost: 500,  // 500 Shells = $5
    emoji: '🎰'
  },
  // Future products:
  // cosmetic_skin: { id: 'cosmetic_skin', name: 'Cosmetic Skin', cost: 200, emoji: '🎨' },
  // name_change: { id: 'name_change', name: 'Name Change Token', cost: 100, emoji: '📝' },
  // xp_boost: { id: 'xp_boost', name: 'XP Boost (1hr)', cost: 150, emoji: '⚡' },
};

// ============================================================================
// SHELLS MANAGER
// ============================================================================

class ShellsManager {
  constructor(db) {
    this.db = db;
    this.initTables();
  }

  /**
   * Create Shells tables
   */
  initTables() {
    this.db.exec(`
      -- Shell transaction ledger
      CREATE TABLE IF NOT EXISTS shell_transactions (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        type TEXT CHECK(type IN ('purchase', 'spend', 'refund', 'grant')) NOT NULL,
        amount INTEGER NOT NULL,
        usdc_amount REAL,
        product_id TEXT,
        solana_tx TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES clawds(id)
      );
    `);

    // Add shells column to clawds if not exists
    try {
      this.db.exec(`ALTER TABLE clawds ADD COLUMN shells INTEGER DEFAULT 0`);
      console.log('  🐚 Added shells column to clawds');
    } catch (e) {
      // Column already exists
    }
  }

  /**
   * Get a character's Shell balance
   */
  getBalance(characterId) {
    const row = this.db.prepare('SELECT shells FROM clawds WHERE id = ?').get(characterId);
    return row?.shells || 0;
  }

  /**
   * Purchase Shells with USDC
   * @param {string} characterId - Character buying shells
   * @param {number} usdcAmount - Amount of USDC spent
   * @param {string} solanaTx - Solana transaction signature (for verification)
   * @returns {object} Purchase result
   */
  purchaseShells(characterId, usdcAmount, solanaTx = null) {
    if (usdcAmount < MIN_PURCHASE_USDC) {
      return { 
        success: false, 
        error: `Minimum purchase is $${MIN_PURCHASE_USDC} USDC (${MIN_PURCHASE_SHELLS} Shells)` 
      };
    }

    const shellsToCredit = Math.floor(usdcAmount * SHELLS_PER_USDC);
    const txId = crypto.randomUUID();

    // Credit shells to character
    this.db.prepare('UPDATE clawds SET shells = shells + ? WHERE id = ?')
      .run(shellsToCredit, characterId);

    // Log transaction
    this.db.prepare(`
      INSERT INTO shell_transactions (id, character_id, type, amount, usdc_amount, solana_tx, description)
      VALUES (?, ?, 'purchase', ?, ?, ?, ?)
    `).run(txId, characterId, shellsToCredit, usdcAmount, solanaTx, 
      `Purchased ${shellsToCredit} Shells for $${usdcAmount.toFixed(2)} USDC`);

    // Track revenue in company wallet
    try {
      this.db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
        .run(usdcAmount, 'company_revenue');
    } catch (e) {
      // company_revenue wallet may not exist yet — create it
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO system_wallets (id, name, type, public_key, encrypted_secret, balance_cache)
          VALUES ('company_revenue', 'Company Revenue', 'treasury', ?, '', ?)
        `).run(COMPANY_WALLET, usdcAmount);
      } catch (e2) {
        // Already exists with different key, just update
      }
    }

    return {
      success: true,
      shellsCredited: shellsToCredit,
      usdcSpent: usdcAmount,
      newBalance: this.getBalance(characterId),
      transactionId: txId
    };
  }

  /**
   * Spend Shells on a product
   * @param {string} characterId - Character spending shells
   * @param {string} productId - Product to buy
   * @param {number} quantity - How many (default 1)
   * @returns {object} Spend result
   */
  spendShells(characterId, productId, quantity = 1) {
    const product = SHELL_PRODUCTS[productId];
    if (!product) {
      return { success: false, error: 'Unknown product' };
    }

    const totalCost = product.cost * quantity;
    const balance = this.getBalance(characterId);

    if (balance < totalCost) {
      return { 
        success: false, 
        error: `Not enough Shells. Need ${totalCost}, have ${balance}`,
        hint: `Buy more Shells! ${totalCost} Shells = $${(totalCost / SHELLS_PER_USDC).toFixed(2)} USDC`
      };
    }

    const txId = crypto.randomUUID();

    // Deduct shells
    this.db.prepare('UPDATE clawds SET shells = shells - ? WHERE id = ?')
      .run(totalCost, characterId);

    // Log transaction
    this.db.prepare(`
      INSERT INTO shell_transactions (id, character_id, type, amount, product_id, description)
      VALUES (?, ?, 'spend', ?, ?, ?)
    `).run(txId, characterId, -totalCost, productId, 
      `Spent ${totalCost} Shells on ${product.name} x${quantity}`);

    return {
      success: true,
      product: product.name,
      quantity,
      shellsSpent: totalCost,
      newBalance: this.getBalance(characterId),
      transactionId: txId
    };
  }

  /**
   * Grant Shells (admin/promotional)
   */
  grantShells(characterId, amount, reason = 'Admin grant') {
    const txId = crypto.randomUUID();
    
    this.db.prepare('UPDATE clawds SET shells = shells + ? WHERE id = ?')
      .run(amount, characterId);

    this.db.prepare(`
      INSERT INTO shell_transactions (id, character_id, type, amount, description)
      VALUES (?, ?, 'grant', ?, ?)
    `).run(txId, characterId, amount, reason);

    return {
      success: true,
      shellsGranted: amount,
      newBalance: this.getBalance(characterId),
      reason
    };
  }

  /**
   * Get transaction history for a character
   */
  getHistory(characterId, limit = 20) {
    return this.db.prepare(`
      SELECT * FROM shell_transactions 
      WHERE character_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(characterId, limit);
  }

  /**
   * Get total revenue stats
   */
  getRevenueStats() {
    const totalRevenue = this.db.prepare(`
      SELECT COALESCE(SUM(usdc_amount), 0) as total 
      FROM shell_transactions WHERE type = 'purchase'
    `).get();

    const totalShellsSold = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM shell_transactions WHERE type = 'purchase'
    `).get();

    const totalShellsSpent = this.db.prepare(`
      SELECT COALESCE(SUM(ABS(amount)), 0) as total 
      FROM shell_transactions WHERE type = 'spend'
    `).get();

    const uniqueBuyers = this.db.prepare(`
      SELECT COUNT(DISTINCT character_id) as count 
      FROM shell_transactions WHERE type = 'purchase'
    `).get();

    return {
      totalRevenueUSDC: totalRevenue.total,
      totalShellsSold: totalShellsSold.total,
      totalShellsSpent: totalShellsSpent.total,
      shellsInCirculation: totalShellsSold.total - totalShellsSpent.total,
      uniqueBuyers: uniqueBuyers.count
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ShellsManager,
  SHELLS_PER_USDC,
  MIN_PURCHASE_USDC,
  MIN_PURCHASE_SHELLS,
  SHELL_PRODUCTS,
  COMPANY_WALLET
};
