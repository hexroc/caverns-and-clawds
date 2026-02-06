/**
 * Narration System Test Suite
 * Tests the descriptive combat narration with variety verification
 */

const narration = require('../src/narration');

console.log('='.repeat(80));
console.log('NARRATION SYSTEM TEST SUITE');
console.log('='.repeat(80));
console.log('');

// Test data
const player = {
  name: 'Snapper the Brave',
  isPlayer: true,
  currentHp: 45,
  maxHp: 60,
  stats: {
    strength: 16,
    dexterity: 14,
    constitution: 15
  },
  position: { rangeBand: 'melee' }
};

const goblin = {
  name: 'Goblin Warrior',
  isPlayer: false,
  currentHp: 7,
  maxHp: 7,
  hp: 7,
  abilities: { STR: 8, DEX: 14, CON: 10, INT: 10, WIS: 8, CHA: 8 },
  position: { rangeBand: 'melee' }
};

const skeleton = {
  name: 'Skeleton Archer',
  isPlayer: false,
  currentHp: 13,
  maxHp: 13,
  hp: 13,
  abilities: { STR: 10, DEX: 14, CON: 15, INT: 6, WIS: 8, CHA: 5 },
  special: ['undead'],
  position: { rangeBand: 'near' }
};

// ============================================================================
// TEST 1: Melee Attacks - Variety Check
// ============================================================================

console.log('TEST 1: Melee Attack Variety (20 attacks)');
console.log('-'.repeat(80));

const meleeAttacks = [];
const meleeNarrations = new Set();

for (let i = 0; i < 20; i++) {
  const result = {
    hits: Math.random() > 0.3,
    isCrit: Math.random() > 0.95,
    isCritFail: Math.random() > 0.95,
    damage: Math.floor(Math.random() * 15) + 1,
    damageType: ['slashing', 'piercing', 'bludgeoning'][Math.floor(Math.random() * 3)],
    totalAttack: Math.floor(Math.random() * 20) + 1,
    defenderAC: 15,
    rangeBand: 'melee'
  };
  
  const narrative = narration.generateAttackNarration(player, goblin, result);
  meleeAttacks.push(narrative);
  meleeNarrations.add(narrative);
  
  console.log(`${i + 1}. ${narrative}`);
  console.log('');
}

const meleeUniqueness = (meleeNarrations.size / meleeAttacks.length * 100).toFixed(1);
console.log(`✓ Uniqueness: ${meleeNarrations.size}/${meleeAttacks.length} unique (${meleeUniqueness}%)`);

if (meleeUniqueness < 75) {
  console.log('⚠️  WARNING: Low uniqueness detected! Need more template variation.');
} else {
  console.log('✓ PASS: Good variety in melee narration');
}

console.log('');
console.log('');

// ============================================================================
// TEST 2: Ranged Attacks
// ============================================================================

console.log('TEST 2: Ranged Attack Variety (10 attacks)');
console.log('-'.repeat(80));

const rangedNarrations = new Set();

for (let i = 0; i < 10; i++) {
  const result = {
    hits: Math.random() > 0.4,
    isCrit: Math.random() > 0.9,
    damage: Math.floor(Math.random() * 12) + 1,
    damageType: 'piercing',
    totalAttack: Math.floor(Math.random() * 20) + 1,
    defenderAC: 15,
    rangeBand: 'near'
  };
  
  const narrative = narration.generateAttackNarration(skeleton, player, result, 30);
  rangedNarrations.add(narrative);
  
  console.log(`${i + 1}. ${narrative}`);
  console.log('');
}

console.log(`✓ Uniqueness: ${rangedNarrations.size}/10 unique (${rangedNarrations.size * 10}%)`);
console.log('');
console.log('');

// ============================================================================
// TEST 3: Critical Hits
// ============================================================================

console.log('TEST 3: Critical Hits (5 variations)');
console.log('-'.repeat(80));

const critNarrations = new Set();

for (let i = 0; i < 5; i++) {
  const result = {
    hits: true,
    isCrit: true,
    damage: Math.floor(Math.random() * 30) + 15,
    damageType: 'slashing',
    totalAttack: 25,
    defenderAC: 15,
    rangeBand: 'melee'
  };
  
  const narrative = narration.generateAttackNarration(player, goblin, result);
  critNarrations.add(narrative);
  
  console.log(`${i + 1}. ${narrative}`);
  console.log('');
}

console.log(`✓ Critical hit templates used: ${critNarrations.size}/5`);
console.log('');
console.log('');

// ============================================================================
// TEST 4: Death Narration
// ============================================================================

console.log('TEST 4: Death Narration (10 variations)');
console.log('-'.repeat(80));

const deathNarrations = new Set();
const testCreatures = [
  { name: 'Goblin', isPlayer: false },
  { name: 'Skeleton', isPlayer: false, special: ['undead'] },
  { name: 'Orc Berserker', isPlayer: false },
  { name: 'Giant Spider', isPlayer: false },
  { name: 'Zombie', isPlayer: false, special: ['undead'] },
];

for (let i = 0; i < 10; i++) {
  const creature = testCreatures[i % testCreatures.length];
  const killer = { name: 'Hero', currentHp: 50, maxHp: 50, hp: 50 };
  
  const narrative = narration.generateDeathNarration(creature, killer);
  deathNarrations.add(narrative);
  
  console.log(`${i + 1}. ${narrative}`);
}

console.log('');
console.log(`✓ Death narration templates used: ${deathNarrations.size}/10`);
console.log('');
console.log('');

// ============================================================================
// TEST 5: Movement Narration
// ============================================================================

console.log('TEST 5: Movement Narration');
console.log('-'.repeat(80));

const movements = [
  { from: 'melee', to: 'near', cost: 20, terrain: false },
  { from: 'near', to: 'melee', cost: 20, terrain: false },
  { from: 'far', to: 'near', cost: 30, terrain: true },
  { from: 'melee', to: 'far', cost: 30, terrain: false }
];

movements.forEach((move, i) => {
  const narrative = narration.generateMovementNarration(
    player,
    move.from,
    move.to,
    move.cost,
    move.terrain,
    []
  );
  
  console.log(`${i + 1}. ${narrative}`);
  console.log('');
});

console.log('');
console.log('');

// ============================================================================
// TEST 6: Environmental Flourishes
// ============================================================================

console.log('TEST 6: Environmental Flourishes (20 samples)');
console.log('-'.repeat(80));

const envFlourishes = new Set();

for (let i = 0; i < 20; i++) {
  const flourish = narration.getEnvironmentalFlourish();
  envFlourishes.add(flourish);
  console.log(`${i + 1}. ${flourish}`);
}

console.log('');
console.log(`✓ Environmental variety: ${envFlourishes.size}/20 unique (${envFlourishes.size * 5}%)`);
console.log('');
console.log('');

// ============================================================================
// TEST 7: Distance Formatting
// ============================================================================

console.log('TEST 7: Distance Formatting');
console.log('-'.repeat(80));

const distances = ['melee', 'near', 'far', 'distant'];
distances.forEach(band => {
  const formatted = narration.formatDistanceFromBand(band);
  console.log(`${band}: ${formatted}`);
});

console.log('');
console.log('');

// ============================================================================
// TEST 8: Atmospheric Scene Setting
// ============================================================================

console.log('TEST 8: Atmospheric Scene Setting (3 examples)');
console.log('-'.repeat(80));

for (let i = 0; i < 3; i++) {
  const atmosphere = narration.generateAtmosphere();
  console.log(`${i + 1}. ${atmosphere}`);
  console.log('');
}

console.log('');
console.log('');

// ============================================================================
// TEST 9: Verify Distance Always Present
// ============================================================================

console.log('TEST 9: Verify Distance Annotations Present');
console.log('-'.repeat(80));

let distanceCount = 0;
const testAttacks = 10;

for (let i = 0; i < testAttacks; i++) {
  const result = {
    hits: Math.random() > 0.5,
    damage: 8,
    damageType: 'slashing',
    totalAttack: 15,
    defenderAC: 14,
    rangeBand: ['melee', 'near', 'far'][Math.floor(Math.random() * 3)]
  };
  
  const narrative = narration.generateAttackNarration(player, goblin, result);
  
  // Check if narrative contains distance in parentheses
  if (narrative.match(/\([^)]*feet[^)]*\)/) || narrative.match(/\(melee range\)/)) {
    distanceCount++;
  }
}

console.log(`✓ Distance annotations found: ${distanceCount}/${testAttacks}`);

if (distanceCount === testAttacks) {
  console.log('✓ PASS: All attacks have distance annotations');
} else {
  console.log(`⚠️  WARNING: ${testAttacks - distanceCount} attacks missing distance annotations`);
}

console.log('');
console.log('');

// ============================================================================
// TEST 10: Verify Attack Rolls Displayed
// ============================================================================

console.log('TEST 10: Verify Attack Roll Display');
console.log('-'.repeat(80));

let rollDisplayCount = 0;

for (let i = 0; i < 10; i++) {
  const result = {
    hits: true,
    damage: 10,
    damageType: 'bludgeoning',
    totalAttack: 17,
    defenderAC: 15,
    rangeBand: 'melee'
  };
  
  const narrative = narration.generateAttackNarration(player, goblin, result);
  
  // Check if narrative contains attack roll display
  if (narrative.match(/Attack:\s*\d+\s*vs\s*AC\s*\d+/)) {
    rollDisplayCount++;
  }
}

console.log(`✓ Attack roll displays found: ${rollDisplayCount}/10`);

if (rollDisplayCount === 10) {
  console.log('✓ PASS: All attacks show roll vs AC');
} else {
  console.log(`⚠️  WARNING: ${10 - rollDisplayCount} attacks missing roll display`);
}

console.log('');
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log('✓ Melee attack variety: ' + meleeUniqueness + '%');
console.log('✓ Ranged attack variety: ' + (rangedNarrations.size * 10) + '%');
console.log('✓ Critical hit templates: ' + critNarrations.size);
console.log('✓ Death narration templates: ' + deathNarrations.size);
console.log('✓ Environmental variety: ' + (envFlourishes.size * 5) + '%');
console.log('✓ Distance annotations: ' + (distanceCount / testAttacks * 100) + '%');
console.log('✓ Attack roll displays: ' + (rollDisplayCount / 10 * 100) + '%');
console.log('');

const overallPass = meleeUniqueness >= 75 && distanceCount === testAttacks && rollDisplayCount === 10;

if (overallPass) {
  console.log('🎉 ALL TESTS PASSED! Narration system working as expected.');
} else {
  console.log('⚠️  Some tests need attention. Review warnings above.');
}

console.log('='.repeat(80));
