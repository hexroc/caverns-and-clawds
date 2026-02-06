/**
 * Backfill Spells Migration
 * 
 * Add default spells to all existing spellcasting characters
 */

const Database = require('better-sqlite3');
const path = require('path');
const { addDefaultSpells } = require('../src/spell-init');

const dbPath = path.join(__dirname, '../db/caverns.db');
const db = new Database(dbPath);

console.log('🔮 Backfilling spells for existing characters...\n');

// Get all characters
const characters = db.prepare(`
  SELECT id, name, class, str, dex, con, int, wis, cha
  FROM clawds
`).all();

console.log(`Found ${characters.length} characters\n`);

let spellcasters = 0;
let nonCasters = 0;
let alreadyHaveSpells = 0;

for (const char of characters) {
  // Check if character already has spells
  const existingSpells = db.prepare(
    'SELECT COUNT(*) as count FROM character_spells WHERE character_id = ?'
  ).get(char.id);
  
  if (existingSpells.count > 0) {
    console.log(`✓ ${char.name} (${char.class}) already has ${existingSpells.count} spells`);
    alreadyHaveSpells++;
    continue;
  }
  
  // Check if this is a spellcasting class
  const spellcastingClasses = ['cleric', 'wizard', 'warlock', 'bard', 'paladin'];
  if (!spellcastingClasses.includes(char.class)) {
    console.log(`- ${char.name} (${char.class}) is not a spellcaster`);
    nonCasters++;
    continue;
  }
  
  // Add default spells
  const stats = {
    str: char.str,
    dex: char.dex,
    con: char.con,
    int: char.int,
    wis: char.wis,
    cha: char.cha
  };
  
  try {
    addDefaultSpells(db, char.id, char.class, stats);
    
    // Count spells added
    const newSpells = db.prepare(
      'SELECT COUNT(*) as count FROM character_spells WHERE character_id = ?'
    ).get(char.id);
    
    console.log(`✨ ${char.name} (${char.class}) → Added ${newSpells.count} spells`);
    spellcasters++;
  } catch (err) {
    console.error(`❌ Failed to add spells for ${char.name}:`, err.message);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Spellcasters updated: ${spellcasters}`);
console.log(`   Non-casters skipped: ${nonCasters}`);
console.log(`   Already had spells: ${alreadyHaveSpells}`);
console.log(`\n✅ Done!`);

db.close();
