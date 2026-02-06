/**
 * Sneak Attack System (Rogue)
 * 5e-compliant sneak attack mechanics
 */

const SNEAK_ATTACK_DICE = {
  1: '1d6',
  3: '2d6',
  5: '3d6',
  7: '4d6',
  9: '5d6',
  11: '6d6',
  13: '7d6',
  15: '8d6',
  17: '9d6',
  19: '10d6'
};

/**
 * Get sneak attack dice for a given rogue level
 */
function getSneakAttackDice(level) {
  // Find the highest level threshold that doesn't exceed the current level
  const levels = Object.keys(SNEAK_ATTACK_DICE).map(Number).sort((a, b) => b - a);
  const applicableLevel = levels.find(l => level >= l) || 1;
  return SNEAK_ATTACK_DICE[applicableLevel];
}

/**
 * Roll sneak attack damage
 */
function rollSneakAttackDamage(level) {
  const dice = getSneakAttackDice(level);
  const [count, sides] = dice.split('d').map(Number);
  
  let total = 0;
  const rolls = [];
  
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }
  
  return {
    dice,
    rolls,
    total,
    breakdown: `${dice} (${rolls.join('+')}) = ${total}`
  };
}

/**
 * Check if weapon is valid for sneak attack (finesse or ranged)
 */
function isValidSneakAttackWeapon(weapon) {
  if (!weapon) return false;
  
  // Finesse weapons (daggers, rapiers, shortswords, etc.)
  const finesseWeapons = [
    'dagger', 'rapier', 'shortsword', 'scimitar', 'whip',
    'hand crossbow', 'light crossbow', 'heavy crossbow',
    'shortbow', 'longbow'
  ];
  
  const weaponName = weapon.name?.toLowerCase() || '';
  
  return finesseWeapons.some(w => weaponName.includes(w)) ||
         weapon.properties?.includes('finesse') ||
         weapon.properties?.includes('ranged') ||
         weapon.type === 'ranged';
}

/**
 * Check if ally is within 5ft of target (for flanking/sneak attack)
 */
function hasAllyNearTarget(target, allies, positions) {
  if (!positions) return false;
  
  for (const ally of allies) {
    if (!ally.alive || ally.hp <= 0) continue;
    
    const allyPos = positions[ally.id];
    const targetPos = positions[target.id];
    
    if (allyPos?.rangeBand === 'melee' && targetPos?.rangeBand === 'melee') {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if sneak attack is available
 * Returns: { eligible: boolean, reason: string }
 */
function checkSneakAttack(attacker, target, options = {}) {
  const {
    weapon,
    hasAdvantage = false,
    hasDisadvantage = false,
    allies = [],
    positions = {},
    usedThisTurn = false
  } = options;

  // Must be a rogue
  if (attacker.class?.toLowerCase() !== 'rogue') {
    return { eligible: false, reason: 'Not a rogue' };
  }

  // Once per turn
  if (usedThisTurn) {
    return { eligible: false, reason: 'Already used sneak attack this turn' };
  }

  // Must use finesse or ranged weapon
  if (!isValidSneakAttackWeapon(weapon)) {
    return { eligible: false, reason: 'Invalid weapon (must be finesse or ranged)' };
  }

  // Cannot have disadvantage
  if (hasDisadvantage && !hasAdvantage) {
    return { eligible: false, reason: 'Cannot sneak attack with disadvantage' };
  }

  // Need advantage OR ally within 5ft of target
  const hasNearbyAlly = hasAllyNearTarget(target, allies, positions);
  
  if (!hasAdvantage && !hasNearbyAlly) {
    return { eligible: false, reason: 'Need advantage or ally adjacent to target' };
  }

  // All conditions met!
  const reason = hasAdvantage 
    ? 'Has advantage on attack'
    : 'Ally within 5ft of target';

  return { eligible: true, reason };
}

/**
 * Apply sneak attack to an attack roll
 * Returns updated damage and log
 */
function applySneakAttack(attacker, target, baseDamage, options = {}) {
  const check = checkSneakAttack(attacker, target, options);
  
  if (!check.eligible) {
    return {
      applied: false,
      reason: check.reason,
      totalDamage: baseDamage,
      sneakAttackDamage: 0
    };
  }

  const sneakDamage = rollSneakAttackDamage(attacker.level);
  const totalDamage = baseDamage + sneakDamage.total;

  return {
    applied: true,
    reason: check.reason,
    baseDamage,
    sneakAttackDamage: sneakDamage.total,
    sneakAttackRoll: sneakDamage,
    totalDamage,
    message: `⚔️ SNEAK ATTACK! +${sneakDamage.total} damage (${sneakDamage.breakdown})`
  };
}

/**
 * Mark that sneak attack was used this turn
 */
function markSneakAttackUsed(attacker) {
  if (!attacker.combatState) {
    attacker.combatState = {};
  }
  attacker.combatState.sneakAttackUsed = true;
}

/**
 * Reset sneak attack at start of turn
 */
function resetSneakAttack(attacker) {
  if (attacker.combatState) {
    attacker.combatState.sneakAttackUsed = false;
  }
}

module.exports = {
  getSneakAttackDice,
  rollSneakAttackDamage,
  isValidSneakAttackWeapon,
  hasAllyNearTarget,
  checkSneakAttack,
  applySneakAttack,
  markSneakAttackUsed,
  resetSneakAttack,
  SNEAK_ATTACK_DICE
};
