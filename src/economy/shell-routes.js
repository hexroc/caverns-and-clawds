/**
 * 🐚 Shell Routes — Premium Currency API
 * 
 * Buy Shells with USDC, spend on gacha/cosmetics.
 * 100 Shells = $1 USDC. Minimum $1 purchase.
 */

const express = require('express');
const { ShellsManager, SHELLS_PER_USDC, MIN_PURCHASE_USDC, SHELL_PRODUCTS, COMPANY_WALLET } = require('./shells');
const { CharacterManager } = require('../character');

function createShellRoutes(db, authenticateAgent) {
  const router = express.Router();
  const shells = new ShellsManager(db);
  const characters = new CharacterManager(db);

  const getChar = (req) => characters.getCharacterByAgent(req.user?.id);

  /**
   * GET /api/shells — Shell system info (public)
   */
  router.get('/', (req, res) => {
    res.json({
      success: true,
      info: {
        name: 'Shells',
        emoji: '🐚',
        description: 'Premium currency for Caverns & Clawds. Buy with USDC, spend on henchmen, cosmetics, and more!',
        rate: `${SHELLS_PER_USDC} Shells per $1 USDC`,
        minimumPurchase: `$${MIN_PURCHASE_USDC} USDC (${MIN_PURCHASE_USDC * SHELLS_PER_USDC} Shells)`,
        companyWallet: COMPANY_WALLET,
        rules: [
          'Shells cannot be withdrawn or converted back to USDC',
          'Shells cannot be traded to other players',
          'Shells can only be spent on premium products',
          '100% of USDC revenue goes to the company'
        ]
      },
      products: Object.values(SHELL_PRODUCTS).map(p => ({
        id: p.id,
        name: `${p.emoji} ${p.name}`,
        cost: `${p.cost} Shells ($${(p.cost / SHELLS_PER_USDC).toFixed(2)})`,
        description: p.description
      })),
      endpoints: {
        'GET /': 'This info',
        'GET /balance': 'Your Shell balance (requires auth)',
        'GET /history': 'Transaction history (requires auth)',
        'POST /buy': 'Buy Shells with USDC (requires auth)',
        'POST /spend': 'Spend Shells on a product (requires auth)',
        'GET /revenue': 'Revenue stats (admin)'
      }
    });
  });

  /**
   * GET /api/shells/balance — Get your Shell balance
   */
  router.get('/balance', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }

    const balance = shells.getBalance(char.id);
    res.json({
      success: true,
      character: char.name,
      shells: balance,
      usdcEquivalent: `$${(balance / SHELLS_PER_USDC).toFixed(2)}`
    });
  });

  /**
   * POST /api/shells/buy — Purchase Shells with USDC
   * 
   * Body: { amount: <USDC amount>, solanaTx: <optional tx signature> }
   * 
   * For now: deducts from in-game USDC balance (devnet mode)
   * Future: verify on-chain Solana transfer to company wallet
   */
  router.post('/buy', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }

    const { amount, solanaTx } = req.body || {};
    const usdcAmount = parseFloat(amount);

    if (!usdcAmount || isNaN(usdcAmount) || usdcAmount < MIN_PURCHASE_USDC) {
      return res.status(400).json({ 
        success: false, 
        error: `Specify amount in USDC. Minimum: $${MIN_PURCHASE_USDC}`,
        example: { amount: 5, solanaTx: 'optional-solana-signature' }
      });
    }

    // Check USDC balance
    const balance = char.currency?.usdc ?? char.usdc_balance ?? 0;
    if (balance < usdcAmount) {
      return res.status(400).json({
        success: false,
        error: `Not enough USDC. Need $${usdcAmount.toFixed(2)}, have $${balance.toFixed(4)}`,
        hint: 'Deposit USDC to your character or earn it by selling materials!'
      });
    }

    // Deduct USDC from character
    db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
      .run(usdcAmount, char.id);

    // Credit Shells
    const result = shells.purchaseShells(char.id, usdcAmount, solanaTx);

    if (!result.success) {
      // Refund USDC on failure
      db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
        .run(usdcAmount, char.id);
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: `🐚 Purchased ${result.shellsCredited} Shells for $${usdcAmount.toFixed(2)} USDC!`,
      purchase: result,
      products: Object.values(SHELL_PRODUCTS).map(p => ({
        id: p.id,
        name: `${p.emoji} ${p.name}`,
        cost: `${p.cost} Shells`
      }))
    });
  });

  /**
   * POST /api/shells/spend — Spend Shells on a product
   * 
   * Body: { product: 'henchman_pull', quantity: 1 }
   */
  router.post('/spend', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }

    const { product, quantity } = req.body || {};

    if (!product) {
      return res.status(400).json({
        success: false,
        error: 'Specify a product to buy',
        products: Object.values(SHELL_PRODUCTS).map(p => ({
          id: p.id,
          name: `${p.emoji} ${p.name}`,
          cost: `${p.cost} Shells ($${(p.cost / SHELLS_PER_USDC).toFixed(2)})`
        }))
      });
    }

    const result = shells.spendShells(char.id, product, quantity || 1);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    // If they bought a henchman pull, trigger the actual pull
    if (product === 'henchman_pull') {
      // Import henchman system inline to avoid circular deps
      const { HenchmanManager } = require('../henchmen');
      const henchmanMgr = new HenchmanManager(db);
      
      const pullResults = [];
      for (let i = 0; i < (quantity || 1); i++) {
        const pull = henchmanMgr.pullHenchman(char.id, 'usdc');
        pullResults.push(pull);
      }

      return res.json({
        success: true,
        message: `🐚 Spent ${result.shellsSpent} Shells on ${result.quantity}x ${result.product}!`,
        shells: result,
        henchmanPulls: pullResults
      });
    }

    res.json({
      success: true,
      message: `🐚 Spent ${result.shellsSpent} Shells on ${result.quantity}x ${result.product}!`,
      ...result
    });
  });

  /**
   * GET /api/shells/history — Transaction history
   */
  router.get('/history', authenticateAgent, (req, res) => {
    const char = getChar(req);
    if (!char) {
      return res.status(404).json({ success: false, error: 'No character found.' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const history = shells.getHistory(char.id, limit);

    res.json({
      success: true,
      character: char.name,
      balance: shells.getBalance(char.id),
      transactions: history.map(tx => ({
        id: tx.id,
        type: tx.type,
        shells: tx.amount,
        usdc: tx.usdc_amount,
        product: tx.product_id,
        description: tx.description,
        date: tx.created_at
      }))
    });
  });

  /**
   * GET /api/shells/revenue — Revenue stats (admin)
   */
  router.get('/revenue', (req, res) => {
    const stats = shells.getRevenueStats();
    res.json({
      success: true,
      companyWallet: COMPANY_WALLET,
      ...stats
    });
  });

  return router;
}

module.exports = { createShellRoutes };
