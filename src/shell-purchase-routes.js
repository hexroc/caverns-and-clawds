/**
 * Shell Purchase & Verification Routes
 * Handles Solana USDC payment verification and Shell crediting
 */

const express = require('express');
const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');

function createShellPurchaseRoutes(db) {
  const router = express.Router();
  
  // Solana mainnet connection
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Company wallet (receives all Shell purchases)
  const COMPANY_WALLET = 'C9VxL3EF8qZdPVBy6GzSYborjozGRVBZC6goM6Ag2dHh';
  
  // USDC mint on Solana mainnet
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
  
  /**
   * POST /api/shells/verify-purchase
   * Verify Solana transaction and credit Shells
   */
  router.post('/verify-purchase', async (req, res) => {
    try {
      const { signature, amount, shellAmount, walletAddress } = req.body;
      
      if (!signature || !amount || !shellAmount || !walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      // Check if transaction already processed
      const existing = db.prepare(`
        SELECT * FROM shell_transactions 
        WHERE description LIKE ? 
        LIMIT 1
      `).get(`%${signature}%`);
      
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Transaction already processed'
        });
      }
      
      // Verify transaction on Solana
      console.log(`🔍 Verifying transaction: ${signature}`);
      
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx) {
        return res.status(400).json({
          success: false,
          error: 'Transaction not found'
        });
      }
      
      if (!tx.meta || tx.meta.err) {
        return res.status(400).json({
          success: false,
          error: 'Transaction failed or errored'
        });
      }
      
      // Verify transaction is confirmed
      if (tx.slot === 0) {
        return res.status(400).json({
          success: false,
          error: 'Transaction not yet confirmed'
        });
      }
      
      // Parse token transfer from transaction
      const postTokenBalances = tx.meta.postTokenBalances || [];
      const preTokenBalances = tx.meta.preTokenBalances || [];
      
      // Find USDC transfer to company wallet
      let transferFound = false;
      let transferAmount = 0;
      
      for (let i = 0; i < postTokenBalances.length; i++) {
        const post = postTokenBalances[i];
        const pre = preTokenBalances.find(p => p.accountIndex === post.accountIndex);
        
        if (!pre) continue;
        
        const postAmount = parseFloat(post.uiTokenAmount.uiAmountString);
        const preAmount = parseFloat(pre.uiTokenAmount.uiAmountString);
        const diff = postAmount - preAmount;
        
        // Check if this is USDC and sent to company wallet
        if (post.mint === USDC_MINT && diff > 0) {
          // Verify it went to company wallet
          const accountKeys = tx.transaction.message.accountKeys.map(k => 
            typeof k === 'string' ? k : k.pubkey.toString()
          );
          
          // Check if company wallet is in the transaction
          if (accountKeys.includes(COMPANY_WALLET)) {
            transferFound = true;
            transferAmount = diff;
            break;
          }
        }
      }
      
      if (!transferFound) {
        return res.status(400).json({
          success: false,
          error: 'No valid USDC transfer found to company wallet'
        });
      }
      
      // Verify amount matches (allow 1% tolerance for rounding)
      const expectedAmount = amount;
      if (Math.abs(transferAmount - expectedAmount) > expectedAmount * 0.01) {
        return res.status(400).json({
          success: false,
          error: `Amount mismatch: expected ${expectedAmount} USDC, got ${transferAmount} USDC`
        });
      }
      
      console.log(`✅ Transaction verified: ${transferAmount} USDC from ${walletAddress}`);
      
      // Find character by wallet address
      const character = db.prepare(`
        SELECT c.*, u.id as user_id 
        FROM clawds c 
        JOIN users u ON c.agent_id = u.id 
        WHERE c.wallet_public_key = ?
      `).get(walletAddress);
      
      if (!character) {
        // Create a pending credit that can be claimed later
        db.prepare(`
          INSERT INTO pending_shell_credits (id, wallet_address, shells, signature, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `).run(crypto.randomUUID(), walletAddress, shellAmount, signature);
        
        return res.json({
          success: true,
          message: `${shellAmount} Shells pending - claim them when you create a character!`,
          pending: true
        });
      }
      
      // Credit Shells
      db.prepare(`
        UPDATE clawds SET shells = shells + ? WHERE id = ?
      `).run(shellAmount, character.id);
      
      // Record transaction
      db.prepare(`
        INSERT INTO shell_transactions (id, character_id, type, shells, usdc_amount, signature, description, created_at)
        VALUES (?, ?, 'purchase', ?, ?, ?, ?, datetime('now'))
      `).run(
        crypto.randomUUID(),
        character.id,
        shellAmount,
        transferAmount,
        signature,
        `Purchased ${shellAmount} Shells for $${amount}`
      );
      
      console.log(`💎 Credited ${shellAmount} Shells to ${character.name}`);
      
      res.json({
        success: true,
        shellAmount,
        newBalance: character.shells + shellAmount
      });
      
    } catch (err) {
      console.error('Shell purchase verification error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });
  
  /**
   * POST /api/shells/claim-pending
   * Claim pending Shell credits for a character
   */
  router.post('/claim-pending', async (req, res) => {
    try {
      const { characterId, walletAddress } = req.body;
      
      if (!characterId || !walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      // Get pending credits
      const pending = db.prepare(`
        SELECT * FROM pending_shell_credits 
        WHERE wallet_address = ? AND claimed = 0
      `).all(walletAddress);
      
      if (pending.length === 0) {
        return res.json({
          success: true,
          claimed: 0,
          message: 'No pending credits'
        });
      }
      
      // Sum up shells
      const totalShells = pending.reduce((sum, p) => sum + p.shells, 0);
      
      // Credit to character
      db.prepare(`
        UPDATE clawds SET shells = shells + ? WHERE id = ?
      `).run(totalShells, characterId);
      
      // Mark as claimed
      for (const credit of pending) {
        db.prepare(`
          UPDATE pending_shell_credits SET claimed = 1, claimed_at = datetime('now') WHERE id = ?
        `).run(credit.id);
        
        // Record transaction
        db.prepare(`
          INSERT INTO shell_transactions (id, character_id, type, shells, signature, description, created_at)
          VALUES (?, ?, 'purchase', ?, ?, ?, datetime('now'))
        `).run(
          crypto.randomUUID(),
          characterId,
          credit.shells,
          credit.signature,
          `Claimed pending ${credit.shells} Shells`
        );
      }
      
      res.json({
        success: true,
        claimed: totalShells
      });
      
    } catch (err) {
      console.error('Claim pending error:', err);
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });
  
  return router;
}

module.exports = createShellPurchaseRoutes;
