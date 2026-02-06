/**
 * Enhanced Henchman AI
 * Integrates with command system for tactical combat behavior
 */

const { getAIBehavior, getCommandState, HENCHMAN_COMMANDS } = require('./commands');

/**
 * Execute henchman turn in combat
 * Returns action object for combat resolver
 */
function executeHenchmanTurn(henchman, player, enemies, allies, positions, combatState) {
  // Get AI behavior based on current command
  const behavior = getAIBehavior(henchman, player, enemies, allies, positions);
  
  // Build action based on behavior
  const action = {
    actor: henchman,
    type: null,
    target: null,
    movement: null,
    log: []
  };
  
  // Handle movement first
  if (behavior.movement) {
    const movementResult = executeMovement(henchman, behavior, player, positions);
    if (movementResult) {
      action.movement = movementResult;
      action.log.push(movementResult.message);
    }
  }
  
  // Handle action
  switch (behavior.action) {
    case 'attack':
      if (behavior.target) {
        action.type = 'attack';
        action.target = behavior.target;
        action.log.push(`${henchman.name} attacks ${behavior.target.name}`);
      } else {
        action.type = 'dodge';
        action.log.push(`${henchman.name} has no target, uses Dodge`);
      }
      break;
      
    case 'defend':
      action.type = 'dodge';
      action.target = player;
      action.log.push(`${henchman.name} guards ${player.name}`);
      break;
      
    case 'disengage':
      action.type = 'disengage';
      action.log.push(`${henchman.name} disengages`);
      break;
      
    case 'special_ability':
      const abilityResult = useSpecialAbility(henchman, behavior.target, allies);
      if (abilityResult.success) {
        action.type = 'special_ability';
        action.target = abilityResult.target;
        action.abilityResult = abilityResult;
        action.log.push(abilityResult.message);
      } else {
        // Fallback to attack
        action.type = 'attack';
        action.target = behavior.target;
        action.log.push(`${henchman.name} cannot use ability, attacks instead`);
      }
      break;
      
    case 'heal':
      const healResult = useHealingAbility(henchman, behavior.target);
      if (healResult.success) {
        action.type = 'heal';
        action.target = behavior.target;
        action.healResult = healResult;
        action.log.push(healResult.message);
      } else {
        action.type = 'dodge';
        action.log.push(`${henchman.name} cannot heal, uses Dodge`);
      }
      break;
      
    default:
      action.type = 'dodge';
      action.log.push(`${henchman.name} takes defensive stance`);
  }
  
  // Apply stance-based decisions
  applyStanceDecisions(action, behavior, henchman);
  
  return action;
}

/**
 * Execute movement based on behavior
 */
function executeMovement(henchman, behavior, player, positions) {
  const currentPos = positions[henchman.id];
  const playerPos = positions[player.id];
  
  switch (behavior.movement) {
    case 'stay':
      return null; // No movement
      
    case 'stay_near_player':
      // Move to melee range with player
      if (currentPos?.rangeBand !== 'melee' || 
          Math.abs(getPositionIndex(currentPos) - getPositionIndex(playerPos)) > 1) {
        return {
          from: currentPos?.rangeBand,
          to: playerPos?.rangeBand,
          message: `${henchman.name} moves to guard position`
        };
      }
      return null;
      
    case 'match_player':
      // Match player's range band
      if (currentPos?.rangeBand !== playerPos?.rangeBand) {
        return {
          from: currentPos?.rangeBand,
          to: playerPos?.rangeBand,
          message: `${henchman.name} follows ${player.name}`
        };
      }
      return null;
      
    case 'flank':
      // Position opposite player for flanking
      return {
        from: currentPos?.rangeBand,
        to: 'melee',
        flank: true,
        message: `${henchman.name} moves to flank`
      };
      
    case 'retreat':
      // Move to farther range band
      const retreatBands = ['melee', 'near', 'far', 'distant'];
      const currentIndex = retreatBands.indexOf(currentPos?.rangeBand);
      const newIndex = Math.min(currentIndex + 1, retreatBands.length - 1);
      
      if (newIndex > currentIndex) {
        return {
          from: currentPos?.rangeBand,
          to: retreatBands[newIndex],
          message: `${henchman.name} retreats to safer distance`
        };
      }
      return null;
      
    default:
      return null;
  }
}

/**
 * Use henchman's special ability
 */
function useSpecialAbility(henchman, target, allies) {
  if (!henchman.specialAbility) {
    return { success: false, reason: 'No special ability' };
  }
  
  // Check if on cooldown
  if (henchman.abilityCooldown > 0) {
    return { success: false, reason: 'Ability on cooldown' };
  }
  
  // Check awakened ability if available
  if (henchman.awakened && henchman.awakenedAbility) {
    const awakenedResult = useAwakenedAbility(henchman, target, allies);
    if (awakenedResult.success) {
      return awakenedResult;
    }
  }
  
  // Use standard special ability
  const ability = henchman.specialAbility;
  
  // Generic ability use (specific implementations would be in henchmen.js)
  henchman.abilityCooldown = 3; // 3 rounds cooldown
  
  return {
    success: true,
    ability: ability.name,
    target,
    message: `${henchman.name} uses ${ability.name}!`,
    effect: ability.description
  };
}

/**
 * Use awakened ability (enhanced special)
 */
function useAwakenedAbility(henchman, target, allies) {
  if (!henchman.awakenedAbility) {
    return { success: false, reason: 'Not awakened' };
  }
  
  const ability = henchman.awakenedAbility;
  
  // Check uses per day
  if (!henchman.awakenedUses) {
    henchman.awakenedUses = ability.usesPerLongRest || 1;
  }
  
  if (henchman.awakenedUses <= 0) {
    return { success: false, reason: 'No awakened ability uses remaining' };
  }
  
  henchman.awakenedUses--;
  henchman.abilityCooldown = 5; // Longer cooldown for awakened
  
  return {
    success: true,
    ability: ability.name,
    awakened: true,
    target,
    message: `✨ ${henchman.name} uses AWAKENED ${ability.name}! ✨`,
    effect: ability.description
  };
}

/**
 * Use healing ability
 */
function useHealingAbility(henchman, target) {
  // Check if has healing spells
  const healingSpells = henchman.spells?.filter(spell => 
    spell.toLowerCase().includes('heal') || spell.toLowerCase().includes('cure')
  ) || [];
  
  if (healingSpells.length === 0) {
    return { success: false, reason: 'No healing abilities' };
  }
  
  // Check spell slots (simplified)
  if (!henchman.spellSlots || henchman.spellSlots[1] <= 0) {
    return { success: false, reason: 'No spell slots' };
  }
  
  henchman.spellSlots[1]--;
  
  // Roll healing (1d8 + WIS mod)
  const healDie = Math.floor(Math.random() * 8) + 1;
  const wisMod = Math.floor(((henchman.wis || 10) - 10) / 2);
  const healAmount = healDie + wisMod;
  
  target.hp = Math.min(target.hp + healAmount, target.maxHp);
  
  return {
    success: true,
    target,
    healAmount,
    roll: { die: healDie, modifier: wisMod },
    message: `${henchman.name} heals ${target.name} for ${healAmount} HP (${healDie}+${wisMod})`
  };
}

/**
 * Apply stance-based combat decisions
 */
function applyStanceDecisions(action, behavior, henchman) {
  const commandState = getCommandState(henchman);
  
  switch (commandState.stance) {
    case HENCHMAN_COMMANDS.AGGRESSIVE:
      // Prioritize damage, avoid Dodge
      if (action.type === 'dodge' && behavior.target) {
        action.type = 'attack';
        action.target = behavior.target;
        action.log.push('(Aggressive: attacking instead of dodging)');
      }
      break;
      
    case HENCHMAN_COMMANDS.DEFENSIVE:
      // Use Dodge more often when threatened
      if (henchman.hp < henchman.maxHp * 0.3 && action.type === 'attack') {
        action.type = 'dodge';
        action.log.push('(Defensive: dodging due to low HP)');
      }
      break;
      
    case HENCHMAN_COMMANDS.RANGED:
      // Avoid melee combat
      if (positions[henchman.id]?.rangeBand === 'melee' && 
          henchman.class !== 'fighter' && 
          henchman.class !== 'barbarian') {
        action.type = 'disengage';
        action.log.push('(Ranged: disengaging from melee)');
      }
      break;
  }
}

/**
 * Get position index for comparison
 */
function getPositionIndex(position) {
  const bands = ['melee', 'near', 'far', 'distant'];
  return bands.indexOf(position?.rangeBand) || 0;
}

/**
 * Evaluate henchman's combat effectiveness
 */
function evaluateCombatEffectiveness(henchman, combatLog) {
  const stats = {
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    hitsLanded: 0,
    hitsTaken: 0,
    abilitiesUsed: 0,
    turnsActive: 0
  };
  
  // Parse combat log for henchman's actions
  for (const entry of combatLog) {
    if (entry.actor === henchman.id) {
      stats.turnsActive++;
      if (entry.type === 'attack' && entry.hit) {
        stats.hitsLanded++;
        stats.damageDealt += entry.damage || 0;
      }
      if (entry.type === 'special_ability') {
        stats.abilitiesUsed++;
      }
      if (entry.type === 'heal') {
        stats.healingDone += entry.healAmount || 0;
      }
    }
    if (entry.target === henchman.id && entry.type === 'attack') {
      if (entry.hit) {
        stats.hitsTaken++;
        stats.damageTaken += entry.damage || 0;
      }
    }
  }
  
  return stats;
}

module.exports = {
  executeHenchmanTurn,
  executeMovement,
  useSpecialAbility,
  useAwakenedAbility,
  useHealingAbility,
  applyStanceDecisions,
  evaluateCombatEffectiveness
};
