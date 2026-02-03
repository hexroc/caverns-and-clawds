/**
 * Caverns & Clawds - Weapon Database
 * 
 * D&D 5e accurate weapon stats including ranges, properties, and damage.
 * All distances in hexes (1 hex = 5 feet).
 */

// ============================================================================
// WEAPON PROPERTIES
// ============================================================================

const WEAPON_PROPERTIES = {
  finesse: 'Can use DEX instead of STR for attack and damage',
  heavy: 'Small creatures have disadvantage',
  light: 'Can be used for two-weapon fighting',
  loading: 'Can only fire once per action/bonus action/reaction',
  reach: 'Adds 5 feet (1 hex) to melee range',
  thrown: 'Can be thrown as a ranged attack',
  twoHanded: 'Requires two hands to use',
  versatile: 'Can be used one or two-handed with different damage',
  ammunition: 'Requires ammunition to fire',
  special: 'Has special rules'
};

// ============================================================================
// WEAPON CATEGORIES
// ============================================================================

const WEAPON_CATEGORIES = {
  simpleMelee: 'Simple Melee Weapon',
  simpleRanged: 'Simple Ranged Weapon',
  martialMelee: 'Martial Melee Weapon',
  martialRanged: 'Martial Ranged Weapon',
  natural: 'Natural Weapon',
  improvised: 'Improvised Weapon'
};

// ============================================================================
// WEAPONS DATABASE
// ============================================================================

const WEAPONS = {
  // === SIMPLE MELEE WEAPONS ===
  
  club: {
    id: 'club',
    name: 'Club',
    category: 'simpleMelee',
    damage: '1d4',
    damageType: 'bludgeoning',
    weight: 2,
    cost: 1, // silver
    range: { melee: 1 }, // 1 hex = 5 feet
    properties: ['light']
  },
  
  dagger: {
    id: 'dagger',
    name: 'Dagger',
    category: 'simpleMelee',
    damage: '1d4',
    damageType: 'piercing',
    weight: 1,
    cost: 20,
    range: { melee: 1, thrown: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['finesse', 'light', 'thrown']
  },
  
  greatclub: {
    id: 'greatclub',
    name: 'Greatclub',
    category: 'simpleMelee',
    damage: '1d8',
    damageType: 'bludgeoning',
    weight: 10,
    cost: 2,
    range: { melee: 1 },
    properties: ['twoHanded']
  },
  
  handaxe: {
    id: 'handaxe',
    name: 'Handaxe',
    category: 'simpleMelee',
    damage: '1d6',
    damageType: 'slashing',
    weight: 2,
    cost: 50,
    range: { melee: 1, thrown: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['light', 'thrown']
  },
  
  javelin: {
    id: 'javelin',
    name: 'Javelin',
    category: 'simpleMelee',
    damage: '1d6',
    damageType: 'piercing',
    weight: 2,
    cost: 5,
    range: { melee: 1, thrown: { normal: 6, long: 24 } }, // 30/120 ft
    properties: ['thrown']
  },
  
  lighthammer: {
    id: 'lighthammer',
    name: 'Light Hammer',
    category: 'simpleMelee',
    damage: '1d4',
    damageType: 'bludgeoning',
    weight: 2,
    cost: 20,
    range: { melee: 1, thrown: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['light', 'thrown']
  },
  
  mace: {
    id: 'mace',
    name: 'Mace',
    category: 'simpleMelee',
    damage: '1d6',
    damageType: 'bludgeoning',
    weight: 4,
    cost: 50,
    range: { melee: 1 },
    properties: []
  },
  
  quarterstaff: {
    id: 'quarterstaff',
    name: 'Quarterstaff',
    category: 'simpleMelee',
    damage: '1d6',
    damageType: 'bludgeoning',
    weight: 4,
    cost: 2,
    range: { melee: 1 },
    properties: ['versatile'],
    versatileDamage: '1d8'
  },
  
  sickle: {
    id: 'sickle',
    name: 'Sickle',
    category: 'simpleMelee',
    damage: '1d4',
    damageType: 'slashing',
    weight: 2,
    cost: 10,
    range: { melee: 1 },
    properties: ['light']
  },
  
  spear: {
    id: 'spear',
    name: 'Spear',
    category: 'simpleMelee',
    damage: '1d6',
    damageType: 'piercing',
    weight: 3,
    cost: 10,
    range: { melee: 1, thrown: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['thrown', 'versatile'],
    versatileDamage: '1d8'
  },
  
  // === SIMPLE RANGED WEAPONS ===
  
  lightCrossbow: {
    id: 'lightCrossbow',
    name: 'Light Crossbow',
    category: 'simpleRanged',
    damage: '1d8',
    damageType: 'piercing',
    weight: 5,
    cost: 250,
    range: { ranged: { normal: 16, long: 64 } }, // 80/320 ft
    properties: ['ammunition', 'loading', 'twoHanded']
  },
  
  dart: {
    id: 'dart',
    name: 'Dart',
    category: 'simpleRanged',
    damage: '1d4',
    damageType: 'piercing',
    weight: 0.25,
    cost: 0.5,
    range: { ranged: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['finesse', 'thrown']
  },
  
  shortbow: {
    id: 'shortbow',
    name: 'Shortbow',
    category: 'simpleRanged',
    damage: '1d6',
    damageType: 'piercing',
    weight: 2,
    cost: 250,
    range: { ranged: { normal: 16, long: 64 } }, // 80/320 ft
    properties: ['ammunition', 'twoHanded']
  },
  
  sling: {
    id: 'sling',
    name: 'Sling',
    category: 'simpleRanged',
    damage: '1d4',
    damageType: 'bludgeoning',
    weight: 0,
    cost: 1,
    range: { ranged: { normal: 6, long: 24 } }, // 30/120 ft
    properties: ['ammunition']
  },
  
  // === MARTIAL MELEE WEAPONS ===
  
  battleaxe: {
    id: 'battleaxe',
    name: 'Battleaxe',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'slashing',
    weight: 4,
    cost: 100,
    range: { melee: 1 },
    properties: ['versatile'],
    versatileDamage: '1d10'
  },
  
  flail: {
    id: 'flail',
    name: 'Flail',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'bludgeoning',
    weight: 2,
    cost: 100,
    range: { melee: 1 },
    properties: []
  },
  
  glaive: {
    id: 'glaive',
    name: 'Glaive',
    category: 'martialMelee',
    damage: '1d10',
    damageType: 'slashing',
    weight: 6,
    cost: 200,
    range: { melee: 2 }, // REACH weapon = 2 hexes (10 feet)
    properties: ['heavy', 'reach', 'twoHanded']
  },
  
  greataxe: {
    id: 'greataxe',
    name: 'Greataxe',
    category: 'martialMelee',
    damage: '1d12',
    damageType: 'slashing',
    weight: 7,
    cost: 300,
    range: { melee: 1 },
    properties: ['heavy', 'twoHanded']
  },
  
  greatsword: {
    id: 'greatsword',
    name: 'Greatsword',
    category: 'martialMelee',
    damage: '2d6',
    damageType: 'slashing',
    weight: 6,
    cost: 500,
    range: { melee: 1 },
    properties: ['heavy', 'twoHanded']
  },
  
  halberd: {
    id: 'halberd',
    name: 'Halberd',
    category: 'martialMelee',
    damage: '1d10',
    damageType: 'slashing',
    weight: 6,
    cost: 200,
    range: { melee: 2 }, // REACH weapon
    properties: ['heavy', 'reach', 'twoHanded']
  },
  
  lance: {
    id: 'lance',
    name: 'Lance',
    category: 'martialMelee',
    damage: '1d12',
    damageType: 'piercing',
    weight: 6,
    cost: 100,
    range: { melee: 2 }, // REACH weapon
    properties: ['reach', 'special'],
    special: 'Disadvantage within 5 feet. Requires two hands when not mounted.'
  },
  
  longsword: {
    id: 'longsword',
    name: 'Longsword',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'slashing',
    weight: 3,
    cost: 150,
    range: { melee: 1 },
    properties: ['versatile'],
    versatileDamage: '1d10'
  },
  
  maul: {
    id: 'maul',
    name: 'Maul',
    category: 'martialMelee',
    damage: '2d6',
    damageType: 'bludgeoning',
    weight: 10,
    cost: 100,
    range: { melee: 1 },
    properties: ['heavy', 'twoHanded']
  },
  
  morningstar: {
    id: 'morningstar',
    name: 'Morningstar',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'piercing',
    weight: 4,
    cost: 150,
    range: { melee: 1 },
    properties: []
  },
  
  pike: {
    id: 'pike',
    name: 'Pike',
    category: 'martialMelee',
    damage: '1d10',
    damageType: 'piercing',
    weight: 18,
    cost: 50,
    range: { melee: 2 }, // REACH weapon
    properties: ['heavy', 'reach', 'twoHanded']
  },
  
  rapier: {
    id: 'rapier',
    name: 'Rapier',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'piercing',
    weight: 2,
    cost: 250,
    range: { melee: 1 },
    properties: ['finesse']
  },
  
  scimitar: {
    id: 'scimitar',
    name: 'Scimitar',
    category: 'martialMelee',
    damage: '1d6',
    damageType: 'slashing',
    weight: 3,
    cost: 250,
    range: { melee: 1 },
    properties: ['finesse', 'light']
  },
  
  shortsword: {
    id: 'shortsword',
    name: 'Shortsword',
    category: 'martialMelee',
    damage: '1d6',
    damageType: 'piercing',
    weight: 2,
    cost: 100,
    range: { melee: 1 },
    properties: ['finesse', 'light']
  },
  
  trident: {
    id: 'trident',
    name: 'Trident',
    category: 'martialMelee',
    damage: '1d6',
    damageType: 'piercing',
    weight: 4,
    cost: 50,
    range: { melee: 1, thrown: { normal: 4, long: 12 } }, // 20/60 ft
    properties: ['thrown', 'versatile'],
    versatileDamage: '1d8'
  },
  
  warpick: {
    id: 'warpick',
    name: 'War Pick',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'piercing',
    weight: 2,
    cost: 50,
    range: { melee: 1 },
    properties: []
  },
  
  warhammer: {
    id: 'warhammer',
    name: 'Warhammer',
    category: 'martialMelee',
    damage: '1d8',
    damageType: 'bludgeoning',
    weight: 2,
    cost: 150,
    range: { melee: 1 },
    properties: ['versatile'],
    versatileDamage: '1d10'
  },
  
  whip: {
    id: 'whip',
    name: 'Whip',
    category: 'martialMelee',
    damage: '1d4',
    damageType: 'slashing',
    weight: 3,
    cost: 20,
    range: { melee: 2 }, // REACH weapon
    properties: ['finesse', 'reach']
  },
  
  // === MARTIAL RANGED WEAPONS ===
  
  blowgun: {
    id: 'blowgun',
    name: 'Blowgun',
    category: 'martialRanged',
    damage: '1',
    damageType: 'piercing',
    weight: 1,
    cost: 100,
    range: { ranged: { normal: 5, long: 20 } }, // 25/100 ft
    properties: ['ammunition', 'loading']
  },
  
  handCrossbow: {
    id: 'handCrossbow',
    name: 'Hand Crossbow',
    category: 'martialRanged',
    damage: '1d6',
    damageType: 'piercing',
    weight: 3,
    cost: 750,
    range: { ranged: { normal: 6, long: 24 } }, // 30/120 ft
    properties: ['ammunition', 'light', 'loading']
  },
  
  heavyCrossbow: {
    id: 'heavyCrossbow',
    name: 'Heavy Crossbow',
    category: 'martialRanged',
    damage: '1d10',
    damageType: 'piercing',
    weight: 18,
    cost: 500,
    range: { ranged: { normal: 20, long: 80 } }, // 100/400 ft
    properties: ['ammunition', 'heavy', 'loading', 'twoHanded']
  },
  
  longbow: {
    id: 'longbow',
    name: 'Longbow',
    category: 'martialRanged',
    damage: '1d8',
    damageType: 'piercing',
    weight: 2,
    cost: 500,
    range: { ranged: { normal: 30, long: 120 } }, // 150/600 ft
    properties: ['ammunition', 'heavy', 'twoHanded']
  },
  
  // === NATURAL WEAPONS (for monsters/lobsters) ===
  
  claw: {
    id: 'claw',
    name: 'Claw',
    category: 'natural',
    damage: '1d6',
    damageType: 'slashing',
    weight: 0,
    cost: 0,
    range: { melee: 1 },
    properties: ['light', 'finesse']
  },
  
  bite: {
    id: 'bite',
    name: 'Bite',
    category: 'natural',
    damage: '1d6',
    damageType: 'piercing',
    weight: 0,
    cost: 0,
    range: { melee: 1 },
    properties: []
  },
  
  crushingClaw: {
    id: 'crushingClaw',
    name: 'Crushing Claw',
    category: 'natural',
    damage: '2d8',
    damageType: 'bludgeoning',
    weight: 0,
    cost: 0,
    range: { melee: 1 },
    properties: ['heavy']
  },
  
  tailSwipe: {
    id: 'tailSwipe',
    name: 'Tail Swipe',
    category: 'natural',
    damage: '1d8',
    damageType: 'bludgeoning',
    weight: 0,
    cost: 0,
    range: { melee: 2 }, // reach
    properties: ['reach']
  },
  
  tentacle: {
    id: 'tentacle',
    name: 'Tentacle',
    category: 'natural',
    damage: '1d8',
    damageType: 'bludgeoning',
    weight: 0,
    cost: 0,
    range: { melee: 2 }, // reach
    properties: ['reach'],
    special: 'Can grapple on hit'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a weapon by ID
 */
function getWeapon(weaponId) {
  return WEAPONS[weaponId] || null;
}

/**
 * Check if a target is in range for an attack
 * @param {Object} weapon - The weapon being used
 * @param {number} distance - Distance in hexes
 * @param {boolean} throwing - Whether to use thrown range
 * @returns {{ inRange: boolean, disadvantage: boolean, rangeType: string }}
 */
function checkWeaponRange(weapon, distance, throwing = false) {
  if (!weapon || !weapon.range) {
    return { inRange: distance <= 1, disadvantage: false, rangeType: 'melee' };
  }
  
  // Check thrown range first if specified
  if (throwing && weapon.range.thrown) {
    const thrown = weapon.range.thrown;
    if (distance <= thrown.normal) {
      return { inRange: true, disadvantage: false, rangeType: 'thrown' };
    } else if (distance <= thrown.long) {
      return { inRange: true, disadvantage: true, rangeType: 'thrown-long' };
    }
    return { inRange: false, disadvantage: false, rangeType: 'out-of-range' };
  }
  
  // Check ranged
  if (weapon.range.ranged) {
    const ranged = weapon.range.ranged;
    if (distance <= ranged.normal) {
      return { inRange: true, disadvantage: false, rangeType: 'ranged' };
    } else if (distance <= ranged.long) {
      return { inRange: true, disadvantage: true, rangeType: 'ranged-long' };
    }
    return { inRange: false, disadvantage: false, rangeType: 'out-of-range' };
  }
  
  // Check melee
  if (weapon.range.melee !== undefined) {
    const meleeRange = weapon.range.melee;
    if (distance <= meleeRange) {
      return { inRange: true, disadvantage: false, rangeType: 'melee' };
    }
    
    // Can use thrown range if available
    if (weapon.range.thrown && weapon.properties?.includes('thrown')) {
      return checkWeaponRange(weapon, distance, true);
    }
    
    return { inRange: false, disadvantage: false, rangeType: 'out-of-range' };
  }
  
  // Default melee
  return { inRange: distance <= 1, disadvantage: false, rangeType: 'melee' };
}

/**
 * Get the maximum range of a weapon (for targeting UI)
 */
function getMaxRange(weapon) {
  if (!weapon || !weapon.range) return 1;
  
  let maxRange = 1;
  
  if (weapon.range.melee !== undefined) {
    maxRange = Math.max(maxRange, weapon.range.melee);
  }
  
  if (weapon.range.ranged) {
    maxRange = Math.max(maxRange, weapon.range.ranged.long || weapon.range.ranged.normal);
  }
  
  if (weapon.range.thrown) {
    maxRange = Math.max(maxRange, weapon.range.thrown.long || weapon.range.thrown.normal);
  }
  
  return maxRange;
}

/**
 * Get the normal (no disadvantage) range of a weapon
 */
function getNormalRange(weapon) {
  if (!weapon || !weapon.range) return 1;
  
  if (weapon.range.melee !== undefined) return weapon.range.melee;
  if (weapon.range.ranged) return weapon.range.ranged.normal;
  if (weapon.range.thrown) return weapon.range.thrown.normal;
  
  return 1;
}

/**
 * Check if weapon has a property
 */
function hasProperty(weapon, property) {
  return weapon?.properties?.includes(property) || false;
}

/**
 * Get all ranged weapons
 */
function getRangedWeapons() {
  return Object.values(WEAPONS).filter(w => w.range.ranged || hasProperty(w, 'thrown'));
}

/**
 * Get all reach weapons
 */
function getReachWeapons() {
  return Object.values(WEAPONS).filter(w => hasProperty(w, 'reach'));
}

/**
 * Determine the attack type based on weapon and how it's being used
 */
function getAttackType(weapon, distance, preferRanged = false) {
  if (!weapon) return 'melee';
  
  // If can only be ranged
  if (!weapon.range.melee && weapon.range.ranged) return 'ranged';
  
  // If ranged preferred and possible
  if (preferRanged) {
    if (weapon.range.ranged) return 'ranged';
    if (hasProperty(weapon, 'thrown')) return 'thrown';
  }
  
  // If in melee range, use melee
  if (weapon.range.melee && distance <= weapon.range.melee) return 'melee';
  
  // Otherwise, use ranged if available
  if (weapon.range.ranged) return 'ranged';
  if (hasProperty(weapon, 'thrown')) return 'thrown';
  
  return 'melee';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  WEAPONS,
  WEAPON_PROPERTIES,
  WEAPON_CATEGORIES,
  getWeapon,
  checkWeaponRange,
  getMaxRange,
  getNormalRange,
  hasProperty,
  getRangedWeapons,
  getReachWeapons,
  getAttackType
};
