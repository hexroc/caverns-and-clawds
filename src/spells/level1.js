/**
 * Caverns & Clawds - Level 1 Spells
 * All level 1 spells with full mechanics
 */

const { d20, roll, getMod, savingThrow } = require('../combat');
const { startConcentration } = require('./concentration');

// ============================================================================
// DAMAGE SPELLS
// ============================================================================

const magicMissile = {
  id: 'magic_missile',
  name: 'Magic Missile',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 120,
  components: ['V', 'S'],
  duration: 'instant',
  description: 'Create 3 bolts of magical force. Each hits automatically for 1d4+1 force damage.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const missiles = 3 + (slotLevel - 1); // +1 missile per level above 1st
    let totalDamage = 0;
    const hits = [];
    
    for (let i = 0; i < missiles; i++) {
      const damage = roll('1d4+1').total;
      totalDamage += damage;
      hits.push({ missile: i + 1, damage });
    }
    
    return {
      success: true,
      damage: totalDamage,
      damageType: 'force',
      hits,
      narrative: `Three glowing darts of force streak toward ${targets[0]?.name}, dealing ${totalDamage} force damage!`
    };
  }
};

const burningHands = {
  id: 'burning_hands',
  name: 'Burning Hands',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 15,
  area: 'cone',
  components: ['V', 'S'],
  duration: 'instant',
  save: 'DEX',
  description: '15ft cone of fire. DEX save or 3d6 fire damage (half on save).',
  
  cast: (caster, targets, slotLevel = 1) => {
    const baseDice = 3 + (slotLevel - 1); // +1d6 per level above 1st
    const damage = roll(`${baseDice}d6`);
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    const results = targets.map(target => {
      const save = savingThrow(target, 'DEX', dc);
      const finalDamage = save.success ? Math.floor(damage.total / 2) : damage.total;
      
      return {
        target: target.name,
        damage: finalDamage,
        saved: save.success,
        saveRoll: save.total
      };
    });
    
    return {
      success: true,
      damageType: 'fire',
      results,
      narrative: `Flames burst from ${caster.name}'s outstretched hands in a searing cone!`
    };
  }
};

const thunderwave = {
  id: 'thunderwave',
  name: 'Thunderwave',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 'self',
  area: '15ft cube',
  components: ['V', 'S'],
  duration: 'instant',
  save: 'CON',
  description: '15ft cube. CON save or 2d8 thunder damage and pushed 10ft (half damage, no push on save).',
  
  cast: (caster, targets, slotLevel = 1) => {
    const baseDice = 2 + (slotLevel - 1); // +1d8 per level above 1st
    const damage = roll(`${baseDice}d8`);
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    const results = targets.map(target => {
      const save = savingThrow(target, 'CON', dc);
      const finalDamage = save.success ? Math.floor(damage.total / 2) : damage.total;
      
      return {
        target: target.name,
        damage: finalDamage,
        pushed: !save.success,
        saved: save.success
      };
    });
    
    return {
      success: true,
      damageType: 'thunder',
      results,
      narrative: `A thunderous wave erupts from ${caster.name}, shaking the very water around them!`
    };
  }
};

const guildingBolt = {
  id: 'guiding_bolt',
  name: 'Guiding Bolt',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 120,
  components: ['V', 'S'],
  duration: '1 round',
  description: 'Ranged spell attack. 4d6 radiant damage. Next attack has advantage.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0];
    const spellMod = getMod(caster.stats?.wisdom || caster.stats?.intelligence || 10);
    const attackRoll = d20() + spellMod + (caster.proficiencyBonus || 2);
    const hits = attackRoll >= (target.ac || 10);
    
    if (hits) {
      const baseDice = 4 + (slotLevel - 1); // +1d6 per level above 1st
      const damage = roll(`${baseDice}d6`);
      
      // Mark target for advantage on next attack
      target.guildedUntilNextHit = true;
      
      return {
        success: true,
        hit: true,
        damage: damage.total,
        damageType: 'radiant',
        effect: 'Next attack on target has advantage',
        narrative: `A flash of radiant light strikes ${target.name} for ${damage.total} damage, illuminating them for allies!`
      };
    }
    
    return {
      success: true,
      hit: false,
      damage: 0,
      narrative: `The radiant bolt streaks past ${target.name}, missing by inches!`
    };
  }
};

const inflictWounds = {
  id: 'inflict_wounds',
  name: 'Inflict Wounds',
  level: 1,
  school: 'necromancy',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S'],
  duration: 'instant',
  description: 'Melee spell attack. 3d10 necrotic damage.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0];
    const spellMod = getMod(caster.stats?.wisdom || caster.stats?.intelligence || 10);
    const attackRoll = d20() + spellMod + (caster.proficiencyBonus || 2);
    const hits = attackRoll >= (target.ac || 10);
    
    if (hits) {
      const baseDice = 3 + (slotLevel - 1); // +1d10 per level above 1st
      const damage = roll(`${baseDice}d10`);
      
      return {
        success: true,
        hit: true,
        damage: damage.total,
        damageType: 'necrotic',
        narrative: `${caster.name}'s touch drains the life force from ${target.name} for ${damage.total} necrotic damage!`
      };
    }
    
    return {
      success: true,
      hit: false,
      damage: 0,
      narrative: `${target.name} evades ${caster.name}'s necrotic touch!`
    };
  }
};

const chromaticOrb = {
  id: 'chromatic_orb',
  name: 'Chromatic Orb',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 90,
  components: ['V', 'S', 'M'],
  duration: 'instant',
  description: 'Ranged spell attack. 3d8 damage. Choose acid, cold, fire, lightning, poison, or thunder.',
  
  cast: (caster, targets, slotLevel = 1, options = {}) => {
    const target = targets[0];
    const damageType = options.damageType || 'fire';
    const spellMod = getMod(caster.stats?.intelligence || 10);
    const attackRoll = d20() + spellMod + (caster.proficiencyBonus || 2);
    const hits = attackRoll >= (target.ac || 10);
    
    if (hits) {
      const baseDice = 3 + (slotLevel - 1); // +1d8 per level above 1st
      const damage = roll(`${baseDice}d8`);
      
      return {
        success: true,
        hit: true,
        damage: damage.total,
        damageType,
        narrative: `A ${damageType} orb slams into ${target.name} for ${damage.total} damage!`
      };
    }
    
    return {
      success: true,
      hit: false,
      damage: 0,
      narrative: `The ${damageType} orb misses ${target.name}!`
    };
  }
};

// ============================================================================
// HEALING SPELLS
// ============================================================================

const cureWounds = {
  id: 'cure_wounds',
  name: 'Cure Wounds',
  level: 1,
  school: 'evocation',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S'],
  duration: 'instant',
  description: 'Touch a creature to restore 1d8 + spellcasting modifier HP.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const baseDice = 1 + (slotLevel - 1); // +1d8 per level above 1st
    const spellMod = getMod(caster.stats?.wisdom || caster.stats?.intelligence || 10);
    const healing = roll(`${baseDice}d8`).total + spellMod;
    
    const target = targets[0] || caster;
    const oldHp = target.currentHp;
    target.currentHp = Math.min(target.maxHp, target.currentHp + healing);
    const actualHealing = target.currentHp - oldHp;
    
    return {
      success: true,
      healing: actualHealing,
      target: target.name,
      narrative: `Healing energy flows into ${target.name}, restoring ${actualHealing} HP!`
    };
  }
};

const healingWord = {
  id: 'healing_word',
  name: 'Healing Word',
  level: 1,
  school: 'evocation',
  castingTime: 'bonus',
  range: 60,
  components: ['V'],
  duration: 'instant',
  description: 'Bonus action. Creature within 60ft regains 1d4 + spellcasting modifier HP.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const baseDice = 1 + (slotLevel - 1); // +1d4 per level above 1st
    const spellMod = getMod(caster.stats?.wisdom || caster.stats?.intelligence || 10);
    const healing = roll(`${baseDice}d4`).total + spellMod;
    
    const target = targets[0] || caster;
    const oldHp = target.currentHp;
    target.currentHp = Math.min(target.maxHp, target.currentHp + healing);
    const actualHealing = target.currentHp - oldHp;
    
    return {
      success: true,
      healing: actualHealing,
      target: target.name,
      narrative: `${caster.name}'s healing word washes over ${target.name}, restoring ${actualHealing} HP!`
    };
  }
};

// ============================================================================
// BUFF/UTILITY SPELLS
// ============================================================================

const shield = {
  id: 'shield',
  name: 'Shield',
  level: 1,
  school: 'abjuration',
  castingTime: 'reaction',
  range: 'self',
  components: ['V', 'S'],
  duration: '1 round',
  description: 'Reaction. +5 AC until start of your next turn, including against the triggering attack.',
  
  cast: (caster, targets, slotLevel = 1) => {
    caster.shieldActive = true;
    caster.tempAC = (caster.tempAC || 0) + 5;
    
    return {
      success: true,
      effect: '+5 AC',
      duration: '1 round',
      narrative: `An invisible barrier springs into existence, protecting ${caster.name}!`
    };
  }
};

const bless = {
  id: 'bless',
  name: 'Bless',
  level: 1,
  school: 'enchantment',
  castingTime: 'action',
  range: 30,
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute in seconds
  concentration: true,
  description: 'Up to 3 creatures add 1d4 to attack rolls and saving throws for 1 minute.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const numTargets = Math.min(3 + (slotLevel - 1), targets.length); // +1 target per level above 1st
    const blessed = targets.slice(0, numTargets);
    
    // Start concentration
    startConcentration(caster, 'bless', 'Bless', 60, {
      buffTargets: true,
      attackBonus: '1d4',
      savingThrowBonus: '1d4'
    });
    
    // Mark targets as blessed
    blessed.forEach(target => {
      target.blessedBy = caster.name;
      target.blessBonus = '1d4';
    });
    
    return {
      success: true,
      targets: blessed.map(t => t.name),
      effect: '+1d4 to attacks and saves',
      duration: '1 minute (concentration)',
      narrative: `Divine light surrounds ${blessed.map(t => t.name).join(', ')}, blessing them with enhanced accuracy!`
    };
  }
};

const hex = {
  id: 'hex',
  name: 'Hex',
  level: 1,
  school: 'enchantment',
  castingTime: 'bonus',
  range: 90,
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  concentration: true,
  description: 'Bonus action. Deal extra 1d6 necrotic damage when you hit. Target has disadvantage on chosen ability checks.',
  
  cast: (caster, targets, slotLevel = 1, options = {}) => {
    const target = targets[0];
    const ability = options.ability || 'STR';
    
    // Start concentration
    startConcentration(caster, 'hex', 'Hex', 3600, {
      debuffTargets: true,
      extraDamage: '1d6',
      damageType: 'necrotic',
      disadvantage: ability
    });
    
    // Mark target
    target.hexedBy = {
      caster: caster.name,
      ability,
      extraDamage: '1d6'
    };
    
    return {
      success: true,
      target: target.name,
      effect: '+1d6 necrotic damage per hit',
      disadvantage: ability,
      duration: '1 hour (concentration)',
      narrative: `${caster.name} places a hex on ${target.name}, cursing them with necrotic energy!`
    };
  }
};

const huntersMark = {
  id: 'hunters_mark',
  name: "Hunter's Mark",
  level: 1,
  school: 'divination',
  castingTime: 'bonus',
  range: 90,
  components: ['V'],
  duration: 3600, // 1 hour
  concentration: true,
  description: 'Bonus action. Deal extra 1d6 damage when you hit. Advantage on Perception/Survival checks to find target.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0];
    
    // Start concentration
    startConcentration(caster, 'hunters_mark', "Hunter's Mark", 3600, {
      debuffTargets: true,
      extraDamage: '1d6',
      damageType: 'weapon'
    });
    
    // Mark target
    target.markedBy = {
      caster: caster.name,
      extraDamage: '1d6'
    };
    
    return {
      success: true,
      target: target.name,
      effect: '+1d6 damage per hit',
      duration: '1 hour (concentration)',
      narrative: `${caster.name} marks ${target.name} as their prey!`
    };
  }
};

const sleep = {
  id: 'sleep',
  name: 'Sleep',
  level: 1,
  school: 'enchantment',
  castingTime: 'action',
  range: 90,
  area: '20ft radius',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  description: 'Creatures in 20ft radius fall unconscious. Roll 5d8, affect creatures with lowest HP first.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const baseDice = 5 + (slotLevel - 1) * 2; // +2d8 per level above 1st
    const hpPool = roll(`${baseDice}d8`).total;
    let remaining = hpPool;
    
    // Sort by current HP (lowest first)
    const sorted = [...targets].sort((a, b) => a.currentHp - b.currentHp);
    const affected = [];
    
    for (const target of sorted) {
      if (remaining >= target.currentHp) {
        target.asleep = true;
        target.condition = 'unconscious';
        affected.push(target.name);
        remaining -= target.currentHp;
      }
    }
    
    return {
      success: true,
      hpPool,
      affected,
      narrative: `Soporific magic washes over the area. ${affected.length} creature(s) fall into magical slumber!`
    };
  }
};

const charmPerson = {
  id: 'charm_person',
  name: 'Charm Person',
  level: 1,
  school: 'enchantment',
  castingTime: 'action',
  range: 30,
  components: ['V', 'S'],
  duration: 3600, // 1 hour
  save: 'WIS',
  description: 'WIS save or target is charmed. Advantage if in combat.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0];
    const dc = 8 + getMod(caster.stats?.charisma || 10) + (caster.proficiencyBonus || 2);
    const inCombat = target.inCombat || false;
    
    // Advantage if in combat
    let saveRoll = d20();
    if (inCombat) {
      const roll2 = d20();
      saveRoll = Math.max(saveRoll, roll2);
    }
    
    const saveMod = getMod(target.stats?.wisdom || 10);
    const saveTotal = saveRoll + saveMod;
    const success = saveTotal >= dc;
    
    if (!success) {
      target.charmedBy = caster.name;
      target.condition = 'charmed';
      
      return {
        success: true,
        charmed: true,
        target: target.name,
        duration: '1 hour',
        narrative: `${target.name} regards ${caster.name} as a friendly acquaintance!`
      };
    }
    
    return {
      success: true,
      charmed: false,
      saved: true,
      narrative: `${target.name} resists the charm!`
    };
  }
};

const hideousLaughter = {
  id: 'hideous_laughter',
  name: "Tasha's Hideous Laughter",
  level: 1,
  school: 'enchantment',
  castingTime: 'action',
  range: 30,
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'WIS',
  description: 'WIS save or target falls prone and incapacitated with laughter. Repeats save at end of turn.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0];
    const dc = 8 + getMod(caster.stats?.charisma || caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    const save = savingThrow(target, 'WIS', dc);
    
    if (!save.success) {
      target.condition = 'prone_incapacitated';
      target.laughing = true;
      
      startConcentration(caster, 'hideous_laughter', "Hideous Laughter", 60, {
        debuffTargets: true
      });
      
      return {
        success: true,
        affected: true,
        target: target.name,
        effect: 'Prone and incapacitated',
        duration: '1 minute (concentration)',
        narrative: `${target.name} falls to the ground, consumed by uncontrollable laughter!`
      };
    }
    
    return {
      success: true,
      affected: false,
      saved: true,
      narrative: `${target.name} maintains composure!`
    };
  }
};

const sanctuary = {
  id: 'sanctuary',
  name: 'Sanctuary',
  level: 1,
  school: 'abjuration',
  castingTime: 'bonus',
  range: 30,
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  description: 'Bonus action. Attackers must make WIS save or choose a new target. Ends if target attacks.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0] || caster;
    const dc = 8 + getMod(caster.stats?.wisdom || 10) + (caster.proficiencyBonus || 2);
    
    target.sanctuary = {
      active: true,
      dc,
      caster: caster.name
    };
    
    return {
      success: true,
      target: target.name,
      effect: 'Attackers must save or target someone else',
      duration: '1 minute',
      narrative: `A protective ward surrounds ${target.name}, turning aside hostile intent!`
    };
  }
};

const detectMagic = {
  id: 'detect_magic',
  name: 'Detect Magic',
  level: 1,
  school: 'divination',
  castingTime: 'action',
  range: 'self',
  area: '30ft',
  components: ['V', 'S'],
  duration: 600, // 10 minutes
  concentration: true,
  ritual: true,
  description: 'Sense presence of magic within 30ft. Use action to see auras and determine school.',
  
  cast: (caster, targets, slotLevel = 1) => {
    startConcentration(caster, 'detect_magic', 'Detect Magic', 600, {
      senseMagic: true,
      range: 30
    });
    
    caster.detectingMagic = true;
    
    return {
      success: true,
      effect: 'Sense magic within 30ft',
      duration: '10 minutes (concentration)',
      narrative: `${caster.name}'s senses expand, perceiving the magical auras around them!`
    };
  }
};

const identify = {
  id: 'identify',
  name: 'Identify',
  level: 1,
  school: 'divination',
  castingTime: '1 minute',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 'instant',
  ritual: true,
  description: 'Learn the properties of a magic item or spells affecting a creature.',
  
  cast: (caster, targets, slotLevel = 1, options = {}) => {
    const item = options.item;
    
    return {
      success: true,
      identified: true,
      narrative: `${caster.name} communes with the item, revealing its secrets...`
    };
  }
};

const mageArmor = {
  id: 'mage_armor',
  name: 'Mage Armor',
  level: 1,
  school: 'abjuration',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 28800, // 8 hours
  description: 'Touch unarmored creature. AC becomes 13 + DEX modifier for 8 hours.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0] || caster;
    const dexMod = getMod(target.stats?.dexterity || 10);
    const newAC = 13 + dexMod;
    
    target.mageArmorActive = true;
    target.mageArmorAC = newAC;
    
    return {
      success: true,
      target: target.name,
      effect: `AC = ${newAC}`,
      duration: '8 hours',
      narrative: `A shimmering magical force surrounds ${target.name}, protecting them from harm!`
    };
  }
};

const falseLife = {
  id: 'false_life',
  name: 'False Life',
  level: 1,
  school: 'necromancy',
  castingTime: 'action',
  range: 'self',
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  description: 'Gain 1d4+4 temporary hit points for 1 hour.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const tempHp = roll('1d4+4').total + (slotLevel - 1) * 5; // +5 per level above 1st
    
    caster.tempHp = Math.max(caster.tempHp || 0, tempHp); // Temp HP doesn't stack
    
    return {
      success: true,
      tempHp,
      duration: '1 hour',
      narrative: `Necromantic energy bolsters ${caster.name} with ${tempHp} temporary hit points!`
    };
  }
};

const fogCloud = {
  id: 'fog_cloud',
  name: 'Fog Cloud',
  level: 1,
  school: 'conjuration',
  castingTime: 'action',
  range: 120,
  area: '20ft radius',
  components: ['V', 'S'],
  duration: 3600, // 1 hour
  concentration: true,
  description: '20ft radius sphere of fog. Heavily obscured.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const radius = 20 + (slotLevel - 1) * 20; // +20ft per level above 1st
    
    startConcentration(caster, 'fog_cloud', 'Fog Cloud', 3600, {
      areaEffect: true,
      radius
    });
    
    return {
      success: true,
      effect: 'Heavily obscured area',
      radius: `${radius}ft`,
      duration: '1 hour (concentration)',
      narrative: `Thick fog spreads in a ${radius}-foot radius, obscuring vision!`
    };
  }
};

const grease = {
  id: 'grease',
  name: 'Grease',
  level: 1,
  school: 'conjuration',
  castingTime: 'action',
  range: 60,
  area: '10ft square',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  save: 'DEX',
  description: '10ft square becomes difficult terrain. DEX save or fall prone when entering.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    const affected = targets.filter(target => {
      const save = savingThrow(target, 'DEX', dc);
      if (!save.success) {
        target.condition = 'prone';
        return true;
      }
      return false;
    });
    
    return {
      success: true,
      affected: affected.map(t => t.name),
      effect: 'Difficult terrain, save or prone',
      duration: '1 minute',
      narrative: `Slippery grease covers the ground! ${affected.length} creature(s) slip and fall!`
    };
  }
};

const jump = {
  id: 'jump',
  name: 'Jump',
  level: 1,
  school: 'transmutation',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  description: 'Touch a creature. Jump distance tripled for 1 minute.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0] || caster;
    
    target.jumpTripled = true;
    
    return {
      success: true,
      target: target.name,
      effect: 'Jump distance x3',
      duration: '1 minute',
      narrative: `${target.name}'s legs surge with magical strength, allowing mighty leaps!`
    };
  }
};

const longstrider = {
  id: 'longstrider',
  name: 'Longstrider',
  level: 1,
  school: 'transmutation',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  description: 'Touch a creature. +10ft speed for 1 hour.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const target = targets[0] || caster;
    
    target.speedBonus = (target.speedBonus || 0) + 10;
    
    return {
      success: true,
      target: target.name,
      effect: '+10ft speed',
      duration: '1 hour',
      narrative: `${target.name} moves with supernatural swiftness!`
    };
  }
};

const featherFall = {
  id: 'feather_fall',
  name: 'Feather Fall',
  level: 1,
  school: 'transmutation',
  castingTime: 'reaction',
  range: 60,
  components: ['V', 'M'],
  duration: 60, // 1 minute
  description: 'Reaction when falling. Up to 5 creatures fall slowly (60ft/round), no fall damage.',
  
  cast: (caster, targets, slotLevel = 1) => {
    const numTargets = Math.min(5, targets.length);
    const affected = targets.slice(0, numTargets);
    
    affected.forEach(target => {
      target.featherFalling = true;
      target.fallDamage = 0;
    });
    
    return {
      success: true,
      targets: affected.map(t => t.name),
      effect: 'Fall slowly, no damage',
      duration: '1 minute',
      narrative: `${affected.map(t => t.name).join(', ')} drift down gently like feathers!`
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  magicMissile,
  burningHands,
  thunderwave,
  guildingBolt,
  inflictWounds,
  chromaticOrb,
  cureWounds,
  healingWord,
  shield,
  bless,
  hex,
  huntersMark,
  sleep,
  charmPerson,
  hideousLaughter,
  sanctuary,
  detectMagic,
  identify,
  mageArmor,
  falseLife,
  fogCloud,
  grease,
  jump,
  longstrider,
  featherFall
};
