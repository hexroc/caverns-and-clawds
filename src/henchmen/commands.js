/**
 * Henchman Command System
 * NWN-style tactical commands for henchman control
 */

const HENCHMAN_COMMANDS = {
  // Combat
  ATTACK_TARGET: 'attack_target',
  ATTACK_NEAREST: 'attack_nearest',
  DEFEND_ME: 'defend_me',
  HOLD_POSITION: 'hold_position',
  FOLLOW: 'follow',
  
  // Tactical
  FLANK: 'flank',
  FOCUS_FIRE: 'focus_fire',
  SWITCH_TARGET: 'switch_target',
  FALL_BACK: 'fall_back',
  
  // Special
  USE_ABILITY: 'use_ability',
  HEAL_ME: 'heal_me',
  DRINK_POTION: 'drink_potion',
  
  // Stance
  AGGRESSIVE: 'aggressive',
  DEFENSIVE: 'defensive',
  RANGED: 'ranged'
};

const COMMAND_DESCRIPTIONS = {
  [HENCHMAN_COMMANDS.ATTACK_TARGET]: 'Attack my target - Focus on the enemy I\'m fighting',
  [HENCHMAN_COMMANDS.ATTACK_NEAREST]: 'Attack nearest enemy - Engage the closest threat',
  [HENCHMAN_COMMANDS.DEFEND_ME]: 'Guard me - Stay close and protect me from attacks',
  [HENCHMAN_COMMANDS.HOLD_POSITION]: 'Hold your ground - Stay at current range, don\'t move',
  [HENCHMAN_COMMANDS.FOLLOW]: 'Follow me - Match my position in combat',
  
  [HENCHMAN_COMMANDS.FLANK]: 'Flank that enemy - Position opposite me for advantage',
  [HENCHMAN_COMMANDS.FOCUS_FIRE]: 'Focus fire on my target - Everyone attack the same enemy',
  [HENCHMAN_COMMANDS.SWITCH_TARGET]: 'Switch targets - Change to a different enemy',
  [HENCHMAN_COMMANDS.FALL_BACK]: 'Retreat - Move to safer distance',
  
  [HENCHMAN_COMMANDS.USE_ABILITY]: 'Use special ability - Use your unique power',
  [HENCHMAN_COMMANDS.HEAL_ME]: 'Heal me - Use healing spell or potion on me',
  [HENCHMAN_COMMANDS.DRINK_POTION]: 'Use a potion - Drink a healing potion',
  
  [HENCHMAN_COMMANDS.AGGRESSIVE]: 'Fight aggressively - Prioritize damage over defense',
  [HENCHMAN_COMMANDS.DEFENSIVE]: 'Fight defensively - Prioritize survival',
  [HENCHMAN_COMMANDS.RANGED]: 'Keep distance - Stay at far range if possible'
};

/**
 * Initialize henchman command state
 */
function initCommandState(henchman) {
  henchman.commandState = {
    currentCommand: HENCHMAN_COMMANDS.FOLLOW,
    targetOverride: null,
    stance: 'balanced',
    position: 'auto',
    lastCommandTime: Date.now()
  };
  return henchman.commandState;
}

/**
 * Issue command to henchman
 */
function issueCommand(henchman, command, options = {}) {
  if (!henchman.commandState) {
    initCommandState(henchman);
  }
  
  if (!Object.values(HENCHMAN_COMMANDS).includes(command)) {
    return {
      success: false,
      reason: 'Invalid command',
      validCommands: Object.keys(HENCHMAN_COMMANDS)
    };
  }
  
  const previousCommand = henchman.commandState.currentCommand;
  
  // Stance commands update stance
  if ([HENCHMAN_COMMANDS.AGGRESSIVE, HENCHMAN_COMMANDS.DEFENSIVE, HENCHMAN_COMMANDS.RANGED].includes(command)) {
    henchman.commandState.stance = command;
    return {
      success: true,
      command,
      stance: command,
      message: `${henchman.name} is now fighting ${command}ly`
    };
  }
  
  // Update command state
  henchman.commandState.currentCommand = command;
  henchman.commandState.lastCommandTime = Date.now();
  
  // Handle target-specific commands
  if (command === HENCHMAN_COMMANDS.ATTACK_TARGET || 
      command === HENCHMAN_COMMANDS.FLANK ||
      command === HENCHMAN_COMMANDS.FOCUS_FIRE) {
    henchman.commandState.targetOverride = options.targetId || null;
  }
  
  // Handle position commands
  if (command === HENCHMAN_COMMANDS.HOLD_POSITION) {
    henchman.commandState.position = options.position || henchman.position;
  }
  
  return {
    success: true,
    command,
    previousCommand,
    targetOverride: henchman.commandState.targetOverride,
    message: `${henchman.name}: "${COMMAND_DESCRIPTIONS[command]}"`
  };
}

/**
 * Get current command state
 */
function getCommandState(henchman) {
  if (!henchman.commandState) {
    initCommandState(henchman);
  }
  return henchman.commandState;
}

/**
 * Clear target override (e.g., when target dies)
 */
function clearTargetOverride(henchman) {
  if (henchman.commandState) {
    henchman.commandState.targetOverride = null;
  }
}

/**
 * Get AI behavior based on current command
 */
function getAIBehavior(henchman, player, enemies, allies, positions) {
  const state = getCommandState(henchman);
  const behavior = {
    action: null,
    target: null,
    movement: null,
    priority: 'normal',
    reasoning: ''
  };
  
  switch (state.currentCommand) {
    case HENCHMAN_COMMANDS.ATTACK_TARGET:
      if (state.targetOverride) {
        behavior.target = enemies.find(e => e.id === state.targetOverride);
        behavior.action = 'attack';
        behavior.reasoning = 'Attacking designated target';
      } else if (player.combatState?.lastAttackedTarget) {
        behavior.target = enemies.find(e => e.id === player.combatState.lastAttackedTarget);
        behavior.action = 'attack';
        behavior.reasoning = 'Attacking player\'s target';
      }
      break;
      
    case HENCHMAN_COMMANDS.ATTACK_NEAREST:
      behavior.target = findNearestEnemy(henchman, enemies, positions);
      behavior.action = 'attack';
      behavior.reasoning = 'Attacking nearest enemy';
      break;
      
    case HENCHMAN_COMMANDS.DEFEND_ME:
      behavior.action = 'defend';
      behavior.target = findNearestThreatToPlayer(player, enemies, positions);
      behavior.movement = 'stay_near_player';
      behavior.priority = 'high';
      behavior.reasoning = 'Defending player';
      break;
      
    case HENCHMAN_COMMANDS.HOLD_POSITION:
      behavior.action = 'attack';
      behavior.target = findEnemyInRange(henchman, enemies, positions);
      behavior.movement = 'stay';
      behavior.reasoning = 'Holding position';
      break;
      
    case HENCHMAN_COMMANDS.FOLLOW:
      behavior.action = 'attack';
      behavior.target = findBestTarget(henchman, enemies, positions);
      behavior.movement = 'match_player';
      behavior.reasoning = 'Following player';
      break;
      
    case HENCHMAN_COMMANDS.FLANK:
      if (state.targetOverride) {
        behavior.target = enemies.find(e => e.id === state.targetOverride);
        behavior.action = 'attack';
        behavior.movement = 'flank';
        behavior.reasoning = 'Flanking target';
      }
      break;
      
    case HENCHMAN_COMMANDS.FALL_BACK:
      behavior.action = 'disengage';
      behavior.movement = 'retreat';
      behavior.priority = 'high';
      behavior.reasoning = 'Retreating to safety';
      break;
      
    case HENCHMAN_COMMANDS.USE_ABILITY:
      behavior.action = 'special_ability';
      behavior.target = findBestAbilityTarget(henchman, enemies, allies);
      behavior.reasoning = 'Using special ability';
      break;
      
    case HENCHMAN_COMMANDS.HEAL_ME:
      if (hasHealingAbility(henchman)) {
        behavior.action = 'heal';
        behavior.target = player;
        behavior.priority = 'high';
        behavior.reasoning = 'Healing player';
      }
      break;
  }
  
  // Apply stance modifiers
  applyStanceModifiers(behavior, state.stance, henchman);
  
  return behavior;
}

/**
 * Apply stance modifiers to AI behavior
 */
function applyStanceModifiers(behavior, stance, henchman) {
  switch (stance) {
    case HENCHMAN_COMMANDS.AGGRESSIVE:
      behavior.riskTolerance = 'high';
      behavior.preferredRange = 'melee';
      behavior.useDodge = false;
      break;
      
    case HENCHMAN_COMMANDS.DEFENSIVE:
      behavior.riskTolerance = 'low';
      behavior.useDodge = true;
      behavior.priority = 'survival';
      break;
      
    case HENCHMAN_COMMANDS.RANGED:
      behavior.preferredRange = 'far';
      behavior.avoidMelee = true;
      break;
      
    default:
      behavior.riskTolerance = 'normal';
      behavior.preferredRange = 'auto';
  }
}

/**
 * Find nearest enemy
 */
function findNearestEnemy(henchman, enemies, positions) {
  let nearest = null;
  let nearestDistance = Infinity;
  
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    
    const distance = getDistance(henchman, enemy, positions);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  
  return nearest;
}

/**
 * Find nearest threat to player
 */
function findNearestThreatToPlayer(player, enemies, positions) {
  return enemies
    .filter(e => e.alive && e.hp > 0)
    .filter(e => positions[e.id]?.rangeBand === 'melee')
    .sort((a, b) => b.cr - a.cr)[0] || null;
}

/**
 * Find enemy in range
 */
function findEnemyInRange(henchman, enemies, positions) {
  const henchmanPos = positions[henchman.id];
  
  return enemies.find(e => {
    if (!e.alive || e.hp <= 0) return false;
    const enemyPos = positions[e.id];
    return enemyPos?.rangeBand === henchmanPos?.rangeBand;
  });
}

/**
 * Find best target (prioritize low HP, high threat)
 */
function findBestTarget(henchman, enemies, positions) {
  const viable = enemies.filter(e => e.alive && e.hp > 0);
  if (viable.length === 0) return null;
  
  // Score based on HP% and CR
  return viable.sort((a, b) => {
    const scoreA = (a.hp / a.maxHp) * 0.5 + (a.cr || 1) * 0.5;
    const scoreB = (b.hp / b.maxHp) * 0.5 + (b.cr || 1) * 0.5;
    return scoreA - scoreB;
  })[0];
}

/**
 * Find best target for special ability
 */
function findBestAbilityTarget(henchman, enemies, allies) {
  // If AoE ability, find clustered enemies
  // If single-target, find high-value target
  // Simplified for now
  return enemies.filter(e => e.alive && e.hp > 0)
    .sort((a, b) => b.cr - a.cr)[0] || null;
}

/**
 * Check if henchman has healing ability
 */
function hasHealingAbility(henchman) {
  return henchman.spells?.some(spell => 
    spell.toLowerCase().includes('heal') || 
    spell.toLowerCase().includes('cure')
  ) || henchman.class?.toLowerCase() === 'cleric';
}

/**
 * Get distance between two combatants (simplified)
 */
function getDistance(a, b, positions) {
  const posA = positions[a.id];
  const posB = positions[b.id];
  
  if (!posA || !posB) return Infinity;
  
  const bandOrder = ['melee', 'near', 'far', 'distant'];
  const indexA = bandOrder.indexOf(posA.rangeBand);
  const indexB = bandOrder.indexOf(posB.rangeBand);
  
  return Math.abs(indexA - indexB);
}

module.exports = {
  HENCHMAN_COMMANDS,
  COMMAND_DESCRIPTIONS,
  initCommandState,
  issueCommand,
  getCommandState,
  clearTargetOverride,
  getAIBehavior,
  findNearestEnemy,
  findBestTarget,
  hasHealingAbility
};
