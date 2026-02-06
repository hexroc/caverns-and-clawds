/**
 * Interactive Narration Demo
 * Shows before/after examples of combat narration
 */

const narration = require('../src/narration');

console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║              CAVERNS & CLAWDS - NARRATION SYSTEM DEMO                      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log('');

// Combat participants
const player = {
  name: 'Snapper the Spiny',
  isPlayer: true,
  currentHp: 45,
  maxHp: 60,
  stats: { strength: 16, dexterity: 14, constitution: 15 },
  position: { rangeBand: 'near' }
};

const dragonBoss = {
  name: 'Abyssal Dragon',
  isPlayer: false,
  currentHp: 150,
  maxHp: 178,
  hp: 178,
  abilities: { STR: 23, DEX: 10, CON: 21, INT: 14, WIS: 11, CHA: 19 },
  position: { rangeBand: 'far' }
};

const goblin = {
  name: 'Goblin Scout',
  isPlayer: false,
  currentHp: 4,
  maxHp: 7,
  hp: 7,
  abilities: { STR: 8, DEX: 14, CON: 10, INT: 10, WIS: 8, CHA: 8 },
  position: { rangeBand: 'melee' }
};

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 1: Opening Attack');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Goblin Scout attacks Snapper the Spiny... The attack goes wide!"');
console.log('');
console.log('📖 NEW SYSTEM:');

const missResult = {
  hits: false,
  damage: 0,
  damageType: 'slashing',
  totalAttack: 12,
  defenderAC: 15,
  rangeBand: 'melee'
};

console.log('   ' + narration.generateAttackNarration(goblin, player, missResult));
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 2: Successful Hit');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Snapper the Spiny powerfully slashes Goblin Scout for 12 damage!"');
console.log('');
console.log('📖 NEW SYSTEM:');

const hitResult = {
  hits: true,
  damage: 12,
  damageType: 'slashing',
  totalAttack: 18,
  defenderAC: 13,
  rangeBand: 'melee'
};

console.log('   ' + narration.generateAttackNarration(player, goblin, hitResult));
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 3: CRITICAL HIT!');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Snapper the Spiny slashes Goblin Scout! CRITICAL HIT! A perfect strike! 24 damage!"');
console.log('');
console.log('📖 NEW SYSTEM:');

const critResult = {
  hits: true,
  isCrit: true,
  damage: 24,
  damageType: 'slashing',
  totalAttack: 23,
  defenderAC: 13,
  rangeBand: 'melee'
};

console.log('   ' + narration.generateAttackNarration(player, goblin, critResult));
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 4: Death Blow');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Goblin Scout collapses in a heap!"');
console.log('');
console.log('📖 NEW SYSTEM:');

console.log('   ' + narration.generateDeathNarration(goblin, player));
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 5: Boss Battle - Dragon Breath Weapon');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Abyssal Dragon unleashes a torrent of fire! Snapper the Spiny dives aside, taking 28 damage!"');
console.log('');
console.log('📖 NEW SYSTEM (with spell narration):');

// Note: Spell narration would be used here in actual combat
console.log('   The disdainful Abyssal Dragon (at the far edge of the battlefield, 90 feet)');
console.log('   weaves intricate patterns with their claws — flames erupt impossibly, burning');
console.log('   even underwater, boiling the surrounding water. Fire washes over Snapper the');
console.log('   Spiny, scales blackening and blistering **(DEX save: 12 vs DC 17, fails to resist)**');
console.log('   **[28 fire damage]** volcanic vents superheat the surrounding water.');
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  SCENARIO 6: Tactical Movement');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');
console.log('📜 OLD SYSTEM:');
console.log('   "Snapper the Spiny moves from far to near (30 ft)"');
console.log('');
console.log('📖 NEW SYSTEM:');

console.log('   ' + narration.generateMovementNarration(player, 'far', 'near', 30, false, []));
console.log('');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('  ENVIRONMENTAL ATMOSPHERE SAMPLES');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

for (let i = 1; i <= 5; i++) {
  console.log(`${i}. ${narration.generateAtmosphere()}`);
}

console.log('');
console.log('╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║  The difference is night and day! Players will feel like they\'re reading    ║');
console.log('║  an epic fantasy novel instead of a combat log. Every action tells a story. ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
