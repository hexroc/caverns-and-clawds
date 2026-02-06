/**
 * Conditions System
 * Prone, Paralyzed, Charmed, Frightened, Restrained, Invisible, etc.
 */

const CONDITION_TYPES = {
  PRONE: 'prone',
  PARALYZED: 'paralyzed',
  CHARMED: 'charmed',
  FRIGHTENED: 'frightened',
  RESTRAINED: 'restrained',
  INVISIBLE: 'invisible',
  STUNNED: 'stunned',
  BLINDED: 'blinded',
  DEAFENED: 'deafened',
  POISONED: 'poisoned',
  UNCONSCIOUS: 'unconscious',
  INCAPACITATED: 'incapacitated',
  PETRIFIED: 'petrified',
  GRAPPLED: 'grappled'
};

const CONDITION_DESCRIPTIONS = {
  [CONDITION_TYPES.PRONE]: 'Lying on the ground. Disadvantage on attacks, advantage to be hit in melee.',
  [CONDITION_TYPES.PARALYZED]: 'Cannot move or act. Auto-crit if hit. Fails STR/DEX saves.',
  [CONDITION_TYPES.CHARMED]: 'Cannot attack charmer. Charmer has advantage on social checks.',
  [CONDITION_TYPES.FRIGHTENED]: 'Disadvantage on ability checks and attacks while source is visible.',
  [CONDITION_TYPES.RESTRAINED]: 'Speed = 0. Disadvantage on attacks and DEX saves. Attackers have advantage.',
  [CONDITION_TYPES.INVISIBLE]: 'Advantage on attacks. Attackers have disadvantage.',
  [CONDITION_TYPES.STUNNED]: 'Incapacitated. Cannot move. Auto-fail STR/DEX saves. Attackers have advantage.',
  [CONDITION_TYPES.BLINDED]: 'Cannot see. Attacks have disadvantage. Attackers have advantage.',
  [CONDITION_TYPES.POISONED]: 'Disadvantage on attack rolls and ability checks.',
  [CONDITION_TYPES.UNCONSCIOUS]: 'Incapacitated. Cannot move or speak. Drop items. Auto-fail STR/DEX saves. Attackers have advantage. Melee attacks are auto-crits.',
  [CONDITION_TYPES.GRAPPLED]: 'Speed = 0. Can escape with Athletics or Acrobatics check.'
};

/**
 * Apply condition to a creature
 */
function applyCondition(target, conditionType, duration = null, source = null) {
  if (!target.conditions) {
    target.conditions = [];
  }
  
  // Check if already has condition
  const existing = target.conditions.find(c => c.type === conditionType);
  if (existing) {
    return { 
      applied: false, 
      reason: 'Already has this condition',
      condition: existing
    };
  }
  
  const condition = {
    type: conditionType,
    duration, // null = until removed, number = rounds remaining
    source,   // What caused it (spell name, creature, etc.)
    appliedAt: Date.now()
  };
  
  target.conditions.push(condition);
  
  // Apply immediate effects
  applyConditionEffects(target, conditionType);
  
  return {
    applied: true,
    condition,
    message: `${target.name} is now ${conditionType}! ${CONDITION_DESCRIPTIONS[conditionType]}`
  };
}

/**
 * Remove condition from a creature
 */
function removeCondition(target, conditionType) {
  if (!target.conditions) {
    return { removed: false, reason: 'No conditions' };
  }
  
  const index = target.conditions.findIndex(c => c.type === conditionType);
  if (index === -1) {
    return { removed: false, reason: 'Does not have this condition' };
  }
  
  const condition = target.conditions[index];
  target.conditions.splice(index, 1);
  
  // Remove condition effects
  removeConditionEffects(target, conditionType);
  
  return {
    removed: true,
    condition,
    message: `${target.name} is no longer ${conditionType}`
  };
}

/**
 * Check if creature has a condition
 */
function hasCondition(target, conditionType) {
  return target.conditions?.some(c => c.type === conditionType) || false;
}

/**
 * Get all active conditions
 */
function getConditions(target) {
  return target.conditions || [];
}

/**
 * Apply mechanical effects of a condition
 */
function applyConditionEffects(target, conditionType) {
  switch (conditionType) {
    case CONDITION_TYPES.PARALYZED:
    case CONDITION_TYPES.STUNNED:
    case CONDITION_TYPES.UNCONSCIOUS:
      target.incapacitated = true;
      break;
      
    case CONDITION_TYPES.RESTRAINED:
    case CONDITION_TYPES.GRAPPLED:
      if (!target.combatState) target.combatState = {};
      target.combatState.speedReduced = true;
      break;
      
    case CONDITION_TYPES.INVISIBLE:
      if (!target.combatState) target.combatState = {};
      target.combatState.invisible = true;
      break;
  }
}

/**
 * Remove mechanical effects of a condition
 */
function removeConditionEffects(target, conditionType) {
  switch (conditionType) {
    case CONDITION_TYPES.PARALYZED:
    case CONDITION_TYPES.STUNNED:
    case CONDITION_TYPES.UNCONSCIOUS:
      // Only remove if no other incapacitating conditions
      const hasOtherIncapacitate = target.conditions?.some(c => 
        [CONDITION_TYPES.PARALYZED, CONDITION_TYPES.STUNNED, CONDITION_TYPES.UNCONSCIOUS].includes(c.type)
      );
      if (!hasOtherIncapacitate) {
        target.incapacitated = false;
      }
      break;
      
    case CONDITION_TYPES.INVISIBLE:
      if (target.combatState) {
        target.combatState.invisible = false;
      }
      break;
  }
}

/**
 * Get attack roll modifiers based on conditions
 */
function getAttackModifiers(attacker, target) {
  const modifiers = {
    advantage: false,
    disadvantage: false,
    reasons: []
  };
  
  // Attacker conditions
  if (hasCondition(attacker, CONDITION_TYPES.PRONE)) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Attacker is prone');
  }
  
  if (hasCondition(attacker, CONDITION_TYPES.BLINDED)) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Attacker is blinded');
  }
  
  if (hasCondition(attacker, CONDITION_TYPES.POISONED)) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Attacker is poisoned');
  }
  
  if (hasCondition(attacker, CONDITION_TYPES.RESTRAINED)) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Attacker is restrained');
  }
  
  if (hasCondition(attacker, CONDITION_TYPES.INVISIBLE)) {
    modifiers.advantage = true;
    modifiers.reasons.push('Attacker is invisible');
  }
  
  const frightenedCondition = attacker.conditions?.find(c => c.type === CONDITION_TYPES.FRIGHTENED);
  if (frightenedCondition && frightenedCondition.source === target.id) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Attacker is frightened of target');
  }
  
  // Target conditions
  if (hasCondition(target, CONDITION_TYPES.PRONE)) {
    // Advantage in melee, disadvantage at range
    // (Need to check range - simplified here)
    modifiers.advantage = true;
    modifiers.reasons.push('Target is prone (melee)');
  }
  
  if (hasCondition(target, CONDITION_TYPES.PARALYZED) ||
      hasCondition(target, CONDITION_TYPES.STUNNED) ||
      hasCondition(target, CONDITION_TYPES.UNCONSCIOUS) ||
      hasCondition(target, CONDITION_TYPES.RESTRAINED)) {
    modifiers.advantage = true;
    modifiers.reasons.push('Target is incapacitated/restrained');
  }
  
  if (hasCondition(target, CONDITION_TYPES.INVISIBLE)) {
    modifiers.disadvantage = true;
    modifiers.reasons.push('Target is invisible');
  }
  
  return modifiers;
}

/**
 * Check if attack is auto-crit (paralyzed/unconscious target within 5ft)
 */
function isAutoCrit(attacker, target, range) {
  if (range !== 'melee') return false;
  
  return hasCondition(target, CONDITION_TYPES.PARALYZED) ||
         hasCondition(target, CONDITION_TYPES.UNCONSCIOUS);
}

/**
 * Check if creature can take actions (incapacitated check)
 */
function canAct(creature) {
  if (creature.incapacitated) return false;
  
  return !hasCondition(creature, CONDITION_TYPES.PARALYZED) &&
         !hasCondition(creature, CONDITION_TYPES.STUNNED) &&
         !hasCondition(creature, CONDITION_TYPES.UNCONSCIOUS) &&
         !hasCondition(creature, CONDITION_TYPES.PETRIFIED);
}

/**
 * Check if creature can move
 */
function canMove(creature) {
  if (!canAct(creature)) return false;
  
  return !hasCondition(creature, CONDITION_TYPES.RESTRAINED) &&
         !hasCondition(creature, CONDITION_TYPES.GRAPPLED) &&
         !hasCondition(creature, CONDITION_TYPES.PARALYZED);
}

/**
 * Tick down condition durations at end of turn
 */
function tickConditions(creature) {
  if (!creature.conditions) return { expired: [] };
  
  const expired = [];
  
  creature.conditions = creature.conditions.filter(condition => {
    if (condition.duration === null) return true; // Permanent until removed
    
    condition.duration--;
    
    if (condition.duration <= 0) {
      expired.push(condition);
      removeConditionEffects(creature, condition.type);
      return false;
    }
    
    return true;
  });
  
  return { expired };
}

/**
 * Clear all conditions (e.g., Greater Restoration)
 */
function clearAllConditions(creature) {
  const cleared = creature.conditions || [];
  
  for (const condition of cleared) {
    removeConditionEffects(creature, condition.type);
  }
  
  creature.conditions = [];
  
  return { cleared };
}

module.exports = {
  CONDITION_TYPES,
  CONDITION_DESCRIPTIONS,
  applyCondition,
  removeCondition,
  hasCondition,
  getConditions,
  getAttackModifiers,
  isAutoCrit,
  canAct,
  canMove,
  tickConditions,
  clearAllConditions
};
