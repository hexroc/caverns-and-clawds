/**
 * Caverns & Clawds - Spell System Index
 * Main entry point for all spell systems
 */

const level1Spells = require('./level1');
const level2Spells = require('./level2');
const spellSlots = require('./spell-slots');
const concentration = require('./concentration');

// Combine all spells into a single registry
const SPELL_REGISTRY = {
  ...level1Spells,
  ...level2Spells
};

// Helper to get spell by ID
function getSpell(spellId) {
  return SPELL_REGISTRY[spellId] || null;
}

// Helper to get all spells by level
function getSpellsByLevel(level) {
  return Object.values(SPELL_REGISTRY).filter(spell => spell.level === level);
}

// Helper to check if spell is available to character
function canCast(character, spellId) {
  const spell = getSpell(spellId);
  if (!spell) return { can: false, reason: 'Spell not found' };
  
  // Check if character has the spell (in spellbook/known spells)
  const hasSpell = character.spells?.includes(spellId) || 
                   character.knownSpells?.includes(spellId);
  
  if (!hasSpell) {
    return { can: false, reason: 'Spell not known' };
  }
  
  // Check spell slot availability
  if (spell.level > 0) {
    const hasSlot = spellSlots.hasSpellSlot(character, spell.level);
    if (!hasSlot) {
      return { can: false, reason: 'No spell slots available' };
    }
  }
  
  // Check concentration
  if (spell.concentration && character.concentration) {
    return { 
      can: true, 
      warning: `Will end concentration on ${character.concentration.spellName}` 
    };
  }
  
  return { can: true };
}

// Main spell casting function
function castSpell(spellId, caster, targets, options = {}) {
  const spell = getSpell(spellId);
  if (!spell) {
    return { success: false, error: 'Spell not found' };
  }
  
  // Check if can cast
  const check = canCast(caster, spellId);
  if (!check.can) {
    return { success: false, error: check.reason };
  }
  
  // Determine slot level (can upcast)
  const slotLevel = options.slotLevel || spell.level;
  if (slotLevel < spell.level) {
    return { success: false, error: 'Cannot cast spell at lower level' };
  }
  
  // Consume spell slot
  if (spell.level > 0) {
    const slotResult = spellSlots.consumeSpellSlot(caster, spell.level, slotLevel);
    if (!slotResult.success) {
      return { success: false, error: slotResult.error };
    }
  }
  
  // Cast the spell
  try {
    const result = spell.cast(caster, targets, slotLevel, options);
    
    // Add spell metadata to result
    result.spellName = spell.name;
    result.spellId = spellId;
    result.spellLevel = spell.level;
    result.slotUsed = slotLevel;
    result.concentration = spell.concentration || false;
    
    return result;
  } catch (error) {
    console.error(`Error casting spell ${spellId}:`, error);
    return { success: false, error: 'Spell casting failed', details: error.message };
  }
}

module.exports = {
  // Spell registry
  SPELL_REGISTRY,
  getSpell,
  getSpellsByLevel,
  
  // Casting
  canCast,
  castSpell,
  
  // Spell slots
  ...spellSlots,
  
  // Concentration
  ...concentration,
  
  // Individual spell exports
  level1: level1Spells,
  level2: level2Spells
};
