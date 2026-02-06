#!/usr/bin/env node
/**
 * Fund NPC Wallets from Treasury
 * 
 * This script distributes USDC from the treasury to NPC wallets
 * so they can pay out quest rewards, buy materials, etc.
 * 
 * Run this after treasury receives DeFi yield or when NPCs run low on funds.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/caverns.db');
const db = new Database(dbPath);

// Get treasury balance
const treasury = db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?').get('treasury');
const treasuryBalance = treasury ? treasury.balance_cache : 0;

console.log('💰 Treasury Balance:', treasuryBalance.toFixed(4), 'USDC\n');

if (treasuryBalance < 0.01) {
  console.log('❌ Treasury has insufficient funds to distribute.');
  console.log('   Fund the treasury first via DeFi yield or manual deposit.\n');
  process.exit(1);
}

// Distribution plan: allocate funds to NPCs based on their role
const distributions = [
  { id: 'npc_quest_giver', name: 'Quest Board', amount: treasuryBalance * 0.40 }, // 40% for quests
  { id: 'bank', name: 'Bank', amount: treasuryBalance * 0.20 }, // 20% for loans/banking
  { id: 'npc_old_shellworth', name: 'Old Shellworth', amount: treasuryBalance * 0.10 }, // 10% for material buying
  { id: 'npc_coral_smith', name: 'Coral Smith', amount: treasuryBalance * 0.10 }, // 10% for material buying
  { id: 'npc_barnacle_bob', name: 'Barnacle Bob', amount: treasuryBalance * 0.10 }, // 10% for jobs
  { id: 'npc_mystic_mantis', name: 'Mystic Mantis', amount: treasuryBalance * 0.05 }, // 5% for services
  { id: 'npc_loan_shark', name: 'Loan Shark', amount: treasuryBalance * 0.05 } // 5% for enforcement
];

console.log('📋 Distribution Plan:\n');
let totalDistributed = 0;

for (const dist of distributions) {
  const rounded = parseFloat(dist.amount.toFixed(4));
  console.log(`   ${dist.name.padEnd(20)} +${rounded.toFixed(4)} USDC`);
  totalDistributed += rounded;
}

console.log(`\n   ${'Remaining'.padEnd(20)} ${(treasuryBalance - totalDistributed).toFixed(4)} USDC`);
console.log('─'.repeat(50));

// Confirm
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('\nProceed with distribution? (yes/no): ', (answer) => {
  readline.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Cancelled.\n');
    process.exit(0);
  }
  
  console.log('\n💸 Distributing funds...\n');
  
  // Execute distributions
  db.transaction(() => {
    for (const dist of distributions) {
      const rounded = parseFloat(dist.amount.toFixed(4));
      
      // Add to NPC wallet
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
        .run(rounded, dist.id);
      
      // Deduct from treasury
      db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
        .run(rounded, 'treasury');
      
      console.log(`   ✅ ${dist.name}: +${rounded.toFixed(4)} USDC`);
    }
  })();
  
  // Show final balances
  console.log('\n📊 Final Balances:\n');
  
  const finalTreasury = db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?').get('treasury');
  console.log(`   Treasury: ${finalTreasury.balance_cache.toFixed(4)} USDC`);
  
  for (const dist of distributions) {
    const npc = db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?').get(dist.id);
    if (npc) {
      console.log(`   ${dist.name.padEnd(20)} ${npc.balance_cache.toFixed(4)} USDC`);
    }
  }
  
  console.log('\n✅ Distribution complete!\n');
  db.close();
});
