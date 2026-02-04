#!/usr/bin/env node
/**
 * DeFi Economy Reset Script
 * Implements B-Rock's revolutionary micro-economy vision
 */

const path = require('path');
const db = require('../src/db');

// Economy parameters
const BANK_SOL_BALANCE = 2.0; // 2 SOL starting capital
const SOL_PRICE_USD = 400; // Estimated SOL price
const BANK_USDC_BALANCE = BANK_SOL_BALANCE * SOL_PRICE_USD; // 800 USDC
const NPC_STARTING_USDC = 10.0; // Each NPC gets 10 USDC
const PRICE_SCALE_FACTOR = 0.01; // Everything down to 100ths of a cent

console.log('🚀 DeFi Economy Reset Starting...\n');

// Step 1: Reset AI Agent Balances
console.log('🤖 Resetting AI agent USDC balances to 0...');

const aiAgents = db.prepare(`
  SELECT c.id, c.name, c.agent_id, c.usdc_balance 
  FROM clawds c 
  JOIN users u ON c.agent_id = u.id 
  WHERE u.type = 'agent'
`).all();

console.log(`Found ${aiAgents.length} AI agents:`);
aiAgents.forEach(agent => {
  console.log(`  • ${agent.name}: ${agent.usdc_balance} USDC → 0 USDC`);
});

// Reset AI balances
const resetAI = db.prepare('UPDATE clawds SET usdc_balance = 0 WHERE agent_id = ?');
const aiTransaction = db.transaction(() => {
  for (const agent of aiAgents) {
    resetAI.run(agent.agent_id);
  }
});

try {
  aiTransaction();
  console.log('✅ AI agent balances reset\n');
} catch (err) {
  console.error('❌ AI reset failed:', err.message);
}

// Step 2: Fund Bank Wallet
console.log('🏦 Funding bank with SOL-equivalent USDC...');

try {
  // Check if bank wallet exists
  const bankWallet = db.prepare('SELECT * FROM economy_wallets WHERE type = "bank"').get();
  
  if (bankWallet) {
    const updateBank = db.prepare('UPDATE economy_wallets SET usdc_balance = ? WHERE type = "bank"');
    updateBank.run(BANK_USDC_BALANCE);
    console.log(`✅ Bank funded: ${BANK_USDC_BALANCE} USDC (${BANK_SOL_BALANCE} SOL equivalent)\n`);
  } else {
    console.log('❌ Bank wallet not found - need to create it');
  }
} catch (err) {
  console.error('❌ Bank funding failed:', err.message);
}

// Step 3: Fund NPC Traders
console.log('💰 Funding NPC traders...');

const NPC_TRADERS = [
  'madame_pearl',
  'ironshell_gus', 
  'coral_trader',
  'weapon_smith',
  'old_shellworth'
];

try {
  // Check if NPCs exist in wallet system
  for (const npcId of NPC_TRADERS) {
    const npcWallet = db.prepare('SELECT * FROM economy_wallets WHERE wallet_id = ?').get(npcId);
    
    if (npcWallet) {
      const updateNPC = db.prepare('UPDATE economy_wallets SET usdc_balance = ? WHERE wallet_id = ?');
      updateNPC.run(NPC_STARTING_USDC, npcId);
      console.log(`  • ${npcId}: ${NPC_STARTING_USDC} USDC`);
    } else {
      // Create NPC wallet if doesn't exist
      const createNPC = db.prepare(`
        INSERT INTO economy_wallets (wallet_id, type, usdc_balance) 
        VALUES (?, 'npc', ?)
      `);
      createNPC.run(npcId, NPC_STARTING_USDC);
      console.log(`  • ${npcId}: Created with ${NPC_STARTING_USDC} USDC`);
    }
  }
  console.log('✅ NPC traders funded\n');
} catch (err) {
  console.error('❌ NPC funding failed:', err.message);
}

// Step 4: Update Material Prices (Micro-economy)
console.log('📊 Rebalancing material prices to micro-amounts...');

try {
  // Get current material prices
  const currentPrices = db.prepare('SELECT * FROM npc_prices').all();
  console.log(`Found ${currentPrices.length} material prices to update`);
  
  const updatePrice = db.prepare('UPDATE npc_prices SET base_price = ? WHERE material = ?');
  const priceTransaction = db.transaction(() => {
    for (const priceRow of currentPrices) {
      const newPrice = Math.max(0.01, priceRow.base_price * PRICE_SCALE_FACTOR);
      updatePrice.run(newPrice, priceRow.material);
      console.log(`  • ${priceRow.material}: ${priceRow.base_price} → ${newPrice.toFixed(2)} USDC`);
    }
  });
  
  priceTransaction();
  console.log('✅ Material prices rebalanced\n');
} catch (err) {
  console.error('❌ Price rebalancing failed:', err.message);
}

// Step 5: Update Shop Item Prices
console.log('🛒 Rebalancing shop item prices...');

try {
  // Update items table if it exists
  const itemsExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='items'").get();
  
  if (itemsExist) {
    const shopItems = db.prepare('SELECT * FROM items WHERE value IS NOT NULL').all();
    console.log(`Found ${shopItems.length} shop items to rebalance`);
    
    const updateItem = db.prepare('UPDATE items SET value = ? WHERE id = ?');
    const itemTransaction = db.transaction(() => {
      for (const item of shopItems) {
        const newValue = Math.max(0.01, item.value * PRICE_SCALE_FACTOR);
        updateItem.run(newValue, item.id);
        console.log(`  • ${item.name}: ${item.value} → ${newValue.toFixed(2)} USDC`);
      }
    });
    
    itemTransaction();
  } else {
    console.log('  ℹ️ Items table not found, skipping shop prices');
  }
  
  console.log('✅ Shop prices rebalanced\n');
} catch (err) {
  console.error('❌ Shop price rebalancing failed:', err.message);
}

// Step 6: Economic Summary Report
console.log('📊 ECONOMIC RESET SUMMARY:\n');

try {
  const totalAIAgents = aiAgents.length;
  const totalNPCs = NPC_TRADERS.length;
  const totalCirculation = BANK_USDC_BALANCE + (totalNPCs * NPC_STARTING_USDC);
  
  console.log(`💰 **FUNDING BREAKDOWN:**`);
  console.log(`  • Bank Reserve: ${BANK_USDC_BALANCE} USDC (${BANK_SOL_BALANCE} SOL)`);
  console.log(`  • NPC Funding: ${totalNPCs * NPC_STARTING_USDC} USDC (${totalNPCs} traders × ${NPC_STARTING_USDC})`);
  console.log(`  • Total Circulation: ${totalCirculation} USDC`);
  console.log(`  • AI Agents Reset: ${totalAIAgents} agents at 0 USDC`);
  
  console.log(`\n📈 **DAILY ECONOMICS:**`);
  const dailyYield = (BANK_SOL_BALANCE * 0.07) / 365; // 7% APY
  const dailyUSDC = dailyYield * SOL_PRICE_USD;
  console.log(`  • Simulated Daily Yield: ${dailyUSDC.toFixed(4)} USDC`);
  console.log(`  • Materials Purchasable: ${Math.floor(dailyUSDC / 0.01)} per day`);
  console.log(`  • Sustainable Agent Count: ${Math.floor(dailyUSDC / 0.02)} active traders`);
  
  console.log(`\n🎯 **SUSTAINABILITY TARGET:**`);
  console.log(`  • Economy should self-sustain on ${BANK_SOL_BALANCE} SOL`);
  console.log(`  • Material prices: 0.01-0.10 USDC`);
  console.log(`  • Agent earnings: 0.05-0.20 USDC/day`);
  
} catch (err) {
  console.error('❌ Summary generation failed:', err.message);
}

console.log('\n🎉 DeFi Economy Reset Complete!');
console.log('🔄 Next steps: Restart AI agents and monitor micro-economy performance');

db.close();