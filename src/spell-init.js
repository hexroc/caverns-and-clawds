/**
 * Spell System Initialization
 * 
 * Proper D&D 5e spell tracking: cantrips + prepared/known spells
 */

const crypto = require('crypto');

/**
 * Initialize character_spells table
 */
function initSpellsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_spells (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      spell_id TEXT NOT NULL,
      spell_type TEXT NOT NULL, -- 'cantrip' or 'leveled'
      spell_level INTEGER DEFAULT 0, -- 0 for cantrips, 1-9 for leveled spells
      prepared INTEGER DEFAULT 1, -- 1 = prepared/known, 0 = known but not prepared
      source TEXT DEFAULT 'class', -- 'class', 'race', 'feat', 'item'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE,
      UNIQUE(character_id, spell_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_character_spells_char 
      ON character_spells(character_id);
    CREATE INDEX IF NOT EXISTS idx_character_spells_type 
      ON character_spells(character_id, spell_type);
  `);
  
  console.log('✨ Spell tracking table initialized');
}

/**
 * Get available cantrips for a class
 */
function getClassCantrips(className) {
  const cantrips = {
    // Cleric cantrips (3 at level 1)
    cleric: [
      'sacred_flame', 'guidance', 'thaumaturgy', 'light', 
      'resistance', 'spare_the_dying', 'mending'
    ],
    
    // Wizard cantrips (3 at level 1)
    wizard: [
      'fire_bolt', 'ray_of_frost', 'shocking_grasp', 'mage_hand',
      'light', 'prestidigitation', 'minor_illusion', 'blade_ward',
      'dancing_lights', 'message'
    ],
    
    // Warlock cantrips (2 at level 1)
    warlock: [
      'eldritch_blast', 'chill_touch', 'mage_hand', 'minor_illusion',
      'prestidigitation', 'true_strike', 'blade_ward'
    ],
    
    // Bard cantrips (2 at level 1)
    bard: [
      'vicious_mockery', 'mage_hand', 'minor_illusion', 'prestidigitation',
      'light', 'dancing_lights', 'message', 'blade_ward'
    ],
    
    // Paladin gets NO cantrips
    paladin: [],
    
    // Sorcerer cantrips (if we add it later)
    sorcerer: [
      'fire_bolt', 'ray_of_frost', 'shocking_grasp', 'mage_hand',
      'light', 'prestidigitation', 'minor_illusion', 'blade_ward'
    ],
    
    // Druid cantrips (if we add it later)
    druid: [
      'produce_flame', 'shillelagh', 'thorn_whip', 'guidance',
      'resistance', 'druidcraft', 'mending'
    ]
  };
  
  return cantrips[className] || [];
}

/**
 * Get available level 1 spells for a class
 */
function getClassLevel1Spells(className) {
  const spells = {
    // Cleric (prepare WIS mod + 1 = 3 spells from full list)
    cleric: [
      'cure_wounds', 'healing_word', 'guiding_bolt', 'bless',
      'shield_of_faith', 'sanctuary', 'inflict_wounds', 'command',
      'detect_magic', 'purify_food_and_drink', 'create_or_destroy_water'
    ],
    
    // Wizard (know 6 spells at level 1: 4 from spellbook + 2 more)
    wizard: [
      'magic_missile', 'shield', 'burning_hands', 'mage_armor',
      'detect_magic', 'identify', 'thunderwave', 'sleep',
      'chromatic_orb', 'feather_fall', 'find_familiar', 'grease'
    ],
    
    // Warlock (know 2 spells at level 1)
    warlock: [
      'hex', 'hellish_rebuke', 'armor_of_agathys', 'charm_person',
      'comprehend_languages', 'expeditious_retreat', 'illusory_script',
      'protection_from_evil_and_good', 'unseen_servant', 'witch_bolt'
    ],
    
    // Bard (know 4 spells at level 1)
    bard: [
      'cure_wounds', 'healing_word', 'dissonant_whispers', 'faerie_fire',
      'thunderwave', 'charm_person', 'disguise_self', 'detect_magic',
      'identify', 'sleep', 'speak_with_animals', 'heroism'
    ],
    
    // Paladin gets spells at level 2
    paladin: [],
    
    // Fighter/Rogue/Ranger don't get spells at level 1
    fighter: [],
    rogue: [],
    ranger: []
  };
  
  return spells[className] || [];
}

/**
 * Get number of cantrips a class gets at level 1
 */
function getCantripsKnown(className, level = 1) {
  const counts = {
    cleric: 3,
    wizard: 3,
    warlock: 2,
    bard: 2,
    paladin: 0,
    fighter: 0,
    rogue: 0,
    ranger: 0
  };
  
  return counts[className] || 0;
}

/**
 * Get number of level 1 spells a class knows/prepares at level 1
 */
function getLevel1SpellsKnown(className, wisdomMod = 0) {
  // Prepared casters (prepare from full list each day)
  if (className === 'cleric' || className === 'paladin') {
    return Math.max(1, wisdomMod + 1); // WIS mod + level
  }
  
  // Known casters (permanently know these spells)
  const counts = {
    wizard: 6,  // Spellbook: 4 starting + 2 free
    warlock: 2,
    bard: 4,
    fighter: 0,
    rogue: 0,
    ranger: 0
  };
  
  return counts[className] || 0;
}

/**
 * Add default spells for a new spellcasting character
 * (This is a fallback - ideally player chooses during creation)
 */
function addDefaultSpells(db, characterId, className, stats) {
  const wisdomMod = Math.floor((stats.wis - 10) / 2);
  const cantripsCount = getCantripsKnown(className);
  const spellsCount = getLevel1SpellsKnown(className, wisdomMod);
  
  if (cantripsCount === 0 && spellsCount === 0) {
    return; // Non-caster class
  }
  
  const availableCantrips = getClassCantrips(className);
  const availableSpells = getClassLevel1Spells(className);
  
  // Add cantrips (all prepared by default)
  for (let i = 0; i < Math.min(cantripsCount, availableCantrips.length); i++) {
    db.prepare(`
      INSERT OR IGNORE INTO character_spells 
        (id, character_id, spell_id, spell_type, spell_level, prepared, source)
      VALUES (?, ?, ?, 'cantrip', 0, 1, 'class')
    `).run(crypto.randomUUID(), characterId, availableCantrips[i]);
  }
  
  // Add level 1 spells (all prepared/known by default)
  for (let i = 0; i < Math.min(spellsCount, availableSpells.length); i++) {
    db.prepare(`
      INSERT OR IGNORE INTO character_spells 
        (id, character_id, spell_id, spell_type, spell_level, prepared, source)
      VALUES (?, ?, ?, 'leveled', 1, 1, 'class')
    `).run(crypto.randomUUID(), characterId, availableSpells[i]);
  }
  
  console.log(`✨ Added ${cantripsCount} cantrips + ${spellsCount} spells for ${className}`);
}

/**
 * Get a character's known spells
 */
function getCharacterSpells(db, characterId) {
  const spells = db.prepare(`
    SELECT spell_id, spell_type, spell_level, prepared, source
    FROM character_spells
    WHERE character_id = ?
    ORDER BY spell_level ASC, spell_id ASC
  `).all(characterId);
  
  return {
    cantrips: spells.filter(s => s.spell_type === 'cantrip').map(s => s.spell_id),
    leveled: spells.filter(s => s.spell_type === 'leveled').map(s => ({
      id: s.spell_id,
      level: s.spell_level,
      prepared: s.prepared === 1,
      source: s.source
    }))
  };
}

module.exports = {
  initSpellsTable,
  getClassCantrips,
  getClassLevel1Spells,
  getCantripsKnown,
  getLevel1SpellsKnown,
  addDefaultSpells,
  getCharacterSpells
};
