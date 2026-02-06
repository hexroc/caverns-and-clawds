/**
 * Caverns & Clawds - Spell Slot Management System
 * Track and restore spell slots per character
 */

// Full caster spell slot progression (Wizard, Sorcerer, Cleric, Druid, Bard)
const FULL_CASTER_SLOTS = {
  1:  { 1: 2 },
  2:  { 1: 3 },
  3:  { 1: 4, 2: 2 },
  4:  { 1: 4, 2: 3 },
  5:  { 1: 4, 2: 3, 3: 2 },
  6:  { 1: 4, 2: 3, 3: 3 },
  7:  { 1: 4, 2: 3, 3: 3, 4: 1 },
  8:  { 1: 4, 2: 3, 3: 3, 4: 2 },
  9:  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }
};

// Half caster progression (Paladin, Ranger)
const HALF_CASTER_SLOTS = {
  1:  {},
  2:  { 1: 2 },
  3:  { 1: 3 },
  4:  { 1: 3 },
  5:  { 1: 4, 2: 2 },
  6:  { 1: 4, 2: 2 },
  7:  { 1: 4, 2: 3 },
  8:  { 1: 4, 2: 3 },
  9:  { 1: 4, 2: 3, 3: 2 },
  10: { 1: 4, 2: 3, 3: 2 },
  11: { 1: 4, 2: 3, 3: 3 },
  12: { 1: 4, 2: 3, 3: 3 },
  13: { 1: 4, 2: 3, 3: 3, 4: 1 },
  14: { 1: 4, 2: 3, 3: 3, 4: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 2 },
  16: { 1: 4, 2: 3, 3: 3, 4: 2 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
};

// Class to caster type mapping
const CASTER_TYPES = {
  tidecaller: 'full',
  shellpriest: 'full',
  shantysinger: 'full',
  depthtouched: 'full',
  crusader: 'half',
  // Default for unknown classes
  default: null
};

/**
 * Get spell slots for a character's level and class
 */
function getMaxSpellSlots(level, characterClass) {
  const casterType = CASTER_TYPES[characterClass?.toLowerCase()] || CASTER_TYPES.default;
  
  if (!casterType) return null; // Non-caster
  
  const progression = casterType === 'full' ? FULL_CASTER_SLOTS : HALF_CASTER_SLOTS;
  return { ...(progression[level] || {}) };
}

/**
 * Initialize spell slots for a character
 */
function initializeSpellSlots(character) {
  const maxSlots = getMaxSpellSlots(character.level || 1, character.class);
  
  if (!maxSlots) {
    character.spellSlots = null;
    return;
  }
  
  character.spellSlots = {
    max: maxSlots,
    current: { ...maxSlots }
  };
}

/**
 * Check if character has spell slot available
 */
function hasSpellSlot(character, spellLevel) {
  if (!character.spellSlots) return false;
  
  // Cantrips don't require slots
  if (spellLevel === 0) return true;
  
  // Check if they have any slot of that level or higher
  for (let level = spellLevel; level <= 9; level++) {
    const current = character.spellSlots.current[level] || 0;
    if (current > 0) return true;
  }
  
  return false;
}

/**
 * Get highest available spell slot level
 */
function getAvailableSlotLevel(character, minLevel) {
  if (!character.spellSlots) return null;
  
  for (let level = minLevel; level <= 9; level++) {
    const current = character.spellSlots.current[level] || 0;
    if (current > 0) return level;
  }
  
  return null;
}

/**
 * Consume a spell slot (uses lowest available at or above spell level)
 */
function consumeSpellSlot(character, spellLevel, preferredSlot = null) {
  if (!character.spellSlots) return { success: false, error: 'Not a spellcaster' };
  
  // Cantrips don't consume slots
  if (spellLevel === 0) return { success: true, slotUsed: 0 };
  
  // Use preferred slot if specified and available
  if (preferredSlot && character.spellSlots.current[preferredSlot] > 0) {
    character.spellSlots.current[preferredSlot]--;
    return { success: true, slotUsed: preferredSlot };
  }
  
  // Find lowest available slot at or above spell level
  for (let level = spellLevel; level <= 9; level++) {
    const current = character.spellSlots.current[level] || 0;
    if (current > 0) {
      character.spellSlots.current[level]--;
      return { success: true, slotUsed: level };
    }
  }
  
  return { success: false, error: `No spell slots available for level ${spellLevel} spell` };
}

/**
 * Restore all spell slots (long rest)
 */
function restoreAllSlots(character) {
  if (!character.spellSlots) return;
  
  character.spellSlots.current = { ...character.spellSlots.max };
}

/**
 * Restore some spell slots (short rest - Warlock pact slots, arcane recovery, etc.)
 */
function restoreSomeSlots(character, slotsToRestore) {
  if (!character.spellSlots) return;
  
  for (const [level, amount] of Object.entries(slotsToRestore)) {
    const slotLevel = parseInt(level);
    const max = character.spellSlots.max[slotLevel] || 0;
    const current = character.spellSlots.current[slotLevel] || 0;
    
    character.spellSlots.current[slotLevel] = Math.min(current + amount, max);
  }
}

/**
 * Get spell slot summary for display
 */
function getSlotSummary(character) {
  if (!character.spellSlots) return null;
  
  const summary = [];
  for (let level = 1; level <= 9; level++) {
    const current = character.spellSlots.current[level] || 0;
    const max = character.spellSlots.max[level] || 0;
    
    if (max > 0) {
      summary.push({
        level,
        current,
        max,
        available: current > 0
      });
    }
  }
  
  return summary;
}

module.exports = {
  getMaxSpellSlots,
  initializeSpellSlots,
  hasSpellSlot,
  getAvailableSlotLevel,
  consumeSpellSlot,
  restoreAllSlots,
  restoreSomeSlots,
  getSlotSummary,
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS,
  CASTER_TYPES
};
