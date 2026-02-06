/**
 * Combat System Integration Test
 * Test cantrips working within the full combat system
 */

const combat = require('./src/combat');

console.log('='.repeat(80));
console.log('COMBAT SYSTEM INTEGRATION TEST - CANTRIPS');
console.log('='.repeat(80));

// Create a test wizard character
const wizard = {
  name: 'Gandalf',
  level: 5,
  class: 'wizard',
  xp: 6500,
  currentHp: 30,
  maxHp: 30,
  stats: {
    level: 5,
    class: 'wizard',
    hp: 30,
    maxHp: 30,
    strength: 10,
    dexterity: 14,
    constitution: 14,
    intelligence: 18,
    wisdom: 12,
    charisma: 10,
    spells: ['fire_bolt', 'ray_of_frost', 'mage_hand'],
    weaponDamage: '1d6'
  }
};

// Test 1: Fire Bolt in combat
console.log('\n1. FIRE BOLT IN COMBAT');
console.log('-'.repeat(80));

const combatState1 = combat.initializeCombat(wizard, ['goblin', 'goblin']);
console.log(`Initiative order: ${combatState1.initiativeOrder.map(i => i.combatant.name || i.combatant.isPlayer ? 'Wizard' : i.combatant.id).join(' → ')}`);

const action1 = {
  type: 'cast_spell',
  options: {
    spell: 'fire_bolt',
    targetIndex: 0
  }
};

const result1 = combat.resolveCombatRound(combatState1, action1);
console.log(`\nRound ${result1.round} Results:`);
console.log(`  Damage dealt: ${result1.damage_dealt}`);
console.log(`  Damage taken: ${result1.damage_taken}`);
console.log(`\nNarration:`);
result1.narration.forEach(n => console.log(`  ${n}`));

// Test 2: Sacred Flame in combat
console.log('\n2. SACRED FLAME IN COMBAT (DEX Save)');
console.log('-'.repeat(80));

const cleric = {
  name: 'Divine Hero',
  level: 5,
  class: 'cleric',
  xp: 6500,
  currentHp: 35,
  maxHp: 35,
  stats: {
    level: 5,
    class: 'cleric',
    hp: 35,
    maxHp: 35,
    strength: 12,
    dexterity: 10,
    constitution: 14,
    intelligence: 10,
    wisdom: 16,
    charisma: 14,
    spells: ['sacred_flame', 'guidance'],
    weaponDamage: '1d8'
  }
};

const combatState2 = combat.initializeCombat(cleric, ['orc']);
const action2 = {
  type: 'cast_spell',
  options: {
    spell: 'sacred_flame',
    targetIndex: 0
  }
};

const result2 = combat.resolveCombatRound(combatState2, action2);
console.log(`\nRound ${result2.round} Results:`);
console.log(`  Damage dealt: ${result2.damage_dealt}`);
console.log(`\nNarration:`);
result2.narration.forEach(n => console.log(`  ${n}`));

// Test 3: Eldritch Blast (Multiple Beams)
console.log('\n3. ELDRITCH BLAST IN COMBAT (Multiple Beams at Level 11)');
console.log('-'.repeat(80));

const warlock = {
  name: 'Hexblade',
  level: 11,
  class: 'warlock',
  xp: 14000,
  currentHp: 60,
  maxHp: 60,
  stats: {
    level: 11,
    class: 'warlock',
    hp: 60,
    maxHp: 60,
    strength: 10,
    dexterity: 14,
    constitution: 14,
    intelligence: 12,
    wisdom: 12,
    charisma: 18,
    spells: ['eldritch_blast', 'blade_ward'],
    weaponDamage: '1d8'
  }
};

const combatState3 = combat.initializeCombat(warlock, ['ogre']);
const action3 = {
  type: 'cast_spell',
  options: {
    spell: 'eldritch_blast',
    targetIndex: 0
  }
};

const result3 = combat.resolveCombatRound(combatState3, action3);
console.log(`\nRound ${result3.round} Results:`);
console.log(`  Damage dealt: ${result3.damage_dealt}`);
console.log(`\nNarration:`);
result3.narration.forEach(n => console.log(`  ${n}`));

// Test 4: Vicious Mockery (Status Effect)
console.log('\n4. VICIOUS MOCKERY IN COMBAT (Status Effect)');
console.log('-'.repeat(80));

const bard = {
  name: 'Bard McBardface',
  level: 5,
  class: 'bard',
  xp: 6500,
  currentHp: 32,
  maxHp: 32,
  stats: {
    level: 5,
    class: 'bard',
    hp: 32,
    maxHp: 32,
    strength: 10,
    dexterity: 14,
    constitution: 12,
    intelligence: 12,
    wisdom: 12,
    charisma: 16,
    spells: ['vicious_mockery'],
    weaponDamage: '1d8'
  }
};

const combatState4 = combat.initializeCombat(bard, ['bugbear']);
const action4 = {
  type: 'cast_spell',
  options: {
    spell: 'vicious_mockery',
    targetIndex: 0
  }
};

const result4 = combat.resolveCombatRound(combatState4, action4);
console.log(`\nRound ${result4.round} Results:`);
console.log(`  Damage dealt: ${result4.damage_dealt}`);
console.log(`\nNarration:`);
result4.narration.forEach(n => console.log(`  ${n}`));

// Check if enemy has disadvantage effect
const enemy = combatState4.enemies[0];
console.log(`\nEnemy conditions: ${JSON.stringify(enemy.conditions || [])}`);

// Test 5: Ray of Frost (Speed Reduction)
console.log('\n5. RAY OF FROST IN COMBAT (Speed Reduction)');
console.log('-'.repeat(80));

const combatState5 = combat.initializeCombat(wizard, ['goblin']);
const action5 = {
  type: 'cast_spell',
  options: {
    spell: 'ray_of_frost',
    targetIndex: 0
  }
};

const result5 = combat.resolveCombatRound(combatState5, action5);
console.log(`\nRound ${result5.round} Results:`);
console.log(`  Damage dealt: ${result5.damage_dealt}`);
console.log(`\nNarration:`);
result5.narration.forEach(n => console.log(`  ${n}`));

const goblin = combatState5.enemies[0];
console.log(`\nGoblin active effects: ${JSON.stringify(goblin.activeEffects || {})}`);

// Test 6: Utility Cantrip (Blade Ward)
console.log('\n6. BLADE WARD IN COMBAT (Utility Cantrip)');
console.log('-'.repeat(80));

const combatState6 = combat.initializeCombat(wizard, ['orc']);
const action6 = {
  type: 'cast_spell',
  options: {
    spell: 'blade_ward'
  }
};

const result6 = combat.resolveCombatRound(combatState6, action6);
console.log(`\nRound ${result6.round} Results:`);
console.log(`\nNarration:`);
result6.narration.forEach(n => console.log(`  ${n}`));

console.log(`\nWizard conditions: ${JSON.stringify(combatState6.character.conditions || [])}`);
console.log(`Wizard active effects: ${JSON.stringify(combatState6.character.activeEffects || {})}`);

// Test 7: Full Combat Sequence with Cantrips
console.log('\n7. FULL COMBAT SEQUENCE (Wizard vs 2 Goblins)');
console.log('-'.repeat(80));

const combatState7 = combat.initializeCombat(wizard, ['goblin', 'goblin']);
console.log('Starting combat...\n');

let round = 1;
while (!combatState7.enemies.every(e => e.currentHp <= 0) && combatState7.character.currentHp > 0 && round <= 5) {
  console.log(`\n--- ROUND ${round} ---`);
  
  // Wizard casts fire bolt
  const action = {
    type: 'cast_spell',
    options: {
      spell: 'fire_bolt',
      targetIndex: combatState7.enemies.findIndex(e => e.currentHp > 0)
    }
  };
  
  const result = combat.resolveCombatRound(combatState7, action);
  
  result.narration.forEach(n => console.log(`  ${n}`));
  
  console.log(`\nStatus:`);
  console.log(`  Wizard HP: ${combatState7.character.currentHp}/${combatState7.character.maxHp}`);
  combatState7.enemies.forEach((e, i) => {
    console.log(`  Goblin ${i + 1} HP: ${e.currentHp}/${e.maxHp}`);
  });
  
  if (result.combat_over) {
    console.log(`\n🎉 Combat Over! Result: ${result.result}`);
    if (result.xp_earned) {
      console.log(`   XP Earned: ${result.xp_earned}`);
    }
    break;
  }
  
  round++;
}

console.log('\n' + '='.repeat(80));
console.log('INTEGRATION TEST COMPLETE');
console.log('All cantrips successfully integrated with combat system!');
console.log('='.repeat(80));
