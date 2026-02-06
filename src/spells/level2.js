/**
 * Caverns & Clawds - Level 2 Spells
 * All level 2 spells with full mechanics
 */

const { d20, roll, getMod, savingThrow } = require('../combat');
const { startConcentration } = require('./concentration');

// ============================================================================
// DAMAGE SPELLS
// ============================================================================

const scorchingRay = {
  id: 'scorching_ray',
  name: 'Scorching Ray',
  level: 2,
  school: 'evocation',
  castingTime: 'action',
  range: 120,
  components: ['V', 'S'],
  duration: 'instant',
  description: 'Create 3 rays of fire. Each makes a ranged spell attack for 2d6 fire damage.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const numRays = 3 + (slotLevel - 2); // +1 ray per level above 2nd
    const spellMod = getMod(caster.stats?.intelligence || 10);
    const rays = [];
    let totalDamage = 0;
    
    for (let i = 0; i < numRays; i++) {
      const target = targets[i % targets.length]; // Cycle through targets
      const attackRoll = d20() + spellMod + (caster.proficiencyBonus || 2);
      const hits = attackRoll >= (target.ac || 10);
      
      if (hits) {
        const damage = roll('2d6').total;
        totalDamage += damage;
        rays.push({ ray: i + 1, target: target.name, hit: true, damage });
      } else {
        rays.push({ ray: i + 1, target: target.name, hit: false, damage: 0 });
      }
    }
    
    return {
      success: true,
      rays,
      totalDamage,
      damageType: 'fire',
      narrative: `${numRays} rays of scorching fire streak toward the enemies, dealing ${totalDamage} total damage!`
    };
  }
};

const shatter = {
  id: 'shatter',
  name: 'Shatter',
  level: 2,
  school: 'evocation',
  castingTime: 'action',
  range: 60,
  area: '10ft radius',
  components: ['V', 'S', 'M'],
  duration: 'instant',
  save: 'CON',
  description: '10ft radius. CON save or 3d8 thunder damage (half on save). Inorganic creatures have disadvantage.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const baseDice = 3 + (slotLevel - 2); // +1d8 per level above 2nd
    const damage = roll(`${baseDice}d8`);
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    const results = targets.map(target => {
      const isInorganic = target.type === 'construct' || target.type === 'elemental';
      let saveRoll = d20();
      
      if (isInorganic) {
        // Disadvantage for inorganic creatures
        const roll2 = d20();
        saveRoll = Math.min(saveRoll, roll2);
      }
      
      const saveMod = getMod(target.stats?.constitution || 10);
      const saveTotal = saveRoll + saveMod;
      const success = saveTotal >= dc;
      const finalDamage = success ? Math.floor(damage.total / 2) : damage.total;
      
      return {
        target: target.name,
        damage: finalDamage,
        saved: success,
        disadvantage: isInorganic
      };
    });
    
    return {
      success: true,
      damageType: 'thunder',
      results,
      narrative: `A thunderous ringing sound erupts, shattering everything in a 10-foot sphere!`
    };
  }
};

const moonbeam = {
  id: 'moonbeam',
  name: 'Moonbeam',
  level: 2,
  school: 'evocation',
  castingTime: 'action',
  range: 120,
  area: '5ft radius, 40ft tall',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'CON',
  description: '5ft radius cylinder. CON save or 2d10 radiant (half on save). Use action to move 60ft.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const baseDice = 2 + (slotLevel - 2); // +1d10 per level above 2nd
    const damage = roll(`${baseDice}d10`);
    const dc = 8 + getMod(caster.stats?.wisdom || 10) + (caster.proficiencyBonus || 2);
    
    startConcentration(caster, 'moonbeam', 'Moonbeam', 60, {
      areaEffect: true,
      damage: `${baseDice}d10`,
      damageType: 'radiant',
      save: 'CON',
      dc
    });
    
    const results = targets.map(target => {
      const save = savingThrow(target, 'CON', dc);
      const finalDamage = save.success ? Math.floor(damage.total / 2) : damage.total;
      
      return {
        target: target.name,
        damage: finalDamage,
        saved: save.success
      };
    });
    
    return {
      success: true,
      damageType: 'radiant',
      results,
      concentration: true,
      duration: '1 minute',
      narrative: `A shaft of silvery moonlight shines down, burning those caught in its radiance!`
    };
  }
};

const flamingSphere = {
  id: 'flaming_sphere',
  name: 'Flaming Sphere',
  level: 2,
  school: 'conjuration',
  castingTime: 'action',
  range: 60,
  area: '5ft radius',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'DEX',
  description: 'Summon 5ft sphere. DEX save or 2d6 fire (half on save). Bonus action to move 30ft.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const baseDice = 2 + (slotLevel - 2); // +1d6 per level above 2nd
    const damage = roll(`${baseDice}d6`);
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    startConcentration(caster, 'flaming_sphere', 'Flaming Sphere', 60, {
      areaEffect: true,
      damage: `${baseDice}d6`,
      damageType: 'fire',
      save: 'DEX',
      dc
    });
    
    const results = targets.map(target => {
      const save = savingThrow(target, 'DEX', dc);
      const finalDamage = save.success ? Math.floor(damage.total / 2) : damage.total;
      
      return {
        target: target.name,
        damage: finalDamage,
        saved: save.success
      };
    });
    
    return {
      success: true,
      damageType: 'fire',
      results,
      concentration: true,
      duration: '1 minute',
      narrative: `A 5-foot sphere of roaring flame appears, scorching nearby enemies!`
    };
  }
};

const heatMetal = {
  id: 'heat_metal',
  name: 'Heat Metal',
  level: 2,
  school: 'transmutation',
  castingTime: 'action',
  range: 60,
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'CON',
  description: 'Heat metal object. 2d8 fire damage. If held, disadvantage on attacks/checks or drop.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const target = targets[0];
    const baseDice = 2 + (slotLevel - 2); // +1d8 per level above 2nd
    const damage = roll(`${baseDice}d8`);
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    startConcentration(caster, 'heat_metal', 'Heat Metal', 60, {
      debuffTargets: true,
      damage: `${baseDice}d8`,
      damageType: 'fire'
    });
    
    target.metalHeated = {
      damage: `${baseDice}d8`,
      disadvantage: true,
      caster: caster.name
    };
    
    return {
      success: true,
      target: target.name,
      damage: damage.total,
      damageType: 'fire',
      effect: 'Disadvantage on attacks/checks or must drop item',
      concentration: true,
      duration: '1 minute',
      narrative: `${target.name}'s metal armor/weapon glows red-hot, burning them for ${damage.total} damage!`
    };
  }
};

// ============================================================================
// CONTROL SPELLS
// ============================================================================

const holdPerson = {
  id: 'hold_person',
  name: 'Hold Person',
  level: 2,
  school: 'enchantment',
  castingTime: 'action',
  range: 60,
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'WIS',
  description: 'WIS save or paralyzed. Repeats save at end of each turn.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const numTargets = 1 + (slotLevel - 2); // +1 target per level above 2nd
    const dc = 8 + getMod(caster.stats?.wisdom || caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    startConcentration(caster, 'hold_person', 'Hold Person', 60, {
      debuffTargets: true,
      condition: 'paralyzed'
    });
    
    const affected = [];
    const resisted = [];
    
    for (let i = 0; i < numTargets && i < targets.length; i++) {
      const target = targets[i];
      const save = savingThrow(target, 'WIS', dc);
      
      if (!save.success) {
        target.condition = 'paralyzed';
        target.heldBy = caster.name;
        affected.push(target.name);
      } else {
        resisted.push(target.name);
      }
    }
    
    return {
      success: true,
      affected,
      resisted,
      concentration: true,
      duration: '1 minute',
      narrative: `${affected.length > 0 ? affected.join(', ') + ' are frozen in place!' : 'The spell fails to take hold!'}`
    };
  }
};

const web = {
  id: 'web',
  name: 'Web',
  level: 2,
  school: 'conjuration',
  castingTime: 'action',
  range: 60,
  area: '20ft cube',
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  concentration: true,
  save: 'DEX',
  description: '20ft cube of sticky webs. Difficult terrain. DEX save or restrained.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const dc = 8 + getMod(caster.stats?.intelligence || 10) + (caster.proficiencyBonus || 2);
    
    startConcentration(caster, 'web', 'Web', 3600, {
      areaEffect: true,
      condition: 'restrained'
    });
    
    const restrained = [];
    
    targets.forEach(target => {
      const save = savingThrow(target, 'DEX', dc);
      
      if (!save.success) {
        target.condition = 'restrained';
        restrained.push(target.name);
      }
    });
    
    return {
      success: true,
      restrained,
      effect: 'Difficult terrain',
      concentration: true,
      duration: '1 hour',
      narrative: `Thick, sticky webs fill the area, trapping ${restrained.length} creature(s)!`
    };
  }
};

const silence = {
  id: 'silence',
  name: 'Silence',
  level: 2,
  school: 'illusion',
  castingTime: 'action',
  range: 120,
  area: '20ft radius',
  components: ['V', 'S'],
  duration: 600, // 10 minutes
  concentration: true,
  description: '20ft radius sphere of magical silence. No sound, spellcasting with V components impossible.',
  
  cast: (caster, targets, slotLevel = 2) => {
    startConcentration(caster, 'silence', 'Silence', 600, {
      areaEffect: true,
      silenced: true
    });
    
    targets.forEach(target => {
      target.silenced = true;
    });
    
    return {
      success: true,
      targets: targets.map(t => t.name),
      effect: 'No sound or verbal spells',
      concentration: true,
      duration: '10 minutes',
      narrative: `A bubble of magical silence descends, cutting off all sound!`
    };
  }
};

const darkness = {
  id: 'darkness',
  name: 'Darkness',
  level: 2,
  school: 'evocation',
  castingTime: 'action',
  range: 60,
  area: '15ft radius',
  components: ['V', 'M'],
  duration: 600, // 10 minutes
  concentration: true,
  description: '15ft radius sphere of magical darkness. Even darkvision cannot see.',
  
  cast: (caster, targets, slotLevel = 2) => {
    startConcentration(caster, 'darkness', 'Darkness', 600, {
      areaEffect: true,
      obscured: 'heavily'
    });
    
    return {
      success: true,
      effect: 'Magical darkness (even darkvision blind)',
      concentration: true,
      duration: '10 minutes',
      narrative: `Impenetrable magical darkness spreads in a 15-foot sphere!`
    };
  }
};

const suggestion = {
  id: 'suggestion',
  name: 'Suggestion',
  level: 2,
  school: 'enchantment',
  castingTime: 'action',
  range: 30,
  components: ['V', 'M'],
  duration: 28800, // 8 hours
  concentration: true,
  save: 'WIS',
  description: 'WIS save or target follows reasonable suggestion.',
  
  cast: (caster, targets, slotLevel = 2, options = {}) => {
    const target = targets[0];
    const suggestion = options.suggestion || 'Leave this place';
    const dc = 8 + getMod(caster.stats?.charisma || 10) + (caster.proficiencyBonus || 2);
    const save = savingThrow(target, 'WIS', dc);
    
    if (!save.success) {
      startConcentration(caster, 'suggestion', 'Suggestion', 28800, {
        debuffTargets: true
      });
      
      target.suggested = {
        caster: caster.name,
        suggestion
      };
      
      return {
        success: true,
        affected: true,
        target: target.name,
        suggestion,
        concentration: true,
        duration: '8 hours',
        narrative: `${target.name} is compelled to: ${suggestion}`
      };
    }
    
    return {
      success: true,
      affected: false,
      saved: true,
      narrative: `${target.name} resists the suggestion!`
    };
  }
};

const detectThoughts = {
  id: 'detect_thoughts',
  name: 'Detect Thoughts',
  level: 2,
  school: 'divination',
  castingTime: 'action',
  range: 'self',
  area: '30ft',
  components: ['V', 'S', 'M'],
  duration: 60, // 1 minute
  concentration: true,
  save: 'WIS',
  description: 'Sense thoughts of creatures within 30ft. Action to probe deeper (WIS save).',
  
  cast: (caster, targets, slotLevel = 2) => {
    startConcentration(caster, 'detect_thoughts', 'Detect Thoughts', 60, {
      senseMind: true
    });
    
    caster.detectingThoughts = true;
    
    return {
      success: true,
      effect: 'Sense surface thoughts within 30ft',
      concentration: true,
      duration: '1 minute',
      narrative: `${caster.name}'s mind expands, sensing the thoughts of nearby creatures!`
    };
  }
};

// ============================================================================
// HEALING/BUFF SPELLS
// ============================================================================

const aid = {
  id: 'aid',
  name: 'Aid',
  level: 2,
  school: 'abjuration',
  castingTime: 'action',
  range: 30,
  components: ['V', 'S', 'M'],
  duration: 28800, // 8 hours
  description: 'Up to 3 creatures gain 5 temp HP and +5 max HP for 8 hours.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const hpBoost = 5 + (slotLevel - 2) * 5; // +5 per level above 2nd
    const numTargets = Math.min(3, targets.length);
    const aided = targets.slice(0, numTargets);
    
    aided.forEach(target => {
      target.tempHp = (target.tempHp || 0) + hpBoost;
      target.maxHpBonus = (target.maxHpBonus || 0) + hpBoost;
      target.currentHp = Math.min(target.currentHp + hpBoost, target.maxHp + target.maxHpBonus);
    });
    
    return {
      success: true,
      targets: aided.map(t => t.name),
      effect: `+${hpBoost} temp HP and max HP`,
      duration: '8 hours',
      narrative: `${aided.map(t => t.name).join(', ')} are bolstered with ${hpBoost} hit points!`
    };
  }
};

const lesserRestoration = {
  id: 'lesser_restoration',
  name: 'Lesser Restoration',
  level: 2,
  school: 'abjuration',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S'],
  duration: 'instant',
  description: 'End one condition: blinded, deafened, paralyzed, or poisoned.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const target = targets[0];
    const conditions = ['blinded', 'deafened', 'paralyzed', 'poisoned'];
    const removedConditions = [];
    
    conditions.forEach(condition => {
      if (target.condition === condition || target[condition]) {
        delete target[condition];
        if (target.condition === condition) {
          target.condition = null;
        }
        removedConditions.push(condition);
      }
    });
    
    return {
      success: true,
      target: target.name,
      removed: removedConditions,
      narrative: `${caster.name} touches ${target.name}, curing ${removedConditions.join(', ')}!`
    };
  }
};

const prayerOfHealing = {
  id: 'prayer_of_healing',
  name: 'Prayer of Healing',
  level: 2,
  school: 'evocation',
  castingTime: '10 minutes',
  range: 30,
  components: ['V'],
  duration: 'instant',
  description: 'Up to 6 creatures regain 2d8 + spellcasting modifier HP.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const numTargets = Math.min(6, targets.length);
    const baseDice = 2 + (slotLevel - 2); // +1d8 per level above 2nd
    const spellMod = getMod(caster.stats?.wisdom || 10);
    const healed = [];
    let totalHealing = 0;
    
    for (let i = 0; i < numTargets; i++) {
      const target = targets[i];
      const healing = roll(`${baseDice}d8`).total + spellMod;
      const oldHp = target.currentHp;
      target.currentHp = Math.min(target.maxHp, target.currentHp + healing);
      const actualHealing = target.currentHp - oldHp;
      
      healed.push({ name: target.name, healing: actualHealing });
      totalHealing += actualHealing;
    }
    
    return {
      success: true,
      healed,
      totalHealing,
      narrative: `${caster.name} leads a prayer of healing, restoring ${totalHealing} total HP!`
    };
  }
};

const enhanceAbility = {
  id: 'enhance_ability',
  name: 'Enhance Ability',
  level: 2,
  school: 'transmutation',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  concentration: true,
  description: 'Target has advantage on chosen ability checks for 1 hour.',
  
  cast: (caster, targets, slotLevel = 2, options = {}) => {
    const target = targets[0] || caster;
    const ability = options.ability || 'STR';
    
    startConcentration(caster, 'enhance_ability', 'Enhance Ability', 3600, {
      buffTargets: true
    });
    
    target.enhancedAbility = ability;
    
    return {
      success: true,
      target: target.name,
      ability,
      effect: `Advantage on ${ability} checks`,
      concentration: true,
      duration: '1 hour',
      narrative: `${target.name} feels a surge of enhanced ${ability}!`
    };
  }
};

// ============================================================================
// UTILITY SPELLS
// ============================================================================

const mistyStep = {
  id: 'misty_step',
  name: 'Misty Step',
  level: 2,
  school: 'conjuration',
  castingTime: 'bonus',
  range: 'self',
  components: ['V'],
  duration: 'instant',
  description: 'Bonus action. Teleport up to 30ft to unoccupied space you can see.',
  
  cast: (caster, targets, slotLevel = 2, options = {}) => {
    const distance = options.distance || 30;
    
    // In a real implementation, would update position
    caster.teleported = true;
    
    return {
      success: true,
      distance,
      narrative: `${caster.name} vanishes in a silvery mist and reappears ${distance} feet away!`
    };
  }
};

const invisibility = {
  id: 'invisibility',
  name: 'Invisibility',
  level: 2,
  school: 'illusion',
  castingTime: 'action',
  range: 'touch',
  components: ['V', 'S', 'M'],
  duration: 3600, // 1 hour
  concentration: true,
  description: 'Target becomes invisible until they attack or cast a spell.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const target = targets[0] || caster;
    
    startConcentration(caster, 'invisibility', 'Invisibility', 3600, {
      buffTargets: true
    });
    
    target.invisible = true;
    target.condition = 'invisible';
    
    return {
      success: true,
      target: target.name,
      effect: 'Invisible until attack/spell',
      concentration: true,
      duration: '1 hour',
      narrative: `${target.name} fades from view, becoming completely invisible!`
    };
  }
};

const mirrorImage = {
  id: 'mirror_image',
  name: 'Mirror Image',
  level: 2,
  school: 'illusion',
  castingTime: 'action',
  range: 'self',
  components: ['V', 'S'],
  duration: 60, // 1 minute
  description: 'Create 3 illusory duplicates. Attacks may hit duplicates instead (destroyed on hit).',
  
  cast: (caster, targets, slotLevel = 2) => {
    caster.mirrorImages = 3;
    
    return {
      success: true,
      images: 3,
      effect: 'Attacks may hit duplicates',
      duration: '1 minute',
      narrative: `Three illusory duplicates of ${caster.name} appear, moving in perfect sync!`
    };
  }
};

const blur = {
  id: 'blur',
  name: 'Blur',
  level: 2,
  school: 'illusion',
  castingTime: 'action',
  range: 'self',
  components: ['V'],
  duration: 60, // 1 minute
  concentration: true,
  description: 'Attackers have disadvantage on attack rolls against you.',
  
  cast: (caster, targets, slotLevel = 2) => {
    startConcentration(caster, 'blur', 'Blur', 60, {
      buffSelf: true
    });
    
    caster.blurred = true;
    
    return {
      success: true,
      effect: 'Attackers have disadvantage',
      concentration: true,
      duration: '1 minute',
      narrative: `${caster.name}'s form becomes blurred and shifting, hard to target!`
    };
  }
};

const spiritualWeapon = {
  id: 'spiritual_weapon',
  name: 'Spiritual Weapon',
  level: 2,
  school: 'evocation',
  castingTime: 'bonus',
  range: 60,
  components: ['V', 'S'],
  duration: 60, // 1 minute
  description: 'Bonus action to summon and attack. 1d8 + spellcasting modifier force damage.',
  
  cast: (caster, targets, slotLevel = 2) => {
    const target = targets[0];
    const spellMod = getMod(caster.stats?.wisdom || 10);
    const baseDice = 1 + Math.floor((slotLevel - 2) / 2); // +1d8 every 2 levels above 2nd
    const attackRoll = d20() + spellMod + (caster.proficiencyBonus || 2);
    const hits = attackRoll >= (target.ac || 10);
    
    caster.spiritualWeapon = {
      active: true,
      damage: `${baseDice}d8`,
      modifier: spellMod,
      duration: 60
    };
    
    if (hits) {
      const damage = roll(`${baseDice}d8`).total + spellMod;
      
      return {
        success: true,
        hit: true,
        target: target.name,
        damage,
        damageType: 'force',
        effect: 'Bonus action each turn',
        duration: '1 minute',
        narrative: `A glowing spectral weapon appears and strikes ${target.name} for ${damage} force damage!`
      };
    }
    
    return {
      success: true,
      hit: false,
      effect: 'Bonus action each turn',
      duration: '1 minute',
      narrative: `A glowing spectral weapon appears, ready to strike!`
    };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  scorchingRay,
  shatter,
  moonbeam,
  flamingSphere,
  heatMetal,
  holdPerson,
  web,
  silence,
  darkness,
  suggestion,
  detectThoughts,
  aid,
  lesserRestoration,
  prayerOfHealing,
  enhanceAbility,
  mistyStep,
  invisibility,
  mirrorImage,
  blur,
  spiritualWeapon
};
