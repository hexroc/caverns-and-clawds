/**
 * Rogue Class Features
 * Expertise, Uncanny Dodge (Cunning Action and Sneak Attack already in combat.js)
 */

/**
 * Expertise - Double proficiency bonus on chosen skills
 * Choose 2 skills at level 1, 2 more at level 6
 */
function applyExpertise(character, skillCheck) {
  if (!character.expertise || character.expertise.length === 0) {
    return { active: false, bonus: 0 };
  }
  
  // Check if this skill has expertise
  if (!character.expertise.includes(skillCheck.skill)) {
    return { active: false, bonus: 0 };
  }
  
  // Double proficiency bonus
  const profBonus = character.proficiency_bonus || 2;
  const expertiseBonus = profBonus; // Add another proficiency bonus (total = 2x)
  
  return {
    active: true,
    bonus: expertiseBonus,
    totalProficiency: profBonus * 2,
    narrative: `⭐ Expertise: +${profBonus * 2} to ${skillCheck.skill}`
  };
}

/**
 * Initialize expertise choices
 */
function initExpertise(character) {
  const numChoices = character.level >= 6 ? 4 : 2;
  
  if (!character.expertise) {
    character.expertise = [];
  }
  
  return {
    numChoices,
    available: character.skills || character.proficiencies || [],
    current: character.expertise
  };
}

/**
 * Uncanny Dodge - Reaction to halve damage when hit
 * Level 5 feature, reaction
 */
function uncannyDodge(character, incomingDamage) {
  // Must be rogue level 5+
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'rogue') {
    return { success: false, error: 'Not a rogue' };
  }
  
  if (character.level < 5) {
    return { success: false, error: 'Uncanny Dodge unlocks at level 5' };
  }
  
  // Check if reaction available
  if (character.reactionUsed) {
    return {
      success: false,
      error: 'Reaction already used this round'
    };
  }
  
  // Halve the damage
  const originalDamage = incomingDamage;
  const halvedDamage = Math.floor(originalDamage / 2);
  const damageReduced = originalDamage - halvedDamage;
  
  // Mark reaction as used
  character.reactionUsed = true;
  
  return {
    success: true,
    originalDamage,
    finalDamage: halvedDamage,
    damageReduced,
    narrative: `⚡ **UNCANNY DODGE!** ${character.name || 'The rogue'} twists at the last second, reducing damage from **${originalDamage}** to **${halvedDamage}**!`
  };
}

/**
 * Check if character can use Uncanny Dodge
 */
function canUncannyDodge(character) {
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'rogue') {
    return { can: false, reason: 'Not a rogue' };
  }
  
  if (character.level < 5) {
    return { can: false, reason: 'Uncanny Dodge unlocks at level 5' };
  }
  
  if (character.reactionUsed) {
    return { can: false, reason: 'Reaction already used this round' };
  }
  
  return { can: true };
}

/**
 * DB Wrapper: Use Uncanny Dodge
 */
function useUncannyDodge(db, characterId, incomingDamage) {
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  if (char.class?.toLowerCase() !== 'rogue') {
    return { success: false, error: 'Only Rogues can use Uncanny Dodge' };
  }
  
  // Get uses
  let uses = db.prepare('SELECT uses_remaining FROM class_features WHERE character_id = ? AND feature_name = ?')
    .get(characterId, 'Uncanny Dodge');
  
  if (!uses) {
    // Initialize (1 per round, resets each turn)
    db.prepare(`
      INSERT INTO class_features (character_id, feature_name, uses_remaining, max_uses, recharge_type)
      VALUES (?, 'Uncanny Dodge', 1, 1, 'reaction')
    `).run(characterId);
    uses = { uses_remaining: 1 };
  }
  
  if (uses.uses_remaining <= 0) {
    return { success: false, error: 'Uncanny Dodge already used this round' };
  }
  
  const mockChar = { level: char.level };
  const result = uncannyDodge(mockChar, incomingDamage);
  
  if (result.success) {
    // Use reaction
    db.prepare('UPDATE class_features SET uses_remaining = 0 WHERE character_id = ? AND feature_name = ?')
      .run(characterId, 'Uncanny Dodge');
  }
  
  return result;
}

module.exports = {
  applyExpertise,
  initExpertise,
  uncannyDodge,
  canUncannyDodge,
  // DB Wrappers
  useUncannyDodge
};
