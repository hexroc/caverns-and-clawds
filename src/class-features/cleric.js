/**
 * Cleric Class Features
 * Channel Divinity (Turn Undead), Destroy Undead
 */

const { d20, savingThrow } = require('../combat');

/**
 * Turn Undead - Channel Divinity
 * WIS save or flee for 1 minute
 * Uses = 1 at level 2, regain on short rest
 */
function turnUndead(cleric, undead = []) {
  // Must be cleric
  const charClass = cleric.class?.toLowerCase() || cleric.class_name?.toLowerCase();
  if (charClass !== 'cleric') {
    return { success: false, error: 'Not a cleric' };
  }
  
  if (cleric.level < 2) {
    return { success: false, error: 'Channel Divinity unlocks at level 2' };
  }
  
  // Check uses
  if (!cleric.channelDivinityUses || cleric.channelDivinityUses <= 0) {
    return {
      success: false,
      error: 'No Channel Divinity uses remaining (regain on short rest)'
    };
  }
  
  // Calculate save DC
  const wisMod = Math.floor(((cleric.wis || cleric.abilities?.WIS || 10) - 10) / 2);
  const profBonus = cleric.proficiency_bonus || 2;
  const saveDC = 8 + profBonus + wisMod;
  
  // Each undead makes WIS save
  const results = undead.map(creature => {
    const save = savingThrow(creature, 'wis', saveDC);
    
    const turned = !save.success;
    
    if (turned) {
      // Apply turned condition
      if (!creature.conditions) creature.conditions = [];
      creature.conditions.push({
        type: 'turned',
        duration: 10, // 10 rounds = 1 minute
        source: 'Turn Undead',
        effect: 'Must spend turns trying to move away, cannot take reactions, can only Dash or avoid harmful effects'
      });
    }
    
    return {
      name: creature.name,
      cr: creature.cr || 0,
      turned,
      saveRoll: save.roll,
      saveDC,
      saved: save.success
    };
  });
  
  // Mark as used
  cleric.channelDivinityUses -= 1;
  
  const turnedCount = results.filter(r => r.turned).length;
  
  return {
    success: true,
    saveDC,
    results,
    turnedCount,
    totalUndead: undead.length,
    usesRemaining: cleric.channelDivinityUses,
    narrative: `⚡ **TURN UNDEAD!** ${cleric.name || 'The cleric'} presents their holy symbol, channeling divine energy! (DC ${saveDC})\n${turnedCount} of ${undead.length} undead are turned and flee in terror!`
  };
}

/**
 * Destroy Undead - Auto-destroy low CR undead when turned
 * CR threshold increases with level:
 * Level 5: CR 1/2
 * Level 8: CR 1
 * Level 11: CR 2
 * Level 14: CR 3
 * Level 17: CR 4
 */
function destroyUndead(cleric, turnedUndead = []) {
  if (cleric.level < 5) {
    return {
      success: false,
      error: 'Destroy Undead unlocks at level 5'
    };
  }
  
  // Determine CR threshold
  let crThreshold = 0.5; // Level 5
  if (cleric.level >= 17) crThreshold = 4;
  else if (cleric.level >= 14) crThreshold = 3;
  else if (cleric.level >= 11) crThreshold = 2;
  else if (cleric.level >= 8) crThreshold = 1;
  
  // Auto-destroy undead at or below CR threshold
  const destroyed = [];
  const survivors = [];
  
  turnedUndead.forEach(creature => {
    const cr = creature.cr || 0;
    if (cr <= crThreshold) {
      creature.hp = 0;
      creature.alive = false;
      destroyed.push({
        name: creature.name,
        cr
      });
    } else {
      survivors.push({
        name: creature.name,
        cr
      });
    }
  });
  
  return {
    success: true,
    crThreshold,
    destroyed: destroyed.length,
    destroyedList: destroyed,
    survivors: survivors.length,
    narrative: destroyed.length > 0
      ? `💀 **DESTROY UNDEAD!** The divine energy is so powerful that ${destroyed.length} weak undead (CR ≤ ${crThreshold}) are instantly destroyed!`
      : `The turned undead are too powerful to destroy (all above CR ${crThreshold}).`
  };
}

/**
 * Restore Channel Divinity on short or long rest
 */
function restoreChannelDivinity(cleric) {
  // 1 use at level 2-5, 2 uses at 6-17, 3 uses at 18+
  let uses = 1;
  if (cleric.level >= 18) uses = 3;
  else if (cleric.level >= 6) uses = 2;
  
  cleric.channelDivinityUses = uses;
  cleric.channelDivinityMax = uses;
  return uses;
}

/**
 * DB Wrapper: Use Turn Undead
 */
function useTurnUndead(db, characterId) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  if (char.class?.toLowerCase() !== 'cleric') {
    return { success: false, error: 'Only Clerics can use Turn Undead' };
  }
  
  // Get Channel Divinity uses
  let uses = db.prepare('SELECT uses_remaining FROM class_features WHERE character_id = ? AND feature_name = ?')
    .get(characterId, 'Channel Divinity');
  
  if (!uses) {
    // Initialize
    const maxUses = char.level >= 18 ? 3 : char.level >= 6 ? 2 : 1;
    db.prepare(`
      INSERT INTO class_features (character_id, feature_name, uses_remaining, max_uses, recharge_type)
      VALUES (?, 'Channel Divinity', ?, ?, 'short_rest')
    `).run(characterId, maxUses, maxUses);
    uses = { uses_remaining: maxUses };
  }
  
  if (uses.uses_remaining <= 0) {
    return { success: false, error: 'No Channel Divinity uses remaining' };
  }
  
  const mockChar = { level: char.level, wis: 14 }; // Assume 14 WIS
  const result = turnUndead(mockChar);
  
  if (result.success) {
    // Use Channel Divinity
    db.prepare('UPDATE class_features SET uses_remaining = uses_remaining - 1 WHERE character_id = ? AND feature_name = ?')
      .run(characterId, 'Channel Divinity');
  }
  
  return result;
}

/**
 * DB Wrapper: Use Destroy Undead
 */
function useDestroyUndead(db, characterId, undeadCR) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  if (char.class?.toLowerCase() !== 'cleric') {
    return { success: false, error: 'Only Clerics can use Destroy Undead' };
  }
  
  const mockChar = { level: char.level };
  const result = destroyUndead(mockChar, undeadCR);
  
  return result;
}

module.exports = {
  turnUndead,
  destroyUndead,
  restoreChannelDivinity,
  // DB Wrappers
  useTurnUndead,
  useDestroyUndead
};
