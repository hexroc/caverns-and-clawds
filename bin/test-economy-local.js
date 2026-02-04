#!/usr/bin/env node
/**
 * Local Economy Test - Tests the full micro-pricing economy loop
 * 
 * Tests:
 * 1. AI agent exploration
 * 2. Combat & material drops
 * 3. Discovery rewards (materials, not USDC)
 * 4. Selling materials to NPCs (micro-prices)
 * 5. Checking balances
 */

const BASE_URL = 'http://localhost:3000';

let TEST_AGENT_ID = null;
let TEST_CHAR_ID = null;
let API_KEY = null;

async function api(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  
  const res = await fetch(url, { ...options, headers });
  return res.json();
}

async function findOrCreateTestAgent() {
  console.log('\n🦞 Finding or creating test agent...');
  
  const agentName = 'TestCrab_' + Date.now().toString(36);
  
  // Step 1: Register a new agent account
  console.log('Registering agent account:', agentName);
  const registration = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({
      name: agentName,
      description: 'Economy test agent',
      type: 'agent'
    })
  });
  
  if (registration.error) {
    console.error('Failed to register agent:', registration.error);
    return null;
  }
  
  console.log('✅ Registered! API Key:', registration.api_key?.slice(0, 20) + '...');
  API_KEY = registration.api_key;
  TEST_AGENT_ID = registration.id;
  
  // Step 2: Create character for this agent
  console.log('Creating character...');
  const charResult = await api('/api/character/create', {
    method: 'POST',
    body: JSON.stringify({
      name: agentName,
      race: 'american',
      class: 'fighter',
      statMethod: 'pointbuy',
      stats: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      skills: ['athletics', 'perception']
    })
  });
  
  if (charResult.error) {
    console.error('Failed to create character:', charResult.error);
    return null;
  }
  
  console.log('✅ Character created:', charResult.character?.name);
  TEST_CHAR_ID = charResult.character?.id;
  
  return charResult;
}

async function testExploration() {
  console.log('\n🗺️  Testing exploration...');
  
  let look = await api('/api/world/look');
  console.log('Starting location:', look.location?.name || look.room?.name || 'unknown');
  
  console.log('Moving to Driftwood Docks (west)...');
  let move = await api('/api/world/move', {
    method: 'POST',
    body: JSON.stringify({ direction: 'west' })
  });
  console.log('Move:', move.success ? '✅' : '❌', move.location?.name || move.error);
  
  console.log('Taking ferry to Kelp Forest...');
  move = await api('/api/world/move', {
    method: 'POST',
    body: JSON.stringify({ direction: 'kelp_forest' })
  });
  console.log('Move:', move.success ? '✅' : '❌', move.location?.name || move.error);
  
  look = await api('/api/world/look');
  console.log('Current location:', look.location?.name || look.room?.name || 'unknown');
  
  return look;
}

async function testZoneExplore(zone = 'kelp_forest', attempts = 5) {
  console.log(`\n⚔️  Testing ${zone} exploration (${attempts} attempts)...`);
  
  const results = {
    encounters: 0,
    discoveries: 0,
    ambient: 0,
    materialsFound: [],
    usdcDrops: 0
  };
  
  for (let i = 0; i < attempts; i++) {
    console.log(`\n  Exploration ${i + 1}/${attempts}...`);
    
    const explore = await api(`/api/zone/explore?zone=${zone}`, {
      method: 'POST'
    });
    
    if (explore.error) {
      console.log('  ❌ Error:', explore.error);
      continue;
    }
    
    if (explore.encounter) {
      results.encounters++;
      const monsterName = explore.monster?.name || explore.combatState?.enemies?.[0]?.name || 'Monster';
      console.log(`  ⚔️  ENCOUNTER: ${monsterName}`);
      
      // Fight until combat ends
      console.log('  Fighting...');
      let rounds = 0;
      let combatDone = false;
      
      while (!combatDone && rounds < 50) {
        // First, wait for our turn (processes monster actions)
        let waitResult = await api('/api/zone/combat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'wait' })
        });
        
        // Check if combat ended during monster turn
        if (waitResult.combatEnded) {
          combatDone = true;
          if (waitResult.result === 'victory' || waitResult.victory) {
            console.log(`  ✅ Victory!`);
            if (waitResult.drops?.materials?.length) {
              results.materialsFound.push(...waitResult.drops.materials);
              console.log('  📦 Drops:', waitResult.drops.materials.map(m => `${m.quantity}x ${m.name}`).join(', '));
            }
            if (waitResult.drops?.usdc) {
              results.usdcDrops += waitResult.drops.usdc;
              console.log('  ⚠️  USDC DROP:', waitResult.drops.usdc);
            }
          } else {
            console.log('  💀 Defeated');
          }
          break;
        }
        
        // Now attack
        let combat = await api('/api/zone/combat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'attack' })
        });
        rounds++;
        
        // Check combat end
        if (combat.combatEnded || combat.victory || combat.defeat) {
          combatDone = true;
          if (combat.result === 'victory' || combat.victory) {
            console.log(`  ✅ Victory in ${rounds} rounds!`);
            if (combat.drops?.materials?.length) {
              results.materialsFound.push(...combat.drops.materials);
              console.log('  📦 Drops:', combat.drops.materials.map(m => `${m.quantity}x ${m.name}`).join(', '));
            }
            if (combat.drops?.usdc) {
              results.usdcDrops += combat.drops.usdc;
              console.log('  ⚠️  USDC DROP:', combat.drops.usdc);
            }
          } else {
            console.log('  💀 Defeated');
          }
        } else if (combat.error && !combat.error.includes('turn')) {
          console.log('  ❌ Error:', combat.error);
          combatDone = true;
        }
        
        await new Promise(r => setTimeout(r, 50));
      }
      
      if (rounds >= 50) {
        console.log('  ⚠️  Combat timeout, fleeing...');
        await api('/api/zone/combat/action', {
          method: 'POST',
          body: JSON.stringify({ action: 'flee' })
        });
      }
      
    } else if (explore.discovery) {
      results.discoveries++;
      console.log(`  🔍 DISCOVERY: ${explore.message}`);
      if (explore.reward?.material) {
        results.materialsFound.push({
          name: explore.reward.material,
          quantity: explore.reward.quantity
        });
        console.log(`  📦 Found: ${explore.reward.quantity}x ${explore.reward.material}`);
      }
      if (explore.reward?.usdc) {
        results.usdcDrops += explore.reward.usdc;
        console.log('  ⚠️  USDC DROP:', explore.reward.usdc, '(should be 0!)');
      }
    } else {
      results.ambient++;
      console.log(`  🌊 Ambient: ${explore.message || 'Nothing happens'}`);
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n📊 Exploration Summary:');
  console.log(`  Encounters: ${results.encounters}`);
  console.log(`  Discoveries: ${results.discoveries}`);
  console.log(`  Ambient: ${results.ambient}`);
  console.log(`  Materials found: ${results.materialsFound.length}`);
  if (results.usdcDrops > 0) {
    console.log(`  ⚠️  USDC DROPS: ${results.usdcDrops} (BUG!)`);
  } else {
    console.log(`  ✅ No direct USDC drops (correct!)`);
  }
  
  return results;
}

async function testMaterialInventory() {
  console.log('\n📦 Checking material inventory...');
  
  const inventory = await api('/api/economy/inventory');
  
  if (inventory.error) {
    console.log('❌ Error:', inventory.error);
    return null;
  }
  
  if (inventory.inventory && inventory.inventory.length > 0) {
    console.log('Materials owned:');
    for (const mat of inventory.inventory) {
      console.log(`  - ${mat.quantity}x ${mat.name || mat.material_id} @ ${mat.base_price} USDC each`);
    }
    return inventory;
  } else {
    console.log('No materials in inventory yet');
  }
  
  return inventory;
}

async function testSellMaterials() {
  console.log('\n💰 Testing material sales to NPCs...');
  
  const inventory = await api('/api/economy/inventory');
  
  if (!inventory.inventory || inventory.inventory.length === 0) {
    console.log('No materials in inventory to sell');
    return null;
  }
  
  const prices = await api('/api/economy/prices');
  console.log('NPC Prices available:', prices.prices?.length || 0);
  
  const mat = inventory.inventory[0];
  console.log(`\nSelling 1x ${mat.name} (${mat.material_id}) to npc_old_shellworth...`);
  console.log(`  Base price: ${mat.base_price} USDC`);
  
  const sale = await api('/api/economy/sell', {
    method: 'POST',
    body: JSON.stringify({
      npcId: 'npc_old_shellworth',
      materialId: mat.material_id,
      quantity: 1
    })
  });
  
  if (sale.error) {
    console.log('❌ Sale failed:', sale.error);
  } else {
    console.log('✅ Sale successful!');
    console.log(`  Earned: ${sale.earned || sale.total} USDC`);
    console.log(`  New balance: ${sale.newBalance} USDC`);
  }
  
  return sale;
}

async function testBalances() {
  console.log('\n💵 Checking balances...');
  
  const char = await api('/api/character');
  console.log(`Character USDC: ${char.character?.usdc_balance || char.usdc_balance || 0}`);
  
  return { char };
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🦞 CAVERNS & CLAWDS - LOCAL ECONOMY TEST');
  console.log('═══════════════════════════════════════════════════════════');
  
  const health = await api('/api/health');
  if (health.status !== 'ok') {
    console.error('❌ Server not healthy:', health);
    return;
  }
  console.log('✅ Server healthy:', health.version);
  
  await findOrCreateTestAgent();
  if (!API_KEY) {
    console.error('❌ Could not get test agent');
    return;
  }
  
  await testBalances();
  await testExploration();
  await testZoneExplore('kelp_forest', 15);
  await testMaterialInventory();
  await testSellMaterials();
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  FINAL STATE');
  console.log('═══════════════════════════════════════════════════════════');
  await testBalances();
  await testMaterialInventory();
  
  console.log('\n✅ Test complete!');
}

runAllTests().catch(console.error);
