#!/usr/bin/env node
/**
 * Crusher Economy Test - Generate actual USDC transactions
 * Updated for new turn-based combat system
 * Loop: Explore → Fight → Loot materials → Sell to NPCs
 */

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';
const CRUSHER_API_KEY = 'dnd_f2f9b022f6854322914affde772bd722';

async function makeRequest(endpoint, options = {}) {
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
    console.error(`API error (${endpoint}):`, err.message);
    return { success: false, error: err.message };
  }
}

async function doCombat() {
  console.log('⚔️ Fighting...');
  
  let rounds = 0;
  const maxRounds = 20;
  
  while (rounds < maxRounds) {
    // Check if still in combat
    const combat = await makeRequest('/api/zone/combat');
    if (!combat.success || !combat.encounter) {
      console.log('✅ Combat ended!');
      return true;
    }

    // Wait for turn
    const waitResult = await makeRequest('/api/zone/combat/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'wait' })
    });

    if (!waitResult.success) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      continue;
    }

    // Attack
    const attackResult = await makeRequest('/api/zone/combat/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'attack' })
    });

    if (attackResult.combatEnded) {
      console.log('✅ Victory!');
      return true;
    }

    if (attackResult.error?.includes('died')) {
      console.log('💀 Defeated!');
      return false;
    }

    rounds++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Flee if too long
  console.log('⏱️ Combat too long, fleeing...');
  await makeRequest('/api/zone/combat/action', {
    method: 'POST',
    body: JSON.stringify({ action: 'flee' })
  });
  return false;
}

async function sellMaterials() {
  console.log('💰 Selling ALL materials...');
  
  const char = await makeRequest('/api/character');
  if (!char.success) return;

  const materials = char.character.materials || [];
  if (materials.length === 0) {
    console.log('📦 No materials to sell');
    return;
  }

  // Get NPC prices
  const prices = await makeRequest('/api/economy/prices');
  if (!prices.success) return;

  let totalEarned = 0;

  // Sell ALL materials to best NPC
  for (const mat of materials) {
    const matData = prices.materials?.find(m => m.material === mat.material);
    if (!matData) continue;

    const sellResult = await makeRequest('/api/economy/sell', {
      method: 'POST',
      body: JSON.stringify({
        material: mat.material,
        quantity: mat.quantity, // Sell EVERYTHING
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

async function sellItemsOnAuction() {
  console.log('🏛️ Listing ALL items on auction...');
  
  const char = await makeRequest('/api/character');
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
    const startPrice = 0.02;
    const buyoutPrice = 0.1;
    
    console.log(`📜 Listing ${item.item_id} (${item.item?.name || item.item_id})...`);
    const result = await makeRequest('/api/economy/auction/create', {
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

async function browseAuction() {
  console.log('👀 Browsing auction house...');
  
  const auctions = await makeRequest('/api/economy/auction/active');
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
  for (const auction of active.slice(0, 5)) {
    console.log(`  🔹 ${auction.itemId} - Current: ${auction.currentBid} USDC (Buyout: ${auction.buyoutPrice} USDC)`);
  }
}

async function main() {
  console.log('⚔️ Crusher Economy Loop Starting...\n');
  
  while (true) {
    try {
      // 1. Get status
      const char = await makeRequest('/api/character');
      if (!char.success) {
        console.log('❌ Could not get character');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }

      console.log(`\n📍 ${char.character.name} @ ${char.character.location}`);
      console.log(`💰 USDC: ${char.character.currency.usdc}`);
      console.log(`⚔️ HP: ${char.character.hp.current}/${char.character.hp.max}`);
      console.log(`📦 Materials: ${char.character.materials?.length || 0}\n`);

      // 2. Check if in combat
      const combat = await makeRequest('/api/zone/combat');
      if (combat.success && combat.encounter) {
        await doCombat();
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      // 3. Sell materials if we have any
      if (char.character.materials && char.character.materials.length > 0) {
        await sellMaterials();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 4. List ALL items on auction
      await sellItemsOnAuction();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 5. Browse auction house
      await browseAuction();
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 6. Navigate to adventure zone and explore
      const zones = ['kelp_forest', 'wreckers_rest'];
      const zone = zones[Math.floor(Math.random() * zones.length)];
      
      // Check current location
      const location = char.character.location || '';
      
      // Navigate if not in adventure zone
      if (!location.includes('kelp_forest') && !location.includes('wreckers')) {
        console.log(`🚶 Moving to docks...`);
        const docks = await makeRequest('/api/world/move', {
          method: 'POST',
          body: JSON.stringify({ direction: 'west' })
        });
        
        if (docks.success) {
          console.log(`🌊 Entering ${zone}...`);
          const enter = await makeRequest('/api/world/move', {
            method: 'POST',
            body: JSON.stringify({ direction: zone })
          });
        }
      }
      
      console.log(`🔍 Exploring...`);
      const explore = await makeRequest('/api/zone/explore', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (explore.encounter) {
        console.log(`⚔️ Encounter! ${explore.description || ''}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Combat will be handled next loop
      } else {
        console.log(`🔍 ${explore.message || 'Nothing found'}`);
      }

    } catch (err) {
      console.error('❌ Error:', err.message);
    }

    // Wait 60s before next cycle
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
