/**
 * Reactions System
 * Shield, Counterspell, Opportunity Attacks, etc.
 */

const REACTION_TYPES = {
  SHIELD: 'shield',
  COUNTERSPELL: 'counterspell',
  OPPORTUNITY_ATTACK: 'opportunity_attack',
  ABSORB_ELEMENTS: 'absorb_elements',
  HELLISH_REBUKE: 'hellish_rebuke',
  UNCANNY_DODGE: 'uncanny_dodge'
};

/**
 * Initialize reaction state for a combatant
 */
function initReactions(combatant) {
  combatant.reactions = {
    available: true,
    used: null,
    availableReactions: getAvailableReactions(combatant)
  };
  return combatant.reactions;
}

/**
 * Get list of reactions available to a combatant
 */
function getAvailableReactions(combatant) {
  const reactions = [REACTION_TYPES.OPPORTUNITY_ATTACK]; // Everyone gets this
  
  // Check spells known/prepared
  if (combatant.spells?.includes('shield')) {
    reactions.push(REACTION_TYPES.SHIELD);
  }
  if (combatant.spells?.includes('counterspell')) {
    reactions.push(REACTION_TYPES.COUNTERSPELL);
  }
  if (combatant.spells?.includes('absorb elements')) {
    reactions.push(REACTION_TYPES.ABSORB_ELEMENTS);
  }
  if (combatant.spells?.includes('hellish rebuke')) {
    reactions.push(REACTION_TYPES.HELLISH_REBUKE);
  }
  
  // Class abilities
  if (combatant.class?.toLowerCase() === 'rogue' && combatant.level >= 5) {
    reactions.push(REACTION_TYPES.UNCANNY_DODGE);
  }
  
  return reactions;
}

/**
 * Check if reaction is available
 */
function canUseReaction(combatant, reactionType) {
  if (!combatant.reactions) {
    initReactions(combatant);
  }
  
  return combatant.reactions.available && 
         combatant.reactions.availableReactions.includes(reactionType);
}

/**
 * Use Shield spell (reaction, +5 AC until start of your next turn)
 */
function useShield(caster, attack) {
  if (!canUseReaction(caster, REACTION_TYPES.SHIELD)) {
    return { success: false, reason: 'Reaction not available' };
  }
  
  // Check spell slots
  if (!caster.spellSlots?.[1] || caster.spellSlots[1] <= 0) {
    return { success: false, reason: 'No 1st-level spell slots' };
  }
  
  // Use reaction and spell slot
  caster.reactions.available = false;
  caster.reactions.used = REACTION_TYPES.SHIELD;
  caster.spellSlots[1]--;
  
  // Grant +5 AC until start of next turn
  const oldAC = caster.ac || 10;
  caster.ac = oldAC + 5;
  caster.shieldActive = true;
  
  const newToHit = (attack.roll + attack.modifier) - caster.ac;
  const turnedMiss = attack.hit && newToHit < 0;
  
  return {
    success: true,
    oldAC,
    newAC: caster.ac,
    turnedMiss,
    message: turnedMiss 
      ? `🛡️ SHIELD! AC ${oldAC} → ${caster.ac}. Hit becomes MISS!`
      : `🛡️ SHIELD! AC ${oldAC} → ${caster.ac} (still hits)`
  };
}

/**
 * Use Counterspell (reaction, cancel enemy spell)
 */
function useCounterspell(caster, targetSpell, targetCaster) {
  if (!canUseReaction(caster, REACTION_TYPES.COUNTERSPELL)) {
    return { success: false, reason: 'Reaction not available' };
  }
  
  // Check spell slots (minimum 3rd level)
  if (!caster.spellSlots?.[3] || caster.spellSlots[3] <= 0) {
    return { success: false, reason: 'No 3rd-level spell slots' };
  }
  
  // Use reaction and spell slot
  caster.reactions.available = false;
  caster.reactions.used = REACTION_TYPES.COUNTERSPELL;
  caster.spellSlots[3]--;
  
  // Determine if counterspell succeeds
  const spellLevel = targetSpell.level || 1;
  let success = true;
  let abilityCheck = null;
  
  // If target spell is 4th level or higher, need ability check
  if (spellLevel >= 4) {
    const dc = 10 + spellLevel;
    const modifier = Math.floor(((caster.int || 10) - 10) / 2); // Use INT for ability check
    const roll = Math.floor(Math.random() * 20) + 1;
    abilityCheck = {
      roll,
      modifier,
      total: roll + modifier,
      dc,
      success: (roll + modifier) >= dc
    };
    success = abilityCheck.success;
  }
  
  return {
    success: true,
    countered: success,
    abilityCheck,
    message: success
      ? `✨ COUNTERSPELL! ${targetSpell.name} is negated!`
      : `✨ COUNTERSPELL failed! (DC ${abilityCheck.dc}, rolled ${abilityCheck.total})`
  };
}

/**
 * Make opportunity attack (reaction, enemy leaves melee range without Disengage)
 */
function useOpportunityAttack(attacker, target) {
  if (!canUseReaction(attacker, REACTION_TYPES.OPPORTUNITY_ATTACK)) {
    return { success: false, reason: 'Reaction not available' };
  }
  
  // Use reaction
  attacker.reactions.available = false;
  attacker.reactions.used = REACTION_TYPES.OPPORTUNITY_ATTACK;
  
  // Make a melee attack
  const attackBonus = Math.floor(((attacker.str || 10) - 10) / 2) + (attacker.proficiencyBonus || 2);
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + attackBonus;
  const hit = total >= (target.ac || 10);
  
  let damage = 0;
  let damageRoll = null;
  
  if (hit) {
    // Roll weapon damage (assume 1d8 + STR)
    const weaponDie = Math.floor(Math.random() * 8) + 1;
    const strMod = Math.floor(((attacker.str || 10) - 10) / 2);
    damage = weaponDie + strMod;
    damageRoll = { die: weaponDie, modifier: strMod, total: damage };
  }
  
  return {
    success: true,
    attack: {
      roll,
      modifier: attackBonus,
      total,
      hit,
      damage,
      damageRoll
    },
    message: hit
      ? `⚔️ OPPORTUNITY ATTACK! Rolled ${roll}+${attackBonus}=${total} vs AC ${target.ac}. HIT for ${damage} damage!`
      : `⚔️ OPPORTUNITY ATTACK! Rolled ${roll}+${attackBonus}=${total} vs AC ${target.ac}. MISS!`
  };
}

/**
 * Use Uncanny Dodge (Rogue reaction, halve damage from one attack)
 */
function useUncannyDodge(rogue, damage) {
  if (!canUseReaction(rogue, REACTION_TYPES.UNCANNY_DODGE)) {
    return { success: false, reason: 'Reaction not available' };
  }
  
  rogue.reactions.available = false;
  rogue.reactions.used = REACTION_TYPES.UNCANNY_DODGE;
  
  const reducedDamage = Math.floor(damage / 2);
  
  return {
    success: true,
    originalDamage: damage,
    reducedDamage,
    damageReduced: damage - reducedDamage,
    message: `🤸 UNCANNY DODGE! Damage reduced from ${damage} to ${reducedDamage}`
  };
}

/**
 * Reset reactions at start of turn
 */
function resetReactions(combatant) {
  if (!combatant.reactions) {
    initReactions(combatant);
    return;
  }
  
  combatant.reactions.available = true;
  combatant.reactions.used = null;
  
  // Remove Shield spell AC bonus
  if (combatant.shieldActive) {
    combatant.ac -= 5;
    combatant.shieldActive = false;
  }
}

/**
 * Check if enemy is leaving melee range without Disengage (triggers opportunity attack)
 */
function checkOpportunityAttack(mover, enemies, positions) {
  const opportunities = [];
  
  // If mover used Disengage, no opportunity attacks
  if (mover.combatState?.disengaged) {
    return opportunities;
  }
  
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) continue;
    
    const enemyPos = positions[enemy.id];
    const moverOldPos = positions[mover.id + '_previous']; // Store previous position
    const moverNewPos = positions[mover.id];
    
    // Enemy was at melee range, mover is moving away
    if (moverOldPos?.rangeBand === 'melee' && moverNewPos?.rangeBand !== 'melee') {
      if (canUseReaction(enemy, REACTION_TYPES.OPPORTUNITY_ATTACK)) {
        opportunities.push({
          attacker: enemy,
          target: mover
        });
      }
    }
  }
  
  return opportunities;
}

module.exports = {
  REACTION_TYPES,
  initReactions,
  getAvailableReactions,
  canUseReaction,
  useShield,
  useCounterspell,
  useOpportunityAttack,
  useUncannyDodge,
  resetReactions,
  checkOpportunityAttack
};
