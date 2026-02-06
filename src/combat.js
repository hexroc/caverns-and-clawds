/**
 * Caverns & Clawds - Combat System
 * Tick-based 5e-style combat resolver with XP and leveling
 */

// ============================================================================
// RANGE BANDS & POSITIONING
// ============================================================================

const RANGE_BANDS = {
  MELEE: 'melee',           // 0-5 ft (adjacent, can melee attack)
  NEAR: 'near',             // 10-30 ft (move action to close, ranged viable)
  FAR: 'far',               // 35-60 ft (2+ moves to close, long range)
  DISTANT: 'distant',       // 65-120 ft (3+ moves, extreme range)
  OUT_OF_RANGE: 'out_of_range'  // 120+ ft (unreachable)
};

// Movement cost per range band
const MOVEMENT_COSTS = {
  [RANGE_BANDS.MELEE]: 5,
  [RANGE_BANDS.NEAR]: 20,
  [RANGE_BANDS.FAR]: 30,
  [RANGE_BANDS.DISTANT]: 60
};

// Distance in feet for each band (for range checking)
const RANGE_DISTANCES = {
  [RANGE_BANDS.MELEE]: 5,
  [RANGE_BANDS.NEAR]: 30,
  [RANGE_BANDS.FAR]: 60,
  [RANGE_BANDS.DISTANT]: 120,
  [RANGE_BANDS.OUT_OF_RANGE]: 999
};

/**
 * Get range band from distance in feet
 */
function getRangeBandFromDistance(distance) {
  if (distance <= 5) return RANGE_BANDS.MELEE;
  if (distance <= 30) return RANGE_BANDS.NEAR;
  if (distance <= 60) return RANGE_BANDS.FAR;
  if (distance <= 120) return RANGE_BANDS.DISTANT;
  return RANGE_BANDS.OUT_OF_RANGE;
}

/**
 * Calculate movement cost to move between range bands
 */
function getMovementCost(fromBand, toBand, difficultTerrain = false) {
  const bands = [RANGE_BANDS.MELEE, RANGE_BANDS.NEAR, RANGE_BANDS.FAR, RANGE_BANDS.DISTANT];
  const fromIndex = bands.indexOf(fromBand);
  const toIndex = bands.indexOf(toBand);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  let cost = 0;
  const direction = toIndex > fromIndex ? 1 : -1;
  
  for (let i = fromIndex; i !== toIndex; i += direction) {
    const nextBand = bands[i + direction];
    cost += MOVEMENT_COSTS[nextBand] || 5;
  }
  
  return difficultTerrain ? cost * 2 : cost;
}

/**
 * Check if character is threatened (enemies at melee range)
 */
function isThreatened(characterPosition, enemyPositions) {
  return enemyPositions.some(pos => pos.rangeBand === RANGE_BANDS.MELEE && pos.alive);
}

/**
 * Check if two combatants are flanking a target
 */
function checkFlanking(attacker1Pos, attacker2Pos, targetPos) {
  // Simplified flanking: both attackers at melee range with target
  return attacker1Pos.rangeBand === RANGE_BANDS.MELEE && 
         attacker2Pos.rangeBand === RANGE_BANDS.MELEE &&
         targetPos.rangeBand === RANGE_BANDS.MELEE;
}

/**
 * Validate attack/spell range
 */
function validateRange(attackerPos, targetPos, requiredRange) {
  const distance = RANGE_DISTANCES[targetPos.rangeBand] || 0;
  return distance <= requiredRange;
}

// ============================================================================
// XP & LEVELING SYSTEM (Solo-adjusted from 5e)
// ============================================================================

const XP_THRESHOLDS = {
  1: 0,
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2500,
  8: 4000,
  9: 6000,
  10: 9000,
  11: 13000,
  12: 18000,
  13: 24000,
  14: 32000,
  15: 42000,
  16: 54000,
  17: 68000,
  18: 84000,
  19: 102000,
  20: 122000
};

const PROFICIENCY_BY_LEVEL = {
  1: 2, 2: 2, 3: 2, 4: 2,
  5: 3, 6: 3, 7: 3, 8: 3,
  9: 4, 10: 4, 11: 4, 12: 4,
  13: 5, 14: 5, 15: 5, 16: 5,
  17: 6, 18: 6, 19: 6, 20: 6
};

// Hit dice by class archetype
const HIT_DICE = {
  barbarian: { die: 12, avg: 7 },
  fighter: { die: 10, avg: 6 },
  paladin: { die: 10, avg: 6 },
  ranger: { die: 10, avg: 6 },
  cleric: { die: 8, avg: 5 },
  druid: { die: 8, avg: 5 },
  monk: { die: 8, avg: 5 },
  rogue: { die: 8, avg: 5 },
  warlock: { die: 8, avg: 5 },
  bard: { die: 8, avg: 5 },
  sorcerer: { die: 6, avg: 4 },
  wizard: { die: 6, avg: 4 },
  // Default for custom classes
  default: { die: 8, avg: 5 }
};

// Martial classes that get Extra Attack
const MARTIAL_CLASSES = ['fighter', 'paladin', 'ranger', 'barbarian', 'monk'];
const FULL_CASTER_CLASSES = ['wizard', 'sorcerer', 'cleric', 'druid', 'bard', 'warlock'];

// Spell slots by caster level (simplified full caster progression)
const SPELL_SLOTS = {
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

/**
 * Calculate level from XP
 */
function getLevelFromXP(xp) {
  let level = 1;
  for (let l = 20; l >= 1; l--) {
    if (xp >= XP_THRESHOLDS[l]) {
      level = l;
      break;
    }
  }
  return level;
}

/**
 * Get XP needed for next level
 */
function getXPForNextLevel(currentLevel) {
  if (currentLevel >= 20) return null;
  return XP_THRESHOLDS[currentLevel + 1];
}

/**
 * Get XP progress toward next level
 */
function getXPProgress(xp) {
  const level = getLevelFromXP(xp);
  const currentThreshold = XP_THRESHOLDS[level];
  const nextThreshold = XP_THRESHOLDS[level + 1];
  
  if (!nextThreshold) return { level, current: xp, next: null, progress: 1.0 };
  
  return {
    level,
    current: xp - currentThreshold,
    next: nextThreshold - currentThreshold,
    progress: (xp - currentThreshold) / (nextThreshold - currentThreshold)
  };
}

/**
 * Calculate number of attacks based on level and class
 */
function getNumberOfAttacks(level, className = 'fighter') {
  const isMartial = MARTIAL_CLASSES.includes(className.toLowerCase());
  const isFighter = className.toLowerCase() === 'fighter';
  
  if (!isMartial) return 1;
  
  if (level >= 20 && isFighter) return 4;
  if (level >= 11 && isFighter) return 3;
  if (level >= 5) return 2;
  return 1;
}

/**
 * Calculate proficiency bonus from level
 */
function getProficiencyBonus(level) {
  return PROFICIENCY_BY_LEVEL[level] || 2;
}

/**
 * Calculate HP for a given level
 */
function calculateHP(level, className, conModifier) {
  const hitDie = HIT_DICE[className.toLowerCase()] || HIT_DICE.default;
  
  // Level 1: max hit die + CON
  let hp = hitDie.die + conModifier;
  
  // Each level after 1: avg hit die + CON
  for (let l = 2; l <= level; l++) {
    hp += hitDie.avg + conModifier;
  }
  
  return Math.max(hp, level); // Minimum 1 HP per level
}

/**
 * Calculate HP gained from leveling up
 */
function getHPGain(className, conModifier) {
  const hitDie = HIT_DICE[className.toLowerCase()] || HIT_DICE.default;
  return hitDie.avg + conModifier;
}

/**
 * Get spell slots for a level (returns null for non-casters)
 */
function getSpellSlots(level, className) {
  if (!FULL_CASTER_CLASSES.includes(className.toLowerCase())) return null;
  return SPELL_SLOTS[level] || SPELL_SLOTS[1];
}

/**
 * Process level up and return stat changes
 */
function processLevelUp(character, newLevel) {
  const oldLevel = character.level || 1;
  const className = character.class || character.stats?.class || 'fighter';
  const conMod = getMod(character.stats?.constitution || character.abilities?.CON || 10);
  
  const changes = {
    oldLevel,
    newLevel,
    hpGain: 0,
    newMaxHp: character.maxHp || character.stats?.maxHp || 20,
    proficiencyBonus: getProficiencyBonus(newLevel),
    attacks: getNumberOfAttacks(newLevel, className),
    spellSlots: getSpellSlots(newLevel, className),
    features: []
  };
  
  // Calculate HP gain for each level
  for (let l = oldLevel + 1; l <= newLevel; l++) {
    const gain = getHPGain(className, conMod);
    changes.hpGain += gain;
    changes.newMaxHp += gain;
    
    // Check for new features
    if (l === 5) {
      if (MARTIAL_CLASSES.includes(className.toLowerCase())) {
        changes.features.push('Extra Attack');
      }
    }
    if (l === 11 && className.toLowerCase() === 'fighter') {
      changes.features.push('Extra Attack (x2)');
    }
    if (l === 20 && className.toLowerCase() === 'fighter') {
      changes.features.push('Extra Attack (x3)');
    }
    
    // Ability Score Improvements at 4, 8, 12, 16, 19
    if ([4, 8, 12, 16, 19].includes(l)) {
      changes.features.push('Ability Score Improvement');
    }
  }
  
  return changes;
}

// ============================================================================
// DICE ROLLING
// ============================================================================

function roll(dice) {
  // Parse dice notation: "2d6+3", "1d20", "d8", "4d6"
  const match = dice.toString().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!match) return parseInt(dice) || 0;
  
  const count = parseInt(match[1]) || 1;
  const sides = parseInt(match[2]);
  const modifier = parseInt(match[3]) || 0;
  
  let total = modifier;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }
  
  return { total, rolls, dice, modifier };
}

function d20() {
  return Math.floor(Math.random() * 20) + 1;
}

function rollWithAdvantage() {
  const r1 = d20();
  const r2 = d20();
  return { result: Math.max(r1, r2), rolls: [r1, r2], type: 'advantage' };
}

function rollWithDisadvantage() {
  const r1 = d20();
  const r2 = d20();
  return { result: Math.min(r1, r2), rolls: [r1, r2], type: 'disadvantage' };
}

function rollD20(advantage = false, disadvantage = false) {
  if (advantage && !disadvantage) return rollWithAdvantage();
  if (disadvantage && !advantage) return rollWithDisadvantage();
  const r = d20();
  return { result: r, rolls: [r], type: 'normal' };
}

function getMod(score) {
  return Math.floor((score - 10) / 2);
}

// ============================================================================
// MONSTER BESTIARY (20+ monsters across difficulty tiers)
// ============================================================================

const MONSTERS = {
  // TIER 1: Minions (CR 1/8-1/4) - HP 5-13, low damage
  giant_rat: {
    name: 'Giant Rat',
    tier: 1,
    cr: 0.125, // CR 1/8
    hp: 7,
    ac: 12,
    attackBonus: 4,
    damage: '1d4+2',
    damagetype: 'piercing',
    speed: 30,
    abilities: { STR: 7, DEX: 15, CON: 11, INT: 2, WIS: 10, CHA: 4 },
    special: ['pack_tactics'],
    xp: 25, // 5e CR 1/8 = 25 XP
    description: 'A mange-ridden rodent the size of a dog'
  },
  kobold: {
    name: 'Kobold',
    tier: 1,
    cr: 0.125, // CR 1/8
    hp: 5,
    ac: 12,
    attackBonus: 4,
    damage: '1d4+2',
    damagetype: 'piercing',
    speed: 30,
    abilities: { STR: 7, DEX: 15, CON: 9, INT: 8, WIS: 7, CHA: 8 },
    special: ['pack_tactics', 'sunlight_sensitivity'],
    xp: 25, // 5e CR 1/8 = 25 XP
    description: 'A small reptilian humanoid clutching a crude spear'
  },
  skeleton: {
    name: 'Skeleton',
    tier: 1,
    cr: 0.25, // CR 1/4
    hp: 13,
    ac: 13,
    attackBonus: 4,
    damage: '1d6+2',
    damagetype: 'piercing',
    speed: 30,
    abilities: { STR: 10, DEX: 14, CON: 15, INT: 6, WIS: 8, CHA: 5 },
    special: ['undead', 'vulnerability_bludgeoning'],
    immunities: ['poison'],
    xp: 50, // 5e CR 1/4 = 50 XP
    description: 'Animated bones held together by dark magic'
  },
  goblin: {
    name: 'Goblin',
    tier: 1,
    cr: 0.25, // CR 1/4
    hp: 7,
    ac: 15,
    attackBonus: 4,
    damage: '1d6+2',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 8, DEX: 14, CON: 10, INT: 10, WIS: 8, CHA: 8 },
    special: ['nimble_escape'],
    xp: 50, // 5e CR 1/4 = 50 XP
    description: 'A wiry green-skinned creature with yellow eyes'
  },
  
  // TIER 2: Soldiers (CR 1/2-1) - HP 11-30
  orc: {
    name: 'Orc',
    tier: 2,
    cr: 0.5, // CR 1/2
    hp: 15,
    ac: 13,
    attackBonus: 5,
    damage: '1d12+3',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 16, DEX: 12, CON: 16, INT: 7, WIS: 11, CHA: 10 },
    special: ['aggressive'],
    xp: 100, // 5e CR 1/2 = 100 XP
    description: 'A hulking brute with tusks and murder in its eyes'
  },
  zombie: {
    name: 'Zombie',
    tier: 2,
    cr: 0.25, // CR 1/4
    hp: 22,
    ac: 8,
    attackBonus: 3,
    damage: '1d6+1',
    damagetype: 'bludgeoning',
    speed: 20,
    abilities: { STR: 13, DEX: 6, CON: 16, INT: 3, WIS: 6, CHA: 5 },
    special: ['undead', 'undead_fortitude'],
    immunities: ['poison'],
    xp: 50, // 5e CR 1/4 = 50 XP
    description: 'A shambling corpse with rotting flesh'
  },
  hobgoblin: {
    name: 'Hobgoblin',
    tier: 2,
    cr: 0.5, // CR 1/2
    hp: 11,
    ac: 18,
    attackBonus: 3,
    damage: '1d8+1',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 13, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 9 },
    special: ['martial_advantage'],
    xp: 100, // 5e CR 1/2 = 100 XP
    description: 'A disciplined goblinoid in well-maintained armor'
  },
  giant_spider: {
    name: 'Giant Spider',
    tier: 2,
    cr: 1, // CR 1
    hp: 26,
    ac: 14,
    attackBonus: 5,
    damage: '1d8+3',
    damagetype: 'piercing',
    speed: 30,
    abilities: { STR: 14, DEX: 16, CON: 12, INT: 2, WIS: 11, CHA: 4 },
    special: ['poison', 'web_walker', 'spider_climb'],
    poisonDC: 11,
    poisonDamage: '2d8',
    xp: 200, // 5e CR 1 = 200 XP
    description: 'A hairy arachnid with dripping fangs'
  },
  
  // TIER 3: Elites (CR 1-3) - HP 22-76
  ogre: {
    name: 'Ogre',
    tier: 3,
    cr: 2, // CR 2
    hp: 59,
    ac: 11,
    attackBonus: 6,
    damage: '2d8+4',
    damagetype: 'bludgeoning',
    speed: 40,
    abilities: { STR: 19, DEX: 8, CON: 16, INT: 5, WIS: 7, CHA: 7 },
    special: [],
    xp: 450, // 5e CR 2 = 450 XP
    description: 'A massive humanoid with a tree-trunk club'
  },
  ghoul: {
    name: 'Ghoul',
    tier: 3,
    cr: 1, // CR 1
    hp: 22,
    ac: 12,
    attackBonus: 4,
    damage: '2d6+2',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 13, DEX: 15, CON: 10, INT: 7, WIS: 10, CHA: 6 },
    special: ['undead', 'paralyzing_touch'],
    paralyzeDC: 10,
    immunities: ['poison'],
    xp: 200, // 5e CR 1 = 200 XP
    description: 'An emaciated undead with elongated claws'
  },
  bugbear: {
    name: 'Bugbear',
    tier: 3,
    cr: 1, // CR 1
    hp: 27,
    ac: 16,
    attackBonus: 4,
    damage: '2d8+2',
    damagetype: 'piercing',
    speed: 30,
    abilities: { STR: 15, DEX: 14, CON: 13, INT: 8, WIS: 11, CHA: 9 },
    special: ['surprise_attack', 'brute'],
    xp: 200, // 5e CR 1 = 200 XP
    description: 'A massive goblinoid covered in coarse fur'
  },
  minotaur: {
    name: 'Minotaur',
    tier: 3,
    cr: 3, // CR 3
    hp: 76,
    ac: 14,
    attackBonus: 6,
    damage: '2d12+4',
    damagetype: 'slashing',
    speed: 40,
    abilities: { STR: 18, DEX: 11, CON: 16, INT: 6, WIS: 16, CHA: 9 },
    special: ['charge', 'labyrinthine_recall', 'reckless'],
    chargeDamage: '2d8',
    xp: 700, // 5e CR 3 = 700 XP
    description: 'A bull-headed humanoid with a massive greataxe'
  },
  
  // TIER 4: Champions (CR 3-6) - HP 59-110
  owlbear: {
    name: 'Owlbear',
    tier: 4,
    cr: 3, // CR 3
    hp: 59,
    ac: 13,
    attackBonus: 7,
    damage: '2d8+5',
    damagetype: 'slashing',
    speed: 40,
    abilities: { STR: 20, DEX: 12, CON: 17, INT: 3, WIS: 12, CHA: 7 },
    special: ['multiattack', 'keen_sight_smell'],
    multiattacks: 2,
    xp: 700, // 5e CR 3 = 700 XP
    description: 'A feathered horror with a hooked beak and razor claws'
  },
  troll: {
    name: 'Troll',
    tier: 4,
    cr: 5, // CR 5
    hp: 84,
    ac: 15,
    attackBonus: 7,
    damage: '2d6+4',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 18, DEX: 13, CON: 20, INT: 7, WIS: 9, CHA: 7 },
    special: ['multiattack', 'regeneration'],
    multiattacks: 3,
    regenAmount: 10,
    xp: 1800, // 5e CR 5 = 1,800 XP
    description: 'A gangly green monstrosity that reeks of decay'
  },
  wraith: {
    name: 'Wraith',
    tier: 4,
    cr: 5, // CR 5
    hp: 67,
    ac: 13,
    attackBonus: 6,
    damage: '4d8+3',
    damagetype: 'necrotic',
    speed: 60,
    abilities: { STR: 6, DEX: 16, CON: 16, INT: 12, WIS: 14, CHA: 15 },
    special: ['incorporeal', 'life_drain', 'sunlight_sensitivity'],
    drainDC: 14,
    immunities: ['poison', 'necrotic'],
    resistances: ['acid', 'cold', 'fire', 'lightning'],
    xp: 1800, // 5e CR 5 = 1,800 XP
    description: 'A shadowy specter of hatred and malice'
  },
  wyvern: {
    name: 'Wyvern',
    tier: 4,
    cr: 6, // CR 6
    hp: 110,
    ac: 13,
    attackBonus: 7,
    damage: '2d6+4',
    damagetype: 'piercing',
    speed: 80,
    abilities: { STR: 19, DEX: 10, CON: 16, INT: 5, WIS: 12, CHA: 6 },
    special: ['multiattack', 'poison_stinger'],
    multiattacks: 2,
    poisonDC: 15,
    poisonDamage: '7d6',
    xp: 2300, // 5e CR 6 = 2,300 XP
    description: 'A dragon-like beast with a venomous tail'
  },
  
  // TIER 5: Bosses (CR 5-21) - HP 82-200+
  young_dragon: {
    name: 'Young Dragon',
    tier: 5,
    cr: 10, // CR 10 (Young Red Dragon)
    hp: 178,
    ac: 18,
    attackBonus: 10,
    damage: '2d10+6',
    damagetype: 'slashing',
    speed: 80,
    abilities: { STR: 23, DEX: 10, CON: 21, INT: 14, WIS: 11, CHA: 19 },
    special: ['multiattack', 'breath_weapon', 'frightful_presence'],
    multiattacks: 3,
    breathDC: 17,
    breathDamage: '16d6',
    breathType: 'fire',
    breathRecharge: 5,
    xp: 5900, // 5e CR 10 = 5,900 XP
    description: 'A magnificent scaled terror of fang and flame'
  },
  beholder_zombie: {
    name: 'Beholder Zombie',
    tier: 5,
    cr: 5, // CR 5
    hp: 93,
    ac: 15,
    attackBonus: 6,
    damage: '4d6',
    damagetype: 'necrotic',
    speed: 20,
    abilities: { STR: 10, DEX: 8, CON: 16, INT: 3, WIS: 8, CHA: 5 },
    special: ['undead', 'undead_fortitude', 'eye_rays'],
    eyeRays: ['paralyzing_ray', 'fear_ray', 'disintegration_ray'],
    rayDC: 14,
    immunities: ['poison'],
    xp: 1800, // 5e CR 5 = 1,800 XP
    description: 'A rotting sphere of eyes and malevolence'
  },
  vampire_spawn: {
    name: 'Vampire Spawn',
    tier: 5,
    cr: 5, // CR 5
    hp: 82,
    ac: 15,
    attackBonus: 6,
    damage: '2d6+3',
    damagetype: 'bludgeoning',
    speed: 30,
    abilities: { STR: 16, DEX: 16, CON: 16, INT: 11, WIS: 10, CHA: 12 },
    special: ['regeneration', 'spider_climb', 'bite'],
    regenAmount: 10,
    biteDamage: '2d6+3',
    biteHeal: true,
    resistances: ['necrotic'],
    xp: 1800, // 5e CR 5 = 1,800 XP
    description: 'A pale predator with crimson eyes and fangs'
  },
  lich: {
    name: 'Lich',
    tier: 5,
    cr: 21, // CR 21
    hp: 135,
    ac: 17,
    attackBonus: 12,
    damage: '3d6',
    damagetype: 'necrotic',
    speed: 30,
    abilities: { STR: 11, DEX: 16, CON: 16, INT: 20, WIS: 14, CHA: 16 },
    special: ['spellcaster', 'legendary_resistance', 'paralyzing_touch', 'frightful_presence'],
    spells: ['wordOfAnnihilation', 'annihilationRay', 'touchOfOblivion', 'depthCharge'],
    paralyzeDC: 18,
    legendaryResistances: 3,
    legendaryActions: 3,
    immunities: ['poison', 'necrotic'],
    xp: 33000, // 5e CR 21 = 33,000 XP
    description: 'An ancient undead sorcerer of immense power'
  },
  
  // Additional high-CR bosses for floor 20
  ancient_dragon: {
    name: 'Ancient Dragon',
    tier: 5,
    cr: 20, // CR 20 (Ancient Red Dragon simplified)
    hp: 546,
    ac: 22,
    attackBonus: 17,
    damage: '2d10+10',
    damagetype: 'slashing',
    speed: 80,
    abilities: { STR: 30, DEX: 10, CON: 29, INT: 18, WIS: 15, CHA: 23 },
    special: ['multiattack', 'breath_weapon', 'frightful_presence', 'legendary_resistance'],
    multiattacks: 3,
    breathDC: 24,
    breathDamage: '26d6',
    breathType: 'fire',
    breathRecharge: 5,
    legendaryResistances: 3,
    legendaryActions: 3,
    immunities: ['fire'],
    xp: 25000, // 5e CR 20 = 25,000 XP
    description: 'An ancient wyrm of apocalyptic power'
  },
  pit_fiend: {
    name: 'Pit Fiend',
    tier: 5,
    cr: 20, // CR 20
    hp: 300,
    ac: 19,
    attackBonus: 14,
    damage: '2d6+8',
    damagetype: 'slashing',
    speed: 30,
    abilities: { STR: 26, DEX: 14, CON: 24, INT: 22, WIS: 18, CHA: 24 },
    special: ['multiattack', 'fear_aura', 'poison', 'magic_resistance'],
    multiattacks: 4,
    poisonDC: 21,
    poisonDamage: '6d6',
    immunities: ['fire', 'poison'],
    xp: 25000, // 5e CR 20 = 25,000 XP
    description: 'A towering devil of hellfire and malice'
  }
};

// ============================================================================
// INITIATIVE & COMBAT ORDER
// ============================================================================

function rollInitiative(combatant) {
  const dexMod = getMod(combatant.abilities?.DEX || combatant.stats?.dexterity || 10);
  const roll = d20();
  return {
    combatant,
    roll,
    modifier: dexMod,
    total: roll + dexMod
  };
}

function determineCombatOrder(character, enemies) {
  const initiatives = [];
  
  // Roll for character
  const charInit = rollInitiative({
    ...character,
    isPlayer: true,
    abilities: {
      STR: character.stats?.strength || 10,
      DEX: character.stats?.dexterity || 10,
      CON: character.stats?.constitution || 10,
      INT: character.stats?.intelligence || 10,
      WIS: character.stats?.wisdom || 10,
      CHA: character.stats?.charisma || 10
    }
  });
  initiatives.push(charInit);
  
  // Roll for each enemy
  enemies.forEach((enemy, index) => {
    const enemyInit = rollInitiative({
      ...enemy,
      isPlayer: false,
      combatIndex: index
    });
    initiatives.push(enemyInit);
  });
  
  // Sort by initiative (highest first, DEX breaks ties)
  initiatives.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.modifier - a.modifier;
  });
  
  return initiatives;
}

// ============================================================================
// ATTACK RESOLUTION
// ============================================================================

function resolveAttack(attacker, defender, advantage = false, disadvantage = false) {
  const attackRoll = rollD20(advantage, disadvantage);
  const isCrit = attackRoll.result === 20;
  const isCritFail = attackRoll.result === 1;
  
  // Calculate attack bonus
  let attackBonus;
  if (attacker.isPlayer) {
    const strMod = getMod(attacker.stats?.strength || 10);
    const dexMod = getMod(attacker.stats?.dexterity || 10);
    const level = attacker.level || attacker.stats?.level || 1;
    const proficiency = getProficiencyBonus(level);
    // Use higher of STR/DEX for finesse, otherwise STR for melee
    attackBonus = Math.max(strMod, dexMod) + proficiency;
    // Apply magic weapon bonus if any
    attackBonus += (attacker.weaponBonus || 0);
  } else {
    attackBonus = attacker.attackBonus || 0;
  }
  
  const totalAttack = attackRoll.result + attackBonus;
  const defenderAC = defender.ac || defender.stats?.ac || 10;
  
  // Critical always hits, critical fail always misses
  const hits = isCrit || (!isCritFail && totalAttack >= defenderAC);
  
  let damage = 0;
  let damageRolls = null;
  
  if (hits) {
    // Roll damage
    const damageDice = attacker.damage || attacker.stats?.weaponDamage || '1d8';
    const damageResult = roll(damageDice);
    
    // Add modifier to damage
    let damageMod = 0;
    if (attacker.isPlayer) {
      const strMod = getMod(attacker.stats?.strength || 10);
      const dexMod = getMod(attacker.stats?.dexterity || 10);
      damageMod = Math.max(strMod, dexMod);
      // Apply magic weapon bonus to damage
      damageMod += (attacker.weaponBonus || 0);
    }
    
    damage = damageResult.total + damageMod;
    
    // Critical hit doubles dice
    if (isCrit) {
      const critBonus = roll(damageDice);
      damage += critBonus.total;
      damageRolls = { normal: damageResult.rolls, critical: critBonus.rolls };
    } else {
      damageRolls = { normal: damageResult.rolls };
    }
    
    // Minimum 1 damage on hit
    damage = Math.max(1, damage);
  }
  
  return {
    attackRoll,
    attackBonus,
    totalAttack,
    defenderAC,
    hits,
    isCrit,
    isCritFail,
    damage,
    damageRolls,
    damageType: attacker.damagetype || 'slashing'
  };
}

// ============================================================================
// SAVING THROWS
// ============================================================================

function savingThrow(character, ability, dc, advantage = false, disadvantage = false) {
  const abilityScore = character.stats?.[ability.toLowerCase()] || 
                       character.abilities?.[ability.toUpperCase()] || 10;
  const mod = getMod(abilityScore);
  
  // Add proficiency if character has saving throw proficiency
  const profBonus = character.savingThrowProficiencies?.includes(ability.toUpperCase()) 
    ? (character.proficiencyBonus || 2) 
    : 0;
  
  const saveRoll = rollD20(advantage, disadvantage);
  const total = saveRoll.result + mod + profBonus;
  const success = total >= dc;
  
  return {
    roll: saveRoll,
    modifier: mod,
    profBonus,
    total,
    dc,
    success,
    ability
  };
}

// ============================================================================
// SPECIAL ABILITIES HANDLERS
// ============================================================================

function handleSpecialAbility(ability, attacker, defender, attackResult) {
  const effects = [];
  
  switch (ability) {
    case 'poison':
      if (attackResult.hits) {
        const save = savingThrow(defender, 'CON', attacker.poisonDC || 10);
        if (!save.success) {
          const poisonDmg = roll(attacker.poisonDamage || '1d6');
          effects.push({
            type: 'poison',
            damage: poisonDmg.total,
            save,
            narration: `Venom courses through ${defender.name}'s veins!`
          });
        } else {
          effects.push({
            type: 'poison_resisted',
            save,
            narration: `${defender.name} resists the poison!`
          });
        }
      }
      break;
      
    case 'paralyzing_touch':
      if (attackResult.hits) {
        const save = savingThrow(defender, 'CON', attacker.paralyzeDC || 10);
        if (!save.success) {
          effects.push({
            type: 'paralyzed',
            duration: 1, // rounds
            save,
            narration: `${defender.name} is paralyzed with supernatural dread!`
          });
        }
      }
      break;
      
    case 'life_drain':
      if (attackResult.hits) {
        const save = savingThrow(defender, 'CON', attacker.drainDC || 13);
        if (!save.success) {
          const drain = Math.floor(attackResult.damage / 2);
          effects.push({
            type: 'life_drain',
            maxHpReduction: drain,
            save,
            narration: `${defender.name}'s life force is drained away!`
          });
        }
      }
      break;
      
    case 'pack_tactics':
      // Advantage if ally is adjacent (simplified: if multiple enemies)
      effects.push({
        type: 'pack_tactics',
        grantAdvantage: true,
        narration: 'The creatures coordinate their attack!'
      });
      break;
      
    case 'multiattack':
      effects.push({
        type: 'multiattack',
        attacks: attacker.multiattacks || 2
      });
      break;
      
    case 'regeneration':
      effects.push({
        type: 'regeneration',
        amount: attacker.regenAmount || 10,
        narration: `${attacker.name}'s wounds begin to close!`
      });
      break;
      
    case 'breath_weapon':
      effects.push({
        type: 'breath_weapon',
        dc: attacker.breathDC || 15,
        damage: attacker.breathDamage || '6d6',
        damageType: attacker.breathType || 'fire',
        recharge: attacker.breathRecharge || 5
      });
      break;
      
    case 'undead_fortitude':
      effects.push({
        type: 'undead_fortitude',
        dc: 5, // + damage taken
        narration: 'The undead refuses to fall!'
      });
      break;
  }
  
  return effects;
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Check if character has Cunning Action feature (Rogue level 2+)
 */
function hasCunningAction(character) {
  // Check features array
  if (character.features) {
    if (Array.isArray(character.features)) {
      return character.features.some(f => 
        f.feature_name === 'cunning_action' || f.name === 'cunning_action'
      );
    }
  }
  
  // Fallback: check class and level
  const className = (character.class || character.stats?.class || '').toLowerCase();
  const level = character.level || character.stats?.level || 1;
  
  return className === 'rogue' && level >= 2;
}

/**
 * Check if an action can be used as a bonus action with Cunning Action
 */
function canUseCunningAction(actionType, character) {
  if (!hasCunningAction(character)) return false;
  
  const cunningActionTypes = ['dash', 'disengage', 'hide'];
  return cunningActionTypes.includes(actionType);
}

const ACTIONS = {
  attack: (character, enemies, options = {}) => {
    const { targetIndex = 0, combatState, weaponRange = 5 } = options;
    const target = enemies[targetIndex];
    if (!target || target.currentHp <= 0) {
      return { success: false, error: 'Invalid target' };
    }
    
    // Range validation
    const characterPos = character.position || { rangeBand: RANGE_BANDS.MELEE };
    const targetPos = target.position || { rangeBand: RANGE_BANDS.MELEE };
    
    // Check if weapon can reach target
    if (!validateRange(characterPos, targetPos, weaponRange)) {
      return {
        success: false,
        error: `Target out of range! ${targetPos.rangeBand} is beyond weapon range (${weaponRange} ft)`,
        currentRange: characterPos.rangeBand,
        targetRange: targetPos.rangeBand,
        weaponRange
      };
    }
    
    // Check for advantage/disadvantage
    let advantage = options.advantage || character.conditions?.includes('hidden');
    let disadvantage = options.disadvantage || character.conditions?.includes('poisoned');
    
    // Flanking check (advantage if ally adjacent to same enemy)
    if (combatState?.henchman && combatState.henchman.currentHp > 0) {
      const henchmanPos = combatState.henchman.position || { rangeBand: RANGE_BANDS.MELEE };
      if (checkFlanking(characterPos, henchmanPos, targetPos)) {
        advantage = true;
        options.flankingBonus = true;
      }
    }
    
    // Disadvantage on ranged attacks when threatened
    const isRangedAttack = weaponRange > 5;
    if (isRangedAttack && isThreatened(characterPos, enemies.map(e => ({ 
      rangeBand: e.position?.rangeBand, 
      alive: e.currentHp > 0 
    })))) {
      disadvantage = true;
      options.threatenedPenalty = true;
    }
    
    // Calculate number of attacks based on level and class
    const level = character.level || character.stats?.level || 1;
    const className = character.class || character.stats?.class || 'fighter';
    const numAttacks = getNumberOfAttacks(level, className);
    
    const attacks = [];
    let totalDamage = 0;
    const narratives = [];
    
    // Perform each attack
    for (let i = 0; i < numAttacks; i++) {
      // Check if target is still alive
      let currentTarget = target;
      let currentTargetIndex = targetIndex;
      
      // If primary target is dead, find next living target
      if (currentTarget.currentHp <= 0) {
        const nextTarget = enemies.find((e, idx) => e.currentHp > 0);
        if (!nextTarget) break; // All enemies dead
        currentTarget = nextTarget;
        currentTargetIndex = enemies.indexOf(nextTarget);
      }
      
      const result = resolveAttack(character, currentTarget, advantage && i === 0, disadvantage);
      
      attacks.push({
        targetIndex: currentTargetIndex,
        targetName: currentTarget.name,
        ...result
      });
      
      if (result.hits) {
        totalDamage += result.damage;
        // Apply damage immediately for subsequent attack targeting
        currentTarget.currentHp -= result.damage;
      }
      
      let attackNarrative = generateAttackNarration(character, currentTarget, result);
      if (i === 0 && options.flankingBonus) {
        attackNarrative += ' [Flanking - Advantage]';
      }
      if (i === 0 && options.threatenedPenalty) {
        attackNarrative += ' [Threatened - Disadvantage]';
      }
      narratives.push(attackNarrative);
    }
    
    return {
      success: true,
      action: 'attack',
      target: target.name,
      targetIndex,
      attacks,
      numAttacks,
      totalDamage,
      damage: totalDamage,
      result: attacks[0], // For backwards compatibility
      narrative: narratives.join(' '),
      flankingBonus: options.flankingBonus,
      threatenedPenalty: options.threatenedPenalty
    };
  },
  
  cast_spell: (character, enemies, options = {}) => {
    const spellName = options.spell || 'magic_missile';
    const targetIndex = options.targetIndex || 0;
    
    // Check if character has spells
    if (!character.stats?.spells || character.stats.spells.length === 0) {
      return { success: false, error: 'No spells available' };
    }
    
    // Simple spell effects with ranges
    const spells = {
      magic_missile: { damage: '3d4+3', auto: true, type: 'force', range: 120 },
      fire_bolt: { damage: '1d10', attackRoll: true, type: 'fire', range: 120 },
      healing_word: { healing: '1d4+3', target: 'self', range: 60 },
      thunderwave: { damage: '2d8', save: 'CON', dc: 13, type: 'thunder', range: 15 },
      burning_hands: { damage: '3d6', save: 'DEX', dc: 13, type: 'fire', range: 15 },
      cure_wounds: { healing: '1d8+3', target: 'self', range: 0 }
    };
    
    const spell = spells[spellName];
    if (!spell) {
      return { success: false, error: 'Unknown spell' };
    }
    
    let result = { action: 'cast_spell', spell: spellName };
    
    if (spell.healing) {
      const healRoll = roll(spell.healing);
      result.healing = healRoll.total;
      result.narrative = `${character.name} casts ${spellName.replace('_', ' ')} and recovers ${healRoll.total} HP!`;
      return { success: true, ...result };
    }
    
    const target = enemies[targetIndex];
    if (!target || target.currentHp <= 0) {
      return { success: false, error: 'Invalid target' };
    }
    
    // Range validation for targeted spells
    const characterPos = character.position || { rangeBand: RANGE_BANDS.MELEE };
    const targetPos = target.position || { rangeBand: RANGE_BANDS.MELEE };
    
    if (!validateRange(characterPos, targetPos, spell.range)) {
      return {
        success: false,
        error: `Target out of spell range! ${targetPos.rangeBand} is beyond ${spell.range} ft range of ${spellName}`,
        currentRange: characterPos.rangeBand,
        targetRange: targetPos.rangeBand,
        spellRange: spell.range
      };
    }
    
    result.target = target.name;
    result.targetIndex = targetIndex;
    
    if (spell.auto) {
      // Auto-hit like magic missile
      const dmgRoll = roll(spell.damage);
      result.damage = dmgRoll.total;
      result.hits = true;
      result.narrative = `Glowing darts of ${spell.type} energy streak toward ${target.name}, dealing ${dmgRoll.total} damage!`;
    } else if (spell.save) {
      // Saving throw spell
      const dmgRoll = roll(spell.damage);
      const save = savingThrow(target, spell.save, spell.dc);
      result.save = save;
      result.damage = save.success ? Math.floor(dmgRoll.total / 2) : dmgRoll.total;
      result.hits = true;
      result.narrative = save.success 
        ? `${target.name} partially avoids the ${spellName.replace('_', ' ')}, taking ${result.damage} ${spell.type} damage!`
        : `${target.name} is engulfed by ${spellName.replace('_', ' ')}, taking ${result.damage} ${spell.type} damage!`;
    } else if (spell.attackRoll) {
      // Spell attack
      const intMod = getMod(character.stats?.intelligence || 10);
      const spellAttack = d20() + intMod + (character.proficiencyBonus || 2);
      const hits = spellAttack >= (target.ac || 10);
      
      if (hits) {
        const dmgRoll = roll(spell.damage);
        result.damage = dmgRoll.total;
        result.hits = true;
        result.narrative = `A bolt of ${spell.type} energy strikes ${target.name} for ${dmgRoll.total} damage!`;
      } else {
        result.damage = 0;
        result.hits = false;
        result.narrative = `The ${spell.type} bolt streaks past ${target.name}, missing by inches!`;
      }
    }
    
    return { success: true, ...result };
  },
  
  dodge: (character, enemies, options = {}) => {
    return {
      success: true,
      action: 'dodge',
      effect: 'disadvantage_on_attacks',
      narrative: `${character.name} focuses entirely on defense, weaving and ducking!`
    };
  },
  
  dash: (character, enemies, options = {}) => {
    // Dash action doubles movement budget
    if (!character.movement) {
      character.movement = { total: 30, remaining: 30, usedThisTurn: false };
    }
    
    character.movement.remaining = character.movement.total * 2 - (character.movement.total - character.movement.remaining);
    
    return {
      success: true,
      action: 'dash',
      effect: 'double_movement',
      movementRemaining: character.movement.remaining,
      narrative: `${character.name} takes the Dash action! Movement doubled to ${character.movement.remaining} ft!`
    };
  },
  
  move: (character, enemies, options = {}) => {
    const { targetRange, targetId, combatState } = options;
    
    if (!targetRange) {
      return { 
        success: false, 
        error: 'Specify target range band',
        availableRanges: Object.values(RANGE_BANDS).slice(0, 4) // exclude OUT_OF_RANGE
      };
    }
    
    if (!character.movement) {
      character.movement = { total: 30, remaining: 30, usedThisTurn: false };
    }
    
    if (!character.position) {
      character.position = { rangeBand: RANGE_BANDS.MELEE };
    }
    
    const currentRange = character.position.rangeBand;
    const difficultTerrain = combatState?.difficultTerrain || false;
    
    // Calculate movement cost
    const cost = getMovementCost(currentRange, targetRange, difficultTerrain);
    
    if (cost > character.movement.remaining) {
      return {
        success: false,
        error: `Not enough movement! Need ${cost} ft, have ${character.movement.remaining} ft`,
        currentRange,
        targetRange,
        cost,
        remaining: character.movement.remaining
      };
    }
    
    // Check if leaving melee range (opportunity attacks)
    const leavingMelee = currentRange === RANGE_BANDS.MELEE && targetRange !== RANGE_BANDS.MELEE;
    const threatened = isThreatened(character.position, enemies.map(e => e.position || {}));
    const hasDisengaged = character.conditions?.includes('disengaged');
    
    let opportunityAttacks = [];
    
    if (leavingMelee && threatened && !hasDisengaged) {
      // Trigger opportunity attacks from adjacent enemies
      const adjacentEnemies = enemies.filter(e => 
        e.currentHp > 0 && 
        e.position?.rangeBand === RANGE_BANDS.MELEE &&
        !e.reactionUsed
      );
      
      for (const enemy of adjacentEnemies) {
        const oa = resolveOpportunityAttack(enemy, character);
        opportunityAttacks.push(oa);
        enemy.reactionUsed = true;
      }
    }
    
    // Move character
    character.position.rangeBand = targetRange;
    character.movement.remaining -= cost;
    character.movement.usedThisTurn = true;
    
    // Update adjacency if moving to/from melee
    if (combatState?.adjacency) {
      if (targetRange === RANGE_BANDS.MELEE) {
        // Now adjacent to all melee enemies
        combatState.adjacency.player = enemies
          .filter(e => e.currentHp > 0 && e.position?.rangeBand === RANGE_BANDS.MELEE)
          .map(e => e.id);
      } else {
        // No longer adjacent
        combatState.adjacency.player = [];
      }
    }
    
    return {
      success: true,
      action: 'move',
      from: currentRange,
      to: targetRange,
      cost,
      remainingMovement: character.movement.remaining,
      opportunityAttacks,
      narrative: generateMovementNarration(character, currentRange, targetRange, cost, difficultTerrain, opportunityAttacks)
    };
  },
  
  use_item: (character, enemies, options = {}) => {
    const itemName = options.item || 'healing_potion';
    
    const items = {
      healing_potion: { healing: '2d4+2', type: 'consumable' },
      greater_healing_potion: { healing: '4d4+4', type: 'consumable' },
      antidote: { effect: 'cure_poison', type: 'consumable' },
      scroll_of_depth_charge: { damage: '8d6', type: 'scroll', save: 'DEX', dc: 15 }
    };
    
    const item = items[itemName];
    if (!item) {
      return { success: false, error: 'Unknown item' };
    }
    
    let result = { action: 'use_item', item: itemName };
    
    if (item.healing) {
      const healRoll = roll(item.healing);
      result.healing = healRoll.total;
      result.narrative = `${character.name} quaffs a ${itemName.replace(/_/g, ' ')} and recovers ${healRoll.total} HP!`;
    } else if (item.effect === 'cure_poison') {
      result.effect = 'cure_poison';
      result.narrative = `${character.name} drinks the antidote, purging the poison from their system!`;
    } else if (item.damage) {
      const targetIndex = options.targetIndex || 0;
      const target = enemies[targetIndex];
      if (!target) {
        return { success: false, error: 'Invalid target' };
      }
      
      const dmgRoll = roll(item.damage);
      let totalDamage = 0;
      
      // AoE damage to all enemies
      enemies.forEach(enemy => {
        if (enemy.currentHp > 0) {
          const save = savingThrow(enemy, item.save, item.dc);
          const dmg = save.success ? Math.floor(dmgRoll.total / 2) : dmgRoll.total;
          totalDamage += dmg;
        }
      });
      
      result.damage = dmgRoll.total;
      result.aoe = true;
      result.narrative = `${character.name} unleashes a ${itemName.replace(/_/g, ' ')}! Fire erupts across the battlefield for ${dmgRoll.total} damage!`;
    }
    
    return { success: true, ...result };
  },
  
  hide: (character, enemies, options = {}) => {
    const dexMod = getMod(character.stats?.dexterity || 10);
    const stealthRoll = d20() + dexMod + (character.proficiencyBonus || 2);
    
    // Check against enemy passive perception
    const highestPerception = Math.max(...enemies.map(e => 10 + getMod(e.abilities?.WIS || 10)));
    const success = stealthRoll >= highestPerception;
    
    return {
      success: true,
      action: 'hide',
      roll: stealthRoll,
      dc: highestPerception,
      hidden: success,
      narrative: success 
        ? `${character.name} melts into the shadows, becoming invisible to their foes!`
        : `${character.name} tries to hide but the enemies spot their movement!`
    };
  },
  
  flee: (character, enemies, options = {}) => {
    const dexMod = getMod(character.stats?.dexterity || 10);
    const fleeRoll = d20() + dexMod;
    
    // DC based on fastest enemy
    const dc = 10 + Math.max(...enemies.filter(e => e.currentHp > 0).map(e => getMod(e.abilities?.DEX || 10)));
    const success = fleeRoll >= dc;
    
    return {
      success: true,
      action: 'flee',
      roll: fleeRoll,
      dc,
      escaped: success,
      narrative: success
        ? `${character.name} breaks free and escapes the combat!`
        : `${character.name} tries to flee but the enemies block their escape!`
    };
  },
  
  disengage: (character, enemies, options = {}) => {
    // Add disengaged condition (prevents opportunity attacks until end of turn)
    if (!character.conditions) character.conditions = [];
    character.conditions.push('disengaged');
    
    return {
      success: true,
      action: 'disengage',
      effect: 'no_opportunity_attacks',
      narrative: `${character.name} carefully disengages, avoiding attacks of opportunity!`,
      hint: 'You can now move away from melee range without triggering opportunity attacks.'
    };
  }
};

// ============================================================================
// ENEMY AI
// ============================================================================

function selectEnemyAction(enemy, character) {
  // Simple AI: mostly attack, occasionally use special abilities
  const actions = [];
  
  // Always can attack
  actions.push({ type: 'attack', weight: 70 });
  
  // Special abilities
  if (enemy.special?.includes('breath_weapon') && !enemy.breathOnCooldown) {
    actions.push({ type: 'breath_weapon', weight: 30 });
  }
  
  // If low HP, might try to flee (for intelligent enemies)
  if (enemy.currentHp < enemy.hp * 0.25 && enemy.abilities?.INT >= 8) {
    actions.push({ type: 'flee', weight: 20 });
  }
  
  // Weight-based selection
  const totalWeight = actions.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const action of actions) {
    roll -= action.weight;
    if (roll <= 0) return action.type;
  }
  
  return 'attack';
}

function resolveEnemyTurn(enemy, character, combatState) {
  const results = [];
  
  // Handle regeneration first
  if (enemy.special?.includes('regeneration') && enemy.currentHp > 0) {
    const regen = enemy.regenAmount || 10;
    enemy.currentHp = Math.min(enemy.hp, enemy.currentHp + regen);
    results.push({
      type: 'regeneration',
      amount: regen,
      narrative: `${enemy.name}'s wounds knit together, recovering ${regen} HP!`
    });
  }
  
  // Skip if dead
  if (enemy.currentHp <= 0) {
    return { skipped: true, reason: 'dead' };
  }
  
  // Skip if paralyzed
  if (enemy.conditions?.includes('paralyzed')) {
    enemy.conditions = enemy.conditions.filter(c => c !== 'paralyzed');
    return { skipped: true, reason: 'paralyzed', narrative: `${enemy.name} struggles against the paralysis!` };
  }
  
  const action = selectEnemyAction(enemy, character);
  
  if (action === 'breath_weapon') {
    // Breath weapon attack
    const save = savingThrow(character, 'DEX', enemy.breathDC || 15);
    const dmgRoll = roll(enemy.breathDamage || '6d6');
    const damage = save.success ? Math.floor(dmgRoll.total / 2) : dmgRoll.total;
    
    enemy.breathOnCooldown = true;
    
    results.push({
      type: 'breath_weapon',
      damage,
      save,
      damageType: enemy.breathType || 'fire',
      narrative: save.success
        ? `${enemy.name} unleashes a torrent of ${enemy.breathType || 'fire'}! ${character.name} dives aside, taking ${damage} damage!`
        : `${enemy.name} unleashes a devastating ${enemy.breathType || 'fire'} breath! ${character.name} is engulfed for ${damage} damage!`
    });
    
    return { action: 'breath_weapon', results };
  }
  
  // Check for multiattack
  const numAttacks = enemy.special?.includes('multiattack') ? (enemy.multiattacks || 2) : 1;
  
  for (let i = 0; i < numAttacks; i++) {
    if (character.currentHp <= 0) break; // Stop if character dies
    
    // Check for pack tactics (advantage)
    const hasPackTactics = enemy.special?.includes('pack_tactics');
    const hasAllies = combatState?.enemies?.filter(e => e.currentHp > 0).length > 1;
    const advantage = hasPackTactics && hasAllies;
    
    // Check if character is dodging
    const disadvantage = combatState?.characterDodging || false;
    
    const attackResult = resolveAttack(enemy, character, advantage, disadvantage);
    
    // Handle special effects on hit
    let specialEffects = [];
    if (attackResult.hits) {
      for (const ability of (enemy.special || [])) {
        const effects = handleSpecialAbility(ability, enemy, character, attackResult);
        specialEffects = specialEffects.concat(effects);
      }
    }
    
    results.push({
      type: 'attack',
      ...attackResult,
      specialEffects,
      narrative: generateAttackNarration(enemy, character, attackResult)
    });
  }
  
  return { action: 'attack', results };
}

// ============================================================================
// NARRATION GENERATOR
// ============================================================================

const ATTACK_VERBS = {
  slashing: ['slashes', 'cleaves', 'hacks', 'carves', 'rends'],
  piercing: ['stabs', 'pierces', 'impales', 'skewers', 'punctures'],
  bludgeoning: ['smashes', 'crushes', 'batters', 'pounds', 'hammers'],
  fire: ['burns', 'scorches', 'immolates', 'sears', 'incinerates'],
  cold: ['freezes', 'chills', 'frosts', 'numbs', 'ice-blasts'],
  necrotic: ['withers', 'drains', 'corrupts', 'decays', 'blights'],
  force: ['blasts', 'strikes', 'slams', 'impacts', 'hammers'],
  default: ['strikes', 'hits', 'attacks', 'wounds', 'damages']
};

const MISS_DESCRIPTIONS = [
  'The attack goes wide!',
  'A narrow miss!',
  'The blow is deflected!',
  'The strike falls short!',
  'The attack is parried!',
  'A glancing blow misses its mark!',
  'The swing connects with nothing but air!',
  'The attack is dodged at the last second!'
];

const CRIT_DESCRIPTIONS = [
  'A DEVASTATING blow!',
  'CRITICAL HIT! A perfect strike!',
  'The attack finds a vital point!',
  'An absolutely BRUTAL hit!',
  'A masterful strike of deadly precision!',
  'The blow lands with bone-shattering force!'
];

const CRIT_FAIL_DESCRIPTIONS = [
  'A catastrophic fumble!',
  'The attack goes wildly astray!',
  'A clumsy miss!',
  'The swing overextends dramatically!',
  'A humiliating whiff!'
];

const DEATH_DESCRIPTIONS = [
  'collapses in a heap',
  'falls with a final gasp',
  'crumples to the ground',
  'meets their end',
  'is vanquished',
  'breathes their last',
  'falls lifeless'
];

function generateAttackNarration(attacker, defender, result) {
  const damageType = result.damageType || 'default';
  const verbs = ATTACK_VERBS[damageType] || ATTACK_VERBS.default;
  const verb = verbs[Math.floor(Math.random() * verbs.length)];
  
  if (result.isCritFail) {
    const critFail = CRIT_FAIL_DESCRIPTIONS[Math.floor(Math.random() * CRIT_FAIL_DESCRIPTIONS.length)];
    return `${attacker.name} attacks ${defender.name}... ${critFail}`;
  }
  
  if (!result.hits) {
    const miss = MISS_DESCRIPTIONS[Math.floor(Math.random() * MISS_DESCRIPTIONS.length)];
    return `${attacker.name} swings at ${defender.name}... ${miss}`;
  }
  
  if (result.isCrit) {
    const crit = CRIT_DESCRIPTIONS[Math.floor(Math.random() * CRIT_DESCRIPTIONS.length)];
    return `${attacker.name} ${verb} ${defender.name}! ${crit} **${result.damage} damage!**`;
  }
  
  // Normal hit
  const intensity = result.damage > 15 ? 'powerfully ' : result.damage > 8 ? '' : 'lightly ';
  return `${attacker.name} ${intensity}${verb} ${defender.name} for **${result.damage} damage!**`;
}

function generateMovementNarration(character, fromBand, toBand, cost, difficultTerrain, opportunityAttacks) {
  const terrain = difficultTerrain ? ' through difficult terrain' : '';
  let narrative = `${character.name} moves from ${fromBand} to ${toBand}${terrain} (${cost} ft)`;
  
  if (opportunityAttacks.length > 0) {
    narrative += '\n⚠️ **Opportunity Attacks triggered!**';
    for (const oa of opportunityAttacks) {
      narrative += `\n${oa.narrative}`;
    }
  }
  
  return narrative;
}

/**
 * Resolve opportunity attack (triggered when leaving melee without Disengage)
 */
function resolveOpportunityAttack(attacker, defender) {
  const result = resolveAttack(attacker, defender);
  
  return {
    attacker: attacker.name,
    defender: defender.name,
    ...result,
    narrative: generateAttackNarration(attacker, defender, result) + ' [Opportunity Attack]'
  };
}

function generateDeathNarration(deceased) {
  const death = DEATH_DESCRIPTIONS[Math.floor(Math.random() * DEATH_DESCRIPTIONS.length)];
  return `**${deceased.name} ${death}!**`;
}

function generateVictoryNarration(character, enemies) {
  const totalXP = enemies.reduce((sum, e) => sum + (e.xp || 50), 0);
  return `🎉 **Victory!** ${character.name} has defeated all enemies! Earned **${totalXP} XP**.`;
}

function generateDefeatNarration(character) {
  return `💀 **${character.name} has fallen!** The darkness claims another soul...`;
}

// ============================================================================
// MAIN COMBAT RESOLUTION
// ============================================================================

function initializeCombat(character, enemyTypes, options = {}) {
  // Create enemy instances with current HP and positioning
  const enemies = enemyTypes.map((type, index) => {
    const template = MONSTERS[type] || MONSTERS.goblin;
    
    // Initialize enemy at NEAR range (typical starting distance)
    const startingRange = options.startingRange || RANGE_BANDS.NEAR;
    
    return {
      ...template,
      id: `enemy_${index}`,
      currentHp: template.hp,
      maxHp: template.hp,
      conditions: [],
      position: {
        rangeBand: startingRange,
        targetId: 'player' // enemies target player by default
      }
    };
  });
  
  // Calculate level from XP if available
  const xp = character.xp || character.stats?.xp || 0;
  const level = character.level || character.stats?.level || getLevelFromXP(xp);
  const className = character.class || character.stats?.class || 'fighter';
  const profBonus = getProficiencyBonus(level);
  
  // Calculate expected HP for level if not set
  const conMod = getMod(character.stats?.constitution || 10);
  const expectedHp = calculateHP(level, className, conMod);
  
  // Initialize character combat state with positioning and movement
  const charCombat = {
    ...character,
    level,
    class: className,
    xp,
    currentHp: character.currentHp || character.stats?.hp || expectedHp,
    maxHp: character.maxHp || character.stats?.maxHp || expectedHp,
    conditions: [],
    proficiencyBonus: profBonus,
    attacks: getNumberOfAttacks(level, className),
    spellSlots: getSpellSlots(level, className),
    position: {
      rangeBand: RANGE_BANDS.MELEE // Player starts at melee range
    },
    movement: {
      total: 30, // Base movement speed (5e standard)
      remaining: 30,
      usedThisTurn: false
    },
    actionUsed: false,
    bonusActionUsed: false,
    reactionUsed: false
  };
  
  // Track henchman positioning if present
  if (options.henchman) {
    options.henchman.position = {
      rangeBand: RANGE_BANDS.MELEE // Henchman starts adjacent to player
    };
    options.henchman.movement = {
      total: 30,
      remaining: 30,
      usedThisTurn: false
    };
  }
  
  // Roll initiative
  const order = determineCombatOrder(charCombat, enemies);
  
  return {
    character: charCombat,
    enemies,
    henchman: options.henchman || null,
    initiativeOrder: order,
    round: 1,
    turnIndex: 0,
    combatLog: [],
    characterDodging: false,
    difficultTerrain: options.difficultTerrain || false,
    // Track which enemies are adjacent to which characters for flanking
    adjacency: {
      player: enemies.filter(e => e.position.rangeBand === RANGE_BANDS.MELEE).map(e => e.id),
      henchman: options.henchman ? [] : null
    }
  };
}

function resolveCombatRound(combatState, playerAction) {
  const { character, enemies, initiativeOrder, henchman } = combatState;
  
  const roundResults = {
    round: combatState.round,
    actions: [],
    damage_dealt: 0,
    damage_taken: 0,
    healing_done: 0,
    narration: [],
    combat_over: false,
    result: 'ongoing'
  };
  
  // Reset dodging at start of new round
  combatState.characterDodging = false;
  
  // Validate bonus action if provided
  if (playerAction.bonusAction) {
    const bonusActionType = playerAction.bonusAction.type;
    if (!canUseCunningAction(bonusActionType, character)) {
      roundResults.actions.push({
        error: true,
        message: `Cannot use ${bonusActionType} as bonus action. Cunning Action required (Rogue level 2+).`
      });
      roundResults.narration.push(`⚠️ Cannot use ${bonusActionType} as bonus action without Cunning Action!`);
      // Remove invalid bonus action
      delete playerAction.bonusAction;
    }
  }
  
  // Process each combatant in initiative order
  for (const init of initiativeOrder) {
    const combatant = init.combatant;
    
    // Skip dead combatants
    if (combatant.isPlayer && character.currentHp <= 0) continue;
    if (!combatant.isPlayer && enemies[combatant.combatIndex]?.currentHp <= 0) continue;
    
    // Reset action economy at start of each turn
    if (combatant.isPlayer) {
      // Reset player's movement, actions, and reactions
      if (!character.movement) {
        character.movement = { total: 30, remaining: 30, usedThisTurn: false };
      }
      character.movement.remaining = character.movement.total;
      character.movement.usedThisTurn = false;
      character.actionUsed = false;
      character.bonusActionUsed = false;
      character.reactionUsed = false;
      
      // Remove disengaged condition (lasts until end of turn)
      if (character.conditions?.includes('disengaged')) {
        character.conditions = character.conditions.filter(c => c !== 'disengaged');
      }
    } else {
      // Reset enemy reactions
      const enemy = enemies[combatant.combatIndex];
      if (enemy) {
        enemy.reactionUsed = false;
      }
    }
    
    if (combatant.isPlayer) {
      // Player's turn - process main action
      const actionHandler = ACTIONS[playerAction.type] || ACTIONS.attack;
      const actionOptions = {
        ...(playerAction.options || {}),
        combatState // Pass combat state for movement, flanking, etc.
      };
      const actionResult = actionHandler(character, enemies, actionOptions);
      
      roundResults.actions.push({
        actor: character.name,
        isPlayer: true,
        actionType: 'action',
        ...actionResult
      });
      
      roundResults.narration.push(actionResult.narrative);
      
      // Process bonus action if provided (Cunning Action)
      if (playerAction.bonusAction && !actionResult.skipCombat) {
        const bonusHandler = ACTIONS[playerAction.bonusAction.type];
        if (bonusHandler) {
          const bonusResult = bonusHandler(character, enemies, playerAction.bonusAction.options || {});
          
          roundResults.actions.push({
            actor: character.name,
            isPlayer: true,
            actionType: 'bonus_action',
            cunningAction: true,
            ...bonusResult
          });
          
          roundResults.narration.push(`🎯 **Cunning Action:** ${bonusResult.narrative}`);
          
          // Apply bonus action effects (like dodge from bonus action)
          if (bonusResult.action === 'dodge') {
            combatState.characterDodging = true;
          }
          if (bonusResult.action === 'hide' && bonusResult.hidden) {
            character.conditions = character.conditions || [];
            character.conditions.push('hidden');
          }
        }
      }
      
      // Apply damage
      if (actionResult.damage && actionResult.targetIndex !== undefined) {
        const target = enemies[actionResult.targetIndex];
        target.currentHp -= actionResult.damage;
        roundResults.damage_dealt += actionResult.damage;
        
        if (target.currentHp <= 0) {
          target.currentHp = 0;
          roundResults.narration.push(generateDeathNarration(target));
        }
      }
      
      // Apply AoE damage
      if (actionResult.aoe && actionResult.damage) {
        enemies.forEach((enemy, idx) => {
          if (enemy.currentHp > 0) {
            const save = savingThrow(enemy, 'DEX', 15);
            const dmg = save.success ? Math.floor(actionResult.damage / 2) : actionResult.damage;
            enemy.currentHp -= dmg;
            roundResults.damage_dealt += dmg;
            
            if (enemy.currentHp <= 0) {
              enemy.currentHp = 0;
              roundResults.narration.push(generateDeathNarration(enemy));
            }
          }
        });
      }
      
      // Apply healing
      if (actionResult.healing) {
        character.currentHp = Math.min(character.maxHp, character.currentHp + actionResult.healing);
        roundResults.healing_done += actionResult.healing;
      }
      
      // Handle dodge
      if (actionResult.action === 'dodge') {
        combatState.characterDodging = true;
      }
      
      // Handle hide
      if (actionResult.action === 'hide' && actionResult.hidden) {
        character.conditions = character.conditions || [];
        character.conditions.push('hidden');
      }
      
      // Handle flee
      if (actionResult.action === 'flee' && actionResult.escaped) {
        roundResults.combat_over = true;
        roundResults.result = 'fled';
        roundResults.narration.push(`${character.name || 'The hero'} escapes from combat!`);
        break;
      }
      
    } else {
      // Enemy's turn
      const enemy = enemies[combatant.combatIndex];
      if (!enemy || enemy.currentHp <= 0) continue;
      
      const enemyResult = resolveEnemyTurn(enemy, character, combatState);
      
      if (enemyResult.skipped) {
        if (enemyResult.narrative) {
          roundResults.narration.push(enemyResult.narrative);
        }
        continue;
      }
      
      for (const result of (enemyResult.results || [])) {
        roundResults.actions.push({
          actor: enemy.name,
          isPlayer: false,
          ...result
        });
        
        roundResults.narration.push(result.narrative);
        
        // Apply damage to character
        if (result.damage) {
          character.currentHp -= result.damage;
          roundResults.damage_taken += result.damage;
          
          // Apply special effects
          for (const effect of (result.specialEffects || [])) {
            if (effect.damage) {
              character.currentHp -= effect.damage;
              roundResults.damage_taken += effect.damage;
              roundResults.narration.push(effect.narration);
            }
            if (effect.type === 'paralyzed') {
              character.conditions = character.conditions || [];
              character.conditions.push('paralyzed');
              roundResults.narration.push(effect.narration);
            }
          }
          
          if (character.currentHp <= 0) {
            character.currentHp = 0;
            roundResults.combat_over = true;
            roundResults.result = 'defeat';
            roundResults.narration.push(generateDefeatNarration(character));
            break;
          }
        }
      }
    }
    
    // Check victory condition
    if (enemies.every(e => e.currentHp <= 0)) {
      roundResults.combat_over = true;
      roundResults.result = 'victory';
      roundResults.narration.push(generateVictoryNarration(character, enemies));
      roundResults.xp_earned = enemies.reduce((sum, e) => sum + (e.xp || 50), 0);
      break;
    }
  }
  
  // Increment round
  combatState.round++;
  
  // Remove hidden condition after acting
  if (character.conditions?.includes('hidden')) {
    character.conditions = character.conditions.filter(c => c !== 'hidden');
  }
  
  // Recharge breath weapons on 5-6
  enemies.forEach(enemy => {
    if (enemy.breathOnCooldown) {
      const recharge = d20();
      if (recharge >= (enemy.breathRecharge || 5)) {
        enemy.breathOnCooldown = false;
      }
    }
  });
  
  return roundResults;
}

// ============================================================================
// ENCOUNTER GENERATION (for dungeon integration)
// ============================================================================

function generateEncounter(dungeonLevel, roomType = 'combat') {
  // Scale difficulty with dungeon level
  const tier = Math.min(5, Math.ceil(dungeonLevel / 3));
  
  const tierMonsters = Object.entries(MONSTERS)
    .filter(([_, m]) => m.tier === tier)
    .map(([key, _]) => key);
  
  // Also include some lower tier monsters
  const lowerTierMonsters = Object.entries(MONSTERS)
    .filter(([_, m]) => m.tier === tier - 1 && tier > 1)
    .map(([key, _]) => key);
  
  const availableMonsters = [...tierMonsters, ...lowerTierMonsters];
  if (availableMonsters.length === 0) {
    // Fallback to tier 1
    const fallback = Object.entries(MONSTERS)
      .filter(([_, m]) => m.tier === 1)
      .map(([key, _]) => key);
    availableMonsters.push(...fallback);
  }
  
  // Number of enemies scales with level and room type
  let numEnemies;
  if (roomType === 'boss') {
    numEnemies = 1;
    // Boss room uses higher tier monster
    const bossMonsters = Object.entries(MONSTERS)
      .filter(([_, m]) => m.tier >= tier)
      .map(([key, _]) => key);
    if (bossMonsters.length > 0) {
      return [bossMonsters[Math.floor(Math.random() * bossMonsters.length)]];
    }
  } else if (roomType === 'elite') {
    numEnemies = Math.floor(Math.random() * 2) + 1;
  } else {
    numEnemies = Math.floor(Math.random() * 3) + 1 + Math.floor(dungeonLevel / 5);
  }
  
  numEnemies = Math.min(numEnemies, 5); // Cap at 5 enemies
  
  const enemies = [];
  for (let i = 0; i < numEnemies; i++) {
    const monsterType = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    enemies.push(monsterType);
  }
  
  return enemies;
}

function getMonsterInfo(monsterType) {
  return MONSTERS[monsterType] || null;
}

function listMonsters(tier = null) {
  if (tier) {
    return Object.entries(MONSTERS)
      .filter(([_, m]) => m.tier === tier)
      .map(([key, m]) => ({ id: key, ...m }));
  }
  return Object.entries(MONSTERS).map(([key, m]) => ({ id: key, ...m }));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core mechanics
  roll,
  d20,
  getMod,
  rollD20,
  rollWithAdvantage,
  rollWithDisadvantage,
  
  // Range Bands & Positioning
  RANGE_BANDS,
  MOVEMENT_COSTS,
  RANGE_DISTANCES,
  getRangeBandFromDistance,
  getMovementCost,
  isThreatened,
  checkFlanking,
  validateRange,
  resolveOpportunityAttack,
  
  // XP & Leveling
  XP_THRESHOLDS,
  PROFICIENCY_BY_LEVEL,
  HIT_DICE,
  SPELL_SLOTS,
  MARTIAL_CLASSES,
  FULL_CASTER_CLASSES,
  getLevelFromXP,
  getXPForNextLevel,
  getXPProgress,
  getNumberOfAttacks,
  getProficiencyBonus,
  calculateHP,
  getHPGain,
  getSpellSlots,
  processLevelUp,
  
  // Combat
  rollInitiative,
  determineCombatOrder,
  resolveAttack,
  savingThrow,
  initializeCombat,
  resolveCombatRound,
  
  // Actions
  ACTIONS,
  hasCunningAction,
  canUseCunningAction,
  
  // Monsters
  MONSTERS,
  getMonsterInfo,
  listMonsters,
  generateEncounter,
  
  // Narration
  generateAttackNarration,
  generateDeathNarration,
  generateVictoryNarration,
  generateDefeatNarration,
  generateMovementNarration
};
