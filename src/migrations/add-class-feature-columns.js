/**
 * Migration: Add class feature tracking columns to clawds table
 */

const db = require('../db');

function addClassFeatureColumns() {
  console.log('🔧 Adding class feature tracking columns...');
  
  const columns = [
    // Fighter
    { name: 'second_wind_available', type: 'INTEGER DEFAULT 1' },
    { name: 'action_surge_uses', type: 'INTEGER DEFAULT 0' },
    { name: 'action_surge_max', type: 'INTEGER DEFAULT 0' },
    { name: 'action_surge_active', type: 'INTEGER DEFAULT 0' },
    { name: 'fighting_style', type: 'TEXT' },
    
    // Paladin
    { name: 'lay_on_hands_pool', type: 'INTEGER DEFAULT 0' },
    { name: 'divine_sense_uses', type: 'INTEGER DEFAULT 0' },
    { name: 'divine_sense_max', type: 'INTEGER DEFAULT 0' },
    
    // Bard
    { name: 'bardic_inspiration_uses', type: 'INTEGER DEFAULT 0' },
    { name: 'bardic_inspiration_max', type: 'INTEGER DEFAULT 0' },
    
    // Cleric
    { name: 'channel_divinity_uses', type: 'INTEGER DEFAULT 0' },
    { name: 'channel_divinity_max', type: 'INTEGER DEFAULT 0' },
    
    // Wizard
    { name: 'arcane_recovery_used', type: 'INTEGER DEFAULT 0' },
    
    // Warlock
    { name: 'pact_boon', type: 'TEXT' },
    { name: 'invocations', type: 'TEXT DEFAULT "[]"' }, // JSON array
    
    // Rogue
    { name: 'expertise', type: 'TEXT DEFAULT "[]"' }, // JSON array
    
    // Universal
    { name: 'reaction_used', type: 'INTEGER DEFAULT 0' }
  ];
  
  // Check which columns already exist
  const existingColumns = db.prepare("PRAGMA table_info(clawds)").all();
  const existingNames = existingColumns.map(c => c.name);
  
  let added = 0;
  
  for (const col of columns) {
    if (!existingNames.includes(col.name)) {
      try {
        const sql = `ALTER TABLE clawds ADD COLUMN ${col.name} ${col.type}`;
        db.prepare(sql).run();
        console.log(`  ✅ Added column: ${col.name}`);
        added++;
      } catch (err) {
        console.error(`  ❌ Failed to add ${col.name}:`, err.message);
      }
    } else {
      console.log(`  ⏭️  Column ${col.name} already exists`);
    }
  }
  
  console.log(`\n✅ Migration complete: ${added} columns added\n`);
  
  return { added, total: columns.length };
}

// Run migration if called directly
if (require.main === module) {
  addClassFeatureColumns();
}

module.exports = { addClassFeatureColumns };
