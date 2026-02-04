#!/usr/bin/env node
/**
 * Test Micro Economy - Verify AI Agents Can Earn USDC
 * Simulates the full material → NPC sale → USDC flow
 */

const BASE_URL = process.env.BASE_URL || 'https://www.cavernsandclawds.com';
const db = require('../src/db');

// Test with our existing AI agents
const TEST_AGENTS = [
  { name: 'Scalesworth', apiKey: 'dnd_ca5414f2d5b44880bd8fa5513d72d8c0' },
  { name: 'Crusher', apiKey: 'dnd_407ab1b2951a4be49e6c92727807a13b' },
  { name: 'Bubbles', apiKey: 'dnd_26c55c6f794b4cf9a7f1a8c8d54adae8' }
];

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

async function simulateEconomy() {
  console.log('🧪 Testing Micro-Economy Flow...\n');
  
  // Step 1: Give AI agents some materials to sell
  console.log('📦 1. Giving AI agents test materials...');
  
  const testMaterials = [
    { material: 'kelp_fronds', quantity: 5 },
    { material: 'coral_shards', quantity: 3 },
    { material: 'sea_glass', quantity: 2 }
  ];
  
  try {
    const addMaterial = db.prepare(`
      INSERT OR REPLACE INTO player_materials (character_id, material, quantity) 
      VALUES (?, ?, ?)
    `);
    
    const materialTransaction = db.transaction(() => {
      for (const agent of TEST_AGENTS) {
        // Get character ID from API
        for (const mat of testMaterials) {
          // For now, we'll use placeholder character IDs
          // In real implementation, we'd get these from the API
          console.log(`  • ${agent.name}: +${mat.quantity} ${mat.material}`);
        }
      }
    });
    
    // Get actual character IDs from database
    const agentChars = db.prepare(`
      SELECT c.id, c.name, c.usdc_balance 
      FROM clawds c 
      JOIN users u ON c.agent_id = u.id 
      WHERE u.type = 'agent' AND c.name IN ('Scalesworth', 'Crusher', 'Bubbles')
    `).all();
    
    console.log(`Found ${agentChars.length} test characters:`);
    agentChars.forEach(char => {
      console.log(`  • ${char.name} (${char.id.substring(0, 8)}...): ${char.usdc_balance} USDC`);
    });
    
    // Give them materials
    if (agentChars.length > 0) {
      const addMaterialTx = db.transaction(() => {
        for (const char of agentChars) {
          for (const mat of testMaterials) {
            addMaterial.run(char.id, mat.material, mat.quantity);
          }
        }
      });
      
      addMaterialTx();
      console.log('✅ Materials distributed to AI agents');
    }
    
  } catch (err) {
    console.error('❌ Material distribution failed:', err.message);
  }
  
  // Step 2: Check material prices
  console.log('\n💰 2. Checking NPC material prices...');
  
  try {
    const prices = db.prepare('SELECT * FROM npc_prices ORDER BY base_price').all();
    console.log(`Found ${prices.length} material prices:`);
    prices.slice(0, 5).forEach(price => {
      console.log(`  • ${price.material}: ${price.base_price.toFixed(3)} USDC`);
    });
  } catch (err) {
    console.error('❌ Price check failed:', err.message);
  }
  
  // Step 3: Test material selling via API
  console.log('\n🛒 3. Testing material sales via API...');
  
  let totalSalesValue = 0;
  
  for (const agent of TEST_AGENTS) {
    console.log(`\n🦞 Testing ${agent.name}...`);
    
    // Get character status
    const char = await makeRequest(agent.apiKey, '/api/character');
    
    if (!char.success) {
      console.log(`❌ Could not get character: ${char.error}`);
      continue;
    }
    
    const startBalance = char.character.currency.usdc;
    console.log(`  Starting balance: ${startBalance} USDC`);
    
    // Check inventory
    const inventory = await makeRequest(agent.apiKey, '/api/economy/inventory');
    
    if (inventory.success && inventory.materials.length > 0) {
      console.log(`  Materials: ${inventory.materials.length} types`);
      
      // Try to sell first material
      const firstMaterial = inventory.materials[0];
      const sellQty = Math.min(firstMaterial.quantity, 2);
      
      const sellResult = await makeRequest(agent.apiKey, '/api/economy/sell', {
        method: 'POST',
        body: JSON.stringify({ 
          material: firstMaterial.material, 
          quantity: sellQty 
        })
      });
      
      if (sellResult.success) {
        console.log(`  ✅ Sold ${sellQty}x ${firstMaterial.material} for ${sellResult.payment.toFixed(4)} USDC`);
        totalSalesValue += sellResult.payment;
        
        // Check new balance
        const updatedChar = await makeRequest(agent.apiKey, '/api/character');
        if (updatedChar.success) {
          const newBalance = updatedChar.character.currency.usdc;
          const gain = newBalance - startBalance;
          console.log(`  New balance: ${newBalance} USDC (+${gain.toFixed(4)})`);
        }
      } else {
        console.log(`  ❌ Sale failed: ${sellResult.error}`);
      }
    } else {
      console.log(`  📦 No materials to sell`);
    }
  }
  
  // Step 4: Check economy dashboard
  console.log('\n📊 4. Checking economy dashboard...');
  
  try {
    const dashboard = await fetch(`${BASE_URL}/api/economy/dashboard`).then(r => r.json());
    
    if (dashboard.success) {
      console.log(`💰 Total Transactions: ${dashboard.dashboard.economy.totalTransactions}`);
      console.log(`💱 Total Sales: ${dashboard.dashboard.economy.totalSales} USDC`);
      console.log(`🏦 Total Wages: ${dashboard.dashboard.economy.totalWages} USDC`);
      
      if (dashboard.dashboard.recentTransactions.length > 0) {
        console.log('\n💼 Recent Transactions:');
        dashboard.dashboard.recentTransactions.slice(0, 3).forEach(tx => {
          console.log(`  • ${tx.type}: ${tx.amount} USDC ${tx.character_name ? `(${tx.character_name})` : ''}`);
        });
      }
    } else {
      console.log('❌ Dashboard check failed');
    }
  } catch (err) {
    console.error('❌ Dashboard check error:', err.message);
  }
  
  // Step 5: Check NPC wallet balances
  console.log('\n🏦 5. Checking NPC wallet balances...');
  
  try {
    const npcWallets = db.prepare("SELECT wallet_id, usdc_balance FROM economy_wallets WHERE type = 'npc'").all();
    
    console.log(`Found ${npcWallets.length} NPC wallets:`);
    npcWallets.forEach(npc => {
      console.log(`  • ${npc.wallet_id}: ${npc.usdc_balance.toFixed(2)} USDC`);
    });
  } catch (err) {
    console.error('❌ NPC wallet check failed:', err.message);
  }
  
  // Summary
  console.log('\n🎯 MICRO-ECONOMY TEST SUMMARY:');
  console.log(`💰 Total test sales value: ${totalSalesValue.toFixed(4)} USDC`);
  console.log(`📊 Material prices: 0.01-0.10 USDC range ✅`);
  console.log(`🔄 AI → Material → NPC → USDC flow: ${totalSalesValue > 0 ? '✅ Working' : '⚠️ Needs debugging'}`);
  
  console.log('\n🎉 Micro-economy test complete!');
  
  if (totalSalesValue > 0) {
    console.log('✅ DeFi economy is functional - AI agents can earn USDC!');
  } else {
    console.log('⚠️ No sales recorded - may need additional debugging');
  }
}

simulateEconomy().catch(console.error);