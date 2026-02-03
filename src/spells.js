/**
 * Caverns & Clawds - Spell Database
 * 
 * D&D 5e accurate spell data including ranges, areas of effect, and damage.
 * All distances in hexes (1 hex = 5 feet).
 */

// ============================================================================
// SPELL RANGES (in hexes, 1 hex = 5 feet)
// ============================================================================

const RANGE = {
  SELF: 0,
  TOUCH: 1,
  FIVE_FT: 1,     // 5 feet
  TEN_FT: 2,      // 10 feet
  FIFTEEN_FT: 3,  // 15 feet
  THIRTY_FT: 6,   // 30 feet
  SIXTY_FT: 12,   // 60 feet
  NINETY_FT: 18,  // 90 feet
  ONE_TWENTY_FT: 24,  // 120 feet
  ONE_FIFTY_FT: 30,   // 150 feet
  THREE_HUNDRED_FT: 60, // 300 feet
  UNLIMITED: 999
};

// ============================================================================
// AREA EFFECT SHAPES
// ============================================================================

const AREA_SHAPES = {
  SINGLE: 'single',     // Single target
  CONE: 'cone',         // Cone shape (originates from caster)
  SPHERE: 'sphere',     // Sphere/radius around a point
  CUBE: 'cube',         // Cube area
  LINE: 'line',         // Line from caster
  CYLINDER: 'cylinder', // Vertical cylinder
  SELF_RADIUS: 'self_radius'  // Centered on caster
};

// ============================================================================
// SPELL SCHOOLS
// ============================================================================

const SCHOOLS = {
  ABJURATION: 'abjuration',
  CONJURATION: 'conjuration',
  DIVINATION: 'divination',
  ENCHANTMENT: 'enchantment',
  EVOCATION: 'evocation',
  ILLUSION: 'illusion',
  NECROMANCY: 'necromancy',
  TRANSMUTATION: 'transmutation'
};

// ============================================================================
// SPELLS DATABASE
// ============================================================================

const SPELLS = {
  
  // ============ CANTRIPS (Level 0) ============
  
  firebolt: {
    id: 'firebolt',
    name: 'Fire Bolt',
    level: 0,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    attackType: 'ranged',
    damage: '1d10',
    damageType: 'fire',
    scaling: { // Damage increases at higher levels
      5: '2d10',
      11: '3d10',
      17: '4d10'
    },
    description: 'A mote of fire streaks toward a creature within range.',
    visual: 'fireball_projectile'
  },
  
  rayOfFrost: {
    id: 'rayOfFrost',
    name: 'Ray of Frost',
    level: 0,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    attackType: 'ranged',
    damage: '1d8',
    damageType: 'cold',
    effect: 'Target speed reduced by 10ft until start of your next turn',
    scaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
    description: 'A frigid beam of blue-white light streaks toward a creature.',
    visual: 'ice_beam'
  },
  
  eldritchBlast: {
    id: 'eldritchBlast',
    name: 'Eldritch Blast',
    level: 0,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    attackType: 'ranged',
    damage: '1d10',
    damageType: 'force',
    scaling: { // Additional beams at higher levels
      5: '2 beams',
      11: '3 beams',
      17: '4 beams'
    },
    description: 'A beam of crackling energy streaks toward a creature.',
    visual: 'eldritch_blast'
  },
  
  acidSplash: {
    id: 'acidSplash',
    name: 'Acid Splash',
    level: 0,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE, targets: 2, targetRadius: 1 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '1d6',
    damageType: 'acid',
    scaling: { 5: '2d6', 11: '3d6', 17: '4d6' },
    description: 'You hurl a bubble of acid at one creature, or two creatures within 5 feet of each other.',
    visual: 'acid_splash'
  },
  
  sacredFlame: {
    id: 'sacredFlame',
    name: 'Sacred Flame',
    level: 0,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '1d8',
    damageType: 'radiant',
    effect: 'Target gains no benefit from cover',
    scaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
    description: 'Flame-like radiance descends on a creature you can see.',
    visual: 'sacred_flame'
  },
  
  chillTouch: {
    id: 'chillTouch',
    name: 'Chill Touch',
    level: 0,
    school: SCHOOLS.NECROMANCY,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 round',
    components: ['V', 'S'],
    attackType: 'ranged',
    damage: '1d8',
    damageType: 'necrotic',
    effect: 'Target cannot regain HP until start of your next turn. Undead have disadvantage on attacks against you.',
    scaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
    description: 'A ghostly skeletal hand reaches toward a creature.',
    visual: 'necrotic_hand'
  },
  
  shockingGrasp: {
    id: 'shockingGrasp',
    name: 'Shocking Grasp',
    level: 0,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    attackType: 'melee',
    damage: '1d8',
    damageType: 'lightning',
    effect: 'Advantage if target wearing metal armor. Target cannot take reactions until start of its next turn.',
    scaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
    description: 'Lightning springs from your hand to deliver a shock.',
    visual: 'lightning_touch'
  },
  
  // ============ 1ST LEVEL SPELLS ============
  
  burningHands: {
    id: 'burningHands',
    name: 'Burning Hands',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { 
      shape: AREA_SHAPES.CONE, 
      size: 3  // 15-foot cone (3 hexes)
    },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '3d6',
    damageType: 'fire',
    halfOnSave: true,
    upcast: '+1d6 per slot above 1st',
    description: 'A thin sheet of flames shoots forth from your outstretched fingertips.',
    visual: 'fire_cone'
  },
  
  magicMissile: {
    id: 'magicMissile',
    name: 'Magic Missile',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE, missiles: 3 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    autoHit: true,
    damage: '1d4+1',
    damageType: 'force',
    missiles: 3,
    upcast: '+1 missile per slot above 1st',
    description: 'You create three glowing darts of magical force that strike their targets.',
    visual: 'magic_missiles'
  },
  
  thunderwave: {
    id: 'thunderwave',
    name: 'Thunderwave',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { 
      shape: AREA_SHAPES.CUBE, 
      size: 3  // 15-foot cube (3 hexes)
    },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'CON',
    damage: '2d8',
    damageType: 'thunder',
    halfOnSave: true,
    effect: 'On failed save, pushed 10 feet away',
    upcast: '+1d8 per slot above 1st',
    description: 'A wave of thunderous force sweeps out from you.',
    visual: 'thunderwave'
  },
  
  cureWounds: {
    id: 'cureWounds',
    name: 'Cure Wounds',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    healing: '1d8',
    effect: 'Regains HP equal to 1d8 + spellcasting modifier',
    upcast: '+1d8 per slot above 1st',
    description: 'A creature you touch regains hit points.',
    visual: 'healing_light'
  },
  
  shield: {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 reaction',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 round',
    components: ['V', 'S'],
    effect: '+5 AC until start of next turn, including against triggering attack. Immune to magic missile.',
    description: 'An invisible barrier of magical force appears to protect you.',
    visual: 'shield_barrier'
  },
  
  sleep: {
    id: 'sleep',
    name: 'Sleep',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.NINETY_FT,
    area: { 
      shape: AREA_SHAPES.SPHERE, 
      radius: 4  // 20-foot radius (4 hexes)
    },
    duration: '1 minute',
    components: ['V', 'S', 'M'],
    effect: 'Roll 5d8; creatures with fewest HP first fall unconscious',
    upcast: '+2d8 HP per slot above 1st',
    description: 'Creatures fall into a magical slumber.',
    visual: 'sleep_sparkles'
  },
  
  // ============ 2ND LEVEL SPELLS ============
  
  scorchingRay: {
    id: 'scorchingRay',
    name: 'Scorching Ray',
    level: 2,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE, missiles: 3 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    attackType: 'ranged',
    damage: '2d6',
    damageType: 'fire',
    missiles: 3,
    upcast: '+1 ray per slot above 2nd',
    description: 'You create three rays of fire and hurl them at targets.',
    visual: 'fire_rays'
  },
  
  shatter: {
    id: 'shatter',
    name: 'Shatter',
    level: 2,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { 
      shape: AREA_SHAPES.SPHERE, 
      radius: 2  // 10-foot radius (2 hexes)
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'CON',
    damage: '3d8',
    damageType: 'thunder',
    halfOnSave: true,
    effect: 'Creatures made of inorganic material have disadvantage',
    upcast: '+1d8 per slot above 2nd',
    description: 'A sudden loud ringing noise erupts from a point you choose.',
    visual: 'shatter_ring'
  },
  
  holdPerson: {
    id: 'holdPerson',
    name: 'Hold Person',
    level: 2,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Concentration, 1 minute',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    condition: 'paralyzed',
    effect: 'Target paralyzed. Repeats save at end of each turn.',
    upcast: '+1 target per slot above 2nd',
    description: 'The target must succeed on a Wisdom save or be paralyzed.',
    visual: 'paralysis_chains'
  },
  
  // ============ 3RD LEVEL SPELLS ============
  
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    level: 3,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_FIFTY_FT,
    area: { 
      shape: AREA_SHAPES.SPHERE, 
      radius: 4  // 20-foot radius (4 hexes)
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '8d6',
    damageType: 'fire',
    halfOnSave: true,
    effect: 'Ignites flammable objects not being worn',
    upcast: '+1d6 per slot above 3rd',
    description: 'A bright streak flashes to a point you choose and then blossoms into an explosion of flame.',
    visual: 'fireball_explosion'
  },
  
  lightningBolt: {
    id: 'lightningBolt',
    name: 'Lightning Bolt',
    level: 3,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { 
      shape: AREA_SHAPES.LINE, 
      length: 20,  // 100 feet (20 hexes)
      width: 1     // 5 feet wide
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '8d6',
    damageType: 'lightning',
    halfOnSave: true,
    upcast: '+1d6 per slot above 3rd',
    description: 'A stroke of lightning forms a line 100 feet long and 5 feet wide.',
    visual: 'lightning_bolt'
  },
  
  counterspell: {
    id: 'counterspell',
    name: 'Counterspell',
    level: 3,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 reaction',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['S'],
    effect: 'Interrupt a spell of 3rd level or lower. For higher, check: d20 + spellcasting ability vs 10 + spell level.',
    upcast: 'Auto-counters spells of slot level or lower',
    description: 'You attempt to interrupt a creature casting a spell.',
    visual: 'counter_flash'
  },
  
  // ============ 4TH LEVEL SPELLS ============
  
  iceStorm: {
    id: 'iceStorm',
    name: 'Ice Storm',
    level: 4,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.THREE_HUNDRED_FT,
    area: { 
      shape: AREA_SHAPES.CYLINDER, 
      radius: 4,   // 20-foot radius (4 hexes)
      height: 8    // 40 feet tall
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '2d8',
    bonusDamage: '4d6',
    damageType: 'bludgeoning',
    bonusDamageType: 'cold',
    halfOnSave: true,
    effect: 'Area becomes difficult terrain until end of your next turn',
    upcast: '+1d8 bludgeoning per slot above 4th',
    description: 'A hail of rock-hard ice pounds to the ground in a 20-foot-radius, 40-foot-high cylinder.',
    visual: 'ice_storm'
  },
  
  // ============ 5TH LEVEL SPELLS ============
  
  coneOfCold: {
    id: 'coneOfCold',
    name: 'Cone of Cold',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { 
      shape: AREA_SHAPES.CONE, 
      size: 12  // 60-foot cone (12 hexes)
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'CON',
    damage: '8d8',
    damageType: 'cold',
    halfOnSave: true,
    effect: 'Creatures killed become frozen statues',
    upcast: '+1d8 per slot above 5th',
    description: 'A blast of cold air erupts from your hands in a 60-foot cone.',
    visual: 'frost_cone'
  },
  
  flameStrike: {
    id: 'flameStrike',
    name: 'Flame Strike',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { 
      shape: AREA_SHAPES.CYLINDER, 
      radius: 2,   // 10-foot radius (2 hexes)
      height: 8    // 40 feet tall
    },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '4d6',
    bonusDamage: '4d6',
    damageType: 'fire',
    bonusDamageType: 'radiant',
    halfOnSave: true,
    upcast: '+1d6 fire OR +1d6 radiant per slot above 5th',
    description: 'A vertical column of divine fire roars down from the heavens.',
    visual: 'divine_pillar'
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a spell by ID
 */
function getSpell(spellId) {
  return SPELLS[spellId] || null;
}

/**
 * Check if target is in spell range
 * @param {Object} spell - The spell being cast
 * @param {number} distance - Distance in hexes to target
 * @returns {boolean}
 */
function isInSpellRange(spell, distance) {
  if (!spell) return false;
  if (spell.range === RANGE.UNLIMITED) return true;
  if (spell.range === RANGE.SELF) return distance === 0;
  return distance <= spell.range;
}

/**
 * Get hexes affected by an area spell
 * @param {Object} spell - The spell
 * @param {Object} origin - Origin hex {q, r}
 * @param {Object} target - Target hex {q, r} (for cones/lines, this determines direction)
 * @param {Function} hexRange - Function to get hexes in range
 * @param {Function} hexDistance - Function to get distance between hexes
 * @returns {Array} Array of affected hex positions
 */
function getAffectedHexes(spell, origin, target, hexRange, hexDistance, hexNeighbors) {
  if (!spell || !spell.area) return [target];
  
  const affected = [];
  const { shape, size, radius, length, width } = spell.area;
  
  switch (shape) {
    case AREA_SHAPES.SINGLE:
      return [target];
      
    case AREA_SHAPES.SPHERE:
    case AREA_SHAPES.CYLINDER:
      // All hexes within radius of target
      const sphereRadius = radius || size || 1;
      const allHexes = hexRange(target, sphereRadius);
      return allHexes.filter(h => hexDistance(target, h) <= sphereRadius);
      
    case AREA_SHAPES.CUBE:
      // All hexes within a cube (approximated on hex grid)
      const cubeSize = size || 1;
      return hexRange(target, cubeSize);
      
    case AREA_SHAPES.CONE:
      // Cone from caster toward target
      const coneSize = size || 3;
      return getConeHexes(origin, target, coneSize, hexDistance, hexNeighbors);
      
    case AREA_SHAPES.LINE:
      // Line from caster toward target
      const lineLength = length || 10;
      const lineWidth = width || 1;
      return getLineHexes(origin, target, lineLength, lineWidth, hexDistance);
      
    case AREA_SHAPES.SELF_RADIUS:
      // All hexes within radius of caster
      const selfRadius = radius || size || 1;
      return hexRange(origin, selfRadius);
      
    default:
      return [target];
  }
}

/**
 * Get hexes in a cone shape
 */
function getConeHexes(origin, target, coneSize, hexDistance, hexNeighbors) {
  const affected = [];
  
  // Determine direction of cone
  const dx = target.q - origin.q;
  const dr = target.r - origin.r;
  
  // Normalize direction
  const length = Math.sqrt(dx * dx + dr * dr);
  const dirQ = length > 0 ? dx / length : 1;
  const dirR = length > 0 ? dr / length : 0;
  
  // For each distance level in the cone, add hexes within spreading width
  for (let dist = 1; dist <= coneSize; dist++) {
    // Width at this distance (cone spreads)
    const widthAtDist = Math.ceil(dist / 2);
    
    // Center hex at this distance
    const centerQ = origin.q + Math.round(dirQ * dist);
    const centerR = origin.r + Math.round(dirR * dist);
    
    // Add center and spread hexes
    affected.push({ q: centerQ, r: centerR });
    
    // Add adjacent hexes based on width
    if (widthAtDist > 0) {
      const neighbors = hexNeighbors({ q: centerQ, r: centerR });
      for (const neighbor of neighbors) {
        const neighborDist = hexDistance(origin, neighbor);
        if (neighborDist <= coneSize && neighborDist >= dist - 1) {
          if (!affected.some(h => h.q === neighbor.q && h.r === neighbor.r)) {
            affected.push(neighbor);
          }
        }
      }
    }
  }
  
  return affected;
}

/**
 * Get hexes in a line shape
 */
function getLineHexes(origin, target, lineLength, lineWidth, hexDistance) {
  const affected = [];
  
  // Direction from origin to target
  const dx = target.q - origin.q;
  const dr = target.r - origin.r;
  const length = Math.sqrt(dx * dx + dr * dr);
  
  if (length === 0) return [origin];
  
  const dirQ = dx / length;
  const dirR = dr / length;
  
  // Walk along the line
  for (let dist = 1; dist <= lineLength; dist++) {
    const hexQ = origin.q + Math.round(dirQ * dist);
    const hexR = origin.r + Math.round(dirR * dist);
    
    affected.push({ q: hexQ, r: hexR });
    
    // Add width (perpendicular hexes)
    if (lineWidth > 1) {
      // Perpendicular directions
      const perpQ = -dirR;
      const perpR = dirQ;
      
      for (let w = 1; w <= Math.floor(lineWidth / 2); w++) {
        affected.push({ 
          q: hexQ + Math.round(perpQ * w), 
          r: hexR + Math.round(perpR * w) 
        });
        affected.push({ 
          q: hexQ - Math.round(perpQ * w), 
          r: hexR - Math.round(perpR * w) 
        });
      }
    }
  }
  
  return affected;
}

/**
 * Get all cantrips
 */
function getCantrips() {
  return Object.values(SPELLS).filter(s => s.level === 0);
}

/**
 * Get spells by level
 */
function getSpellsByLevel(level) {
  return Object.values(SPELLS).filter(s => s.level === level);
}

/**
 * Get spells with area effects
 */
function getAreaSpells() {
  return Object.values(SPELLS).filter(s => 
    s.area && s.area.shape !== AREA_SHAPES.SINGLE
  );
}

/**
 * Calculate spell damage (with scaling)
 */
function getSpellDamage(spell, casterLevel = 1, slotLevel = null) {
  if (!spell.damage) return null;
  
  let damage = spell.damage;
  
  // Cantrip scaling (based on character level)
  if (spell.level === 0 && spell.scaling) {
    const levels = Object.keys(spell.scaling).map(Number).sort((a, b) => b - a);
    for (const level of levels) {
      if (casterLevel >= level) {
        damage = spell.scaling[level];
        break;
      }
    }
  }
  
  // Upcast scaling (based on slot level)
  if (slotLevel && slotLevel > spell.level && spell.upcast) {
    const extraLevels = slotLevel - spell.level;
    const upcastMatch = spell.upcast.match(/\+(\d+)d(\d+)/);
    if (upcastMatch) {
      const [_, numDice, dieSize] = upcastMatch;
      const extraDice = parseInt(numDice) * extraLevels;
      // Add extra dice to damage
      const baseDiceMatch = damage.match(/(\d+)d(\d+)/);
      if (baseDiceMatch) {
        const baseNum = parseInt(baseDiceMatch[1]);
        const baseDie = baseDiceMatch[2];
        damage = `${baseNum + extraDice}d${baseDie}`;
      }
    }
  }
  
  return damage;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SPELLS,
  RANGE,
  AREA_SHAPES,
  SCHOOLS,
  getSpell,
  isInSpellRange,
  getAffectedHexes,
  getCantrips,
  getSpellsByLevel,
  getAreaSpells,
  getSpellDamage
};
