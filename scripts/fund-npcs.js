#!/usr/bin/env node
/**
 * Fund NPC Wallets
 * 
 * Give each NPC 100 USDC starting balance to enable closed-loop economy.
 * Run this once after deploying balance check fixes.
 */

const db = require('../src/db');

const NPC_STARTING_BALANCE = 100.0;

console.log('💰 Funding NPC Wallets...\n');

// Get all NPCs
const npcs = db.prepare('SELECT id, name, balance_cache FROM system_wallets WHERE type = ?').all('npc');

console.log(`Found ${npcs.length} NPCs:\n`);

for (const npc of npcs) {
  const currentBalance = npc.balance_cache || 0;
  const fundAmount = NPC_STARTING_BALANCE - currentBalance;
  
  if (fundAmount > 0) {
    db.prepare('UPDATE system_wallets SET balance_cache = ? WHERE id = ?')
      .run(NPC_STARTING_BALANCE, npc.id);
    console.log(`  ✅ ${npc.name}: ${currentBalance} → ${NPC_STARTING_BALANCE} USDC (+${fundAmount.toFixed(4)})`);
  } else {
    console.log(`  ⏭️  ${npc.name}: ${currentBalance} USDC (already funded)`);
  }
}

console.log('\n✅ NPC funding complete!');
console.log('\nNPCs can now buy materials, pay for jobs, and fund quests from their wallets.');
console.log('Treasury should periodically refill NPCs when they run low.\n');
