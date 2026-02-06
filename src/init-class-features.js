/**
 * Initialize class features for a newly created character
 */

const db = require('./db');

function initClassFeatures(characterId, characterClass, level, stats) {
  const updates = {};
  
  const charClass = characterClass.toLowerCase();
  const chaMod = Math.floor((stats.cha - 10) / 2);
  const intMod = Math.floor((stats.int - 10) / 2);
  const wisMod = Math.floor((stats.wis - 10) / 2);
  
  // Fighter features
  if (charClass === 'fighter') {
    updates.second_wind_available = 1;
    updates.action_surge_uses = level >= 2 ? (level >= 17 ? 2 : 1) : 0;
    updates.action_surge_max = level >= 2 ? (level >= 17 ? 2 : 1) : 0;
  }
  
  // Paladin features
  if (charClass === 'paladin') {
    updates.lay_on_hands_pool = level * 5;
    updates.divine_sense_uses = Math.max(1, chaMod);
    updates.divine_sense_max = Math.max(1, chaMod);
  }
  
  // Bard features
  if (charClass === 'bard') {
    updates.bardic_inspiration_uses = Math.max(1, chaMod);
    updates.bardic_inspiration_max = Math.max(1, chaMod);
  }
  
  // Cleric features
  if (charClass === 'cleric') {
    let uses = 1;
    if (level >= 18) uses = 3;
    else if (level >= 6) uses = 2;
    
    updates.channel_divinity_uses = level >= 2 ? uses : 0;
    updates.channel_divinity_max = level >= 2 ? uses : 0;
  }
  
  // Wizard features
  if (charClass === 'wizard') {
    updates.arcane_recovery_used = 0;
  }
  
  // Build UPDATE SQL
  if (Object.keys(updates).length > 0) {
    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    db.prepare(`UPDATE clawds SET ${setClauses} WHERE id = ?`)
      .run(...values, characterId);
    
    console.log(`✅ Initialized ${charClass} features for character ${characterId}`);
  }
  
  return updates;
}

/**
 * Update class features on level up
 */
function updateClassFeaturesOnLevelUp(characterId, characterClass, newLevel, stats) {
  // Re-initialize with new level
  return initClassFeatures(characterId, characterClass, newLevel, stats);
}

module.exports = {
  initClassFeatures,
  updateClassFeaturesOnLevelUp
};
