/**
 * Paladin Class Features
 * Divine Smite, Lay on Hands, Divine Sense, Fighting Styles
 */

const { roll } = require('../combat');

/**
 * Divine Smite - Spend spell slot for extra radiant damage on hit
 * Level 1 slot: 2d8 radiant (+1d8 vs undead/fiend)
 * Level 2 slot: 3d8 radiant (+1d8 vs undead/fiend)
 * Level 3 slot: 4d8 radiant (+1d8 vs undead/fiend)
 * Max 5d8 base damage
 */
function divineSmite(spellLevel, targetType = 'normal') {
  if (!spellLevel || spellLevel < 1) {
    return {
      success: false,
      error: 'Must spend a spell slot of level 1 or higher'
    };
  }
  
  // Base damage: 2d8 for level 1, +1d8 per level above 1st (max 5d8)
  let numDice = Math.min(2 + (spellLevel - 1), 5);
  
  // +1d8 against undead or fiends
  const bonusTargets = ['undead', 'fiend'];
  if (bonusTargets.includes(targetType.toLowerCase())) {
    numDice += 1;
  }
  
  // Roll damage
  let totalDamage = 0;
  const rolls = [];
  
  for (let i = 0; i < numDice; i++) {
    const die = roll(8);
    rolls.push(die);
    totalDamage += die;
  }
  
  return {
    success: true,
    damage: totalDamage,
    damageType: 'radiant',
    dice: `${numDice}d8`,
    rolls,
    spellLevel,
    bonusVsEvil: bonusTargets.includes(targetType.toLowerCase()),
    narrative: `Divine power surges through your weapon, dealing **${totalDamage} radiant damage**!${bonusTargets.includes(targetType.toLowerCase()) ? ' (Bonus vs ' + targetType + ')' : ''}`
  };
}

/**
 * Lay on Hands - Healing pool (paladin level × 5 HP)
 * Can spend any amount up to remaining pool
 * Can cure one disease or poison (costs 5 HP from pool)
 */
function layOnHands(character, target, hpToSpend, cureDisease = false) {
  // Initialize pool if not present
  if (!character.layOnHandsPool) {
    character.layOnHandsPool = character.level * 5;
  }
  
  if (cureDisease) {
    if (character.layOnHandsPool < 5) {
      return {
        success: false,
        error: 'Not enough Lay on Hands HP remaining (need 5 to cure disease)'
      };
    }
    
    character.layOnHandsPool -= 5;
    
    // Remove disease/poison condition
    if (target.conditions) {
      target.conditions = target.conditions.filter(c => 
        !['poisoned', 'diseased'].includes(c.type)
      );
    }
    
    return {
      success: true,
      type: 'cure',
      poolRemaining: character.layOnHandsPool,
      narrative: `You lay hands upon ${target.name}, curing their disease or poison with divine magic.`
    };
  }
  
  // Healing
  if (hpToSpend > character.layOnHandsPool) {
    return {
      success: false,
      error: `Not enough Lay on Hands HP remaining (have ${character.layOnHandsPool}, need ${hpToSpend})`
    };
  }
  
  if (hpToSpend < 1) {
    return {
      success: false,
      error: 'Must spend at least 1 HP from pool'
    };
  }
  
  // Apply healing
  const oldHP = target.hp || target.hp_current;
  const maxHP = target.maxHp || target.hp_max;
  const newHP = Math.min(oldHP + hpToSpend, maxHP);
  const actualHealing = newHP - oldHP;
  
  if (target.hp !== undefined) target.hp = newHP;
  if (target.hp_current !== undefined) target.hp_current = newHP;
  
  character.layOnHandsPool -= hpToSpend;
  
  return {
    success: true,
    type: 'heal',
    healing: actualHealing,
    poolSpent: hpToSpend,
    poolRemaining: character.layOnHandsPool,
    oldHP,
    newHP,
    narrative: `You lay hands upon ${target.name}, healing **${actualHealing} HP** with divine energy.`
  };
}

/**
 * Restore Lay on Hands pool on long rest
 */
function restoreLayOnHands(character) {
  const maxPool = character.level * 5;
  character.layOnHandsPool = maxPool;
  return maxPool;
}

/**
 * Divine Sense - Detect celestials, fiends, undead within 60ft
 * CHA modifier uses per long rest (minimum 1)
 */
function divineSense(character, nearbyCreatures = []) {
  // Initialize uses
  if (character.divineSenseUses === undefined) {
    const chaMod = Math.floor((character.cha || character.abilities?.CHA || 10) - 10) / 2;
    character.divineSenseUses = Math.max(1, chaMod);
    character.divineSenseMax = character.divineSenseUses;
  }
  
  if (character.divineSenseUses <= 0) {
    return {
      success: false,
      error: 'No Divine Sense uses remaining (regain on long rest)'
    };
  }
  
  // Detect celestials, fiends, undead, consecrated/desecrated objects
  const detectableTypes = ['celestial', 'fiend', 'undead'];
  const detected = nearbyCreatures.filter(creature => 
    detectableTypes.includes(creature.type?.toLowerCase()) ||
    creature.consecrated ||
    creature.desecrated
  );
  
  character.divineSenseUses -= 1;
  
  return {
    success: true,
    detected: detected.length,
    creatures: detected.map(c => ({
      name: c.name,
      type: c.type,
      location: c.location || 'nearby',
      consecrated: c.consecrated,
      desecrated: c.desecrated
    })),
    usesRemaining: character.divineSenseUses,
    narrative: detected.length > 0
      ? `Your divine sense reveals ${detected.length} presence(s) of otherworldly power: ${detected.map(c => c.name).join(', ')}`
      : 'Your divine sense reveals no celestials, fiends, or undead nearby.'
  };
}

/**
 * Restore Divine Sense on long rest
 */
function restoreDivineSense(character) {
  const chaMod = Math.floor(((character.cha || character.abilities?.CHA || 10) - 10) / 2);
  const uses = Math.max(1, chaMod);
  character.divineSenseUses = uses;
  character.divineSenseMax = uses;
  return uses;
}

/**
 * Check if character can use Divine Smite
 */
function canDivineSmite(character) {
  // Must be paladin
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'paladin') {
    return { can: false, reason: 'Not a paladin' };
  }
  
  // Must be level 2+
  if (character.level < 2) {
    return { can: false, reason: 'Divine Smite unlocks at level 2' };
  }
  
  // Must have spell slots
  if (!character.spellSlots || Object.keys(character.spellSlots).length === 0) {
    return { can: false, reason: 'No spell slots available' };
  }
  
  // Find lowest available slot
  for (let level = 1; level <= 5; level++) {
    if (character.spellSlots[level] && character.spellSlots[level].current > 0) {
      return { 
        can: true, 
        lowestSlot: level,
        slotsAvailable: character.spellSlots[level].current
      };
    }
  }
  
  return { can: false, reason: 'No spell slots remaining' };
}

/**
 * DB Wrapper: Use Divine Smite
 */
function useDivineSmite(db, characterId, encounter, targetId, spellLevel = 1) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  // Check if paladin
  if (char.class?.toLowerCase() !== 'paladin') {
    return { success: false, error: 'Only Paladins can use Divine Smite' };
  }
  
  // Check spell slot
  const slotColumn = `spell_slots_${spellLevel}`;
  const slots = char[slotColumn] || 0;
  
  if (slots <= 0) {
    return { success: false, error: `No level ${spellLevel} spell slots remaining` };
  }
  
  // Find target
  const target = encounter.monsters?.find(m => m.id === targetId);
  const targetType = target?.type || 'normal';
  
  // Use Divine Smite
  const result = divineSmite(spellLevel, targetType);
  
  if (result.success) {
    // Spend spell slot
    db.prepare(`UPDATE clawds SET ${slotColumn} = ${slotColumn} - 1 WHERE id = ?`).run(characterId);
    
    // Apply damage to target if in encounter
    if (target) {
      target.hp -= result.damage;
    }
  }
  
  return result;
}

/**
 * DB Wrapper: Use Lay on Hands
 */
function useLayOnHands(db, characterId, targetId, hpToSpend, cureDisease = false) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  // Check if paladin
  if (char.class?.toLowerCase() !== 'paladin') {
    return { success: false, error: 'Only Paladins can use Lay on Hands' };
  }
  
  // Get pool
  let pool = db.prepare('SELECT uses_remaining FROM class_features WHERE character_id = ? AND feature_name = ?')
    .get(characterId, 'Lay on Hands');
  
  if (!pool) {
    // Initialize
    const maxPool = char.level * 5;
    db.prepare(`
      INSERT INTO class_features (character_id, feature_name, uses_remaining, max_uses, recharge_type)
      VALUES (?, 'Lay on Hands', ?, ?, 'long_rest')
    `).run(characterId, maxPool, maxPool);
    pool = { uses_remaining: maxPool };
  }
  
  if (pool.uses_remaining < hpToSpend || (cureDisease && pool.uses_remaining < 5)) {
    return { success: false, error: 'Not enough Lay on Hands HP remaining' };
  }
  
  // Get target
  const target = db.prepare('SELECT * FROM clawds WHERE id = ?').get(targetId);
  if (!target) {
    return { success: false, error: 'Target not found' };
  }
  
  // Use Lay on Hands
  const mockChar = { level: char.level, layOnHandsPool: pool.uses_remaining };
  const mockTarget = { name: target.name, hp_current: target.hp_current, hp_max: target.hp_max };
  
  const result = layOnHands(mockChar, mockTarget, hpToSpend, cureDisease);
  
  if (result.success) {
    // Update pool
    db.prepare('UPDATE class_features SET uses_remaining = ? WHERE character_id = ? AND feature_name = ?')
      .run(mockChar.layOnHandsPool, characterId, 'Lay on Hands');
    
    // Update target HP if healing
    if (result.type === 'heal') {
      db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(mockTarget.hp_current, targetId);
    }
  }
  
  return result;
}

/**
 * DB Wrapper: Use Divine Sense
 */
function useDivineSense(db, characterId, nearbyCreatures = []) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  // Check if paladin
  if (char.class?.toLowerCase() !== 'paladin') {
    return { success: false, error: 'Only Paladins can use Divine Sense' };
  }
  
  // Get uses
  let uses = db.prepare('SELECT uses_remaining FROM class_features WHERE character_id = ? AND feature_name = ?')
    .get(characterId, 'Divine Sense');
  
  if (!uses) {
    // Initialize (1 + CHA mod, min 1)
    const chaMod = 4; // Default CHA mod
    const maxUses = Math.max(1, 1 + chaMod);
    db.prepare(`
      INSERT INTO class_features (character_id, feature_name, uses_remaining, max_uses, recharge_type)
      VALUES (?, 'Divine Sense', ?, ?, 'long_rest')
    `).run(characterId, maxUses, maxUses);
    uses = { uses_remaining: maxUses };
  }
  
  if (uses.uses_remaining <= 0) {
    return { success: false, error: 'No Divine Sense uses remaining' };
  }
  
  // Use Divine Sense
  const mockChar = { divineSenseUses: uses.uses_remaining };
  const result = divineSense(mockChar, nearbyCreatures);
  
  if (result.success) {
    // Update uses
    db.prepare('UPDATE class_features SET uses_remaining = uses_remaining - 1 WHERE character_id = ? AND feature_name = ?')
      .run(characterId, 'Divine Sense');
  }
  
  return result;
}

module.exports = {
  divineSmite,
  canDivineSmite,
  layOnHands,
  restoreLayOnHands,
  divineSense,
  restoreDivineSense,
  // DB Wrappers
  useDivineSmite,
  useLayOnHands,
  useDivineSense
};
