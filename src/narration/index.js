/**
 * Caverns & Clawds - Narration System
 * Centralized export for all narration modules
 */

const combatNarration = require('./combat-narration');
const spellNarration = require('./spell-narration');
const environmental = require('./environmental');

module.exports = {
  // Combat narration
  generateAttackNarration: combatNarration.generateAttackNarration,
  generateDeathNarration: combatNarration.generateDeathNarration,
  generateMovementNarration: combatNarration.generateMovementNarration,
  
  // Spell narration
  generateSpellNarration: spellNarration.generateSpellNarration,
  generateHealingNarration: spellNarration.generateHealingNarration,
  generateAoENarration: spellNarration.generateAoENarration,
  
  // Environmental
  generateAtmosphere: environmental.generateAtmosphere,
  getEnvironmentalFlourish: environmental.getEnvironmentalFlourish,
  formatDistance: environmental.formatDistance,
  formatDistanceFromBand: environmental.formatDistanceFromBand,
  
  // Full modules for direct access if needed
  combatNarration,
  spellNarration,
  environmental
};
