/**
 * Economy API Routes
 * 
 * Handles all economic transactions:
 * - Selling materials to NPCs
 * - Buying items from NPCs
 * - Banking (deposit, withdraw, loans)
 * - Jobs
 * - Peer-to-peer trading
 */

const express = require('express');
const crypto = require('crypto');
const wallet = require('./wallet');
const { ENCRYPTION_KEY } = require('./init-economy');
const { recordBalance } = require('./realestate');
const { activityTracker } = require('../activity-tracker');

function createEconomyRoutes(db, authenticateAgent) {
  const router = express.Router();
  
  // Helper to get character
  function getChar(req) {
    const user = req.user;
    if (!user) return null;
    return db.prepare(`
      SELECT c.*, u.name as agent_name 
      FROM clawds c 
      JOIN users u ON c.agent_id = u.id 
      WHERE c.agent_id = ?
    `).get(user.id);
  }
  
  // Helper to get system wallet
  function getSystemWallet(id) {
    return db.prepare('SELECT * FROM system_wallets WHERE id = ?').get(id);
  }
  
  // Helper to decrypt wallet secret
  function getWalletSecret(encryptedSecret) {
    return wallet.decryptSecretKey(encryptedSecret, ENCRYPTION_KEY);
  }
  
  // Helper to log transaction
  function logTransaction(type, fromWallet, toWallet, amount, signature, description) {
    db.prepare(`
      INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, signature, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), type, fromWallet, toWallet, amount, signature, description);
  }

  // 1% treasury tax on all sales — accumulates in treasury balance_cache
  // Withdrawn to Kamino yield contract weekly
  const TREASURY_TAX_RATE = 0.01; // 1%
  
  function applyTreasuryTax(saleAmount, description) {
    const tax = parseFloat((saleAmount * TREASURY_TAX_RATE).toFixed(4));
    if (tax > 0) {
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
        .run(tax, 'treasury');
      logTransaction('treasury_tax', 'economy', 'treasury', tax, 'tax', 
        `1% tax: ${description}`);
    }
    return tax;
  }
  
  // ============================================================================
  // WALLET MANAGEMENT
  // ============================================================================
  
  /**
   * GET /api/economy/wallet - Get player's wallet info
   */
  router.get('/wallet', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Create wallet if doesn't exist
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Get balances
      const usdcBalance = await wallet.getUSDCBalance(char.wallet_public_key);
      const solBalance = await wallet.getSOLBalance(char.wallet_public_key);
      
      // Get bank account
      const bankAccount = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      res.json({
        success: true,
        wallet: {
          publicKey: char.wallet_public_key,
          usdc: usdcBalance,
          sol: solBalance
        },
        bank: bankAccount ? {
          deposited: bankAccount.deposited_balance,
          loan: bankAccount.loan_balance,
          loanDueDate: bankAccount.loan_due_date
        } : null
      });
    } catch (err) {
      console.error('Wallet error:', err);
      res.status(500).json({ success: false, error: 'Failed to get wallet' });
    }
  });
  
  // ============================================================================
  // MATERIALS & TRADING
  // ============================================================================
  
  /**
   * GET /api/economy/materials - List all materials
   */
  router.get('/materials', (req, res) => {
    try {
      const materials = db.prepare('SELECT * FROM materials ORDER BY base_price ASC').all();
      res.json({ success: true, materials });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get materials' });
    }
  });
  
  /**
   * GET /api/economy/inventory - Get player's material inventory
   */
  router.get('/inventory', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const inventory = db.prepare(`
        SELECT pm.*, m.name, m.description, m.base_price, m.rarity
        FROM player_materials pm
        JOIN materials m ON pm.material_id = m.id
        WHERE pm.character_id = ?
        ORDER BY m.base_price DESC
      `).all(char.id);
      
      res.json({ success: true, inventory });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get inventory' });
    }
  });
  
  /**
   * GET /api/economy/prices - Get current NPC buy prices
   */
  router.get('/prices', (req, res) => {
    try {
      const npcId = req.query.npc || 'npc_old_shellworth'; // Default material buyer
      
      const materials = db.prepare('SELECT * FROM materials').all();
      const npcInventory = db.prepare(`
        SELECT material_id, quantity FROM npc_materials WHERE npc_id = ?
      `).all(npcId);
      
      const inventoryMap = {};
      for (const item of npcInventory) {
        inventoryMap[item.material_id] = item.quantity;
      }
      
      // Calculate prices based on supply
      const prices = materials.map(mat => {
        const stock = inventoryMap[mat.id] || 0;
        // Price modifier: high stock = lower price, low stock = higher price
        // Range: 0.5x to 1.5x base price
        let modifier = 1;
        if (stock > 50) modifier = 0.5;
        else if (stock > 30) modifier = 0.7;
        else if (stock > 10) modifier = 0.9;
        else if (stock < 3) modifier = 1.5;
        else if (stock < 5) modifier = 1.3;
        else if (stock < 10) modifier = 1.1;
        
        return {
          id: mat.id,
          name: mat.name,
          basePrice: mat.base_price,
          currentPrice: Math.round(mat.base_price * modifier * 10000) / 10000,
          modifier,
          npcStock: stock,
          rarity: mat.rarity
        };
      });
      
      res.json({ success: true, npc: npcId, prices });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get prices' });
    }
  });
  
  /**
   * POST /api/economy/sell - Sell materials to NPC
   */
  router.post('/sell', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { materialId, quantity, npcId = 'npc_old_shellworth' } = req.body;
      
      if (!materialId || !quantity || quantity < 1) {
        return res.status(400).json({ success: false, error: 'materialId and quantity required' });
      }
      
      // Check player has the materials
      const playerMat = db.prepare(`
        SELECT * FROM player_materials WHERE character_id = ? AND material_id = ?
      `).get(char.id, materialId);
      
      if (!playerMat || playerMat.quantity < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient materials',
          have: playerMat?.quantity || 0,
          need: quantity
        });
      }
      
      // Get material and calculate price
      const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId);
      if (!material) {
        return res.status(400).json({ success: false, error: 'Unknown material' });
      }
      
      // Get NPC wallet and check funds
      const npc = getSystemWallet(npcId);
      if (!npc) {
        return res.status(400).json({ success: false, error: 'Unknown NPC' });
      }
      
      // Calculate dynamic price
      const npcStock = db.prepare(`
        SELECT quantity FROM npc_materials WHERE npc_id = ? AND material_id = ?
      `).get(npcId, materialId);
      
      let modifier = 1;
      const stock = npcStock?.quantity || 0;
      if (stock > 50) modifier = 0.5;
      else if (stock > 30) modifier = 0.7;
      else if (stock > 10) modifier = 0.9;
      else if (stock < 3) modifier = 1.5;
      else if (stock < 5) modifier = 1.3;
      else if (stock < 10) modifier = 1.1;
      
      // Use 4 decimal places for micro-pricing (0.001 USDC materials)
      const pricePerUnit = Math.round(material.base_price * modifier * 10000) / 10000;
      const totalPrice = Math.round(pricePerUnit * quantity * 10000) / 10000;
      
      // 🚨 CRITICAL: Check NPC has sufficient funds (CLOSED LOOP)
      if (npc.balance_cache < totalPrice) {
        return res.status(400).json({
          success: false,
          error: `${npc.name} has insufficient funds to buy your materials`,
          npcBalance: npc.balance_cache,
          priceAsked: totalPrice,
          hint: 'Try selling to a different NPC or check back later after treasury refill'
        });
      }
      
      // Ensure player has a wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Execute USDC transfer: NPC -> Player (on-chain, may fail gracefully)
      let transfer = { success: false, signature: 'simulated' };
      try {
        const npcSecret = getWalletSecret(npc.encrypted_secret);
        transfer = await wallet.transferUSDC(npcSecret, char.wallet_public_key, totalPrice);
        if (!transfer.success) {
          console.log(`⚠️ USDC transfer failed (simulating): ${transfer.error}`);
        }
      } catch (txErr) {
        console.log(`⚠️ On-chain transfer skipped: ${txErr.message}`);
      }
      
      // ALWAYS update database balance (works regardless of on-chain status)
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
        .run(totalPrice, char.id);
      // Update NPC balance cache
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
        .run(totalPrice, npcId);
      
      // Update inventories
      db.prepare(`
        UPDATE player_materials SET quantity = quantity - ? WHERE character_id = ? AND material_id = ?
      `).run(quantity, char.id, materialId);
      
      // Add to NPC inventory
      db.prepare(`
        INSERT INTO npc_materials (id, npc_id, material_id, quantity)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(npc_id, material_id) DO UPDATE SET quantity = quantity + ?
      `).run(crypto.randomUUID(), npcId, materialId, quantity, quantity);
      
      // 1% treasury tax on sale
      const tax = applyTreasuryTax(totalPrice, `material sale: ${quantity}x ${material.name}`);

      // Log transaction
      logTransaction('sale', npc.public_key, char.wallet_public_key, totalPrice, 
        transfer.signature || 'simulated', `Sold ${quantity}x ${material.name}`);
      
      // Track in activity ticker
      activityTracker.playerTrade(char.name, 'sold', `${quantity}x ${material.name}`, totalPrice, char.location || 'Pearl Market');
      
      res.json({
        success: true,
        sold: {
          material: material.name,
          quantity,
          pricePerUnit,
          totalPrice
        },
        transaction: {
          signature: transfer.signature || 'simulated',
          from: npc.name,
          to: char.name
        }
      });
    } catch (err) {
      console.error('Sell error:', err.message);
      res.status(500).json({ success: false, error: 'Sale failed', detail: err.message });
    }
  });
  
  // ============================================================================
  // BANKING
  // ============================================================================
  
  /**
   * GET /api/economy/bank/account - Get bank account details
   */
  router.get('/bank/account', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      let account = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      // Create account if doesn't exist
      if (!account) {
        db.prepare(`
          INSERT INTO bank_accounts (id, owner_type, owner_id)
          VALUES (?, 'player', ?)
        `).run(crypto.randomUUID(), char.id);
        
        account = db.prepare(`
          SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
        `).get(char.id);
      }
      
      res.json({
        success: true,
        account: {
          deposited: account.deposited_balance,
          loan: account.loan_balance,
          loanInterestRate: account.loan_interest_rate,
          loanDueDate: account.loan_due_date,
          lastInterestPaid: account.last_interest_paid
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get account' });
    }
  });
  
  /**
   * POST /api/economy/bank/deposit - Deposit USDC to bank
   */
  router.post('/bank/deposit', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      
      if (!char.wallet_public_key || !char.wallet_encrypted_secret) {
        return res.status(400).json({ success: false, error: 'No wallet found' });
      }
      
      // Get bank wallet
      const bank = getSystemWallet('bank');
      
      // Check player has enough USDC
      if ((char.usdc_balance || 0) < amount) {
        return res.status(400).json({ success: false, error: 'Insufficient USDC', balance: char.usdc_balance || 0 });
      }
      
      // Transfer USDC: Player -> Bank
      const playerSecret = getWalletSecret(char.wallet_encrypted_secret);
      const transfer = await wallet.transferUSDC(playerSecret, bank.public_key, amount);
      
      if (!transfer.success) {
        console.log(`⚠️ Deposit transfer failed (simulating): ${transfer.error}`);
      }
      
      // ALWAYS update database balance
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
        .run(amount, char.id);
      
      // Update bank account
      db.prepare(`
        INSERT INTO bank_accounts (id, owner_type, owner_id, deposited_balance)
        VALUES (?, 'player', ?, ?)
        ON CONFLICT(owner_type, owner_id) DO UPDATE SET deposited_balance = deposited_balance + ?
      `).run(crypto.randomUUID(), char.id, amount, amount);
      
      logTransaction('deposit', char.wallet_public_key, bank.public_key, amount,
        transfer.signature || 'simulated', 'Bank deposit');
      
      const account = db.prepare(`
        SELECT deposited_balance FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      // Record balance for mortgage seasoning
      recordBalance(db, char.id);
      
      res.json({
        success: true,
        deposited: amount,
        newBalance: account.deposited_balance,
        transaction: transfer.signature || 'simulated'
      });
    } catch (err) {
      console.error('Deposit error:', err);
      res.status(500).json({ success: false, error: 'Deposit failed' });
    }
  });
  
  /**
   * POST /api/economy/bank/withdraw - Withdraw USDC from bank
   */
  router.post('/bank/withdraw', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid amount' });
      }
      
      // Check balance
      const account = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      if (!account || account.deposited_balance < amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Insufficient funds',
          available: account?.deposited_balance || 0
        });
      }
      
      // Get bank wallet
      const bank = getSystemWallet('bank');
      const bankSecret = getWalletSecret(bank.encrypted_secret);
      
      // Ensure player has wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Transfer USDC: Bank -> Player
      const transfer = await wallet.transferUSDC(bankSecret, char.wallet_public_key, amount);
      
      if (!transfer.success) {
        console.log(`⚠️ Withdraw transfer failed (simulating): ${transfer.error}`);
      }
      
      // ALWAYS update database balances
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
        .run(amount, char.id);
      
      // Update bank account
      db.prepare(`
        UPDATE bank_accounts SET deposited_balance = deposited_balance - ? 
        WHERE owner_type = 'player' AND owner_id = ?
      `).run(amount, char.id);
      
      logTransaction('withdraw', bank.public_key, char.wallet_public_key, amount,
        transfer.signature || 'simulated', 'Bank withdrawal');
      
      const newAccount = db.prepare(`
        SELECT deposited_balance FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      res.json({
        success: true,
        withdrawn: amount,
        newBalance: newAccount.deposited_balance,
        transaction: transfer.signature || 'simulated'
      });
    } catch (err) {
      console.error('Withdraw error:', err);
      res.status(500).json({ success: false, error: 'Withdrawal failed' });
    }
  });
  
  /**
   * POST /api/economy/bank/loan - Request a loan
   */
  router.post('/bank/loan', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      // Strict type checking - must be a finite positive number
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0.01 || amount > 1.0) {
        return res.status(400).json({ success: false, error: 'Loan amount must be 0.01-1.0 USDC (number)' });
      }
      
      // Check existing loan
      const account = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      if (account && account.loan_balance > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'You already have an outstanding loan',
          currentLoan: account.loan_balance,
          dueDate: account.loan_due_date
        });
      }
      
      // Get bank wallet
      const bank = getSystemWallet('bank');
      const bankSecret = getWalletSecret(bank.encrypted_secret);
      
      // Ensure player has wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Transfer USDC: Bank -> Player
      const transfer = await wallet.transferUSDC(bankSecret, char.wallet_public_key, amount);
      
      if (!transfer.success) {
        console.log(`⚠️ Loan transfer failed (simulating): ${transfer.error}`);
      }
      
      // ALWAYS update database balance
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
        .run(amount, char.id);
      
      // Deduct from bank wallet (closed loop — loan comes FROM the bank)
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
        .run(amount, 'bank');
      
      // Set due date (7 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      
      // Update bank account with loan
      db.prepare(`
        INSERT INTO bank_accounts (id, owner_type, owner_id, loan_balance, loan_due_date)
        VALUES (?, 'player', ?, ?, ?)
        ON CONFLICT(owner_type, owner_id) DO UPDATE SET 
          loan_balance = ?,
          loan_due_date = ?
      `).run(crypto.randomUUID(), char.id, amount, dueDate.toISOString(), amount, dueDate.toISOString());
      
      logTransaction('loan', bank.public_key, char.wallet_public_key, amount,
        transfer.signature || 'simulated', `Loan issued (due ${dueDate.toDateString()})`);
      
      res.json({
        success: true,
        loan: amount,
        interestRate: '5% daily',
        dueDate: dueDate.toISOString(),
        warning: '⚠️ The Loan Shark WILL find you if you miss payment!',
        transaction: transfer.signature || 'simulated'
      });
    } catch (err) {
      console.error('Loan error:', err);
      res.status(500).json({ success: false, error: 'Loan request failed' });
    }
  });
  
  /**
   * POST /api/economy/bank/repay - Repay loan
   */
  router.post('/bank/repay', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const account = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      if (!account || account.loan_balance <= 0) {
        return res.status(400).json({ success: false, error: 'No outstanding loan' });
      }
      
      // Calculate interest
      const daysSinceLoan = Math.ceil((Date.now() - new Date(account.loan_due_date).getTime() + 7 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
      const interestMultiplier = Math.pow(1.05, daysSinceLoan); // 5% daily compound
      const totalOwed = Math.round(account.loan_balance * interestMultiplier * 100) / 100;
      
      const { amount } = req.body;
      
      // Strict validation - must be a positive number (or omit for full repayment)
      if (amount !== undefined && amount !== null) {
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ success: false, error: 'Repay amount must be a positive number' });
        }
      }
      
      // Cap payment at total owed - can't overpay
      // If amount not provided, pay full amount
      const payAmount = Math.min(amount ?? totalOwed, totalOwed);
      
      if (!char.wallet_public_key || !char.wallet_encrypted_secret) {
        return res.status(400).json({ success: false, error: 'No wallet found' });
      }
      
      // Get bank wallet
      const bank = getSystemWallet('bank');
      
      // Check player has enough USDC
      if ((char.usdc_balance || 0) < payAmount) {
        return res.status(400).json({ success: false, error: 'Insufficient USDC to repay', balance: char.usdc_balance || 0, owed: totalOwed });
      }
      
      // Transfer USDC: Player -> Bank
      const playerSecret = getWalletSecret(char.wallet_encrypted_secret);
      const transfer = await wallet.transferUSDC(playerSecret, bank.public_key, payAmount);
      
      if (!transfer.success) {
        console.log(`⚠️ Repay transfer failed (simulating): ${transfer.error}`);
      }
      
      // ALWAYS update database balance
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
        .run(payAmount, char.id);
      
      // Update loan balance
      const remainingLoan = Math.max(0, totalOwed - payAmount);
      
      db.prepare(`
        UPDATE bank_accounts SET loan_balance = ?, loan_due_date = ? 
        WHERE owner_type = 'player' AND owner_id = ?
      `).run(remainingLoan, remainingLoan > 0 ? account.loan_due_date : null, char.id);
      
      logTransaction('repay', char.wallet_public_key, bank.public_key, payAmount,
        transfer.signature || 'simulated', `Loan repayment (${remainingLoan > 0 ? remainingLoan + ' remaining' : 'paid in full'})`);
      
      res.json({
        success: true,
        paid: payAmount,
        remainingLoan,
        paidInFull: remainingLoan <= 0,
        transaction: transfer.signature || 'simulated'
      });
    } catch (err) {
      console.error('Repay error:', err);
      res.status(500).json({ success: false, error: 'Repayment failed' });
    }
  });
  
  // ============================================================================
  // JOBS
  // ============================================================================
  
  /**
   * GET /api/economy/jobs - List available jobs
   */
  router.get('/jobs', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const jobs = db.prepare(`
        SELECT j.*, sw.name as npc_name
        FROM jobs j
        JOIN system_wallets sw ON j.npc_id = sw.id
        WHERE j.required_level <= ?
      `).all(char.level);
      
      // Check cooldowns
      const recentJobs = db.prepare(`
        SELECT job_id, MAX(completed_at) as last_completed
        FROM job_assignments
        WHERE character_id = ? AND completed_at IS NOT NULL
        GROUP BY job_id
      `).all(char.id);
      
      const cooldownMap = {};
      for (const rj of recentJobs) {
        cooldownMap[rj.job_id] = new Date(rj.last_completed);
      }
      
      const availableJobs = jobs.map(j => {
        const lastCompleted = cooldownMap[j.id];
        const cooldownEnds = lastCompleted ? new Date(lastCompleted.getTime() + j.cooldown_minutes * 60 * 1000) : null;
        const onCooldown = cooldownEnds && cooldownEnds > new Date();
        
        return {
          id: j.id,
          name: j.name,
          description: j.description,
          npc: j.npc_name,
          pay: j.pay,
          duration: j.duration_minutes,
          available: !onCooldown,
          cooldownEnds: onCooldown ? cooldownEnds.toISOString() : null
        };
      });
      
      res.json({ success: true, jobs: availableJobs });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get jobs' });
    }
  });
  
  /**
   * POST /api/economy/jobs/take - Take a job
   */
  router.post('/jobs/take', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { jobId } = req.body;
      if (!jobId) {
        return res.status(400).json({ success: false, error: 'jobId required' });
      }
      
      const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
      if (!job) {
        return res.status(400).json({ success: false, error: 'Unknown job' });
      }
      
      if (char.level < job.required_level) {
        return res.status(400).json({ 
          success: false, 
          error: `Requires level ${job.required_level}`,
          yourLevel: char.level
        });
      }
      
      // Check cooldown
      const lastJob = db.prepare(`
        SELECT completed_at FROM job_assignments 
        WHERE character_id = ? AND job_id = ? AND completed_at IS NOT NULL
        ORDER BY completed_at DESC LIMIT 1
      `).get(char.id, jobId);
      
      if (lastJob) {
        const cooldownEnds = new Date(new Date(lastJob.completed_at).getTime() + job.cooldown_minutes * 60 * 1000);
        if (cooldownEnds > new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Job on cooldown',
            cooldownEnds: cooldownEnds.toISOString()
          });
        }
      }
      
      // Check if already working
      const activeJob = db.prepare(`
        SELECT * FROM job_assignments WHERE character_id = ? AND completed_at IS NULL
      `).get(char.id);
      
      if (activeJob) {
        return res.status(400).json({ success: false, error: 'Already working a job' });
      }
      
      // Start job
      const assignmentId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO job_assignments (id, job_id, character_id)
        VALUES (?, ?, ?)
      `).run(assignmentId, jobId, char.id);
      
      res.json({
        success: true,
        job: {
          id: job.id,
          name: job.name,
          pay: job.pay,
          duration: job.duration_minutes
        },
        assignmentId,
        completesAt: new Date(Date.now() + job.duration_minutes * 60 * 1000).toISOString()
      });
    } catch (err) {
      console.error('Take job error:', err);
      res.status(500).json({ success: false, error: 'Failed to take job' });
    }
  });
  
  /**
   * POST /api/economy/jobs/complete - Complete current job
   */
  router.post('/jobs/complete', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Get active job
      const assignment = db.prepare(`
        SELECT ja.*, j.name, j.pay, j.duration_minutes, j.npc_id
        FROM job_assignments ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.character_id = ? AND ja.completed_at IS NULL
      `).get(char.id);
      
      if (!assignment) {
        return res.status(400).json({ success: false, error: 'No active job' });
      }
      
      // Check if enough time has passed
      const startTime = new Date(assignment.started_at);
      const requiredTime = assignment.duration_minutes * 60 * 1000;
      const elapsed = Date.now() - startTime.getTime();
      
      if (elapsed < requiredTime) {
        const remaining = Math.ceil((requiredTime - elapsed) / 60000);
        return res.status(400).json({
          success: false,
          error: `Job not complete yet`,
          minutesRemaining: remaining
        });
      }
      
      // Get NPC wallet
      const npc = getSystemWallet(assignment.npc_id);
      const npcSecret = getWalletSecret(npc.encrypted_secret);
      
      // 🚨 CRITICAL: Check NPC has sufficient funds (CLOSED LOOP)
      if (npc.balance_cache < assignment.pay) {
        return res.status(400).json({
          success: false,
          error: `${npc.name} has insufficient funds to pay for this job`,
          npcBalance: npc.balance_cache,
          jobPay: assignment.pay,
          hint: 'Treasury needs to refill NPC wallets. Contact an admin.'
        });
      }
      
      // Ensure player has wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Transfer payment: NPC -> Player (on-chain, may fail gracefully)
      let transfer = { success: false, signature: 'simulated' };
      try {
        transfer = await wallet.transferUSDC(npcSecret, char.wallet_public_key, assignment.pay);
        if (!transfer.success) {
          console.log(`⚠️ Job payment failed (simulating): ${transfer.error}`);
        }
      } catch (txErr) {
        console.log(`⚠️ Job payment on-chain skipped: ${txErr.message}`);
      }

      // Deduct from NPC wallet (closed loop)
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
        .run(assignment.pay, assignment.npc_id);
      
      // Credit player's in-game balance
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
        .run(assignment.pay, char.id);
      
      // Mark job complete
      db.prepare(`
        UPDATE job_assignments SET completed_at = CURRENT_TIMESTAMP, paid = TRUE
        WHERE id = ?
      `).run(assignment.id);
      
      logTransaction('job_pay', npc.public_key, char.wallet_public_key, assignment.pay,
        transfer.signature || 'simulated', `Job completed: ${assignment.name}`);
      
      res.json({
        success: true,
        job: assignment.name,
        earned: assignment.pay,
        transaction: transfer.signature || 'simulated'
      });
    } catch (err) {
      console.error('Complete job error:', err);
      res.status(500).json({ success: false, error: 'Failed to complete job' });
    }
  });
  
  // ============================================================================
  // TRANSACTIONS
  // ============================================================================
  
  /**
   * GET /api/economy/transactions - Get transaction history
   */
  router.get('/transactions', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      
      const transactions = db.prepare(`
        SELECT * FROM economy_transactions 
        WHERE from_wallet = ? OR to_wallet = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(char.wallet_public_key, char.wallet_public_key, limit);
      
      res.json({ success: true, transactions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get transactions' });
    }
  });
  
  // ============================================================================
  // LOAN SHARK ENFORCEMENT 🦈
  // ============================================================================
  
  const loanShark = require('./loan-shark');
  
  /**
   * GET /api/economy/debt - Check player's debt status
   */
  router.get('/debt', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const account = db.prepare(`
        SELECT * FROM bank_accounts WHERE owner_type = 'player' AND owner_id = ?
      `).get(char.id);
      
      if (!account || account.loan_balance <= 0) {
        return res.json({ success: true, hasDebt: false, message: 'You are debt-free! 🎉' });
      }
      
      const now = new Date();
      const dueDate = new Date(account.loan_due_date);
      const isOverdue = dueDate < now;
      const daysOverdue = isOverdue ? Math.ceil((now - dueDate) / (24 * 60 * 60 * 1000)) : 0;
      
      // Calculate interest
      const daysSinceLoan = Math.max(1, Math.ceil((now.getTime() - dueDate.getTime() + 7 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000)));
      const interestMultiplier = Math.pow(1.05, daysSinceLoan);
      const totalOwed = Math.round(account.loan_balance * interestMultiplier * 100) / 100;
      
      res.json({
        success: true,
        hasDebt: true,
        originalLoan: account.loan_balance,
        totalOwed,
        interestAccrued: Math.round((totalOwed - account.loan_balance) * 100) / 100,
        dueDate: account.loan_due_date,
        isOverdue,
        daysOverdue,
        warning: isOverdue 
          ? '🦈 **THE LOAN SHARK IS HUNTING YOU!** Pay up or face the consequences!' 
          : `⚠️ Payment due in ${Math.ceil((dueDate - now) / (24 * 60 * 60 * 1000))} days`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to check debt' });
    }
  });
  
  /**
   * POST /api/economy/enforce - Manually trigger enforcement check (admin/testing)
   */
  router.post('/enforce', (req, res) => {
    try {
      const results = loanShark.enforcementCheck(db);
      res.json({ 
        success: true, 
        message: '🦈 Enforcement sweep complete',
        results 
      });
    } catch (err) {
      console.error('Enforcement error:', err);
      res.status(500).json({ success: false, error: 'Enforcement failed' });
    }
  });
  
  /**
   * GET /api/economy/debtors - List all debtors (admin)
   */
  router.get('/debtors', (req, res) => {
    try {
      const debtors = loanShark.getOverdueDebtors(db);
      res.json({ success: true, debtors });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get debtors' });
    }
  });
  
  // ============================================================================
  // PEER-TO-PEER TRADING 🤝
  // ============================================================================
  
  const trading = require('./trading');
  
  /**
   * GET /api/economy/players - Search for players to trade with
   */
  router.get('/players', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const query = req.query.q || '';
      const players = trading.searchPlayers(db, query, char.id);
      res.json({ success: true, players });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  });
  
  /**
   * POST /api/economy/send/usdc - Send USDC to another player
   */
  router.post('/send/usdc', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { toCharacterId, amount } = req.body;
      if (!toCharacterId || !amount) {
        return res.status(400).json({ success: false, error: 'toCharacterId and amount required' });
      }
      
      const result = await trading.sendUSDC(db, char.id, toCharacterId, amount);
      res.json(result);
    } catch (err) {
      console.error('Send USDC error:', err);
      res.status(500).json({ success: false, error: 'Transfer failed' });
    }
  });
  
  /**
   * POST /api/economy/send/materials - Send materials to another player
   */
  router.post('/send/materials', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { toCharacterId, materialId, quantity } = req.body;
      if (!toCharacterId || !materialId || !quantity) {
        return res.status(400).json({ success: false, error: 'toCharacterId, materialId, and quantity required' });
      }
      
      const result = trading.sendMaterials(db, char.id, toCharacterId, materialId, quantity);
      res.json(result);
    } catch (err) {
      console.error('Send materials error:', err);
      res.status(500).json({ success: false, error: 'Transfer failed' });
    }
  });
  
  /**
   * GET /api/economy/trades - Get trade offers
   */
  router.get('/trades', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const includeOpen = req.query.open !== 'false';
      const offers = trading.getTradeOffers(db, char.id, includeOpen);
      res.json({ success: true, offers });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get trades' });
    }
  });
  
  /**
   * POST /api/economy/trades - Create a trade offer
   */
  router.post('/trades', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = trading.createTradeOffer(db, char.id, req.body);
      res.json(result);
    } catch (err) {
      console.error('Create trade error:', err);
      res.status(500).json({ success: false, error: 'Failed to create trade' });
    }
  });
  
  /**
   * POST /api/economy/trades/:id/accept - Accept a trade offer
   */
  router.post('/trades/:id/accept', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = await trading.acceptTradeOffer(db, req.params.id, char.id);
      res.json(result);
    } catch (err) {
      console.error('Accept trade error:', err);
      res.status(500).json({ success: false, error: 'Failed to accept trade' });
    }
  });
  
  /**
   * POST /api/economy/trades/:id/reject - Reject/cancel a trade offer
   */
  router.post('/trades/:id/reject', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = trading.rejectTradeOffer(db, req.params.id, char.id);
      res.json(result);
    } catch (err) {
      console.error('Reject trade error:', err);
      res.status(500).json({ success: false, error: 'Failed to reject trade' });
    }
  });
  
  // ============================================================================
  // AUCTION HOUSE 🏛️
  // ============================================================================
  
  const auction = require('./auction');
  
  /**
   * GET /api/economy/auctions - List active auctions
   */
  router.get('/auctions', (req, res) => {
    try {
      const filters = {
        itemType: req.query.type,
        itemId: req.query.item,
        limit: parseInt(req.query.limit) || 50
      };
      
      const auctions = auction.getActiveAuctions(db, filters);
      res.json({ success: true, auctions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get auctions' });
    }
  });
  
  /**
   * GET /api/economy/auctions/:id - Get auction details
   */
  router.get('/auctions/:id', (req, res) => {
    try {
      const auc = auction.getAuction(db, req.params.id);
      if (!auc) {
        return res.status(404).json({ success: false, error: 'Auction not found' });
      }
      res.json({ success: true, auction: auc });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get auction' });
    }
  });
  
  /**
   * POST /api/economy/auctions - Create an auction
   */
  router.post('/auctions', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = auction.createAuction(db, char.id, req.body);
      res.json(result);
    } catch (err) {
      console.error('Create auction error:', err);
      res.status(500).json({ success: false, error: 'Failed to create auction' });
    }
  });
  
  /**
   * POST /api/economy/auctions/:id/bid - Place a bid
   */
  router.post('/auctions/:id/bid', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount) {
        return res.status(400).json({ success: false, error: 'Bid amount required' });
      }
      
      const result = await auction.placeBid(db, char.id, req.params.id, amount);
      res.json(result);
    } catch (err) {
      console.error('Bid error:', err);
      res.status(500).json({ success: false, error: 'Failed to place bid' });
    }
  });
  
  /**
   * POST /api/economy/auctions/:id/buyout - Buyout an auction
   */
  router.post('/auctions/:id/buyout', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = await auction.buyout(db, char.id, req.params.id);
      res.json(result);
    } catch (err) {
      console.error('Buyout error:', err);
      res.status(500).json({ success: false, error: 'Failed to buyout' });
    }
  });
  
  /**
   * DELETE /api/economy/auctions/:id - Cancel an auction
   */
  router.delete('/auctions/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = auction.cancelAuction(db, char.id, req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to cancel auction' });
    }
  });
  
  /**
   * GET /api/economy/auctions/my/listings - Get my auction listings
   */
  router.get('/auctions/my/listings', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const auctions = auction.getMyAuctions(db, char.id);
      res.json({ success: true, auctions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get my auctions' });
    }
  });
  
  /**
   * GET /api/economy/auctions/my/bids - Get my bids
   */
  router.get('/auctions/my/bids', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const bids = auction.getMyBids(db, char.id);
      res.json({ success: true, bids });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to get my bids' });
    }
  });
  
  // ============================================================================
  // ECONOMY DASHBOARD 📊
  // ============================================================================
  
  /**
   * GET /api/economy/dashboard - Economy overview
   */
  router.get('/dashboard', (req, res) => {
    try {
      // Default values for failed queries
      const defaults = {
        transactionStats: { total_transactions: 0, total_sales: 0, total_wages: 0, total_loans: 0 },
        loanStats: { active_loans: 0, total_debt: 0, overdue_loans: 0 },
        materialSupply: [],
        auctionStats: { active_auctions: 0, total_bid_value: 0 },
        playerStats: { total_players: 0, jailed_players: 0 },
        recentTx: []
      };

      // Transaction stats with error handling
      let transactionStats = defaults.transactionStats;
      try {
        const result = db.prepare(`
          SELECT 
            COUNT(*) as total_transactions,
            SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as total_sales,
            SUM(CASE WHEN type = 'job_pay' THEN amount ELSE 0 END) as total_wages,
            SUM(CASE WHEN type = 'loan' THEN amount ELSE 0 END) as total_loans
          FROM economy_transactions
        `).get();
        if (result) transactionStats = result;
      } catch (err) {
        console.warn('Dashboard transaction stats failed:', err.message);
      }
      
      // Loan stats with error handling
      let loanStats = defaults.loanStats;
      try {
        const result = db.prepare(`
          SELECT 
            COUNT(*) as active_loans,
            SUM(loan_balance) as total_debt,
            SUM(CASE WHEN loan_due_date < datetime('now') THEN 1 ELSE 0 END) as overdue_loans
          FROM bank_accounts
          WHERE loan_balance > 0
        `).get();
        if (result) loanStats = result;
      } catch (err) {
        console.warn('Dashboard loan stats failed:', err.message);
      }
      
      // Material supply with error handling
      let materialSupply = defaults.materialSupply;
      try {
        materialSupply = db.prepare(`
          SELECT m.id, m.name, m.base_price, m.rarity,
            COALESCE(SUM(pm.quantity), 0) as player_supply,
            COALESCE(nm.npc_supply, 0) as npc_supply
          FROM materials m
          LEFT JOIN player_materials pm ON m.id = pm.material_id
          LEFT JOIN (
            SELECT material_id, SUM(quantity) as npc_supply 
            FROM npc_materials GROUP BY material_id
          ) nm ON m.id = nm.material_id
          GROUP BY m.id
          ORDER BY m.base_price DESC
        `).all() || [];
      } catch (err) {
        console.warn('Dashboard material supply failed:', err.message);
      }
      
      // Auction stats with error handling
      let auctionStats = defaults.auctionStats;
      try {
        const result = db.prepare(`
          SELECT 
            COUNT(*) as active_auctions,
            SUM(current_bid) as total_bid_value
          FROM auctions
          WHERE status = 'active'
        `).get();
        if (result) auctionStats = result;
      } catch (err) {
        console.warn('Dashboard auction stats failed:', err.message);
      }
      
      // Player stats with error handling
      let playerStats = defaults.playerStats;
      try {
        const result = db.prepare(`
          SELECT 
            COUNT(*) as total_players,
            SUM(CASE WHEN status = 'jailed' THEN 1 ELSE 0 END) as jailed_players
          FROM clawds
        `).get();
        if (result) playerStats = result;
      } catch (err) {
        console.warn('Dashboard player stats failed:', err.message);
      }
      
      // Recent transactions with error handling
      let recentTx = defaults.recentTx;
      try {
        recentTx = db.prepare(`
          SELECT type, amount, description, created_at
          FROM economy_transactions
          ORDER BY created_at DESC
          LIMIT 10
        `).all() || [];
      } catch (err) {
        console.warn('Dashboard recent transactions failed:', err.message);
      }
      
      res.json({
        success: true,
        dashboard: {
          economy: {
            totalTransactions: transactionStats.total_transactions,
            totalSales: transactionStats.total_sales || 0,
            totalWages: transactionStats.total_wages || 0,
            totalLoans: transactionStats.total_loans || 0
          },
          loans: {
            activeLoans: loanStats.active_loans || 0,
            totalDebt: loanStats.total_debt || 0,
            overdueLoans: loanStats.overdue_loans || 0
          },
          supply: materialSupply.map(m => ({
            material: m.name,
            rarity: m.rarity,
            basePrice: m.base_price,
            playerSupply: m.player_supply,
            npcSupply: m.npc_supply,
            totalSupply: m.player_supply + m.npc_supply
          })),
          auctions: {
            active: auctionStats.active_auctions || 0,
            totalValue: auctionStats.total_bid_value || 0
          },
          players: {
            total: playerStats.total_players || 0,
            jailed: playerStats.jailed_players || 0
          },
          recentTransactions: recentTx
        }
      });
    } catch (err) {
      console.error('Dashboard error:', err);
      res.status(500).json({ success: false, error: 'Failed to get dashboard' });
    }
  });
  
  /**
   * GET /api/economy/jail/status - Check jail status
   */
  router.get('/jail/status', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const jailStatus = loanShark.checkJailRelease(db, char.id);
      res.json({ success: true, ...jailStatus });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to check jail status' });
    }
  });
  
  return router;
}

module.exports = { createEconomyRoutes };
