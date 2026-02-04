#!/usr/bin/env node
/**
 * Create Economy Tables for DeFi System
 * Sets up bank, NPC wallets, and material pricing
 */

const db = require('../src/db');

console.log('🏗️  Creating DeFi economy tables...\n');

try {
  // Create economy_wallets table
  console.log('🏦 Creating economy_wallets table...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS economy_wallets (
      wallet_id TEXT PRIMARY KEY,
      type TEXT CHECK(type IN ('bank', 'npc', 'player')) NOT NULL,
      usdc_balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  console.log('✅ Economy wallets table created');
  
  // Create npc_prices table
  console.log('📊 Creating npc_prices table...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS npc_prices (
      material TEXT PRIMARY KEY,
      base_price REAL NOT NULL,
      demand_multiplier REAL DEFAULT 1.0,
      supply_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  console.log('✅ NPC prices table created');
  
  // Create player_materials table if it doesn't exist
  console.log('📦 Creating player_materials table...');
  
  db.prepare(`
    CREATE TABLE IF NOT EXISTS player_materials (
      character_id TEXT NOT NULL,
      material TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      PRIMARY KEY (character_id, material),
      FOREIGN KEY (character_id) REFERENCES clawds(id)
    )
  `).run();
  
  console.log('✅ Player materials table created');
  
  // Seed bank wallet
  console.log('🏦 Creating bank wallet...');
  
  const bankExists = db.prepare("SELECT * FROM economy_wallets WHERE wallet_id = 'system_bank'").get();
  
  if (!bankExists) {
    db.prepare(`
      INSERT INTO economy_wallets (wallet_id, type, usdc_balance) 
      VALUES ('system_bank', 'bank', 800.0)
    `).run();
    console.log('✅ Bank wallet created with 800 USDC');
  } else {
    console.log('ℹ️  Bank wallet already exists');
  }
  
  // Seed NPC wallets
  console.log('💰 Creating NPC trader wallets...');
  
  const NPC_TRADERS = [
    'madame_pearl',
    'ironshell_gus', 
    'coral_trader',
    'weapon_smith',
    'old_shellworth'
  ];
  
  for (const npcId of NPC_TRADERS) {
    const npcExists = db.prepare('SELECT * FROM economy_wallets WHERE wallet_id = ?').get(npcId);
    
    if (!npcExists) {
      db.prepare(`
        INSERT INTO economy_wallets (wallet_id, type, usdc_balance) 
        VALUES (?, 'npc', 10.0)
      `).run(npcId);
      console.log(`  • ${npcId}: Created with 10.0 USDC`);
    } else {
      console.log(`  • ${npcId}: Already exists`);
    }
  }
  
  // Seed material prices (micro-economy)
  console.log('📊 Seeding material prices...');
  
  const MATERIALS = [
    // Common materials (0.01 USDC)
    { material: 'kelp_fronds', price: 0.01 },
    { material: 'sea_salt', price: 0.01 },
    { material: 'small_pearls', price: 0.01 },
    { material: 'seaweed', price: 0.01 },
    
    // Uncommon materials (0.02 USDC)  
    { material: 'coral_shards', price: 0.02 },
    { material: 'fish_scales', price: 0.02 },
    { material: 'barnacle_shells', price: 0.02 },
    { material: 'sea_glass', price: 0.02 },
    
    // Rare materials (0.05 USDC)
    { material: 'kraken_ink', price: 0.05 },
    { material: 'deep_crystals', price: 0.05 },
    { material: 'ancient_coral', price: 0.05 },
    
    // Epic materials (0.10 USDC)
    { material: 'leviathan_scales', price: 0.10 },
    { material: 'abyssal_stones', price: 0.10 },
    { material: 'void_essence', price: 0.10 }
  ];
  
  const insertPrice = db.prepare(`
    INSERT OR REPLACE INTO npc_prices (material, base_price) 
    VALUES (?, ?)
  `);
  
  const priceTransaction = db.transaction(() => {
    for (const { material, price } of MATERIALS) {
      insertPrice.run(material, price);
      console.log(`  • ${material}: ${price.toFixed(3)} USDC`);
    }
  });
  
  priceTransaction();
  
  console.log('✅ Material prices seeded');
  
  // Final verification
  console.log('\n🔍 Verifying economy setup...');
  
  const bankBalance = db.prepare("SELECT usdc_balance FROM economy_wallets WHERE wallet_id = 'system_bank'").get();
  const npcCount = db.prepare("SELECT COUNT(*) as count FROM economy_wallets WHERE type = 'npc'").get();
  const materialCount = db.prepare('SELECT COUNT(*) as count FROM npc_prices').get();
  
  console.log(`🏦 Bank balance: ${bankBalance?.usdc_balance || 0} USDC`);
  console.log(`👥 NPC wallets: ${npcCount?.count || 0} traders`);
  console.log(`📦 Material prices: ${materialCount?.count || 0} items`);
  
  console.log('\n🎉 DeFi economy tables created successfully!');
  console.log('💰 Ready for micro-economy operation');
  
} catch (err) {
  console.error('❌ Table creation failed:', err.message);
  process.exit(1);
}

db.close();