const Database = require('better-sqlite3');
const db = new Database('./db/caverns.db');

// Verify henchmen query works
const testChar = 'char_faithful';
const henchmen = db.prepare(`
  SELECT ch.*, hp.name as template_name, hp.class as hench_class
  FROM character_henchmen ch
  LEFT JOIN (SELECT id, name, class FROM (
    SELECT 'sally_shrimp' as id, 'Sally the Shrimp' as name, 'fighter' as class
    UNION SELECT 'barnaby_barnacle', 'Barnaby', 'defender'
    UNION SELECT 'finley_fish', 'Finley', 'support'
    UNION SELECT 'rocky_urchin', 'Rocky', 'fighter'
  )) hp ON ch.henchman_id = hp.id
  WHERE ch.character_id = ? AND ch.status = 'alive'
`).all(testChar);

console.log('✅ Henchmen query works!');
console.log('Faithful brings:');
henchmen.forEach(h => console.log(`  🦐 ${h.custom_name} (${h.hench_class}) Lvl ${h.level} HP:${h.hp_current}`));

// Check all characters
const allHench = db.prepare('SELECT character_id, COUNT(*) as cnt FROM character_henchmen WHERE status="alive" GROUP BY character_id').all();
console.log('\nParty composition:');
allHench.forEach(c => console.log(`  ${c.character_id}: ${c.cnt} henchmen`));

db.close();
console.log('\n🎯 Ready to test runs with henchmen!');
