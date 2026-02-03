/**
 * Tavern Wallet Infrastructure
 * 
 * Handles:
 * - House wallet (receives player deposits)
 * - Tax wallet (B-Rock's profit wallet)
 * - On-chain transaction listener (auto-credit deposits)
 * - Withdrawal processing (send winnings)
 */

const { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const bs58 = require('bs58');
const crypto = require('crypto');

// ============================================================================
// WALLET CONFIGURATION
// ============================================================================

const WALLET_CONFIG = {
  // House wallet - receives deposits, pays out winnings
  house: {
    address: process.env.TAVERN_HOUSE_WALLET || '2tFdErcENQr7gFKZp6hTZMzt7vqcY6H5r1g5BfajSi24',
    secret: process.env.TAVERN_HOUSE_SECRET // Base58 encoded secret key
  },
  
  // Tax wallet - B-Rock's profit wallet (receives house cut)
  tax: {
    address: process.env.TAVERN_TAX_WALLET || 'CcYM7g2V6W8m9fRHEKB1BppsZb2Hy9FubJPaLTGpWATs',
    // No secret needed - we only send TO this wallet
  },
  
  // RPC endpoints
  rpc: {
    mainnet: process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com',
    devnet: process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com'
  },
  
  // Network (mainnet-beta or devnet)
  network: process.env.TAVERN_NETWORK || 'devnet',
  
  // House cut percentage (5% = 0.05)
  houseCut: 0.05,
  
  // Minimum deposit (0.001 SOL)
  minDeposit: 0.001 * LAMPORTS_PER_SOL,
  
  // Minimum withdrawal (0.01 SOL)
  minWithdrawal: 0.01 * LAMPORTS_PER_SOL,
  
  // Transaction fee buffer
  txFeeBuffer: 0.001 * LAMPORTS_PER_SOL
};

// ============================================================================
// WALLET MANAGER
// ============================================================================

class TavernWalletManager {
  constructor(db, config = WALLET_CONFIG) {
    this.db = db;
    this.config = config;
    this.connection = new Connection(
      config.network === 'mainnet-beta' ? config.rpc.mainnet : config.rpc.devnet,
      'confirmed'
    );
    this.houseKeypair = null;
    this.subscriptionId = null;
    this.processedTxs = new Set(); // Prevent double-processing
    
    this._initHouseKeypair();
    this._initDB();
  }
  
  _initHouseKeypair() {
    if (this.config.house.secret) {
      try {
        const secretKey = bs58.default.decode(this.config.house.secret);
        this.houseKeypair = Keypair.fromSecretKey(secretKey);
        console.log('🏠 House wallet loaded:', this.houseKeypair.publicKey.toBase58());
      } catch (err) {
        console.error('❌ Failed to load house keypair:', err.message);
      }
    } else {
      console.warn('⚠️ House wallet secret not configured - withdrawals disabled');
    }
  }
  
  _initDB() {
    // Pending deposits table (for tracking unprocessed deposits)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tavern_pending_deposits (
        id TEXT PRIMARY KEY,
        tx_signature TEXT UNIQUE NOT NULL,
        from_wallet TEXT NOT NULL,
        amount_lamports INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        player_id TEXT,
        processed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Withdrawal requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tavern_withdrawals (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        amount_lamports INTEGER NOT NULL,
        to_wallet TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        tx_signature TEXT,
        error TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        processed_at TEXT,
        FOREIGN KEY (player_id) REFERENCES tavern_players(id)
      )
    `);
    
    // House profit tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tavern_house_profits (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        amount_lamports INTEGER NOT NULL,
        transferred INTEGER DEFAULT 0,
        transfer_tx TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES tavern_matches(id)
      )
    `);
    
    console.log('💰 Tavern wallet database initialized');
  }
  
  // ===== DEPOSIT DETECTION =====
  
  /**
   * Start listening for incoming deposits to house wallet
   */
  async startDepositListener() {
    if (!this.config.house.address || this.config.house.address === 'HOUSE_WALLET_NOT_CONFIGURED') {
      console.error('❌ Cannot start deposit listener - house wallet not configured');
      return false;
    }
    
    const housePubkey = new PublicKey(this.config.house.address);
    
    console.log(`👂 Starting deposit listener for: ${this.config.house.address}`);
    console.log(`   Network: ${this.config.network}`);
    
    // Subscribe to account changes
    this.subscriptionId = this.connection.onAccountChange(
      housePubkey,
      async (accountInfo, context) => {
        console.log('📥 House wallet activity detected, slot:', context.slot);
        await this.checkRecentDeposits();
      },
      'confirmed'
    );
    
    // Also poll periodically as backup
    this.pollInterval = setInterval(() => this.checkRecentDeposits(), 30000);
    
    console.log('✅ Deposit listener started');
    return true;
  }
  
  /**
   * Stop the deposit listener
   */
  async stopDepositListener() {
    if (this.subscriptionId !== null) {
      await this.connection.removeAccountChangeListener(this.subscriptionId);
      this.subscriptionId = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    console.log('🛑 Deposit listener stopped');
  }
  
  /**
   * Check for recent deposits and credit players
   */
  async checkRecentDeposits() {
    try {
      const housePubkey = new PublicKey(this.config.house.address);
      
      // Get recent signatures (last 20 transactions)
      const signatures = await this.connection.getSignaturesForAddress(
        housePubkey,
        { limit: 20 }
      );
      
      for (const sigInfo of signatures) {
        // Skip if already processed
        if (this.processedTxs.has(sigInfo.signature)) continue;
        
        const existing = this.db.prepare(
          'SELECT * FROM tavern_pending_deposits WHERE tx_signature = ?'
        ).get(sigInfo.signature);
        if (existing) {
          this.processedTxs.add(sigInfo.signature);
          continue;
        }
        
        // Get transaction details
        const tx = await this.connection.getParsedTransaction(
          sigInfo.signature,
          { maxSupportedTransactionVersion: 0 }
        );
        
        if (!tx || !tx.meta) continue;
        
        // Find transfers TO house wallet
        const preBalance = tx.meta.preBalances;
        const postBalance = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;
        
        const houseIndex = accountKeys.findIndex(
          k => k.pubkey.toBase58() === this.config.house.address
        );
        
        if (houseIndex === -1) continue;
        
        const depositAmount = postBalance[houseIndex] - preBalance[houseIndex];
        
        if (depositAmount > 0) {
          // This is a deposit! Find the sender
          const senderIndex = accountKeys.findIndex((k, i) => {
            return i !== houseIndex && (preBalance[i] - postBalance[i]) > 0;
          });
          
          const senderAddress = senderIndex >= 0 
            ? accountKeys[senderIndex].pubkey.toBase58()
            : 'unknown';
          
          console.log(`💸 Deposit detected: ${depositAmount / LAMPORTS_PER_SOL} SOL from ${senderAddress}`);
          
          // Record pending deposit
          const depositId = crypto.randomUUID();
          this.db.prepare(`
            INSERT INTO tavern_pending_deposits (id, tx_signature, from_wallet, amount_lamports, slot)
            VALUES (?, ?, ?, ?, ?)
          `).run(depositId, sigInfo.signature, senderAddress, depositAmount, sigInfo.slot);
          
          // Try to auto-credit if we can match a player
          await this.autoCredit(depositId);
        }
        
        this.processedTxs.add(sigInfo.signature);
      }
    } catch (err) {
      console.error('Error checking deposits:', err.message);
    }
  }
  
  /**
   * Auto-credit a deposit to a player if wallet matches
   */
  async autoCredit(depositId) {
    const deposit = this.db.prepare(
      'SELECT * FROM tavern_pending_deposits WHERE id = ?'
    ).get(depositId);
    
    if (!deposit || deposit.status !== 'pending') return null;
    
    // Find player by wallet
    const player = this.db.prepare(
      'SELECT * FROM tavern_players WHERE wallet_address = ? AND verified = 1'
    ).get(deposit.from_wallet);
    
    if (!player) {
      console.log(`⏳ Deposit from unknown wallet: ${deposit.from_wallet}`);
      return null;
    }
    
    // Credit the player
    this.db.prepare(`
      UPDATE tavern_players SET balance_lamports = balance_lamports + ? WHERE id = ?
    `).run(deposit.amount_lamports, player.id);
    
    // Mark deposit as processed
    this.db.prepare(`
      UPDATE tavern_pending_deposits 
      SET status = 'credited', player_id = ?, processed_at = datetime('now')
      WHERE id = ?
    `).run(player.id, depositId);
    
    // Log transaction
    this.db.prepare(`
      INSERT INTO tavern_transactions (id, player_id, type, amount_lamports, tx_signature, status)
      VALUES (?, ?, 'deposit', ?, ?, 'completed')
    `).run(crypto.randomUUID(), player.id, deposit.amount_lamports, deposit.tx_signature);
    
    console.log(`✅ Auto-credited ${deposit.amount_lamports / LAMPORTS_PER_SOL} SOL to ${player.agent_name}`);
    
    return {
      success: true,
      player: player.agent_name,
      amount: deposit.amount_lamports,
      amountSOL: deposit.amount_lamports / LAMPORTS_PER_SOL
    };
  }
  
  /**
   * Manually credit a deposit (admin function)
   */
  manualCredit(txSignature, playerId) {
    const deposit = this.db.prepare(
      'SELECT * FROM tavern_pending_deposits WHERE tx_signature = ?'
    ).get(txSignature);
    
    if (!deposit) {
      return { success: false, error: 'Deposit not found' };
    }
    
    if (deposit.status !== 'pending') {
      return { success: false, error: `Deposit already ${deposit.status}` };
    }
    
    const player = this.db.prepare(
      'SELECT * FROM tavern_players WHERE id = ?'
    ).get(playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    // Credit the player
    this.db.prepare(`
      UPDATE tavern_players SET balance_lamports = balance_lamports + ? WHERE id = ?
    `).run(deposit.amount_lamports, playerId);
    
    // Mark deposit as processed
    this.db.prepare(`
      UPDATE tavern_pending_deposits 
      SET status = 'credited', player_id = ?, processed_at = datetime('now')
      WHERE id = ?
    `).run(playerId, deposit.id);
    
    // Log transaction
    this.db.prepare(`
      INSERT INTO tavern_transactions (id, player_id, type, amount_lamports, tx_signature, status)
      VALUES (?, ?, 'deposit', ?, ?, 'completed')
    `).run(crypto.randomUUID(), playerId, deposit.amount_lamports, deposit.tx_signature);
    
    return {
      success: true,
      amount: deposit.amount_lamports,
      amountSOL: deposit.amount_lamports / LAMPORTS_PER_SOL,
      player: player.agent_name
    };
  }
  
  // ===== WITHDRAWALS =====
  
  /**
   * Request a withdrawal
   */
  requestWithdrawal(playerId, amountLamports, toWallet = null) {
    const player = this.db.prepare(
      'SELECT * FROM tavern_players WHERE id = ?'
    ).get(playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    if (!player.verified) {
      return { success: false, error: 'Wallet not verified' };
    }
    
    // Default to player's registered wallet
    const targetWallet = toWallet || player.wallet_address;
    
    // Validate amount
    if (amountLamports < this.config.minWithdrawal) {
      return { 
        success: false, 
        error: `Minimum withdrawal is ${this.config.minWithdrawal / LAMPORTS_PER_SOL} SOL` 
      };
    }
    
    if (amountLamports > player.balance_lamports) {
      return { 
        success: false, 
        error: 'Insufficient balance',
        balance: player.balance_lamports,
        balanceSOL: player.balance_lamports / LAMPORTS_PER_SOL
      };
    }
    
    // Lock the funds
    this.db.prepare(`
      UPDATE tavern_players SET balance_lamports = balance_lamports - ? WHERE id = ?
    `).run(amountLamports, playerId);
    
    // Create withdrawal request
    const withdrawalId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO tavern_withdrawals (id, player_id, amount_lamports, to_wallet)
      VALUES (?, ?, ?, ?)
    `).run(withdrawalId, playerId, amountLamports, targetWallet);
    
    // Process immediately if house wallet is configured
    if (this.houseKeypair) {
      this.processWithdrawal(withdrawalId);
    }
    
    return {
      success: true,
      withdrawalId,
      amount: amountLamports,
      amountSOL: amountLamports / LAMPORTS_PER_SOL,
      toWallet: targetWallet,
      status: 'pending',
      message: this.houseKeypair 
        ? 'Withdrawal processing...' 
        : 'Withdrawal queued (manual processing required)'
    };
  }
  
  /**
   * Process a pending withdrawal
   */
  async processWithdrawal(withdrawalId) {
    const withdrawal = this.db.prepare(
      'SELECT * FROM tavern_withdrawals WHERE id = ?'
    ).get(withdrawalId);
    
    if (!withdrawal || withdrawal.status !== 'pending') {
      return { success: false, error: 'Invalid withdrawal' };
    }
    
    if (!this.houseKeypair) {
      return { success: false, error: 'House wallet not configured' };
    }
    
    try {
      const toPubkey = new PublicKey(withdrawal.to_wallet);
      
      // Account for transaction fee
      const sendAmount = withdrawal.amount_lamports - this.config.txFeeBuffer;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.houseKeypair.publicKey,
          toPubkey,
          lamports: sendAmount
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.houseKeypair]
      );
      
      // Update withdrawal record
      this.db.prepare(`
        UPDATE tavern_withdrawals 
        SET status = 'completed', tx_signature = ?, processed_at = datetime('now')
        WHERE id = ?
      `).run(signature, withdrawalId);
      
      // Log transaction
      this.db.prepare(`
        INSERT INTO tavern_transactions (id, player_id, type, amount_lamports, tx_signature, status)
        VALUES (?, ?, 'withdrawal', ?, ?, 'completed')
      `).run(crypto.randomUUID(), withdrawal.player_id, withdrawal.amount_lamports, signature);
      
      console.log(`💸 Withdrawal sent: ${sendAmount / LAMPORTS_PER_SOL} SOL to ${withdrawal.to_wallet}`);
      console.log(`   TX: ${signature}`);
      
      return {
        success: true,
        txSignature: signature,
        amount: sendAmount,
        amountSOL: sendAmount / LAMPORTS_PER_SOL,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${this.config.network}`
      };
    } catch (err) {
      // Refund on failure
      this.db.prepare(`
        UPDATE tavern_players SET balance_lamports = balance_lamports + ? WHERE id = ?
      `).run(withdrawal.amount_lamports, withdrawal.player_id);
      
      this.db.prepare(`
        UPDATE tavern_withdrawals SET status = 'failed', error = ? WHERE id = ?
      `).run(err.message, withdrawalId);
      
      console.error('❌ Withdrawal failed:', err.message);
      return { success: false, error: err.message };
    }
  }
  
  // ===== HOUSE PROFITS =====
  
  /**
   * Record house profit from a match
   */
  recordHouseProfit(matchId, profitLamports) {
    const profitId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO tavern_house_profits (id, match_id, amount_lamports)
      VALUES (?, ?, ?)
    `).run(profitId, matchId, profitLamports);
    
    console.log(`💰 House profit: ${profitLamports / LAMPORTS_PER_SOL} SOL from match ${matchId}`);
    return profitId;
  }
  
  /**
   * Transfer accumulated profits to tax wallet
   */
  async transferProfitsToTax() {
    if (!this.houseKeypair) {
      return { success: false, error: 'House wallet not configured' };
    }
    
    // Get untransferred profits
    const profits = this.db.prepare(`
      SELECT SUM(amount_lamports) as total FROM tavern_house_profits WHERE transferred = 0
    `).get();
    
    if (!profits.total || profits.total < this.config.minWithdrawal) {
      return { 
        success: false, 
        error: 'Not enough accumulated profits',
        total: profits.total || 0,
        minRequired: this.config.minWithdrawal
      };
    }
    
    try {
      const taxPubkey = new PublicKey(this.config.tax.address);
      const sendAmount = profits.total - this.config.txFeeBuffer;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.houseKeypair.publicKey,
          toPubkey: taxPubkey,
          lamports: sendAmount
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.houseKeypair]
      );
      
      // Mark profits as transferred
      this.db.prepare(`
        UPDATE tavern_house_profits 
        SET transferred = 1, transfer_tx = ?
        WHERE transferred = 0
      `).run(signature);
      
      console.log(`🏦 Profits transferred to tax wallet: ${sendAmount / LAMPORTS_PER_SOL} SOL`);
      console.log(`   TX: ${signature}`);
      
      return {
        success: true,
        txSignature: signature,
        amount: sendAmount,
        amountSOL: sendAmount / LAMPORTS_PER_SOL,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${this.config.network}`
      };
    } catch (err) {
      console.error('❌ Profit transfer failed:', err.message);
      return { success: false, error: err.message };
    }
  }
  
  // ===== STATUS & INFO =====
  
  /**
   * Get wallet status and balances
   */
  async getWalletStatus() {
    let houseBalance = 0;
    try {
      houseBalance = await this.getBalance(this.config.house.address);
    } catch (err) {
      console.error('Error fetching house balance:', err.message);
    }
    
    const pendingDeposits = this.db.prepare(`
      SELECT COUNT(*) as count, SUM(amount_lamports) as total 
      FROM tavern_pending_deposits WHERE status = 'pending'
    `).get();
    
    const pendingWithdrawals = this.db.prepare(`
      SELECT COUNT(*) as count, SUM(amount_lamports) as total
      FROM tavern_withdrawals WHERE status = 'pending'
    `).get();
    
    const untransferredProfits = this.db.prepare(`
      SELECT SUM(amount_lamports) as total FROM tavern_house_profits WHERE transferred = 0
    `).get();
    
    const totalPlayerBalances = this.db.prepare(`
      SELECT SUM(balance_lamports) as total FROM tavern_players
    `).get();
    
    return {
      network: this.config.network,
      houseWallet: {
        address: this.config.house.address,
        balance: houseBalance,
        balanceSOL: houseBalance / LAMPORTS_PER_SOL,
        configured: !!this.houseKeypair
      },
      taxWallet: {
        address: this.config.tax.address
      },
      houseCut: `${this.config.houseCut * 100}%`,
      pendingDeposits: {
        count: pendingDeposits.count,
        total: pendingDeposits.total || 0,
        totalSOL: (pendingDeposits.total || 0) / LAMPORTS_PER_SOL
      },
      pendingWithdrawals: {
        count: pendingWithdrawals.count,
        total: pendingWithdrawals.total || 0,
        totalSOL: (pendingWithdrawals.total || 0) / LAMPORTS_PER_SOL
      },
      untransferredProfits: {
        total: untransferredProfits.total || 0,
        totalSOL: (untransferredProfits.total || 0) / LAMPORTS_PER_SOL
      },
      playerLiability: {
        total: totalPlayerBalances.total || 0,
        totalSOL: (totalPlayerBalances.total || 0) / LAMPORTS_PER_SOL
      },
      listenerActive: this.subscriptionId !== null
    };
  }
  
  /**
   * Get balance of any wallet
   */
  async getBalance(address) {
    try {
      const pubkey = new PublicKey(address);
      return await this.connection.getBalance(pubkey);
    } catch (err) {
      return 0;
    }
  }
  
  /**
   * Get deposit history for a player
   */
  getDepositHistory(playerId, limit = 20) {
    return this.db.prepare(`
      SELECT * FROM tavern_transactions 
      WHERE player_id = ? AND type = 'deposit'
      ORDER BY created_at DESC LIMIT ?
    `).all(playerId, limit);
  }
  
  /**
   * Get withdrawal history for a player
   */
  getWithdrawalHistory(playerId, limit = 20) {
    return this.db.prepare(`
      SELECT * FROM tavern_withdrawals
      WHERE player_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(playerId, limit);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TavernWalletManager,
  WALLET_CONFIG,
  LAMPORTS_PER_SOL
};
