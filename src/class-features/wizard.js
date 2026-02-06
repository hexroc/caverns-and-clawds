/**
 * Wizard Class Features
 * Arcane Recovery
 */

/**
 * Arcane Recovery - Recover spell slots on short rest
 * Can recover slots with combined level ≤ INT modifier (minimum 1)
 * Cannot recover 6th level or higher slots
 */
function arcaneRecovery(wizard) {
  // Must be wizard
  const charClass = wizard.class?.toLowerCase() || wizard.class_name?.toLowerCase();
  if (charClass !== 'wizard') {
    return { success: false, error: 'Not a wizard' };
  }
  
  // Check if already used
  if (wizard.arcaneRecoveryUsed) {
    return {
      success: false,
      error: 'Arcane Recovery already used (regain on long rest)'
    };
  }
  
  // Calculate maximum slot levels can recover
  const intMod = Math.floor(((wizard.int || wizard.abilities?.INT || 10) - 10) / 2);
  const maxSlotLevels = Math.max(1, intMod);
  
  if (!wizard.spellSlots) {
    return {
      success: false,
      error: 'No spell slots to recover'
    };
  }
  
  // Find available slots to recover (level 1-5 only)
  const available = {};
  for (let level = 1; level <= 5; level++) {
    if (wizard.spellSlots[level]) {
      const current = wizard.spellSlots[level].current || 0;
      const max = wizard.spellSlots[level].max || 0;
      const canRecover = max - current;
      if (canRecover > 0) {
        available[level] = canRecover;
      }
    }
  }
  
  return {
    success: true,
    type: 'prompt',
    maxSlotLevels,
    availableSlots: available,
    narrative: `You meditate briefly, recovering spell slots with combined level ≤ **${maxSlotLevels}** (INT modifier).`,
    instruction: 'Choose which slots to recover (cannot exceed total level limit)'
  };
}

/**
 * Apply Arcane Recovery choices
 */
function applyArcaneRecovery(wizard, choices) {
  const intMod = Math.floor(((wizard.int || wizard.abilities?.INT || 10) - 10) / 2);
  const maxSlotLevels = Math.max(1, intMod);
  
  // Validate choices
  let totalLevels = 0;
  const recovered = {};
  
  Object.entries(choices).forEach(([level, count]) => {
    const slotLevel = parseInt(level);
    if (slotLevel > 5) {
      throw new Error('Cannot recover 6th level or higher slots');
    }
    totalLevels += slotLevel * count;
    recovered[slotLevel] = count;
  });
  
  if (totalLevels > maxSlotLevels) {
    return {
      success: false,
      error: `Total slot levels (${totalLevels}) exceeds limit (${maxSlotLevels})`
    };
  }
  
  // Apply recovery
  Object.entries(recovered).forEach(([level, count]) => {
    const slotLevel = parseInt(level);
    if (wizard.spellSlots[slotLevel]) {
      wizard.spellSlots[slotLevel].current = Math.min(
        wizard.spellSlots[slotLevel].current + count,
        wizard.spellSlots[slotLevel].max
      );
    }
  });
  
  // Mark as used
  wizard.arcaneRecoveryUsed = true;
  
  return {
    success: true,
    recovered,
    totalLevels,
    narrative: `✨ Arcane Recovery: You recover **${totalLevels}** levels of spell slots.`
  };
}

/**
 * Restore Arcane Recovery on long rest
 */
function restoreArcaneRecovery(wizard) {
  wizard.arcaneRecoveryUsed = false;
  return true;
}

module.exports = {
  arcaneRecovery,
  applyArcaneRecovery,
  restoreArcaneRecovery
};
