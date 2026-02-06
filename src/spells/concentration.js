/**
 * Caverns & Clawds - Concentration System
 * Track concentration spells and handle breaking concentration
 */

const { d20, getMod } = require('../combat');

/**
 * Start concentrating on a spell
 */
function startConcentration(character, spellId, spellName, duration, effects = {}) {
  // Break existing concentration
  if (character.concentration) {
    endConcentration(character);
  }
  
  character.concentration = {
    spellId,
    spellName,
    startTime: Date.now(),
    duration, // in seconds
    effects,
    active: true
  };
  
  return {
    success: true,
    message: `${character.name} begins concentrating on ${spellName}`
  };
}

/**
 * End concentration (spell ends or is broken)
 */
function endConcentration(character, reason = 'spell ended') {
  if (!character.concentration) return;
  
  const spell = character.concentration;
  character.concentration = null;
  
  return {
    spellName: spell.spellName,
    reason,
    message: `${character.name}'s concentration on ${spell.spellName} ends (${reason})`
  };
}

/**
 * Check if concentration should expire due to time
 */
function checkConcentrationExpiry(character) {
  if (!character.concentration) return null;
  
  const { startTime, duration } = character.concentration;
  const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
  
  if (elapsed >= duration) {
    return endConcentration(character, 'duration expired');
  }
  
  return null;
}

/**
 * Make concentration save when damaged
 * DC = max(10, damage / 2)
 */
function concentrationSave(character, damageAmount) {
  if (!character.concentration) return { success: true, message: 'Not concentrating' };
  
  const dc = Math.max(10, Math.floor(damageAmount / 2));
  const conMod = getMod(character.stats?.constitution || character.abilities?.CON || 10);
  const proficiency = character.proficiencyBonus || 2;
  
  // Check for War Caster feat or similar bonuses
  const advantage = character.features?.includes('War Caster') || false;
  
  let roll;
  if (advantage) {
    const roll1 = d20();
    const roll2 = d20();
    roll = Math.max(roll1, roll2);
  } else {
    roll = d20();
  }
  
  const total = roll + conMod + proficiency;
  const success = total >= dc;
  
  if (!success) {
    endConcentration(character, 'concentration broken by damage');
  }
  
  return {
    success,
    roll,
    modifier: conMod + proficiency,
    total,
    dc,
    damage: damageAmount,
    message: success 
      ? `${character.name} maintains concentration (${total} vs DC ${dc})`
      : `${character.name} loses concentration on ${character.concentration?.spellName} (${total} vs DC ${dc})`
  };
}

/**
 * Break concentration (incapacitated, killed, etc.)
 */
function breakConcentration(character, reason = 'incapacitated') {
  if (!character.concentration) return null;
  
  return endConcentration(character, reason);
}

/**
 * Check if character is concentrating on a specific spell
 */
function isConcentratingOn(character, spellId) {
  return character.concentration?.spellId === spellId && character.concentration?.active;
}

/**
 * Get current concentration status
 */
function getConcentrationStatus(character) {
  if (!character.concentration) {
    return { concentrating: false };
  }
  
  const { spellId, spellName, startTime, duration, effects } = character.concentration;
  const elapsed = (Date.now() - startTime) / 1000;
  const remaining = Math.max(0, duration - elapsed);
  
  return {
    concentrating: true,
    spellId,
    spellName,
    elapsedSeconds: elapsed,
    remainingSeconds: remaining,
    durationSeconds: duration,
    effects
  };
}

/**
 * Apply concentration effects to targets/self
 */
function applyConcentrationEffects(character, targets = []) {
  if (!character.concentration) return null;
  
  const { effects } = character.concentration;
  
  // Apply effects based on spell type
  if (effects.buffTargets) {
    // Apply buffs to allies (e.g., Bless, Haste)
    targets.forEach(target => {
      if (effects.acBonus) {
        target.tempAC = (target.tempAC || 0) + effects.acBonus;
      }
      if (effects.attackBonus) {
        target.tempAttackBonus = (target.tempAttackBonus || 0) + effects.attackBonus;
      }
      if (effects.savingThrowBonus) {
        target.tempSaveBonus = (target.tempSaveBonus || 0) + effects.savingThrowBonus;
      }
    });
  }
  
  if (effects.debuffTargets) {
    // Apply debuffs to enemies (e.g., Hex, Hunter's Mark)
    targets.forEach(target => {
      if (effects.extraDamage) {
        target.markedBy = {
          character: character.name,
          damageType: effects.damageType,
          damageDice: effects.extraDamage
        };
      }
      if (effects.disadvantage) {
        target.disadvantageOn = effects.disadvantage; // e.g., 'ability_checks'
      }
    });
  }
  
  return { success: true, effectsApplied: true };
}

/**
 * Remove concentration effects from targets
 */
function removeConcentrationEffects(character, targets = []) {
  if (!character.concentration) return null;
  
  const { effects } = character.concentration;
  
  if (effects.buffTargets) {
    targets.forEach(target => {
      delete target.tempAC;
      delete target.tempAttackBonus;
      delete target.tempSaveBonus;
    });
  }
  
  if (effects.debuffTargets) {
    targets.forEach(target => {
      delete target.markedBy;
      delete target.disadvantageOn;
    });
  }
  
  return { success: true, effectsRemoved: true };
}

module.exports = {
  startConcentration,
  endConcentration,
  checkConcentrationExpiry,
  concentrationSave,
  breakConcentration,
  isConcentratingOn,
  getConcentrationStatus,
  applyConcentrationEffects,
  removeConcentrationEffects
};
