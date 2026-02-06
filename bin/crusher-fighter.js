#!/usr/bin/env node
/**
 * Crusher - The Battle-Hungry Fighter AI
 * Updated for new turn-based combat system
 */

const CRUSHER_API_KEY = 'dnd_ecb19e6ba2b8473bae09c7070aaec3ac';
const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const CRUSHER_PHRASES = [
  "💪 *flexes claws menacingly*",
  "Looking for a good fight!",
  "⚔️ *sharpens weapons*",
  "These depths hold worthy opponents...",
  "*cracks knuckles* Time for action!",
  "🛡️ Nothing I can't handle!",
  "Bring on the monsters!",
  "*battle-ready stance*"
];

class CrusherFighter {
  constructor() {
    this.currentLocation = 'briny_flagon';
    this.inCombat = false;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${CRUSHER_API_KEY}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      return await response.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async getCurrentStatus() {
    const char = await this.makeRequest('/api/character');
    if (char.success) {
      this.currentLocation = char.character.location;
      return char.character;
    }
    return null;
  }

  async checkCombat() {
    const combat = await this.makeRequest('/api/zone/combat');
    if (combat.success && combat.encounter) {
      this.inCombat = true;
      return combat.encounter;
    }
    this.inCombat = false;
    return null;
  }

  async doCombat() {
    const encounter = await this.checkCombat();
    if (!encounter) return false;

    console.log(`⚔️ In combat! Round ${encounter.round || 1}`);

    // New combat system: MUST wait before acting
    const waitResult = await this.makeRequest('/api/zone/combat/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'wait' })
    });

    if (!waitResult.success) {
      console.log('⏳ Waiting for turn...');
      return true; // Still in combat
    }

    // Now attack
    const attackResult = await this.makeRequest('/api/zone/combat/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'attack' })
    });

    if (attackResult.success) {
      console.log(`💥 Attack: ${attackResult.messages?.join(' ') || 'Hit!'}`);
      
      if (attackResult.combatEnded) {
        console.log('✅ Victory!');
        this.inCombat = false;
        return false;
      }
    } else if (attackResult.error?.includes('died')) {
      console.log('💀 Defeated! Respawning...');
      this.inCombat = false;
      return false;
    }

    return true; // Still fighting
  }

  async sellAllMaterials() {
    console.log('💰 Selling ALL materials...');
    
    const char = await this.makeRequest('/api/character');
    if (!char.success || !char.character.materials) return;

    const materials = char.character.materials || [];
    if (materials.length === 0) {
      console.log('📦 No materials to sell');
      return;
    }

    // Get NPC prices
    const prices = await this.makeRequest('/api/economy/prices');
    if (!prices.success) return;

    let totalEarned = 0;

    // Sell ALL materials
    for (const mat of materials) {
      const matData = prices.materials?.find(m => m.material === mat.material);
      if (!matData) continue;

      const sellResult = await this.makeRequest('/api/economy/sell', {
        method: 'POST',
        body: JSON.stringify({
          material: mat.material,
          quantity: mat.quantity, // Sell ALL quantity
          npcId: matData.npcId
        })
      });

      if (sellResult.success) {
        totalEarned += sellResult.usdcEarned || 0;
        console.log(`  ✅ Sold ${mat.quantity}x ${mat.material}: ${sellResult.usdcEarned} USDC`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (totalEarned > 0) {
      console.log(`💵 Total earned: ${totalEarned.toFixed(4)} USDC`);
    }
  }

  async sellAllItems() {
    console.log('🏛️ Listing ALL items on auction...');
    
    const char = await this.makeRequest('/api/character');
    if (!char.success || !char.character.inventory) return;

    const inventory = char.character.inventory;
    
    // Find items to auction (exclude equipped and consumables)
    const auctionables = inventory.filter(item => 
      !item.equipped && 
      item.quantity > 0 &&
      !['healing_potion', 'rations'].includes(item.item_id)
    );

    if (auctionables.length === 0) {
      console.log('📦 Nothing to auction');
      return;
    }

    console.log(`📦 Listing ${auctionables.length} items...`);

    // List ALL items
    for (const item of auctionables) {
      const startPrice = 0.02; // 2 cents
      const buyoutPrice = 0.1; // 10 cents
      
      console.log(`📜 Listing ${item.item_id} (${item.item?.name || item.item_id})...`);
      const result = await this.makeRequest('/api/economy/auction/create', {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.item_id,
          quantity: 1,
          startingBid: startPrice,
          buyoutPrice: buyoutPrice,
          duration: 24
        })
      });

      if (result.success) {
        console.log(`  ✅ Listed!`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async browseAuction() {
    console.log('👀 Browsing auction house...');
    
    const auctions = await this.makeRequest('/api/economy/auction/active');
    if (!auctions.success || !auctions.auctions) {
      console.log('📋 No active auctions');
      return;
    }

    const active = auctions.auctions;
    if (active.length === 0) {
      console.log('📋 Auction house is empty');
      return;
    }

    console.log(`📋 Found ${active.length} active auctions`);
    
    // Show first few
    for (const auction of active.slice(0, 3)) {
      console.log(`  🔹 ${auction.itemId} - Current: ${auction.currentBid} USDC (Buyout: ${auction.buyoutPrice} USDC)`);
    }
  }

  async explore() {
    const zones = ['kelp_forest', 'wreckers_rest'];
    const zone = zones[Math.floor(Math.random() * zones.length)];

    // Navigate to adventure zone if not already there
    if (!this.currentLocation.includes('kelp_forest') && !this.currentLocation.includes('wreckers')) {
      // First move to docks
      console.log(`🚶 Moving to docks...`);
      const docks = await this.makeRequest('/api/world/move', {
        method: 'POST',
        body: JSON.stringify({ direction: 'west' })
      });
      if (docks.success) {
        this.currentLocation = docks.to;
      }

      // Then enter adventure zone
      console.log(`🌊 Entering ${zone}...`);
      const enter = await this.makeRequest('/api/world/move', {
        method: 'POST',
        body: JSON.stringify({ direction: zone })
      });
      if (enter.success) {
        this.currentLocation = enter.to;
      }
    }

    console.log(`🔍 Exploring...`);
    
    const result = await this.makeRequest('/api/zone/explore', {
      method: 'POST',
      body: JSON.stringify({})
    });

    if (result.encounter) {
      console.log(`⚔️ Encounter! ${result.description || 'Monsters appear!'}`);
      this.inCombat = true;
    } else {
      console.log(`🔍 ${result.message || 'Nothing found'}`);
    }
  }

  async executeBehavior() {
    const status = await this.getCurrentStatus();
    if (!status) {
      console.log('❌ Could not get character status');
      return;
    }

    console.log(`\n📍 Crusher @ ${status.location} | HP: ${status.hp.current}/${status.hp.max} | ${status.currency.usdc} USDC`);

    // Check if already in combat
    const inCombat = await this.checkCombat();
    
    if (inCombat) {
      await this.doCombat();
    } else {
      // Not in combat - sell everything, then explore
      const roll = Math.random();
      
      if (roll < 0.4) {
        // 40% chance: Sell materials → List items → Browse auction
        await this.sellAllMaterials();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.sellAllItems();
        await new Promise(resolve => setTimeout(resolve, 2000));
        await this.browseAuction();
      } else {
        // 60% chance to explore
        await this.explore();
      }
    }
  }
}

// Main loop
async function runLoop() {
  const crusher = new CrusherFighter();
  
  while (true) {
    try {
      await crusher.executeBehavior();
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
    
    // Wait 60 seconds before next action
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

if (require.main === module) {
  console.log('⚔️ Crusher Fighter Bot Starting...');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log('');
  runLoop().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { CrusherFighter };
