/**
 * Class Features Test Suite
 * Tests all 31 class features across 7 classes
 */

const Database = require('better-sqlite3');
const classFeatures = require('../src/class-features');

// Test database
const db = new Database(':memory:');

// Initialize tables
db.exec(`
  CREATE TABLE clawds (
    id INTEGER PRIMARY KEY,
    agent_id TEXT,
    name TEXT,
    race TEXT,
    class TEXT,
    level INTEGER,
    hp_current INTEGER,
    hp_max INTEGER,
    spell_slots_1 INTEGER DEFAULT 0,
    spell_slots_2 INTEGER DEFAULT 0,
    spell_slots_3 INTEGER DEFAULT 0,
    spell_slots_4 INTEGER DEFAULT 0,
    spell_slots_5 INTEGER DEFAULT 0,
    status TEXT DEFAULT 'alive'
  );

  CREATE TABLE class_features (
    character_id INTEGER,
    feature_name TEXT,
    uses_remaining INTEGER,
    max_uses INTEGER,
    recharge_type TEXT,
    metadata TEXT,
    PRIMARY KEY (character_id, feature_name)
  );

  CREATE TABLE active_conditions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    condition_name TEXT,
    source TEXT,
    duration INTEGER,
    metadata TEXT
  );

  CREATE TABLE henchmen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER,
    name TEXT,
    rarity TEXT,
    level INTEGER DEFAULT 1,
    hp_current INTEGER,
    hp_max INTEGER,
    is_active INTEGER DEFAULT 0
  );
`);

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed++;
    results.errors.push({ name, error: err.message });
    console.log(`❌ ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Helper: Create test character
function createChar(classType, level = 5) {
  const result = db.prepare(`
    INSERT INTO clawds (agent_id, name, race, class, level, hp_current, hp_max, spell_slots_1, spell_slots_2)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `test_${classType}`,
    `Test${classType}`,
    'Reef Lobster',
    classType,
    level,
    50,
    50,
    level >= 1 ? 4 : 0,
    level >= 3 ? 3 : 0
  );
  return result.lastInsertRowid;
}

// Helper: Get feature uses
function getUses(charId, featureName) {
  const row = db.prepare('SELECT uses_remaining FROM class_features WHERE character_id = ? AND feature_name = ?')
    .get(charId, featureName);
  return row ? row.uses_remaining : null;
}

// Helper: Create mock encounter
function mockEncounter(charId) {
  return {
    id: 1,
    characterId: charId,
    monsters: [
      { id: 1, name: 'Test Monster', hp: 30, maxHp: 30, ac: 12 }
    ],
    round: 1,
    currentTurn: { type: 'player', id: charId }
  };
}

console.log('\n🧪 CLASS FEATURES TEST SUITE\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ============================================================================
// FIGHTER TESTS
// ============================================================================

console.log('⚔️  FIGHTER TESTS\n');

test('Fighter: Second Wind heals and uses resource', () => {
  const charId = createChar('Fighter', 5);
  
  // Damage character
  db.prepare('UPDATE clawds SET hp_current = 20 WHERE id = ?').run(charId);
  
  const result = classFeatures.fighter.useSecondWind(db, charId);
  assert(result.success, 'Second Wind should succeed');
  assert(result.healing >= 6 && result.healing <= 15, 'Healing should be 1d10+5');
  
  const char = db.prepare('SELECT hp_current FROM clawds WHERE id = ?').get(charId);
  assert(char.hp_current > 20, 'HP should increase');
  
  const uses = getUses(charId, 'Second Wind');
  assert(uses === 0, 'Uses should be 0 after use');
  
  // Try again - should fail
  const result2 = classFeatures.fighter.useSecondWind(db, charId);
  assert(!result2.success, 'Second use should fail');
});

test('Fighter: Action Surge grants extra action', () => {
  const charId = createChar('Fighter', 5);
  
  const result = classFeatures.fighter.useActionSurge(db, charId);
  assert(result.success, 'Action Surge should succeed');
  
  const uses = getUses(charId, 'Action Surge');
  assert(uses === 0, 'Uses should be 0 after use');
});

test('Fighter: Fighting Style applies to attacks', () => {
  const charId = createChar('Fighter', 5);
  
  // Set Dueling style
  classFeatures.fighter.initializeFightingStyle(db, charId, 'Dueling');
  
  const bonus = classFeatures.fighter.getFightingStyleBonus(db, charId, 'damage', {
    isOneHanded: true,
    isTwoHanded: false
  });
  
  assert(bonus === 2, 'Dueling should give +2 damage');
});

test('Fighter: Defense style applies to AC', () => {
  const charId = createChar('Fighter', 5);
  
  classFeatures.fighter.initializeFightingStyle(db, charId, 'Defense');
  
  const bonus = classFeatures.fighter.getFightingStyleBonus(db, charId, 'ac', {
    wearingArmor: true
  });
  
  assert(bonus === 1, 'Defense should give +1 AC');
});

// ============================================================================
// PALADIN TESTS
// ============================================================================

console.log('\n🛡️  PALADIN TESTS\n');

test('Paladin: Divine Smite adds radiant damage', () => {
  const charId = createChar('Paladin', 5);
  const encounter = mockEncounter(charId);
  
  const result = classFeatures.paladin.useDivineSmite(db, charId, encounter, 1, 1);
  assert(result.success, 'Divine Smite should succeed');
  assert(result.damage >= 2 && result.damage <= 16, 'Damage should be 2d8 (level 1 spell)');
  
  const char = db.prepare('SELECT spell_slots_1 FROM clawds WHERE id = ?').get(charId);
  assert(char.spell_slots_1 === 3, 'Should use 1st level spell slot');
});

test('Paladin: Divine Smite fails without spell slots', () => {
  const charId = createChar('Paladin', 5);
  const encounter = mockEncounter(charId);
  
  // Use all slots
  db.prepare('UPDATE clawds SET spell_slots_1 = 0, spell_slots_2 = 0 WHERE id = ?').run(charId);
  
  const result = classFeatures.paladin.useDivineSmite(db, charId, encounter, 1, 1);
  assert(!result.success, 'Divine Smite should fail without slots');
});

test('Paladin: Lay on Hands heals target', () => {
  const charId = createChar('Paladin', 5);
  const targetId = createChar('Fighter', 3);
  
  // Damage target
  db.prepare('UPDATE clawds SET hp_current = 15 WHERE id = ?').run(targetId);
  
  const result = classFeatures.paladin.useLayOnHands(db, charId, targetId, 10);
  assert(result.success, 'Lay on Hands should succeed');
  assert(result.healed === 10, 'Should heal 10 HP');
  
  const pool = getUses(charId, 'Lay on Hands');
  assert(pool === 15, 'Pool should be 25 - 10 = 15');
  
  const target = db.prepare('SELECT hp_current FROM clawds WHERE id = ?').get(targetId);
  assert(target.hp_current === 25, 'Target should be healed');
});

test('Paladin: Lay on Hands respects pool limit', () => {
  const charId = createChar('Paladin', 5);
  const targetId = createChar('Fighter', 3);
  
  const result = classFeatures.paladin.useLayOnHands(db, charId, targetId, 30);
  assert(!result.success, 'Should fail - not enough in pool');
});

test('Paladin: Divine Sense detects undead/fiends', () => {
  const charId = createChar('Paladin', 5);
  
  const result = classFeatures.paladin.useDivineSense(db, charId);
  assert(result.success, 'Divine Sense should succeed');
  
  const uses = getUses(charId, 'Divine Sense');
  assert(uses === 4, 'Should have 4 uses remaining (1 + CHA mod 4)');
});

// ============================================================================
// BARD TESTS
// ============================================================================

console.log('\n🎵 BARD TESTS\n');

test('Bard: Bardic Inspiration gives die to ally', () => {
  const charId = createChar('Bard', 5);
  const allyId = createChar('Fighter', 3);
  
  const result = classFeatures.bard.giveBardicInspiration(db, charId, allyId);
  assert(result.success, 'Bardic Inspiration should succeed');
  assert(result.die === 'd8', 'Level 5 bard should give d8');
  
  const uses = getUses(charId, 'Bardic Inspiration');
  assert(uses === 3, 'Should have 3 uses left (CHA mod 4 - 1)');
  
  // Check ally has condition
  const condition = db.prepare('SELECT * FROM active_conditions WHERE character_id = ? AND condition_name = ?')
    .get(allyId, 'Bardic Inspiration');
  assert(condition !== undefined, 'Ally should have Bardic Inspiration condition');
});

test('Bard: Jack of All Trades applies to ability checks', () => {
  const charId = createChar('Bard', 5);
  
  classFeatures.bard.initializeJackOfAllTrades(db, charId);
  
  const bonus = classFeatures.bard.getJackOfAllTradesBonus(db, charId);
  assert(bonus === 2, 'Level 5 bard should get +2 (half proficiency)');
});

test('Bard: Song of Rest adds healing', () => {
  const charId = createChar('Bard', 5);
  
  const result = classFeatures.bard.applySongOfRest(db, charId, 10);
  assert(result.success, 'Song of Rest should succeed');
  assert(result.bonusHealing >= 1 && result.bonusHealing <= 6, 'Should add 1d6 healing');
  assert(result.totalHealing >= 11 && result.totalHealing <= 16, 'Total should be base + die');
});

// ============================================================================
// ROGUE TESTS
// ============================================================================

console.log('\n🗡️  ROGUE TESTS\n');

test('Rogue: Expertise doubles proficiency', () => {
  const charId = createChar('Rogue', 5);
  
  classFeatures.rogue.initializeExpertise(db, charId, ['Stealth', 'Sleight of Hand']);
  
  const hasExpertise = classFeatures.rogue.hasExpertise(db, charId, 'Stealth');
  assert(hasExpertise, 'Should have expertise in Stealth');
  
  const bonus = classFeatures.rogue.getExpertiseBonus(db, charId, 'Stealth', 3);
  assert(bonus === 6, 'Expertise should double +3 to +6');
});

test('Rogue: Uncanny Dodge halves damage', () => {
  const charId = createChar('Rogue', 5);
  
  const result = classFeatures.rogue.useUncannyDodge(db, charId, 20);
  assert(result.success, 'Uncanny Dodge should succeed');
  assert(result.damageReduced === 10, 'Should halve 20 damage to 10');
  
  const uses = getUses(charId, 'Uncanny Dodge');
  assert(uses === 0, 'Should have 0 uses left');
});

// ============================================================================
// WIZARD TESTS
// ============================================================================

console.log('\n🧙 WIZARD TESTS\n');

test('Wizard: Arcane Recovery restores spell slots', () => {
  const charId = createChar('Wizard', 5);
  
  // Use some slots
  db.prepare('UPDATE clawds SET spell_slots_1 = 1, spell_slots_2 = 0 WHERE id = ?').run(charId);
  
  const result = classFeatures.wizard.useArcaneRecovery(db, charId, 2); // Recover 2 levels
  assert(result.success, 'Arcane Recovery should succeed');
  assert(result.slotsRecovered.includes('2nd'), 'Should recover 2nd level slot');
  
  const char = db.prepare('SELECT spell_slots_2 FROM clawds WHERE id = ?').get(charId);
  assert(char.spell_slots_2 === 1, '2nd level slot should be recovered');
  
  const uses = getUses(charId, 'Arcane Recovery');
  assert(uses === 0, 'Should be used');
});

test('Wizard: Arcane Recovery respects level limit', () => {
  const charId = createChar('Wizard', 5);
  
  const result = classFeatures.wizard.useArcaneRecovery(db, charId, 4); // Try to recover 4 levels (max is 2 at level 5)
  assert(!result.success, 'Should fail - exceeds level limit');
});

// ============================================================================
// WARLOCK TESTS
// ============================================================================

console.log('\n👁️  WARLOCK TESTS\n');

test('Warlock: Eldritch Invocations are initialized', () => {
  const charId = createChar('Warlock', 5);
  
  classFeatures.warlock.initializeInvocations(db, charId, ['Agonizing Blast', 'Repelling Blast']);
  
  const hasInvocation = classFeatures.warlock.hasInvocation(db, charId, 'Agonizing Blast');
  assert(hasInvocation, 'Should have Agonizing Blast');
  
  const bonus = classFeatures.warlock.getInvocationBonus(db, charId, 'Agonizing Blast', 'damage');
  assert(bonus === 4, 'Agonizing Blast should add CHA mod (4) to damage');
});

test('Warlock: Pact Boon is set and retrieved', () => {
  const charId = createChar('Warlock', 5);
  
  classFeatures.warlock.initializePactBoon(db, charId, 'Pact of the Blade');
  
  const pact = classFeatures.warlock.getPactBoon(db, charId);
  assert(pact === 'Pact of the Blade', 'Should have correct pact boon');
});

// ============================================================================
// CLERIC TESTS
// ============================================================================

console.log('\n✨ CLERIC TESTS\n');

test('Cleric: Turn Undead affects undead', () => {
  const charId = createChar('Cleric', 5);
  
  const result = classFeatures.cleric.useTurnUndead(db, charId);
  assert(result.success, 'Turn Undead should succeed');
  assert(result.saveDC === 13, 'DC should be 8 + prof(3) + WIS(2)');
  
  const uses = getUses(charId, 'Channel Divinity');
  assert(uses === 0, 'Should use Channel Divinity');
});

test('Cleric: Destroy Undead has CR threshold', () => {
  const charId = createChar('Cleric', 5);
  
  const result = classFeatures.cleric.useDestroyUndead(db, charId, 0.5);
  assert(result.success, 'Destroy Undead should succeed on CR 1/2');
  assert(result.destroyed, 'CR 1/2 should be destroyed at level 5');
  
  const result2 = classFeatures.cleric.useDestroyUndead(db, charId, 2);
  assert(result2.success, 'Check should succeed');
  assert(!result2.destroyed, 'CR 2 should NOT be destroyed at level 5');
});

// ============================================================================
// REST SYSTEM TESTS
// ============================================================================

console.log('\n💤 REST SYSTEM TESTS\n');

test('Short Rest restores short rest features', () => {
  const charId = createChar('Fighter', 5);
  
  // Use Second Wind
  classFeatures.fighter.useSecondWind(db, charId);
  assert(getUses(charId, 'Second Wind') === 0, 'Should be used');
  
  // Short rest
  classFeatures.restoreShortRestFeatures(db, charId);
  
  assert(getUses(charId, 'Second Wind') === 1, 'Should be restored');
});

test('Long Rest restores all features and spell slots', () => {
  const charId = createChar('Paladin', 5);
  
  // Use features
  classFeatures.paladin.useLayOnHands(db, charId, charId, 10);
  classFeatures.paladin.useDivineSense(db, charId);
  db.prepare('UPDATE clawds SET spell_slots_1 = 0, spell_slots_2 = 0 WHERE id = ?').run(charId);
  
  // Long rest
  classFeatures.restoreLongRestFeatures(db, charId);
  
  assert(getUses(charId, 'Lay on Hands') === 25, 'Lay on Hands should be full');
  assert(getUses(charId, 'Divine Sense') === 5, 'Divine Sense should be restored');
  
  const char = db.prepare('SELECT spell_slots_1, spell_slots_2 FROM clawds WHERE id = ?').get(charId);
  assert(char.spell_slots_1 === 4, '1st level slots should be restored');
  assert(char.spell_slots_2 === 3, '2nd level slots should be restored');
});

test('Warlock spell slots restore on short rest', () => {
  const charId = createChar('Warlock', 5);
  
  db.prepare('UPDATE clawds SET spell_slots_1 = 0 WHERE id = ?').run(charId);
  
  classFeatures.restoreShortRestFeatures(db, charId);
  
  const char = db.prepare('SELECT spell_slots_1 FROM clawds WHERE id = ?').get(charId);
  assert(char.spell_slots_1 > 0, 'Warlock slots should restore on short rest');
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

console.log('\n🔍 EDGE CASE TESTS\n');

test('Feature fails when character is wrong class', () => {
  const charId = createChar('Rogue', 5);
  
  const result = classFeatures.fighter.useSecondWind(db, charId);
  assert(!result.success, 'Rogue should not be able to use Fighter feature');
});

test('Feature fails when out of uses', () => {
  const charId = createChar('Fighter', 5);
  
  // Use Action Surge
  classFeatures.fighter.useActionSurge(db, charId);
  
  // Try again
  const result = classFeatures.fighter.useActionSurge(db, charId);
  assert(!result.success, 'Should fail when out of uses');
});

test('Healing does not exceed max HP', () => {
  const charId = createChar('Paladin', 5);
  
  // Character at full HP
  db.prepare('UPDATE clawds SET hp_current = 50, hp_max = 50 WHERE id = ?').run(charId);
  
  classFeatures.paladin.useLayOnHands(db, charId, charId, 25);
  
  const char = db.prepare('SELECT hp_current FROM clawds WHERE id = ?').get(charId);
  assert(char.hp_current === 50, 'HP should not exceed max');
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`📊 RESULTS: ${results.passed} passed, ${results.failed} failed\n`);

if (results.failed > 0) {
  console.log('❌ FAILURES:\n');
  results.errors.forEach(({ name, error }) => {
    console.log(`   ${name}: ${error}`);
  });
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED!\n');
  process.exit(0);
}
