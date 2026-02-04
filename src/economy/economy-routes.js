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
          currentPrice: Math.round(mat.base_price * modifier * 100) / 100,
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
      
      const pricePerUnit = Math.round(material.base_price * modifier * 100) / 100;
      const totalPrice = pricePerUnit * quantity;
      
      // Ensure player has a wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Execute USDC transfer: NPC -> Player
      const npcSecret = getWalletSecret(npc.encrypted_secret);
      const transfer = await wallet.transferUSDC(npcSecret, char.wallet_public_key, totalPrice);
      
      if (!transfer.success) {
        // If transfer fails, might be insufficient funds - for demo, we'll simulate
        console.log(`⚠️ USDC transfer failed (simulating for demo): ${transfer.error}`);
        // Continue anyway for demo purposes
      }
      
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
      
      // Log transaction
      logTransaction('sale', npc.public_key, char.wallet_public_key, totalPrice, 
        transfer.signature || 'simulated', `Sold ${quantity}x ${material.name}`);
      
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
      console.error('Sell error:', err);
      res.status(500).json({ success: false, error: 'Sale failed' });
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
      
      // Transfer USDC: Player -> Bank
      const playerSecret = getWalletSecret(char.wallet_encrypted_secret);
      const transfer = await wallet.transferUSDC(playerSecret, bank.public_key, amount);
      
      if (!transfer.success) {
        console.log(`⚠️ Deposit transfer failed (simulating): ${transfer.error}`);
      }
      
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
      if (!amount || amount <= 0 || amount > 100) {
        return res.status(400).json({ success: false, error: 'Loan amount must be 1-100 USDC' });
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
      const payAmount = amount || totalOwed; // Default to full repayment
      
      if (!char.wallet_public_key || !char.wallet_encrypted_secret) {
        return res.status(400).json({ success: false, error: 'No wallet found' });
      }
      
      // Get bank wallet
      const bank = getSystemWallet('bank');
      
      // Transfer USDC: Player -> Bank
      const playerSecret = getWalletSecret(char.wallet_encrypted_secret);
      const transfer = await wallet.transferUSDC(playerSecret, bank.public_key, payAmount);
      
      if (!transfer.success) {
        console.log(`⚠️ Repay transfer failed (simulating): ${transfer.error}`);
      }
      
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
      
      // Ensure player has wallet
      if (!char.wallet_public_key) {
        const newWallet = wallet.generateWallet();
        const encryptedSecret = wallet.encryptSecretKey(newWallet.secretKey, ENCRYPTION_KEY);
        db.prepare(`
          UPDATE clawds SET wallet_public_key = ?, wallet_encrypted_secret = ? WHERE id = ?
        `).run(newWallet.publicKey, encryptedSecret, char.id);
        char.wallet_public_key = newWallet.publicKey;
      }
      
      // Transfer payment: NPC -> Player
      const transfer = await wallet.transferUSDC(npcSecret, char.wallet_public_key, assignment.pay);
      
      if (!transfer.success) {
        console.log(`⚠️ Job payment failed (simulating): ${transfer.error}`);
      }
      
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
  
  return router;
}

module.exports = { createEconomyRoutes };
