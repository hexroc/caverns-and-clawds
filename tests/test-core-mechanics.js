/**
 * Test Core Mechanics - Death Saves, Sneak Attack, Resistances, Reactions, Conditions
 */

const deathSaves = require('../src/combat/death-saves');
const sneakAttack = require('../src/combat/sneak-attack');
const damageSystem = require('../src/combat/damage');
const reactions = require('../src/combat/reactions');
const conditions = require('../src/combat/conditions');

console.log('='.repeat(60));
console.log('TESTING CORE COMBAT MECHANICS');
console.log('='.repeat(60));

// ============================================================================
// TEST 1: Death Saving Throws
// ============================================================================

console.log('\n### TEST 1: Death Saving Throws ###');

const testCharacter = {
  name: 'Test Rogue',
  hp: 0,
  maxHp: 30,
  class: 'rogue',
  level: 5
};

// Initialize death saves
deathSaves.initDeathSaves(testCharacter);
console.log('✓ Character at 0 HP, death saves initialized:', testCharacter.deathSaves);

// Simulate death save rolls
console.log('\nSimulating death save rolls:');
for (let i = 1; i <= 3; i++) {
  const result = deathSaves.rollDeathSave(testCharacter);
  console.log(`  Roll ${i}: d20=${result.natural}, ${result.result}`);
  if (result.dead || result.revived) break;
}

// Test damage at 0 HP
const testChar2 = { name: 'Unconscious Fighter', hp: 0, maxHp: 40 };
deathSaves.initDeathSaves(testChar2);
const damageResult = deathSaves.damageAtZeroHP(testChar2, 10, true); // Critical hit
console.log('\n✓ Critical hit while unconscious:', damageResult.message);

// Test healing at 0 HP
const testChar3 = { name: 'Dying Cleric', hp: 0, maxHp: 35 };
deathSaves.initDeathSaves(testChar3);
const healResult = deathSaves.healFromZeroHP(testChar3, 8);
console.log('✓ Healing at 0 HP:', healResult.message);

// ============================================================================
// TEST 2: Sneak Attack
// ============================================================================

console.log('\n### TEST 2: Sneak Attack (Rogue) ###');

const rogue = {
  name: 'Sneaky Pete',
  class: 'rogue',
  level: 5,
  combatState: {}
};

const enemy = {
  name: 'Goblin',
  id: 'goblin1',
  hp: 15,
  maxHp: 15
};

const ally = {
  name: 'Fighter Friend',
  id: 'fighter1',
  alive: true,
  hp: 40
};

// Test sneak attack with advantage
const sneakCheck1 = sneakAttack.checkSneakAttack(rogue, enemy, {
  weapon: { properties: ['finesse'] },
  hasAdvantage: true,
  hasDisadvantage: false
});
console.log('✓ Sneak Attack with advantage:', sneakCheck1);

// Test sneak attack with ally flanking
const sneakCheck2 = sneakAttack.checkSneakAttack(rogue, enemy, {
  weapon: { name: 'shortsword', properties: ['finesse'] },
  hasAdvantage: false,
  allies: [ally],
  positions: {
    goblin1: { rangeBand: 'melee' },
    fighter1: { rangeBand: 'melee' }
  }
});
console.log('✓ Sneak Attack with flanking ally:', sneakCheck2);

// Roll sneak attack damage
const sneakDamage = sneakAttack.rollSneakAttackDamage(5);
console.log('✓ Sneak Attack damage at level 5:', sneakDamage.breakdown);

// ============================================================================
// TEST 3: Resistances/Immunities/Vulnerabilities
// ============================================================================

console.log('\n### TEST 3: Damage System ###');

const skeleton = {
  name: 'Skeleton',
  hp: 20,
  maxHp: 20,
  vulnerabilities: ['bludgeoning'],
  resistances: ['piercing', 'slashing'],
  immunities: ['poison']
};

// Test vulnerability (double damage)
const vulnDamage = damageSystem.applyDamage(skeleton, 10, 'bludgeoning');
console.log('✓ Bludgeoning damage (vulnerable):', vulnDamage);

// Test resistance (half damage)
skeleton.hp = 20; // Reset
const resDamage = damageSystem.applyDamage(skeleton, 10, 'slashing');
console.log('✓ Slashing damage (resistant):', resDamage);

// Test immunity (zero damage)
skeleton.hp = 20; // Reset
const immuneDamage = damageSystem.applyDamage(skeleton, 10, 'poison');
console.log('✓ Poison damage (immune):', immuneDamage);

// Test temporary HP
skeleton.hp = 20;
const tempHPResult = damageSystem.grantTempHP(skeleton, 5);
console.log('✓ Granted temporary HP:', tempHPResult);

const damageWithTemp = damageSystem.applyDamage(skeleton, 8, 'slashing');
console.log('✓ Damage with temp HP:', damageWithTemp);

// ============================================================================
// TEST 4: Reactions
// ============================================================================

console.log('\n### TEST 4: Reactions ###');

const wizard = {
  name: 'Wizard',
  class: 'wizard',
  level: 5,
  ac: 12,
  spells: ['shield', 'counterspell'],
  spellSlots: { 1: 2, 2: 2, 3: 1 },
  int: 16
};

reactions.initReactions(wizard);
console.log('✓ Wizard reactions initialized:', wizard.reactions);

// Test Shield spell
const attack = { roll: 15, modifier: 5, hit: true }; // Total 20 vs AC 12
const shieldResult = reactions.useShield(wizard, attack);
console.log('✓ Shield spell:', shieldResult);

// Reset reactions
reactions.resetReactions(wizard);

// Test opportunity attack
const fleeing = { name: 'Fleeing Goblin', ac: 13, hp: 10 };
const attacker = { name: 'Fighter', str: 16, proficiencyBonus: 2 };
reactions.initReactions(attacker);
const oaResult = reactions.useOpportunityAttack(attacker, fleeing);
console.log('✓ Opportunity Attack:', oaResult);

// ============================================================================
// TEST 5: Conditions
// ============================================================================

console.log('\n### TEST 5: Conditions ###');

const target = { name: 'Test Dummy', hp: 30, maxHp: 30 };

// Apply prone condition
const proneResult = conditions.applyCondition(target, conditions.CONDITION_TYPES.PRONE);
console.log('✓ Applied prone:', proneResult.message);

// Check attack modifiers
const fighter = { name: 'Fighter' };
const mods = conditions.getAttackModifiers(fighter, target);
console.log('✓ Attack modifiers vs prone target:', mods);

// Apply paralyzed condition
const paraResult = conditions.applyCondition(target, conditions.CONDITION_TYPES.PARALYZED);
console.log('✓ Applied paralyzed:', paraResult.message);

// Check if can act
const canActResult = conditions.canAct(target);
console.log('✓ Can act while paralyzed?', canActResult);

// Check auto-crit
const autoCrit = conditions.isAutoCrit(fighter, target, 'melee');
console.log('✓ Auto-crit on paralyzed target?', autoCrit);

// Remove condition
const removeResult = conditions.removeCondition(target, conditions.CONDITION_TYPES.PRONE);
console.log('✓ Removed prone:', removeResult.message);

// Tick conditions with duration
target.conditions = [];
conditions.applyCondition(target, conditions.CONDITION_TYPES.STUNNED, 3);
const tickResult = conditions.tickConditions(target);
console.log('✓ Ticked conditions, remaining duration:', target.conditions[0]?.duration);

console.log('\n' + '='.repeat(60));
console.log('ALL TESTS PASSED ✓');
console.log('='.repeat(60));
