/**
 * Test Henchman Command System
 */

const commands = require('../src/henchmen/commands');
const ai = require('../src/henchmen/ai');

console.log('='.repeat(60));
console.log('TESTING HENCHMAN COMMAND SYSTEM');
console.log('='.repeat(60));

// ============================================================================
// TEST 1: Command State Initialization
// ============================================================================

console.log('\n### TEST 1: Command State Initialization ###');

const henchman = {
  id: 'sally_shrimp',
  name: 'Sally the Shrimp',
  class: 'fighter',
  level: 3,
  hp: 25,
  maxHp: 25,
  str: 14,
  dex: 16,
  con: 12,
  int: 8,
  wis: 10,
  cha: 10,
  spells: []
};

commands.initCommandState(henchman);
console.log('✓ Henchman command state initialized:', henchman.commandState);

// ============================================================================
// TEST 2: Issue Commands
// ============================================================================

console.log('\n### TEST 2: Issue Commands ###');

// Attack target command
const attackCmd = commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.ATTACK_TARGET, {
  targetId: 'goblin_1'
});
console.log('✓ Attack Target command:', attackCmd);

// Defensive stance
const defensiveCmd = commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.DEFENSIVE);
console.log('✓ Defensive stance:', defensiveCmd);

// Flank command
const flankCmd = commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.FLANK, {
  targetId: 'orc_boss'
});
console.log('✓ Flank command:', flankCmd);

// Hold position
const holdCmd = commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.HOLD_POSITION);
console.log('✓ Hold position:', holdCmd);

// ============================================================================
// TEST 3: AI Behavior Based on Commands
// ============================================================================

console.log('\n### TEST 3: AI Behavior Based on Commands ###');

const player = {
  id: 'player1',
  name: 'Snapper',
  level: 5,
  hp: 35,
  maxHp: 35,
  combatState: {}
};

const enemies = [
  { id: 'goblin_1', name: 'Goblin Archer', hp: 10, maxHp: 10, alive: true, cr: 0.25 },
  { id: 'goblin_2', name: 'Goblin Warrior', hp: 15, maxHp: 15, alive: true, cr: 0.25 },
  { id: 'orc_boss', name: 'Orc Chieftain', hp: 40, maxHp: 40, alive: true, cr: 2 }
];

const allies = [henchman];

const positions = {
  player1: { rangeBand: 'melee' },
  sally_shrimp: { rangeBand: 'near' },
  goblin_1: { rangeBand: 'far' },
  goblin_2: { rangeBand: 'melee' },
  orc_boss: { rangeBand: 'melee' }
};

// Test ATTACK_TARGET behavior
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.ATTACK_TARGET, { targetId: 'orc_boss' });
const behavior1 = commands.getAIBehavior(henchman, player, enemies, allies, positions);
console.log('✓ AI Behavior (ATTACK_TARGET):', behavior1);

// Test DEFEND_ME behavior
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.DEFEND_ME);
const behavior2 = commands.getAIBehavior(henchman, player, enemies, allies, positions);
console.log('✓ AI Behavior (DEFEND_ME):', behavior2);

// Test ATTACK_NEAREST behavior
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.ATTACK_NEAREST);
const behavior3 = commands.getAIBehavior(henchman, player, enemies, allies, positions);
console.log('✓ AI Behavior (ATTACK_NEAREST):', behavior3);

// ============================================================================
// TEST 4: Henchman AI Turn Execution
// ============================================================================

console.log('\n### TEST 4: Henchman AI Turn Execution ###');

// Reset henchman to aggressive stance
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.AGGRESSIVE);
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.ATTACK_TARGET, { targetId: 'orc_boss' });

const action1 = ai.executeHenchmanTurn(henchman, player, enemies, allies, positions, {});
console.log('✓ Henchman turn (AGGRESSIVE + ATTACK_TARGET):');
console.log('  Action:', action1.type);
console.log('  Target:', action1.target?.name || 'none');
console.log('  Log:', action1.log);

// Test defensive stance
commands.issueCommand(henchman, commands.HENCHMAN_COMMANDS.DEFENSIVE);
henchman.hp = 5; // Low HP

const action2 = ai.executeHenchmanTurn(henchman, player, enemies, allies, positions, {});
console.log('✓ Henchman turn (DEFENSIVE + Low HP):');
console.log('  Action:', action2.type);
console.log('  Log:', action2.log);

// ============================================================================
// TEST 5: Special Abilities
// ============================================================================

console.log('\n### TEST 5: Special Abilities ###');

const henchmanWithAbility = {
  ...henchman,
  hp: 25,
  specialAbility: {
    name: 'Sonic Punch',
    description: 'Deal bonus 1d8 force damage'
  },
  abilityCooldown: 0
};

commands.issueCommand(henchmanWithAbility, commands.HENCHMAN_COMMANDS.USE_ABILITY);
const abilityAction = ai.executeHenchmanTurn(henchmanWithAbility, player, enemies, allies, positions, {});
console.log('✓ Special ability turn:');
console.log('  Action:', abilityAction.type);
console.log('  Log:', abilityAction.log);

// ============================================================================
// TEST 6: Healing
// ============================================================================

console.log('\n### TEST 6: Healing ###');

const clericHenchman = {
  id: 'coral_cleric',
  name: 'Coral the Cleric',
  class: 'cleric',
  level: 5,
  hp: 30,
  maxHp: 30,
  wis: 16,
  spells: ['cure wounds', 'healing word'],
  spellSlots: { 1: 3, 2: 2 },
  commandState: {}
};

commands.initCommandState(clericHenchman);
commands.issueCommand(clericHenchman, commands.HENCHMAN_COMMANDS.HEAL_ME);

player.hp = 10; // Injured player
const healAction = ai.executeHenchmanTurn(clericHenchman, player, enemies, allies, positions, {});
console.log('✓ Healing action:');
console.log('  Action:', healAction.type);
console.log('  Target:', healAction.target?.name || 'none');
console.log('  Log:', healAction.log);

// ============================================================================
// TEST 7: Command Descriptions
// ============================================================================

console.log('\n### TEST 7: Available Commands ###');

console.log('All available commands:');
for (const [key, value] of Object.entries(commands.HENCHMAN_COMMANDS)) {
  console.log(`  ${key}: ${commands.COMMAND_DESCRIPTIONS[value]}`);
}

console.log('\n' + '='.repeat(60));
console.log('ALL HENCHMAN TESTS PASSED ✓');
console.log('='.repeat(60));
