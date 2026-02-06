/**
 * Bard Class Features
 * Bardic Inspiration, Jack of All Trades, Song of Rest, Font of Inspiration
 */

const { roll } = require('../combat');

/**
 * Bardic Inspiration - Give ally inspiration die to add to d20 roll
 * d6 at level 1, d8 at level 5, d10 at level 10, d12 at level 15
 * CHA modifier uses per long rest (Font of Inspiration: short rest at level 5)
 */
function bardicInspiration(bard, target) {
  // Initialize uses
  if (bard.bardicInspirationUses === undefined) {
    const chaMod = Math.floor(((bard.cha || bard.abilities?.CHA || 10) - 10) / 2);
    bard.bardicInspirationUses = Math.max(1, chaMod);
    bard.bardicInspirationMax = bard.bardicInspirationUses;
  }
  
  if (bard.bardicInspirationUses <= 0) {
    return {
      success: false,
      error: 'No Bardic Inspiration uses remaining'
    };
  }
  
  // Must be bard
  const charClass = bard.class?.toLowerCase() || bard.class_name?.toLowerCase();
  if (charClass !== 'bard') {
    return { success: false, error: 'Not a bard' };
  }
  
  // Determine die size based on level
  let dieSize = 6;
  if (bard.level >= 15) dieSize = 12;
  else if (bard.level >= 10) dieSize = 10;
  else if (bard.level >= 5) dieSize = 8;
  
  // Grant inspiration to target
  if (!target.inspirations) {
    target.inspirations = [];
  }
  
  target.inspirations.push({
    type: 'bardic',
    die: `d${dieSize}`,
    dieSize,
    source: bard.name || bard.id,
    used: false
  });
  
  bard.bardicInspirationUses -= 1;
  
  return {
    success: true,
    die: `d${dieSize}`,
    dieSize,
    target: target.name || target.id,
    usesRemaining: bard.bardicInspirationUses,
    narrative: `🎵 ${bard.name || 'The bard'} inspires ${target.name || 'you'} with stirring words! They gain a **d${dieSize}** Bardic Inspiration die.`
  };
}

/**
 * Use Bardic Inspiration die (called by inspired character)
 */
function useBardicInspiration(character, rollType = 'd20') {
  if (!character.inspirations || character.inspirations.length === 0) {
    return {
      success: false,
      error: 'No Bardic Inspiration to use'
    };
  }
  
  // Find first unused inspiration
  const inspiration = character.inspirations.find(i => !i.used && i.type === 'bardic');
  if (!inspiration) {
    return {
      success: false,
      error: 'No unused Bardic Inspiration'
    };
  }
  
  // Roll the inspiration die
  const inspirationRoll = roll(inspiration.dieSize);
  
  // Mark as used
  inspiration.used = true;
  
  // Clean up used inspirations
  character.inspirations = character.inspirations.filter(i => !i.used);
  
  return {
    success: true,
    bonus: inspirationRoll,
    die: inspiration.die,
    narrative: `✨ You use your Bardic Inspiration (${inspiration.die}), rolling **${inspirationRoll}**!`
  };
}

/**
 * Restore Bardic Inspiration uses
 */
function restoreBardicInspiration(bard, restType = 'long') {
  const chaMod = Math.floor(((bard.cha || bard.abilities?.CHA || 10) - 10) / 2);
  const uses = Math.max(1, chaMod);
  
  // Font of Inspiration (level 5): regain on short rest
  if (restType === 'short' && bard.level < 5) {
    return 0; // No recovery on short rest until level 5
  }
  
  bard.bardicInspirationUses = uses;
  bard.bardicInspirationMax = uses;
  return uses;
}

/**
 * Jack of All Trades - Add half proficiency bonus to non-proficient ability checks
 * Level 2 feature
 */
function jackOfAllTrades(bard, abilityCheck) {
  if (bard.level < 2) {
    return { active: false, bonus: 0 };
  }
  
  // Check if already proficient in this skill
  const isProficient = bard.proficiencies?.includes(abilityCheck.skill) ||
                       bard.skills?.includes(abilityCheck.skill);
  
  if (isProficient) {
    return { active: false, bonus: 0, reason: 'Already proficient' };
  }
  
  // Add half proficiency bonus (rounded down)
  const profBonus = bard.proficiency_bonus || 2;
  const bonus = Math.floor(profBonus / 2);
  
  return {
    active: true,
    bonus,
    narrative: `🎭 Jack of All Trades: +${bonus} to the check`
  };
}

/**
 * Song of Rest - Extra healing during short rest
 * d6 at level 2, d8 at level 9, d10 at level 13, d12 at level 17
 */
function songOfRest(bard, allies = []) {
  if (bard.level < 2) {
    return {
      success: false,
      error: 'Song of Rest unlocks at level 2'
    };
  }
  
  // Determine die size
  let dieSize = 6;
  if (bard.level >= 17) dieSize = 12;
  else if (bard.level >= 13) dieSize = 10;
  else if (bard.level >= 9) dieSize = 8;
  
  // Roll healing for each ally
  const healing = {};
  
  allies.forEach(ally => {
    const healRoll = roll(dieSize);
    const allyId = ally.id || ally.name;
    healing[allyId] = {
      roll: healRoll,
      die: `d${dieSize}`,
      name: ally.name || allyId
    };
  });
  
  return {
    success: true,
    die: `d${dieSize}`,
    dieSize,
    healing,
    numAllies: allies.length,
    narrative: `🎶 ${bard.name || 'The bard'} plays a soothing song during the rest. Each ally regains an additional **d${dieSize}** HP.`
  };
}

/**
 * Check if character can use Bardic Inspiration
 */
function canBardicInspiration(bard) {
  const charClass = bard.class?.toLowerCase() || bard.class_name?.toLowerCase();
  if (charClass !== 'bard') {
    return { can: false, reason: 'Not a bard' };
  }
  
  if (!bard.bardicInspirationUses || bard.bardicInspirationUses <= 0) {
    return { can: false, reason: 'No uses remaining' };
  }
  
  return { 
    can: true, 
    uses: bard.bardicInspirationUses,
    die: bard.level >= 15 ? 'd12' : bard.level >= 10 ? 'd10' : bard.level >= 5 ? 'd8' : 'd6'
  };
}

module.exports = {
  bardicInspiration,
  useBardicInspiration,
  restoreBardicInspiration,
  canBardicInspiration,
  jackOfAllTrades,
  songOfRest
};
