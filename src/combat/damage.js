/**
 * Damage System - Resistances, Immunities, Vulnerabilities
 * Handles damage type modification and temporary HP
 */

const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning',  // Physical
  'fire', 'cold', 'lightning', 'thunder', // Elemental
  'acid', 'poison', 'necrotic', 'radiant', // Magical
  'force', 'psychic'                        // Special
];

/**
 * Apply damage with resistance/immunity/vulnerability consideration
 */
function applyDamage(target, damage, damageType = 'slashing') {
  let finalDamage = damage;
  let modifications = [];

  // Check temporary HP first
  let tempHpAbsorbed = 0;
  if (target.tempHp > 0) {
    tempHpAbsorbed = Math.min(target.tempHp, finalDamage);
    target.tempHp -= tempHpAbsorbed;
    finalDamage -= tempHpAbsorbed;
    modifications.push(`${tempHpAbsorbed} absorbed by temporary HP`);
  }

  // Apply immunity (damage = 0)
  if (target.immunities?.includes(damageType)) {
    modifications.push(`immune to ${damageType}`);
    return {
      original: damage,
      final: 0,
      tempHpAbsorbed,
      remaining: finalDamage,
      modifications,
      immune: true
    };
  }

  // Apply vulnerability (damage x2)
  if (target.vulnerabilities?.includes(damageType)) {
    const beforeVuln = finalDamage;
    finalDamage = finalDamage * 2;
    modifications.push(`vulnerable to ${damageType} (${beforeVuln} → ${finalDamage})`);
  }

  // Apply resistance (damage / 2, rounded down)
  if (target.resistances?.includes(damageType)) {
    const beforeRes = finalDamage;
    finalDamage = Math.floor(finalDamage / 2);
    modifications.push(`resistant to ${damageType} (${beforeRes} → ${finalDamage})`);
  }

  // Apply final damage to HP
  target.hp -= finalDamage;

  return {
    original: damage,
    final: finalDamage,
    tempHpAbsorbed,
    remaining: finalDamage,
    modifications,
    immune: false,
    resistant: target.resistances?.includes(damageType),
    vulnerable: target.vulnerabilities?.includes(damageType)
  };
}

/**
 * Grant temporary HP (doesn't stack - take the higher value)
 */
function grantTempHP(target, amount) {
  const oldTempHP = target.tempHp || 0;
  
  if (amount > oldTempHP) {
    target.tempHp = amount;
    return {
      granted: true,
      amount,
      previous: oldTempHP,
      message: `Gained ${amount} temporary HP${oldTempHP > 0 ? ` (replaced ${oldTempHP})` : ''}`
    };
  }
  
  return {
    granted: false,
    amount: oldTempHP,
    previous: oldTempHP,
    message: `Kept existing ${oldTempHP} temporary HP (new amount ${amount} was lower)`
  };
}

/**
 * Remove temporary HP (e.g., at end of encounter)
 */
function removeTempHP(target) {
  const amount = target.tempHp || 0;
  target.tempHp = 0;
  return { removed: amount };
}

/**
 * Add resistance to a creature
 */
function addResistance(target, damageType) {
  if (!target.resistances) {
    target.resistances = [];
  }
  if (!target.resistances.includes(damageType)) {
    target.resistances.push(damageType);
    return { added: true, damageType };
  }
  return { added: false, damageType, reason: 'Already resistant' };
}

/**
 * Add immunity to a creature
 */
function addImmunity(target, damageType) {
  if (!target.immunities) {
    target.immunities = [];
  }
  if (!target.immunities.includes(damageType)) {
    target.immunities.push(damageType);
    return { added: true, damageType };
  }
  return { added: false, damageType, reason: 'Already immune' };
}

/**
 * Add vulnerability to a creature
 */
function addVulnerability(target, damageType) {
  if (!target.vulnerabilities) {
    target.vulnerabilities = [];
  }
  if (!target.vulnerabilities.includes(damageType)) {
    target.vulnerabilities.push(damageType);
    return { added: true, damageType };
  }
  return { added: false, damageType, reason: 'Already vulnerable' };
}

/**
 * Remove resistance/immunity/vulnerability
 */
function removeDamageModifier(target, damageType, modifierType = 'resistance') {
  const key = modifierType === 'resistance' ? 'resistances' 
            : modifierType === 'immunity' ? 'immunities'
            : 'vulnerabilities';
  
  if (!target[key]) return { removed: false };
  
  const index = target[key].indexOf(damageType);
  if (index > -1) {
    target[key].splice(index, 1);
    return { removed: true, damageType, modifierType };
  }
  
  return { removed: false, damageType, modifierType };
}

/**
 * Get all damage modifiers for a creature
 */
function getDamageModifiers(target) {
  return {
    resistances: target.resistances || [],
    immunities: target.immunities || [],
    vulnerabilities: target.vulnerabilities || [],
    tempHp: target.tempHp || 0
  };
}

/**
 * Check if damage type is physical (for certain spell/ability interactions)
 */
function isPhysicalDamage(damageType) {
  return ['slashing', 'piercing', 'bludgeoning'].includes(damageType);
}

/**
 * Check if damage type is magical (for certain spell/ability interactions)
 */
function isMagicalDamage(damageType) {
  return ['fire', 'cold', 'lightning', 'thunder', 'acid', 'poison', 
          'necrotic', 'radiant', 'force', 'psychic'].includes(damageType);
}

module.exports = {
  DAMAGE_TYPES,
  applyDamage,
  grantTempHP,
  removeTempHP,
  addResistance,
  addImmunity,
  addVulnerability,
  removeDamageModifier,
  getDamageModifiers,
  isPhysicalDamage,
  isMagicalDamage
};
