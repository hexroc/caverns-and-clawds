#!/usr/bin/env node
/**
 * Add USDC column to characters and migrate from pearls
 * Converts existing pearl economy to USDC micro-economy
 */

const db = require('../src/db');

console.log('💎 Adding USDC column and migrating from pearls...\n');

try {
  // Check if usdc_balance column already exists
  const columns = db.prepare("PRAGMA table_info(clawds)").all();
  const hasUSDC = columns.some(col => col.name === 'usdc_balance');
  
  if (hasUSDC) {
    console.log('✅ USDC column already exists');
  } else {
    console.log('📊 Adding usdc_balance column...');
    
    // Add USDC balance column
    db.prepare('ALTER TABLE clawds ADD COLUMN usdc_balance REAL DEFAULT 100.0').run();
    
    console.log('✅ USDC column added');
  }
  
  // Migrate pearl balances to USDC (1 pearl = 1 USDC for now)
  console.log('🔄 Migrating pearl balances to USDC...');
  
  const characters = db.prepare('SELECT id, name, pearls, usdc_balance FROM clawds').all();
  
  console.log(`Found ${characters.length} characters to migrate:`);
  
  const migrateBalance = db.prepare('UPDATE clawds SET usdc_balance = ? WHERE id = ?');
  const migration = db.transaction(() => {
    for (const char of characters) {
      // Convert pearls to USDC (1:1 ratio initially)
      const usdcAmount = char.pearls || 0;
      migrateBalance.run(usdcAmount, char.id);
      console.log(`  • ${char.name}: ${char.pearls || 0} pearls → ${usdcAmount} USDC`);
    }
  });
  
  migration();
  
  console.log('✅ Pearl to USDC migration complete');
  
  // Now verify the migration worked
  console.log('\n🔍 Verifying migration...');
  
  const verifyCharacters = db.prepare('SELECT id, name, usdc_balance FROM clawds LIMIT 5').all();
  verifyCharacters.forEach(char => {
    console.log(`  ✅ ${char.name}: ${char.usdc_balance} USDC`);
  });
  
  console.log('\n🎉 USDC column migration successful!');
  console.log('💰 Characters now have USDC balances instead of pearls');
  
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}

db.close();