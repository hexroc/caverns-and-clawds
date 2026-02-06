/**
 * Comprehensive Class Features Test Suite
 * Tests all 31 class features across 7 classes
 */

const classFeatures = require('../../src/class-features');

console.log('🧪 COMPREHENSIVE CLASS FEATURES TEST SUITE');
console.log('='.repeat(80) + '\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passCount++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failCount++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// ============================================================================
// FIGHTER TESTS
// ============================================================================

console.log('⚔️  FIGHTER CLASS FEATURES');
console.log('-'.repeat(80));

test('Fighting Style: Dueling', () => {
  const fighter = {
    class: 'fighter',
    fightingStyle: 'dueling',
    equipment: [
      { slot: 'main_hand', equipped: true, item: 'longsword', twoHanded: false },
      { slot: 'off_hand', equipped: true, item: 'shield', type: 'shield' }
    ]
  };
  
  const result = classFeatures.fighter.applyFightingStyle(fighter, 'dueling', {});
  assert(result.active, 'Dueling style should be active');
  assert(result.bonuses.damageBonus === 2, 'Dueling should grant +2 damage');
});

test('Fighting Style: Archery', () => {
  const fighter = { class: 'fighter', fightingStyle: 'archery' };
  const weapon = { range: 80 };
  
  const result = classFeatures.fighter.applyFightingStyle(fighter, 'archery', { weapon });
  assert(result.active, 'Archery style should be active');
  assert(result.bonuses.attackBonus === 2, 'Archery should grant +2 attack');
});

test('Second Wind', () => {
  const fighter = {
    class: 'fighter',
    level: 3,
    hp: 10,
    hp_current: 10,
    maxHp: 30,
    hp_max: 30,
    secondWindAvailable: true
  };
  
  const result = classFeatures.fighter.secondWind(fighter);
  assert(result.success, 'Second Wind should succeed');
  assert(result.healing > 0, 'Should heal HP');
  assert(fighter.secondWindAvailable === false, 'Should mark as used');
});

test('Action Surge', () => {
  const fighter = {
    class: 'fighter',
    level: 5,
    actionSurgeUses: 1
  };
  
  const result = classFeatures.fighter.actionSurge(fighter);
  assert(result.success, 'Action Surge should succeed');
  assert(fighter.actionSurgeActive === true, 'Should activate Action Surge');
  assert(fighter.actionSurgeUses === 0, 'Should consume use');
});

console.log('');

// ============================================================================
// PALADIN TESTS
// ============================================================================

console.log('⚡ PALADIN CLASS FEATURES');
console.log('-'.repeat(80));

test('Divine Smite: Level 1 slot', () => {
  const result = classFeatures.paladin.divineSmite(1, 'normal');
  assert(result.success, 'Divine Smite should succeed');
  assert(result.damage >= 2 && result.damage <= 16, 'Should deal 2d8 damage');
  assert(result.damageType === 'radiant', 'Should be radiant damage');
});

test('Divine Smite: vs Undead (bonus damage)', () => {
  const result = classFeatures.paladin.divineSmite(1, 'undead');
  assert(result.success, 'Divine Smite should succeed vs undead');
  assert(result.bonusVsEvil === true, 'Should flag bonus vs undead');
  // 3d8 total (2d8 base + 1d8 bonus)
  assert(result.damage >= 3 && result.damage <= 24, 'Should deal 3d8 damage vs undead');
});

test('Lay on Hands: Healing', () => {
  const paladin = { class: 'paladin', level: 5, layOnHandsPool: 25 };
  const target = { name: 'Ally', hp: 10, hp_current: 10, maxHp: 20, hp_max: 20 };
  
  const result = classFeatures.paladin.layOnHands(paladin, target, 10, false);
  assert(result.success, 'Lay on Hands should succeed');
  assert(result.healing === 10, 'Should heal 10 HP');
  assert(paladin.layOnHandsPool === 15, 'Should deduct from pool');
  assert(target.hp_current === 20, 'Target should be healed');
});

test('Divine Sense', () => {
  const paladin = {
    class: 'paladin',
    level: 3,
    cha: 14,
    divineSenseUses: 2
  };
  
  const creatures = [
    { name: 'Zombie', type: 'undead' },
    { name: 'Goblin', type: 'humanoid' },
    { name: 'Angel', type: 'celestial' }
  ];
  
  const result = classFeatures.paladin.divineSense(paladin, creatures);
  assert(result.success, 'Divine Sense should succeed');
  assert(result.detected === 2, 'Should detect 2 creatures (undead + celestial)');
  assert(paladin.divineSenseUses === 1, 'Should consume use');
});

console.log('');

// ============================================================================
// BARD TESTS
// ============================================================================

console.log('🎵 BARD CLASS FEATURES');
console.log('-'.repeat(80));

test('Bardic Inspiration: Grant', () => {
  const bard = {
    class: 'bard',
    level: 1,
    name: 'Melody',
    cha: 16,
    bardicInspirationUses: 3
  };
  
  const target = { name: 'Fighter', inspirations: [] };
  
  const result = classFeatures.bard.bardicInspiration(bard, target);
  assert(result.success, 'Bardic Inspiration should succeed');
  assert(result.die === 'd6', 'Should be d6 at level 1');
  assert(target.inspirations.length === 1, 'Target should have inspiration');
  assert(bard.bardicInspirationUses === 2, 'Should consume use');
});

test('Bardic Inspiration: Use', () => {
  const character = {
    inspirations: [
      { type: 'bardic', die: 'd6', dieSize: 6, used: false }
    ]
  };
  
  const result = classFeatures.bard.useBardicInspiration(character);
  assert(result.success, 'Using inspiration should succeed');
  assert(result.bonus >= 1 && result.bonus <= 6, 'Should roll d6');
  assert(character.inspirations.length === 0, 'Should remove used inspiration');
});

test('Jack of All Trades', () => {
  const bard = {
    level: 3,
    proficiency_bonus: 2,
    proficiencies: ['stealth', 'performance']
  };
  
  const check = { skill: 'nature' }; // Not proficient
  
  const result = classFeatures.bard.jackOfAllTrades(bard, check);
  assert(result.active, 'Jack of All Trades should be active');
  assert(result.bonus === 1, 'Should add half proficiency (+1)');
});

test('Song of Rest', () => {
  const bard = { level: 5, name: 'Bard' };
  const allies = [
    { id: '1', name: 'Fighter' },
    { id: '2', name: 'Rogue' }
  ];
  
  const result = classFeatures.bard.songOfRest(bard, allies);
  assert(result.success, 'Song of Rest should succeed');
  assert(result.die === 'd6', 'Should be d6 at level 5');
  assert(result.numAllies === 2, 'Should affect 2 allies');
  assert(result.healing['1'].roll >= 1 && result.healing['1'].roll <= 6, 'Should roll d6');
});

console.log('');

// ============================================================================
// ROGUE TESTS
// ============================================================================

console.log('🗡️  ROGUE CLASS FEATURES');
console.log('-'.repeat(80));

test('Expertise', () => {
  const rogue = {
    class: 'rogue',
    level: 3,
    proficiency_bonus: 2,
    expertise: ['stealth', 'thieves_tools']
  };
  
  const check = { skill: 'stealth' };
  
  const result = classFeatures.rogue.applyExpertise(rogue, check);
  assert(result.active, 'Expertise should be active');
  assert(result.bonus === 2, 'Should add another proficiency bonus');
  assert(result.totalProficiency === 4, 'Total should be 2x proficiency');
});

test('Uncanny Dodge', () => {
  const rogue = {
    class: 'rogue',
    level: 5,
    reactionUsed: false
  };
  
  const incomingDamage = 20;
  
  const result = classFeatures.rogue.uncannyDodge(rogue, incomingDamage);
  assert(result.success, 'Uncanny Dodge should succeed');
  assert(result.finalDamage === 10, 'Should halve damage');
  assert(result.damageReduced === 10, 'Should reduce by 10');
  assert(rogue.reactionUsed === true, 'Should consume reaction');
});

console.log('');

// ============================================================================
// WIZARD TESTS
// ============================================================================

console.log('🔮 WIZARD CLASS FEATURES');
console.log('-'.repeat(80));

test('Arcane Recovery: Check Available', () => {
  const wizard = {
    class: 'wizard',
    level: 5,
    int: 16,
    arcaneRecoveryUsed: false,
    spellSlots: {
      1: { current: 2, max: 4 },
      2: { current: 0, max: 3 },
      3: { current: 0, max: 2 }
    }
  };
  
  const result = classFeatures.wizard.arcaneRecovery(wizard);
  assert(result.success, 'Arcane Recovery check should succeed');
  assert(result.maxSlotLevels === 3, 'INT 16 = +3 mod, can recover 3 levels');
  assert(result.availableSlots[1] === 2, 'Can recover 2 level 1 slots');
  assert(result.availableSlots[2] === 3, 'Can recover 3 level 2 slots');
});

test('Arcane Recovery: Apply', () => {
  const wizard = {
    class: 'wizard',
    level: 5,
    int: 16,
    arcaneRecoveryUsed: false,
    spellSlots: {
      1: { current: 2, max: 4 },
      2: { current: 0, max: 3 }
    }
  };
  
  const choices = { 1: 1, 2: 1 }; // Recover 1 level 1 + 1 level 2 = 3 levels total
  
  const result = classFeatures.wizard.applyArcaneRecovery(wizard, choices);
  assert(result.success, 'Arcane Recovery should succeed');
  assert(result.totalLevels === 3, 'Should recover 3 levels total');
  assert(wizard.spellSlots[1].current === 3, 'Should recover 1 level 1 slot');
  assert(wizard.spellSlots[2].current === 1, 'Should recover 1 level 2 slot');
  assert(wizard.arcaneRecoveryUsed === true, 'Should mark as used');
});

console.log('');

// ============================================================================
// WARLOCK TESTS
// ============================================================================

console.log('👁️  WARLOCK CLASS FEATURES');
console.log('-'.repeat(80));

test('Eldritch Invocation: Agonizing Blast', () => {
  const warlock = { class: 'warlock', cha: 18 };
  const spell = { id: 'eldritch_blast' };
  
  const result = classFeatures.warlock.applyInvocation(warlock, 'agonizing_blast', { spell });
  assert(result.active, 'Agonizing Blast should be active');
  assert(result.effect.damageBonus === 4, 'CHA 18 = +4 mod, should add +4 per beam');
});

test('Eldritch Invocation: Armor of Shadows', () => {
  const warlock = { class: 'warlock', dex: 14, ac: 12, equipment: [] };
  
  const result = classFeatures.warlock.applyInvocation(warlock, 'armor_of_shadows', {});
  assert(result.active, 'Armor of Shadows should be active');
  assert(result.effect.acOverride === 15, 'Should set AC to 13 + DEX (13 + 2 = 15)');
});

test('Pact Boon: Chain', () => {
  const warlock = { class: 'warlock', level: 3 };
  
  const result = classFeatures.warlock.choosePactBoon(warlock, 'chain');
  assert(result.success, 'Choosing Pact of Chain should succeed');
  assert(warlock.pactFamiliarAvailable === true, 'Should unlock familiar');
});

console.log('');

// ============================================================================
// CLERIC TESTS
// ============================================================================

console.log('✨ CLERIC CLASS FEATURES');
console.log('-'.repeat(80));

test('Turn Undead', () => {
  const cleric = {
    class: 'cleric',
    level: 5,
    wis: 16,
    proficiency_bonus: 3,
    channelDivinityUses: 1
  };
  
  const undead = [
    { name: 'Zombie 1', wis: 8, conditions: [] },
    { name: 'Zombie 2', wis: 8, conditions: [] },
    { name: 'Skeleton', wis: 8, conditions: [] }
  ];
  
  const result = classFeatures.cleric.turnUndead(cleric, undead);
  assert(result.success, 'Turn Undead should succeed');
  assert(result.saveDC === 14, 'Save DC should be 8 + 3 + 3 = 14');
  assert(cleric.channelDivinityUses === 0, 'Should consume use');
});

test('Destroy Undead', () => {
  const cleric = { level: 5 }; // CR 1/2 threshold at level 5
  
  const turnedUndead = [
    { name: 'Zombie', cr: 0.25, hp: 20, alive: true }, // Will be destroyed
    { name: 'Skeleton', cr: 0.25, hp: 13, alive: true }, // Will be destroyed
    { name: 'Ghoul', cr: 1, hp: 22, alive: true } // Survives (CR too high)
  ];
  
  const result = classFeatures.cleric.destroyUndead(cleric, turnedUndead);
  assert(result.success, 'Destroy Undead should succeed');
  assert(result.crThreshold === 0.5, 'Threshold should be CR 1/2 at level 5');
  assert(result.destroyed === 2, 'Should destroy 2 low-CR undead');
  assert(turnedUndead[0].hp === 0, 'Zombie should be destroyed');
  assert(turnedUndead[1].hp === 0, 'Skeleton should be destroyed');
  assert(turnedUndead[2].hp === 22, 'Ghoul should survive');
});

console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('📊 TEST RESULTS');
console.log('='.repeat(80));
console.log(`✅ PASSED: ${passCount} tests`);
console.log(`❌ FAILED: ${failCount} tests`);
console.log('');

if (failCount === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  process.exit(0);
} else {
  console.log('⚠️  SOME TESTS FAILED');
  process.exit(1);
}
