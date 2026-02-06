/**
 * Caverns & Clawds - Spell Utilities
 * Shared helpers for spell mechanics
 */

const { roll, d20, getMod, getProficiencyBonus, savingThrow } = require('../combat');

/**
 * Calculate spell save DC for a character
 * Formula: 8 + proficiency bonus + spellcasting ability modifier
 */
function calculateSpellSaveDC(character) {
  const level = character.level || character.stats?.level || 1;
  const profBonus = getProficiencyBonus(level);
  
  // Determine spellcasting ability by class
  const className = (character.class || character.stats?.class || 'wizard').toLowerCase();
  let spellcastingAbility;
  
  if (['wizard', 'artificer'].includes(className)) {
    spellcastingAbility = character.stats?.intelligence || 10;
  } else if (['cleric', 'druid', 'ranger'].includes(className)) {
    spellcastingAbility = character.stats?.wisdom || 10;
  } else if (['bard', 'sorcerer', 'warlock', 'paladin'].includes(className)) {
    spellcastingAbility = character.stats?.charisma || 10;
  } else {
    // Default to intelligence
    spellcastingAbility = character.stats?.intelligence || 10;
  }
  
  const spellcastingMod = getMod(spellcastingAbility);
  
  return 8 + profBonus + spellcastingMod;
}

/**
 * Calculate spell attack bonus for a character
 * Formula: proficiency bonus + spellcasting ability modifier
 */
function calculateSpellAttackBonus(character) {
  const level = character.level || character.stats?.level || 1;
  const profBonus = getProficiencyBonus(level);
  
  // Determine spellcasting ability by class
  const className = (character.class || character.stats?.class || 'wizard').toLowerCase();
  let spellcastingAbility;
  
  if (['wizard', 'artificer'].includes(className)) {
    spellcastingAbility = character.stats?.intelligence || 10;
  } else if (['cleric', 'druid', 'ranger'].includes(className)) {
    spellcastingAbility = character.stats?.wisdom || 10;
  } else if (['bard', 'sorcerer', 'warlock', 'paladin'].includes(className)) {
    spellcastingAbility = character.stats?.charisma || 10;
  } else {
    // Default to intelligence
    spellcastingAbility = character.stats?.intelligence || 10;
  }
  
  const spellcastingMod = getMod(spellcastingAbility);
  
  return profBonus + spellcastingMod;
}

/**
 * Get scaled cantrip damage dice based on caster level
 * Cantrips scale at levels 5, 11, and 17
 */
function getScaledCantripDice(baseDice, level) {
  const diceCount = baseDice.match(/^(\d+)d/)?.[1] || '1';
  const diceSize = baseDice.match(/d(\d+)/)?.[1] || '8';
  
  let multiplier = 1;
  if (level >= 17) multiplier = 4;
  else if (level >= 11) multiplier = 3;
  else if (level >= 5) multiplier = 2;
  
  return `${parseInt(diceCount) * multiplier}d${diceSize}`;
}

/**
 * Roll a spell attack
 */
function rollSpellAttack(attacker, defender, advantage = false, disadvantage = false) {
  // Roll d20 with advantage/disadvantage
  let attackRoll;
  if (advantage && !disadvantage) {
    const r1 = d20();
    const r2 = d20();
    attackRoll = { result: Math.max(r1, r2), rolls: [r1, r2], type: 'advantage' };
  } else if (disadvantage && !advantage) {
    const r1 = d20();
    const r2 = d20();
    attackRoll = { result: Math.min(r1, r2), rolls: [r1, r2], type: 'disadvantage' };
  } else {
    const r = d20();
    attackRoll = { result: r, rolls: [r], type: 'normal' };
  }
  
  const isCrit = attackRoll.result === 20;
  const isCritFail = attackRoll.result === 1;
  
  const attackBonus = calculateSpellAttackBonus(attacker);
  const totalAttack = attackRoll.result + attackBonus;
  const defenderAC = defender.ac || defender.stats?.ac || 10;
  
  // Critical always hits, critical fail always misses
  const hits = isCrit || (!isCritFail && totalAttack >= defenderAC);
  
  return {
    attackRoll,
    attackBonus,
    totalAttack,
    defenderAC,
    hits,
    isCrit,
    isCritFail
  };
}

/**
 * Roll spell damage with optional critical hit
 */
function rollSpellDamage(damageDice, isCrit = false) {
  const damageResult = roll(damageDice);
  let totalDamage = damageResult.total;
  let damageRolls = { normal: damageResult.rolls };
  
  // Critical hit doubles the dice
  if (isCrit) {
    const critBonus = roll(damageDice);
    totalDamage += critBonus.total;
    damageRolls.critical = critBonus.rolls;
  }
  
  return {
    damage: totalDamage,
    rolls: damageRolls
  };
}

/**
 * Resolve a spell save with half damage on success
 */
function resolveSpellSave(caster, target, saveAbility, damageDice, options = {}) {
  const dc = calculateSpellSaveDC(caster);
  const save = savingThrow(target, saveAbility, dc);
  
  const damageResult = roll(damageDice);
  const fullDamage = damageResult.total;
  const actualDamage = save.success && !options.noHalfDamage ? Math.floor(fullDamage / 2) : fullDamage;
  
  return {
    save,
    dc,
    damage: actualDamage,
    fullDamage,
    rolls: damageResult.rolls,
    savedForHalf: save.success && !options.noHalfDamage
  };
}

/**
 * Check if target is in range
 * Range in feet, distances calculated from hex positions
 */
function isInRange(casterPos, targetPos, rangeInFeet) {
  // For now, simple implementation - assume targets are in range
  // TODO: Coordinate with positioning system
  return true;
}

/**
 * Apply status effect to target
 */
function applyStatusEffect(target, effect) {
  if (!target.conditions) {
    target.conditions = [];
  }
  
  if (!target.conditions.includes(effect.type)) {
    target.conditions.push(effect.type);
  }
  
  // Store effect details
  if (!target.activeEffects) {
    target.activeEffects = {};
  }
  
  target.activeEffects[effect.type] = {
    ...effect,
    appliedAt: Date.now()
  };
  
  return target;
}

/**
 * Remove status effect from target
 */
function removeStatusEffect(target, effectType) {
  if (target.conditions) {
    target.conditions = target.conditions.filter(c => c !== effectType);
  }
  
  if (target.activeEffects) {
    delete target.activeEffects[effectType];
  }
  
  return target;
}

/**
 * Check if target has a specific damage resistance
 */
function hasResistance(target, damageType) {
  return target.resistances?.includes(damageType) || false;
}

/**
 * Check if target has a specific damage immunity
 */
function hasImmunity(target, damageType) {
  return target.immunities?.includes(damageType) || false;
}

/**
 * Check if target has a specific damage vulnerability
 */
function hasVulnerability(target, damageType) {
  return target.vulnerabilities?.includes(damageType) || false;
}

/**
 * Apply damage with resistance/immunity/vulnerability
 */
function applyDamageWithResistances(target, damage, damageType) {
  if (hasImmunity(target, damageType)) {
    return {
      actualDamage: 0,
      modified: true,
      modifier: 'immune'
    };
  }
  
  let actualDamage = damage;
  let modifier = null;
  
  if (hasResistance(target, damageType)) {
    actualDamage = Math.floor(damage / 2);
    modifier = 'resistant';
  } else if (hasVulnerability(target, damageType)) {
    actualDamage = damage * 2;
    modifier = 'vulnerable';
  }
  
  return {
    actualDamage,
    modified: modifier !== null,
    modifier
  };
}

module.exports = {
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  getScaledCantripDice,
  rollSpellAttack,
  rollSpellDamage,
  resolveSpellSave,
  isInRange,
  applyStatusEffect,
  removeStatusEffect,
  hasResistance,
  hasImmunity,
  hasVulnerability,
  applyDamageWithResistances
};
