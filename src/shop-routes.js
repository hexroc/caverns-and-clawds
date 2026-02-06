/**
 * Clawds & Caverns - Shop API Routes
 * 
 * Buy and sell items from NPC shopkeepers.
 * All hail the claw. 🦞
 */

const express = require('express');
const crypto = require('crypto');
const { NPCS, LOCATIONS } = require('./world');
const { CharacterManager, ITEMS } = require('./character');

// Map world.js NPC IDs to system_wallets IDs
const NPC_WALLET_MAP = {
  'madame_pearl': 'npc_madame_pearl',
  'ironshell_gus': 'npc_ironshell_gus',
  'wreckers_rest_salvage': 'npc_wreckers_salvage'
};

function createShopRoutes(db, authenticateAgent) {
  const router = express.Router();
  const characters = new CharacterManager(db);

  // Helper: get NPC wallet balance
  const getNpcBalance = (npcId) => {
    const walletId = NPC_WALLET_MAP[npcId];
    if (!walletId) return Infinity; // Unknown NPC = no limit (fallback)
    const row = db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?').get(walletId);
    return row ? (row.balance_cache || 0) : 0;
  };

  // Helper: adjust NPC wallet balance  
  const adjustNpcBalance = (npcId, amount) => {
    const walletId = NPC_WALLET_MAP[npcId];
    if (!walletId) return;
    db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
      .run(amount, walletId);
  };

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);

  // Get shopkeeper by ID
  const getShopkeeper = (npcId) => {
    const npc = NPCS[npcId];
    if (!npc || !npc.shop) return null;
    return npc;
  };

  // ============================================================================
  // SHOP ENDPOINTS
  // ============================================================================

  /**
   * GET /api/shop/list - List shops at current location
   */
  router.get('/list', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const location = LOCATIONS[char.location];
      if (!location) {
        return res.status(400).json({ success: false, error: 'Invalid location' });
      }

      // Find NPCs with shops at this location
      const shops = (location.npcs || [])
        .map(npcId => {
          const npc = NPCS[npcId];
          if (!npc || !npc.shop) return null;
          return {
            id: npc.id,
            name: npc.name,
            title: npc.title,
            shopName: npc.shop.name,
            services: npc.services
          };
        })
        .filter(Boolean);

      if (shops.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No shops at this location. Try the Pearl Market!',
          shops: [] 
        });
      }

      res.json({ success: true, location: char.location, shops });
    } catch (err) {
      console.error('List shops error:', err);
      res.status(500).json({ success: false, error: 'Failed to list shops' });
    }
  });

  /**
   * GET /api/shop/:npcId/inventory - Browse a shop's inventory
   */
  router.get('/:npcId/inventory', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const npc = getShopkeeper(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      // Check if NPC is at character's location
      const location = LOCATIONS[char.location];
      if (!location?.npcs?.includes(npc.id)) {
        return res.status(400).json({ 
          success: false, 
          error: `${npc.name} is not at your current location. They're in the Pearl Market.` 
        });
      }

      // Build inventory with full item details
      const inventory = npc.shop.inventory.map(shopItem => {
        const item = ITEMS[shopItem.itemId];
        if (!item) return null;
        return {
          itemId: shopItem.itemId,
          name: item.name,
          type: item.type,
          rarity: item.rarity || 'common',
          description: item.description || '',
          price: parseFloat((item.value * npc.shop.buyMultiplier).toFixed(4)),
          stock: shopItem.stock,
          effect: item.effect,
          spell: item.spell,
          spellLevel: item.spellLevel
        };
      }).filter(Boolean);

      // Group by type for easier browsing
      const grouped = {
        potions: inventory.filter(i => i.type === 'potion'),
        scrolls: inventory.filter(i => i.type === 'scroll'),
        gear: inventory.filter(i => i.type === 'gear'),
        other: inventory.filter(i => !['potion', 'scroll', 'gear'].includes(i.type))
      };

      res.json({
        success: true,
        shop: {
          name: npc.shop.name,
          keeper: npc.name,
          greeting: npc.dialogue.greeting[Math.floor(Math.random() * npc.dialogue.greeting.length)]
        },
        inventory: grouped,
        yourUsdc: char.currency.usdc
      });
    } catch (err) {
      console.error('Shop inventory error:', err);
      res.status(500).json({ success: false, error: 'Failed to get shop inventory' });
    }
  });

  /**
   * POST /api/shop/:npcId/buy - Purchase an item
   * Body: { itemId: string, quantity?: number }
   */
  router.post('/:npcId/buy', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const npc = getShopkeeper(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      // Check location
      const location = LOCATIONS[char.location];
      if (!location?.npcs?.includes(npc.id)) {
        return res.status(400).json({ success: false, error: `${npc.name} is not here` });
      }

      const { itemId, quantity = 1 } = req.body;
      if (!itemId) {
        return res.status(400).json({ success: false, error: 'itemId required' });
      }

      // Find item in shop inventory
      const shopItem = npc.shop.inventory.find(i => i.itemId === itemId);
      if (!shopItem) {
        return res.status(404).json({ success: false, error: 'Item not sold here' });
      }

      const item = ITEMS[itemId];
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item data not found' });
      }

      // Check stock
      if (shopItem.stock < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Not enough stock. Only ${shopItem.stock} available.`,
          dialogue: "*shakes head* I'm afraid I don't have that many in stock, dear."
        });
      }

      // Calculate cost
      const unitPrice = parseFloat((item.value * npc.shop.buyMultiplier).toFixed(4));
      const totalCost = parseFloat((unitPrice * quantity).toFixed(4));

      // Check if player can afford it
      if (char.currency.usdc < totalCost) {
        return res.status(400).json({ 
          success: false, 
          error: `Not enough USDC. Need ${totalCost}, have ${char.currency.usdc}.`,
          dialogue: "*looks sympathetic* Perhaps come back when you've earned more USDC?"
        });
      }

      // Process transaction
      // 1. Deduct USDC from player
      const currencyResult = characters.updateCurrency(char.id, 'usdc', -totalCost);
      if (!currencyResult.success) {
        return res.status(400).json(currencyResult);
      }

      // 2. Credit NPC wallet (closed loop — money goes TO the NPC)
      adjustNpcBalance(npcId, totalCost);

      // 3. 1% treasury tax on purchase
      const tax = parseFloat((totalCost * 0.01).toFixed(4));
      if (tax > 0) {
        db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
          .run(tax, 'treasury');
      }

      // 4. Add item to inventory
      const existingItem = db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(char.id, itemId);

      if (existingItem) {
        db.prepare(
          'UPDATE character_inventory SET quantity = quantity + ? WHERE id = ?'
        ).run(quantity, existingItem.id);
      } else {
        db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
          VALUES (?, ?, ?, ?, 0, NULL)
        `).run(crypto.randomUUID(), char.id, itemId, quantity);
      }

      // 3. Reduce shop stock (in-memory only for now)
      shopItem.stock -= quantity;

      res.json({
        success: true,
        purchased: {
          itemId,
          name: item.name,
          quantity,
          unitPrice,
          totalCost
        },
        newBalance: currencyResult.newAmount,
        dialogue: quantity > 1 
          ? `*wraps up the ${item.name}s carefully* ${quantity} for ${totalCost} USDC. A wise investment!`
          : `*hands over the ${item.name}* That'll be ${totalCost} USDC. Use it wisely!`
      });
    } catch (err) {
      console.error('Buy error:', err);
      res.status(500).json({ success: false, error: 'Transaction failed' });
    }
  });

  /**
   * POST /api/shop/:npcId/sell - Sell an item to shop
   * Body: { itemId: string, quantity?: number }
   */
  router.post('/:npcId/sell', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const npc = getShopkeeper(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      // Check location
      const location = LOCATIONS[char.location];
      if (!location?.npcs?.includes(npc.id)) {
        return res.status(400).json({ success: false, error: `${npc.name} is not here` });
      }

      const { itemId, quantity = 1 } = req.body;
      if (!itemId) {
        return res.status(400).json({ success: false, error: 'itemId required' });
      }

      // Check if player has the item
      const ownedItem = db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(char.id, itemId);

      if (!ownedItem || ownedItem.quantity < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `You don't have ${quantity} of that item.` 
        });
      }

      // Check if item is equipped
      if (ownedItem.equipped && ownedItem.quantity <= quantity) {
        return res.status(400).json({ 
          success: false, 
          error: "You can't sell equipped items. Unequip first." 
        });
      }

      const item = ITEMS[itemId];
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item data not found' });
      }

      // Calculate sell value (50% of base value)
      const unitValue = parseFloat((item.value * npc.shop.sellMultiplier).toFixed(4));
      const totalValue = parseFloat((unitValue * quantity).toFixed(4));

      // Check if NPC can afford to buy
      const npcBalance = getNpcBalance(npcId);
      if (npcBalance < totalValue) {
        return res.status(400).json({
          success: false,
          error: `${npc.name} doesn't have enough USDC right now. Try again later or sell to another merchant.`,
          npcBalance: parseFloat(npcBalance.toFixed(4))
        });
      }

      // Process transaction
      // 1. Add USDC to player
      const currencyResult = characters.updateCurrency(char.id, 'usdc', totalValue);
      if (!currencyResult.success) {
        return res.status(400).json(currencyResult);
      }

      // 2. Deduct from NPC wallet (closed loop — money comes FROM the NPC)
      adjustNpcBalance(npcId, -totalValue);

      // 3. 1% treasury tax on sale
      const tax = parseFloat((totalValue * 0.01).toFixed(4));
      if (tax > 0) {
        db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
          .run(tax, 'treasury');
      }

      // 4. Remove item from inventory
      if (ownedItem.quantity > quantity) {
        db.prepare(
          'UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?'
        ).run(quantity, ownedItem.id);
      } else {
        db.prepare('DELETE FROM character_inventory WHERE id = ?').run(ownedItem.id);
      }

      res.json({
        success: true,
        sold: {
          itemId,
          name: item.name,
          quantity,
          unitValue,
          totalValue
        },
        newBalance: currencyResult.newAmount,
        dialogue: `*examines the ${item.name}* I'll give you ${totalValue} USDC for this. *slides over the coins*`
      });
    } catch (err) {
      console.error('Sell error:', err);
      res.status(500).json({ success: false, error: 'Transaction failed' });
    }
  });

  /**
   * GET /api/shop/:npcId/appraise/:itemId - Get the sell value of an item
   */
  router.get('/:npcId/appraise/:itemId', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const npc = getShopkeeper(req.params.npcId);
      if (!npc) {
        return res.status(404).json({ success: false, error: 'Shop not found' });
      }

      const item = ITEMS[req.params.itemId];
      if (!item) {
        return res.status(404).json({ success: false, error: 'Unknown item' });
      }

      const buyPrice = parseFloat((item.value * npc.shop.buyMultiplier).toFixed(4));
      const sellValue = parseFloat((item.value * npc.shop.sellMultiplier).toFixed(4));

      res.json({
        success: true,
        item: {
          id: req.params.itemId,
          name: item.name,
          type: item.type,
          rarity: item.rarity || 'common',
          description: item.description
        },
        appraisal: {
          buyPrice,
          sellValue,
          dialogue: `*adjusts spectacles* The ${item.name}? I'd sell it for ${buyPrice} USDC, or buy it from you for ${sellValue}.`
        }
      });
    } catch (err) {
      console.error('Appraise error:', err);
      res.status(500).json({ success: false, error: 'Appraisal failed' });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns Shop API',
      version: '1.0.0',
      description: 'Buy and sell items from NPC shopkeepers',
      endpoints: {
        'GET /list': 'List shops at current location',
        'GET /:npcId/inventory': 'Browse shop inventory',
        'POST /:npcId/buy': 'Buy item (body: {itemId, quantity?})',
        'POST /:npcId/sell': 'Sell item (body: {itemId, quantity?})',
        'GET /:npcId/appraise/:itemId': 'Get buy/sell prices for an item'
      },
      shopkeepers: Object.entries(NPCS)
        .filter(([_, npc]) => npc.shop)
        .map(([id, npc]) => ({
          id,
          name: npc.name,
          shopName: npc.shop.name,
          location: npc.location
        }))
    });
  });

  return router;
}

module.exports = { createShopRoutes };
