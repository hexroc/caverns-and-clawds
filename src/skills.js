/**
 * Caverns & Clawds - Skill Check System
 * D&D 5e skills with underwater lobster flavor
 */

// ============================================================================
// SKILL DEFINITIONS
// ============================================================================

const SKILLS = {
  // Strength
  athletics: { name: 'Athletics', ability: 'STR', description: 'Climbing, swimming, jumping, grappling' },
  
  // Dexterity
  acrobatics: { name: 'Acrobatics', ability: 'DEX', description: 'Balance, tumbling, agility' },
  sleight_of_hand: { name: 'Sleight of Hand', ability: 'DEX', description: 'Pickpocketing, hiding objects' },
  stealth: { name: 'Stealth', ability: 'DEX', description: 'Hiding, moving silently' },
  
  // Intelligence
  arcana: { name: 'Arcana', ability: 'INT', description: 'Magic, spells, magical creatures' },
  history: { name: 'History', ability: 'INT', description: 'Ancient lore, past events' },
  investigation: { name: 'Investigation', ability: 'INT', description: 'Finding clues, deducing information' },
  nature: { name: 'Nature', ability: 'INT', description: 'Terrain, flora, fauna' },
  religion: { name: 'Religion', ability: 'INT', description: 'Gods, rituals, holy symbols' },
  
  // Wisdom
  sea_creature_handling: { name: 'Sea Creature Handling', ability: 'WIS', description: 'Calming hostile sea creatures, reading creature behavior' },
  insight: { name: 'Insight', ability: 'WIS', description: 'Determining intentions, reading emotions' },
  medicine: { name: 'Medicine', ability: 'WIS', description: 'Diagnosing, stabilizing, healing' },
  perception: { name: 'Perception', ability: 'WIS', description: 'Spotting hidden things, noticing details' },
  survival: { name: 'Survival', ability: 'WIS', description: 'Tracking, foraging, navigating' },
  
  // Charisma
  deception: { name: 'Deception', ability: 'CHA', description: 'Lying, disguising, bluffing' },
  intimidation: { name: 'Intimidation', ability: 'CHA', description: 'Threatening, coercing' },
  performance: { name: 'Performance', ability: 'CHA', description: 'Entertaining, acting, music' },
  persuasion: { name: 'Persuasion', ability: 'CHA', description: 'Convincing, negotiating, diplomacy' }
};

// Ability score modifiers
function getAbilityMod(score) {
  return Math.floor((score - 10) / 2);
}

// Proficiency bonus by level
function getProficiencyBonus(level) {
  return Math.ceil(1 + level / 4);
}

// ============================================================================
// SKILL CHECK SYSTEM
// ============================================================================

/**
 * Make a skill check
 * @param {Object} character - Character making the check
 * @param {string} skillName - Skill to check (e.g. 'stealth')
 * @param {number} dc - Difficulty Class
 * @param {Object} options - { advantage, disadvantage, situationalBonus }
 * @returns {Object} - { success, total, roll, modifier, narrative }
 */
function makeSkillCheck(character, skillName, dc, options = {}) {
  const skill = SKILLS[skillName];
  if (!skill) {
    return { success: false, error: `Unknown skill: ${skillName}` };
  }
  
  // Get ability modifier
  const abilityScore = character[skill.ability.toLowerCase()] || 10;
  const abilityMod = getAbilityMod(abilityScore);
  
  // Check proficiency
  const proficiencies = getProficienciesFromDB(character.id);
  const isProficient = proficiencies.includes(skillName);
  const hasExpertise = checkExpertise(character.id, skillName);
  
  const profBonus = getProficiencyBonus(character.level);
  const proficiencyMod = hasExpertise ? profBonus * 2 : (isProficient ? profBonus : 0);
  
  // Jack of All Trades (Bard feature)
  const jackOfAllTrades = character.class === 'Bard' && !isProficient ? Math.floor(profBonus / 2) : 0;
  
  // Roll d20 (with advantage/disadvantage)
  let roll;
  if (options.advantage) {
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    roll = Math.max(roll1, roll2);
  } else if (options.disadvantage) {
    const roll1 = Math.floor(Math.random() * 20) + 1;
    const roll2 = Math.floor(Math.random() * 20) + 1;
    roll = Math.min(roll1, roll2);
  } else {
    roll = Math.floor(Math.random() * 20) + 1;
  }
  
  const situationalBonus = options.situationalBonus || 0;
  const total = roll + abilityMod + proficiencyMod + jackOfAllTrades + situationalBonus;
  const success = total >= dc;
  
  // Automatic success/failure
  if (roll === 20) {
    return {
      success: true,
      roll,
      total,
      dc,
      naturalTwenty: true,
      modifier: abilityMod + proficiencyMod + jackOfAllTrades + situationalBonus,
      narrative: generateSkillNarration(character, skill, dc, { roll, total, success: true, crit: true })
    };
  }
  
  if (roll === 1) {
    return {
      success: false,
      roll,
      total,
      dc,
      naturalOne: true,
      modifier: abilityMod + proficiencyMod + jackOfAllTrades + situationalBonus,
      narrative: generateSkillNarration(character, skill, dc, { roll, total, success: false, fumble: true })
    };
  }
  
  return {
    success,
    roll,
    total,
    dc,
    modifier: abilityMod + proficiencyMod + jackOfAllTrades + situationalBonus,
    proficient: isProficient,
    expertise: hasExpertise,
    narrative: generateSkillNarration(character, skill, dc, { roll, total, success })
  };
}

// ============================================================================
// SKILL NARRATION
// ============================================================================

function generateSkillNarration(character, skill, dc, result) {
  const narrations = {
    stealth: {
      success: [
        `${character.name} melts into the shadows, moving silently through the water like a ghost`,
        `With practiced ease, ${character.name} blends perfectly with the kelp and rocks`,
        `${character.name} becomes one with the current, completely undetectable`,
        `Like a mantis shrimp stalking prey, ${character.name} moves without a sound`
      ],
      failure: [
        `${character.name} kicks up sediment, alerting everything nearby!`,
        `A wayward antenna scrapes against rock — the sound echoes through the water`,
        `${character.name}'s shell clinks against coral, shattering the silence`,
        `Bioluminescent plankton swirl around ${character.name}, giving away their position`
      ]
    },
    perception: {
      success: [
        `${character.name}'s keen eyes spot something others would miss`,
        `${character.name}'s antenna twitch — they sense something hidden nearby`,
        `With sharp focus, ${character.name} notices a crucial detail`,
        `${character.name} spots the telltale signs immediately`
      ],
      failure: [
        `${character.name} searches carefully but finds nothing of note`,
        `Despite thorough investigation, ${character.name} overlooks the clue`,
        `${character.name}'s attention wanders at the wrong moment`,
        `The detail escapes ${character.name}'s notice`
      ]
    },
    persuasion: {
      success: [
        `${character.name}'s words flow like honey, completely convincing`,
        `With eloquent charm, ${character.name} makes a compelling argument`,
        `${character.name}'s sincerity is undeniable — their words ring true`,
        `${character.name} speaks with such conviction that resistance melts away`
      ],
      failure: [
        `${character.name}'s words fall flat, failing to convince`,
        `Despite their best efforts, ${character.name} cannot sway them`,
        `${character.name}'s argument lacks the persuasive power needed`,
        `The plea goes unheeded — ${character.name} is not believed`
      ]
    },
    athletics: {
      success: [
        `With powerful strokes, ${character.name} surges forward effortlessly`,
        `${character.name}'s strength carries them through with ease`,
        `Muscles rippling, ${character.name} makes it look easy`,
        `${character.name} demonstrates impressive physical prowess`
      ],
      failure: [
        `${character.name} struggles against the current, making little progress`,
        `Despite straining with effort, ${character.name} cannot overcome the obstacle`,
        `${character.name}'s strength proves insufficient for the task`,
        `The physical challenge overwhelms ${character.name}`
      ]
    },
    investigation: {
      success: [
        `${character.name} pieces together the clues with keen deduction`,
        `Sharp intellect reveals the pattern — ${character.name} understands!`,
        `${character.name}'s analytical mind unravels the mystery`,
        `With methodical examination, ${character.name} discovers the truth`
      ],
      failure: [
        `The evidence remains frustratingly unclear to ${character.name}`,
        `${character.name} cannot connect the dots — the truth eludes them`,
        `Despite careful study, ${character.name} misses the key detail`,
        `The mystery deepens as ${character.name}'s investigation yields nothing`
      ]
    }
  };
  
  const templates = narrations[skill.name.toLowerCase().replace(' ', '_')] || {
    success: [`${character.name} succeeds at ${skill.name}!`],
    failure: [`${character.name} fails the ${skill.name} check.`]
  };
  
  let template;
  if (result.crit) {
    template = `🎲 **NATURAL 20!** ` + templates.success[Math.floor(Math.random() * templates.success.length)];
  } else if (result.fumble) {
    template = `🎲 **CRITICAL FAILURE!** ` + templates.failure[Math.floor(Math.random() * templates.failure.length)];
  } else if (result.success) {
    template = templates.success[Math.floor(Math.random() * templates.success.length)];
  } else {
    template = templates.failure[Math.floor(Math.random() * templates.failure.length)];
  }
  
  return `${template} **(${result.roll} + ${result.total - result.roll} = ${result.total} vs DC ${dc})**`;
}

// ============================================================================
// HELPER FUNCTIONS (require DB instance)
// ============================================================================

// These will be set by the initialization function
let dbInstance = null;

function setDatabase(db) {
  dbInstance = db;
}

function getProficienciesFromDB(characterId) {
  if (!dbInstance) return [];
  
  try {
    const rows = dbInstance.prepare(
      'SELECT proficiency_name FROM character_proficiencies WHERE character_id = ? AND proficiency_type = ?'
    ).all(characterId, 'skill');
    
    return rows.map(r => r.proficiency_name);
  } catch (err) {
    console.error('Error getting proficiencies:', err);
    return [];
  }
}

function checkExpertise(characterId, skillName) {
  if (!dbInstance) return false;
  
  try {
    // Check class_features table for Expertise entries
    const row = dbInstance.prepare(`
      SELECT metadata FROM class_features 
      WHERE character_id = ? AND feature_name = 'Expertise'
    `).get(characterId);
    
    if (!row) return false;
    
    const metadata = JSON.parse(row.metadata || '{}');
    const expertiseSkills = metadata.skills || [];
    return expertiseSkills.includes(skillName);
  } catch (err) {
    return false;
  }
}

// ============================================================================
// SKILL CHECK APPLICATIONS
// ============================================================================

/**
 * Stealth check to avoid random encounters
 */
function stealthToAvoidEncounter(character, zone) {
  const dc = zone.tier === 'easy' ? 10 : zone.tier === 'medium' ? 12 : 15;
  return makeSkillCheck(character, 'stealth', dc);
}

/**
 * Perception check to find hidden treasure
 */
function perceptionToFindTreasure(character, zone) {
  const dc = 12 + (zone.tier === 'hard' ? 3 : zone.tier === 'medium' ? 2 : 0);
  return makeSkillCheck(character, 'perception', dc);
}

/**
 * Persuasion check for better NPC prices
 */
function persuasionForDiscount(character, npc) {
  const dc = 12 + (npc.stubbornness || 0);
  return makeSkillCheck(character, 'persuasion', dc);
}

module.exports = {
  SKILLS,
  makeSkillCheck,
  stealthToAvoidEncounter,
  perceptionToFindTreasure,
  persuasionForDiscount,
  getProficiencyBonus,
  getAbilityMod,
  setDatabase
};
