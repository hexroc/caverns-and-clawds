/**
 * Test Suite for Cantrip System
 * Verify all 20 cantrips work correctly
 */

const { castCantrip, listCantrips } = require('./src/spells/cantrips');
const { calculateSpellSaveDC, calculateSpellAttackBonus } = require('./src/spells/spell-utils');

// Mock characters at different levels
const createTestCharacter = (level, className = 'wizard', intelligence = 16, wisdom = 14, charisma = 12) => ({
  name: `Level ${level} ${className}`,
  level,
  class: className,
  stats: {
    level,
    class: className,
    intelligence,
    wisdom,
    charisma,
    strength: 10,
    dexterity: 14,
    constitution: 14
  }
});

// Mock enemy
const createTestEnemy = (name = 'Goblin', ac = 13, hp = 10) => ({
  name,
  ac,
  hp,
  currentHp: hp,
  abilities: {
    STR: 8,
    DEX: 14,
    CON: 10,
    INT: 10,
    WIS: 8,
    CHA: 8
  }
});

console.log('='.repeat(80));
console.log('CANTRIP SYSTEM TEST SUITE');
console.log('='.repeat(80));

// Test 1: List all cantrips
console.log('\n1. LIST ALL CANTRIPS');
console.log('-'.repeat(80));
const allCantrips = listCantrips();
console.log(`Total cantrips: ${allCantrips.length}`);
allCantrips.forEach(c => {
  console.log(`  - ${c.name} (${c.id}): ${c.school}, ${c.attackType || c.saveType || 'utility'}`);
});

// Test 2: Spell Save DC and Attack Bonus calculation
console.log('\n2. SPELL SAVE DC & ATTACK BONUS');
console.log('-'.repeat(80));
const testLevels = [1, 5, 11, 17];
testLevels.forEach(level => {
  const wizard = createTestCharacter(level, 'wizard', 16);
  const cleric = createTestCharacter(level, 'cleric', 14, 16);
  const warlock = createTestCharacter(level, 'warlock', 12, 14, 18);
  
  console.log(`Level ${level}:`);
  console.log(`  Wizard (INT 16): DC ${calculateSpellSaveDC(wizard)}, Attack +${calculateSpellAttackBonus(wizard)}`);
  console.log(`  Cleric (WIS 16): DC ${calculateSpellSaveDC(cleric)}, Attack +${calculateSpellAttackBonus(cleric)}`);
  console.log(`  Warlock (CHA 18): DC ${calculateSpellSaveDC(warlock)}, Attack +${calculateSpellAttackBonus(warlock)}`);
});

// Test 3: Damage Scaling
console.log('\n3. DAMAGE SCALING (Fire Bolt)');
console.log('-'.repeat(80));
testLevels.forEach(level => {
  const caster = createTestCharacter(level, 'wizard');
  const target = createTestEnemy();
  
  // Run multiple times to see different rolls
  let totalDamage = 0;
  const numTests = 10;
  
  for (let i = 0; i < numTests; i++) {
    const result = castCantrip('fire_bolt', caster, target);
    if (result.hits) {
      totalDamage += result.damage;
    }
  }
  
  const avgDamage = (totalDamage / numTests).toFixed(1);
  console.log(`  Level ${level}: Average damage ${avgDamage} per cast (${numTests} trials)`);
});

// Test 4: Individual Cantrip Tests
console.log('\n4. INDIVIDUAL CANTRIP TESTS');
console.log('-'.repeat(80));

const testCantrips = [
  { id: 'fire_bolt', name: 'Fire Bolt' },
  { id: 'sacred_flame', name: 'Sacred Flame' },
  { id: 'eldritch_blast', name: 'Eldritch Blast' },
  { id: 'vicious_mockery', name: 'Vicious Mockery' },
  { id: 'ray_of_frost', name: 'Ray of Frost' },
  { id: 'shocking_grasp', name: 'Shocking Grasp' },
  { id: 'acid_splash', name: 'Acid Splash' },
  { id: 'poison_spray', name: 'Poison Spray' },
  { id: 'chill_touch', name: 'Chill Touch' },
  { id: 'produce_flame', name: 'Produce Flame' }
];

testCantrips.forEach(cantrip => {
  const caster = createTestCharacter(5, 'wizard');
  const target = createTestEnemy();
  
  const result = castCantrip(cantrip.id, caster, target);
  
  console.log(`\n  ${cantrip.name}:`);
  console.log(`    Success: ${result.success}`);
  console.log(`    Hits: ${result.hits}`);
  if (result.damage) console.log(`    Damage: ${result.damage}`);
  if (result.effect) console.log(`    Effect: ${result.effect}`);
  if (result.save) console.log(`    Save: ${result.save.success ? 'SUCCESS' : 'FAILED'} (rolled ${result.save.roll.result})`);
  console.log(`    Narrative: ${result.narrative.substring(0, 100)}...`);
});

// Test 5: Eldritch Blast Multiple Beams
console.log('\n5. ELDRITCH BLAST SCALING (Multiple Beams)');
console.log('-'.repeat(80));
testLevels.forEach(level => {
  const warlock = createTestCharacter(level, 'warlock', 12, 14, 16);
  const target = createTestEnemy();
  
  const result = castCantrip('eldritch_blast', warlock, target);
  
  console.log(`  Level ${level}: ${result.numBeams} beam(s), ${result.damage} total damage`);
});

// Test 6: Utility Cantrips
console.log('\n6. UTILITY CANTRIP TESTS');
console.log('-'.repeat(80));

const utilityCantrips = [
  'mage_hand',
  'light',
  'prestidigitation',
  'mending',
  'guidance',
  'resistance',
  'thaumaturgy',
  'druidcraft',
  'minor_illusion',
  'blade_ward'
];

utilityCantrips.forEach(cantripId => {
  const caster = createTestCharacter(5, 'cleric');
  const target = createTestEnemy();
  
  const result = castCantrip(cantripId, caster, caster); // Most utility spells target self
  
  console.log(`  ${cantripId}:`);
  console.log(`    Success: ${result.success}`);
  console.log(`    Effect: ${result.effect || 'N/A'}`);
  console.log(`    Utility: ${result.utility ? 'YES' : 'NO'}`);
});

// Test 7: Acid Splash (Multiple Targets)
console.log('\n7. ACID SPLASH (Multiple Targets)');
console.log('-'.repeat(80));
const caster = createTestCharacter(5, 'wizard');
const target1 = createTestEnemy('Goblin 1');
const target2 = createTestEnemy('Goblin 2');

const result = castCantrip('acid_splash', caster, [target1, target2]);
console.log(`  Targets: ${result.targets.length}`);
result.targets.forEach((t, i) => {
  console.log(`    Target ${i + 1} (${t.target}): ${t.saved ? 'Saved' : 'Failed save'}, ${t.damage} damage`);
});
console.log(`  Total damage: ${result.damage}`);
console.log(`  Narrative: ${result.narrative}`);

// Test 8: Vicious Mockery (Status Effect)
console.log('\n8. VICIOUS MOCKERY (Status Effect)');
console.log('-'.repeat(80));
const bard = createTestCharacter(5, 'bard', 12, 14, 16);
const orc = createTestEnemy('Orc', 13, 20);

const mockeryResult = castCantrip('vicious_mockery', bard, orc);
console.log(`  Damage: ${mockeryResult.damage}`);
console.log(`  Effect: ${mockeryResult.effect || 'None'}`);
console.log(`  Target conditions: ${JSON.stringify(orc.conditions || [])}`);
console.log(`  Narrative: ${mockeryResult.narrative}`);

// Test 9: Ray of Frost (Speed Reduction)
console.log('\n9. RAY OF FROST (Speed Reduction)');
console.log('-'.repeat(80));
const frostCaster = createTestCharacter(5, 'wizard');
const ogre = createTestEnemy('Ogre', 11, 50);

const frostResult = castCantrip('ray_of_frost', frostCaster, ogre);
console.log(`  Hit: ${frostResult.hits}`);
console.log(`  Damage: ${frostResult.damage}`);
console.log(`  Effect: ${frostResult.effect}`);
console.log(`  Target active effects: ${JSON.stringify(ogre.activeEffects || {})}`);

// Test 10: Chill Touch (Healing Prevention)
console.log('\n10. CHILL TOUCH (Healing Prevention)');
console.log('-'.repeat(80));
const necromancer = createTestCharacter(5, 'wizard');
const skeleton = createTestEnemy('Skeleton', 13, 15);
skeleton.special = ['undead'];
skeleton.type = 'undead';

const chillResult = castCantrip('chill_touch', necromancer, skeleton);
console.log(`  Hit: ${chillResult.hits}`);
console.log(`  Damage: ${chillResult.damage}`);
console.log(`  Effect: ${chillResult.effect}`);
console.log(`  Undead Effect: ${chillResult.undeadEffect ? 'YES' : 'NO'}`);
console.log(`  Target conditions: ${JSON.stringify(skeleton.conditions || [])}`);

console.log('\n' + '='.repeat(80));
console.log('TEST SUITE COMPLETE');
console.log('='.repeat(80));
