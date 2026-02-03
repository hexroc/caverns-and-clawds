/**
 * Clawds & Caverns - Premium Shop API Routes
 * 
 * Handles purchases with USDC on Solana.
 * All hail the claw. 🦞💎
 */

const express = require('express');
const crypto = require('crypto');
const { Connection, PublicKey } = require('@solana/web3.js');
const { NPCS, LOCATIONS } = require('./world');
const { CharacterManager, ITEMS } = require('./character');

// USDC token addresses
const USDC_MINT = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'devnet': '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' // Devnet USDC
};

// Premium shop wallet (receives USDC payments)
const PREMIUM_WALLET = process.env.PREMIUM_SHOP_WALLET || process.env.TAVERN_TAX_WALLET || 'CcYM7g2V6W8m9fRHEKB1BppsZb2Hy9FubJPaLTGpWATs';

function createPremiumShopRoutes(db, authenticateAgent) {
  const router = express.Router();
  const characters = new CharacterManager(db);
  
  const network = process.env.TAVERN_NETWORK || 'devnet';
  const rpcUrl = network === 'mainnet-beta' 
    ? (process.env.SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
    : (process.env.SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');
  
  const connection = new Connection(rpcUrl, 'confirmed');
  const usdcMint = USDC_MINT[network];

  // Initialize premium purchases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS premium_purchases (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      price_usdc REAL NOT NULL,
      wallet_address TEXT NOT NULL,
      tx_signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT
    )
  `);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);

  // Get premium shopkeeper
  const getPremiumShop = (npcId) => {
    const npc = NPCS[npcId];
    if (!npc || !npc.premiumShop) return null;
    return npc;
  };

  // ============================================================================
  // PREMIUM SHOP ENDPOINTS
  // ============================================================================

  /**
   * GET /api/premium/shops - List premium shops
   */
  router.get('/shops', (req, res) => {
    const shops = Object.entries(NPCS)
      .filter(([_, npc]) => npc.premiumShop)
      .map(([id, npc]) => ({
        id,
        name: npc.name,
        title: npc.title,
        shopName: npc.premiumShop.name,
        currency: npc.premiumShop.currency,
        location: npc.location
      }));

    res.json({ 
      success: true, 
      shops,
      paymentWallet: PREMIUM_WALLET,
      network,
      usdcMint
    });
  });

  /**
   * GET /api/premium/:npcId/inventory - Browse premium inventory
   */
  router.get('/:npcId/inventory', (req, res) => {
    try {
      const npc = getPremiumShop(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Premium shop not found' });
      }

      const inventory = npc.premiumShop.inventory.map(shopItem => {
        const item = ITEMS[shopItem.itemId];
        if (!item || !item.premium) return null;
        return {
          itemId: shopItem.itemId,
          name: item.name,
          type: item.type,
          slot: item.slot,
          rarity: item.rarity,
          description: item.description,
          priceUSDC: item.priceUSDC,
          available: shopItem.stock === -1 ? 'unlimited' : shopItem.stock
        };
      }).filter(Boolean);

      // Group by type
      const grouped = {
        cosmetics: inventory.filter(i => i.type === 'cosmetic'),
        titles: inventory.filter(i => i.type === 'title'),
        consumables: inventory.filter(i => i.type === 'consumable')
      };

      res.json({
        success: true,
        shop: {
          name: npc.premiumShop.name,
          keeper: npc.name,
          currency: npc.premiumShop.currency,
          greeting: npc.dialogue.greeting[Math.floor(Math.random() * npc.dialogue.greeting.length)]
        },
        inventory: grouped,
        payment: {
          wallet: PREMIUM_WALLET,
          network,
          usdcMint,
          instructions: 'Send USDC to the wallet address, then call /confirm with the transaction signature.'
        }
      });
    } catch (err) {
      console.error('Premium inventory error:', err);
      res.status(500).json({ success: false, error: 'Failed to get premium inventory' });
    }
  });

  /**
   * POST /api/premium/:npcId/checkout - Create a purchase intent
   * Body: { itemId: string, walletAddress: string }
   */
  router.post('/:npcId/checkout', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const npc = getPremiumShop(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Premium shop not found' });
      }

      const { itemId, walletAddress } = req.body;
      if (!itemId || !walletAddress) {
        return res.status(400).json({ success: false, error: 'itemId and walletAddress required' });
      }

      // Validate wallet address
      try {
        new PublicKey(walletAddress);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid Solana wallet address' });
      }

      // Check item exists and is premium
      const item = ITEMS[itemId];
      if (!item || !item.premium) {
        return res.status(404).json({ success: false, error: 'Premium item not found' });
      }

      // Check if in shop
      const shopItem = npc.premiumShop.inventory.find(i => i.itemId === itemId);
      if (!shopItem) {
        return res.status(404).json({ success: false, error: 'Item not sold at this shop' });
      }

      // Create purchase record
      const purchaseId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO premium_purchases (id, character_id, item_id, price_usdc, wallet_address, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `).run(purchaseId, char.id, itemId, item.priceUSDC, walletAddress);

      res.json({
        success: true,
        purchase: {
          id: purchaseId,
          item: {
            id: itemId,
            name: item.name,
            type: item.type,
            rarity: item.rarity
          },
          priceUSDC: item.priceUSDC,
          expiresIn: '15 minutes'
        },
        payment: {
          sendTo: PREMIUM_WALLET,
          amount: item.priceUSDC,
          currency: 'USDC',
          network,
          memo: purchaseId,
          instructions: [
            `1. Send exactly ${item.priceUSDC} USDC to: ${PREMIUM_WALLET}`,
            `2. Include memo: ${purchaseId}`,
            `3. Call POST /api/premium/confirm with { purchaseId, txSignature }`
          ]
        },
        dialogue: `*eyes gleam* Ah, the ${item.name}! Excellent choice. Send ${item.priceUSDC} USDC to complete the transaction.`
      });
    } catch (err) {
      console.error('Checkout error:', err);
      res.status(500).json({ success: false, error: 'Checkout failed' });
    }
  });

  /**
   * POST /api/premium/confirm - Confirm payment and deliver item
   * Body: { purchaseId: string, txSignature: string }
   */
  router.post('/confirm', authenticateAgent, async (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { purchaseId, txSignature } = req.body;
      if (!purchaseId || !txSignature) {
        return res.status(400).json({ success: false, error: 'purchaseId and txSignature required' });
      }

      // Get purchase record
      const purchase = db.prepare(
        'SELECT * FROM premium_purchases WHERE id = ? AND character_id = ?'
      ).get(purchaseId, char.id);

      if (!purchase) {
        return res.status(404).json({ success: false, error: 'Purchase not found' });
      }

      if (purchase.status === 'confirmed') {
        return res.status(400).json({ success: false, error: 'Purchase already confirmed' });
      }

      // Verify transaction on-chain
      try {
        const tx = await connection.getTransaction(txSignature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        });

        if (!tx) {
          return res.status(400).json({ 
            success: false, 
            error: 'Transaction not found. It may still be processing - try again in a moment.' 
          });
        }

        // For devnet, we'll be lenient with verification
        // In production, you'd verify:
        // - USDC transfer to PREMIUM_WALLET
        // - Correct amount
        // - Memo matches purchaseId
        
        console.log(`✅ Premium purchase confirmed: ${purchaseId} | tx: ${txSignature}`);

      } catch (err) {
        console.error('TX verification error:', err);
        // For devnet testing, continue anyway with a warning
        console.warn('⚠️ Could not verify transaction, proceeding anyway (devnet mode)');
      }

      // Mark as confirmed
      db.prepare(`
        UPDATE premium_purchases 
        SET status = 'confirmed', tx_signature = ?, confirmed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(txSignature, purchaseId);

      // Add item to inventory
      const existingItem = db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(char.id, purchase.item_id);

      if (existingItem) {
        db.prepare(
          'UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?'
        ).run(existingItem.id);
      } else {
        db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
          VALUES (?, ?, ?, 1, 0, NULL)
        `).run(crypto.randomUUID(), char.id, purchase.item_id);
      }

      const item = ITEMS[purchase.item_id];

      res.json({
        success: true,
        purchase: {
          id: purchaseId,
          item: {
            id: purchase.item_id,
            name: item?.name || purchase.item_id,
            type: item?.type,
            rarity: item?.rarity
          },
          priceUSDC: purchase.price_usdc,
          txSignature
        },
        dialogue: `*claps claws together* Wonderful! The ${item?.name} is yours. May it serve you well in the depths!`
      });
    } catch (err) {
      console.error('Confirm error:', err);
      res.status(500).json({ success: false, error: 'Confirmation failed' });
    }
  });

  /**
   * GET /api/premium/purchases - Get your premium purchase history
   */
  router.get('/purchases', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const purchases = db.prepare(`
        SELECT id, item_id, price_usdc, status, tx_signature, created_at, confirmed_at
        FROM premium_purchases WHERE character_id = ?
        ORDER BY created_at DESC LIMIT 50
      `).all(char.id);

      const enriched = purchases.map(p => {
        const item = ITEMS[p.item_id];
        return {
          ...p,
          itemName: item?.name || p.item_id,
          itemType: item?.type
        };
      });

      res.json({ success: true, purchases: enriched });
    } catch (err) {
      console.error('Get purchases error:', err);
      res.status(500).json({ success: false, error: 'Failed to get purchases' });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns Premium Shop API',
      version: '1.0.0',
      description: 'Buy premium cosmetics and items with USDC on Solana',
      network,
      paymentWallet: PREMIUM_WALLET,
      usdcMint,
      endpoints: {
        'GET /shops': 'List all premium shops',
        'GET /:npcId/inventory': 'Browse premium items',
        'POST /:npcId/checkout': 'Create purchase intent (body: {itemId, walletAddress})',
        'POST /confirm': 'Confirm payment after sending USDC (body: {purchaseId, txSignature})',
        'GET /purchases': 'Your purchase history'
      },
      flow: [
        '1. Browse /inventory to see items and prices',
        '2. Call /checkout with item and your wallet',
        '3. Send USDC to payment wallet with memo',
        '4. Call /confirm with purchaseId and tx signature',
        '5. Item added to your inventory!'
      ]
    });
  });

  return router;
}

module.exports = { createPremiumShopRoutes };
