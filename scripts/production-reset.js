#!/usr/bin/env node
/**
 * Production Reset Script
 * Wipes players, agents, and economy data for fresh DeFi start
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../db/caverns.db');
const db = new Database(dbPath);

console.log('🧹 PRODUCTION RESET - DeFi Economy Fresh Start');
console.log('Database:', dbPath);
console.log('');

// Disable foreign key checks temporarily
db.pragma('foreign_keys = OFF');

// Wipe all related tables
const tables = [
  'economy_transactions',
  'player_materials', 
  'npc_materials',
  'bank_accounts',
  'active_encounters',
  'active_quests',
  'quest_progress',
  'quest_completions',
  'character_inventory',
  'player_presence',
  'chat_messages',
  'mortgages',
  'rental_agreements',
  'property_deeds',
  'shop_inventory',
  'shop_employees',
  'shop_buy_orders',
  'shop_sales',
  'player_shops',
  'trade_offers',
  'auction_bids',
  'auctions',
  'clawds',
  'users',
];

for (const table of tables) {
  try {
    const before = db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get().c;
    db.prepare(`DELETE FROM ${table}`).run();
    console.log(`✅ ${table}: ${before} deleted`);
  } catch (err) {
    if (!err.message.includes('no such table')) {
      console.log(`⚠️  ${table}: ${err.message.slice(0, 50)}`);
    }
  }
}

// Re-enable foreign keys
db.pragma('foreign_keys = ON');

// Re-initialize economy wallets
console.log('\n💰 Re-initializing economy...');
try {
  db.prepare('DELETE FROM economy_wallets').run();
  
  db.prepare(`INSERT INTO economy_wallets (wallet_id, type, usdc_balance) VALUES ('system_bank', 'bank', 100.0)`).run();
  
  const npcs = ['madame_pearl', 'ironshell_gus', 'coral_trader', 'weapon_smith', 'old_shellworth'];
  for (const npc of npcs) {
    db.prepare(`INSERT INTO economy_wallets (wallet_id, type, usdc_balance) VALUES (?, 'npc', 1.0)`).run(npc);
  }
  console.log('✅ Bank: 100 USDC, NPCs: 1 USDC each');
} catch (err) {
  console.log('⚠️  Economy:', err.message);
}

console.log('\n🎉 Reset complete!');
