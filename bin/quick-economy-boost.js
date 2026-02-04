#!/usr/bin/env node
/**
 * Quick Economy Boost - Generate immediate transactions for AI traders
 * Gets them exploring, fighting, and trading to create real activity
 */

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';

const TRADERS = [
  { name: 'Scalesworth', apiKey: 'dnd_ca5414f2d5b44880bd8fa5513d72d8c0', archetype: 'trader' },
  { name: 'Crusher', apiKey: 'dnd_407ab1b2951a4be49e6c92727807a13b', archetype: 'fighter' },
  { name: 'Bubbles', apiKey: 'dnd_26c55c6f794b4cf9a7f1a8c8d54adae8', archetype: 'healer' }
];

const ADVENTURE_ZONES = ['kelp_forest', 'shipwreck_graveyard', 'thermal_vents'];

async function makeRequest(apiKey, endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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

async function boostTrader(trader) {
  console.log(`\n💰 ${trader.name} starting economy boost...`);
  
  // 1. Get current status
  const char = await makeRequest(trader.apiKey, '/api/character');
  if (!char.success) {
    console.log(`❌ ${trader.name}: Could not get character`);
    return;
  }
  
  console.log(`📍 ${trader.name} @ ${char.character.location} | ${char.character.currency.usdc} USDC | Level ${char.character.level}`);
  
  // 2. Enter an adventure zone if not already in one
  const isInAdventureZone = ADVENTURE_ZONES.some(zone => char.character.location.includes(zone));
  
  if (!isInAdventureZone) {
    const zone = ADVENTURE_ZONES[Math.floor(Math.random() * ADVENTURE_ZONES.length)];
    console.log(`🚪 ${trader.name} entering ${zone}...`);
    
    const enterResult = await makeRequest(trader.apiKey, '/api/world/enter-zone', {
      method: 'POST',
      body: JSON.stringify({ zoneType: zone })
    });
    
    if (enterResult.success) {
      console.log(`✅ ${trader.name} entered ${enterResult.zone.name}`);
    } else {
      console.log(`❌ ${trader.name} failed to enter zone:`, enterResult.error);
    }
  }
  
  // 3. Explore and fight monsters for materials
  for (let i = 0; i < 3; i++) {
    console.log(`⚔️ ${trader.name} exploring (attempt ${i + 1})...`);
    
    const exploreResult = await makeRequest(trader.apiKey, '/api/zone/explore', {
      method: 'POST',
      body: JSON.stringify({})
    });
    
    if (exploreResult.success) {
      if (exploreResult.combat) {
        console.log(`🐟 ${trader.name} fought ${exploreResult.encounter.name}!`);
        if (exploreResult.materials && exploreResult.materials.length > 0) {
          console.log(`💎 Materials gained: ${exploreResult.materials.map(m => m.material).join(', ')}`);
        }
      }
    } else {
      console.log(`❌ ${trader.name} explore failed:`, exploreResult.error);
    }
    
    // Small delay between explores
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 4. Check materials inventory
  const inventory = await makeRequest(trader.apiKey, '/api/economy/inventory');
  if (inventory.success && inventory.materials.length > 0) {
    console.log(`💰 ${trader.name} has materials: ${inventory.materials.map(m => `${m.quantity}x ${m.material}`).join(', ')}`);
    
    // 5. Sell some materials to NPCs
    for (const material of inventory.materials.slice(0, 2)) { // Sell first 2 types
      const sellAmount = Math.min(material.quantity, Math.floor(material.quantity / 2) + 1);
      
      const sellResult = await makeRequest(trader.apiKey, '/api/economy/sell', {
        method: 'POST',
        body: JSON.stringify({ 
          material: material.material, 
          quantity: sellAmount 
        })
      });
      
      if (sellResult.success) {
        console.log(`💰 ${trader.name} sold ${sellAmount}x ${material.material} for ${sellResult.payment.toFixed(2)} USDC`);
      } else {
        console.log(`❌ ${trader.name} sell failed:`, sellResult.error);
      }
    }
  }
  
  console.log(`✅ ${trader.name} economy boost complete`);
}

async function main() {
  console.log('🚀 Starting economy boost for all AI traders...\n');
  
  for (const trader of TRADERS) {
    await boostTrader(trader);
    // Small delay between traders
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Economy boost complete! Checking results...\n');
  
  // Check final dashboard
  const dashboard = await fetch(`${BASE_URL}/api/economy/dashboard`).then(r => r.json());
  if (dashboard.success) {
    console.log('📊 Economy Dashboard:');
    console.log(`💰 Total Transactions: ${dashboard.dashboard.economy.totalTransactions}`);
    console.log(`💱 Total Sales: ${dashboard.dashboard.economy.totalSales} USDC`);
    console.log(`💴 Total Wages: ${dashboard.dashboard.economy.totalWages} USDC`);
    
    if (dashboard.dashboard.recentTransactions.length > 0) {
      console.log('\n💼 Recent Transactions:');
      dashboard.dashboard.recentTransactions.slice(0, 3).forEach(tx => {
        console.log(`  • ${tx.type}: ${tx.amount} USDC (${tx.character_name})`);
      });
    }
  }
}

main().catch(console.error);