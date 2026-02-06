/**
 * Caverns & Clawds - Cantrip System
 * All 20 standard D&D 5e cantrips with proper mechanics
 */

const {
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  getScaledCantripDice,
  rollSpellAttack,
  rollSpellDamage,
  resolveSpellSave,
  applyStatusEffect,
  applyDamageWithResistances
} = require('./spell-utils');

// ============================================================================
// DAMAGE CANTRIPS (10 total)
// ============================================================================

/**
 * 1. Fire Bolt - Attack roll, 1d10 fire
 */
const FIRE_BOLT = {
  id: 'fire_bolt',
  name: 'Fire Bolt',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 120, // feet
  components: ['V', 'S'],
  duration: 'Instantaneous',
  attackType: 'ranged',
  baseDamage: '1d10',
  damageType: 'fire',
  description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack. On hit, deal 1d10 fire damage. Flammable objects ignite.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d10', level);
    
    const attackResult = rollSpellAttack(caster, target, options.advantage, options.disadvantage);
    
    if (!attackResult.hits) {
      return {
        success: true,
        hits: false,
        damage: 0,
        attackRoll: attackResult.attackRoll,
        narrative: `${caster.name || 'The caster'} hurls a bolt of fire at ${target.name}... The fiery projectile streaks past, missing its mark!`
      };
    }
    
    const damageResult = rollSpellDamage(scaledDamage, attackResult.isCrit);
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, damageResult.damage, 'fire');
    
    let narrative = attackResult.isCrit
      ? `${caster.name || 'The caster'} launches a CRITICAL bolt of flame! ${target.name} is engulfed in fire for **${actualDamage} damage**!`
      : `${caster.name || 'The caster'} hurls a fiery bolt that strikes ${target.name} for **${actualDamage} fire damage**!`;
    
    if (modified) {
      narrative += ` (${modifier})`;
    }
    
    return {
      success: true,
      hits: true,
      damage: actualDamage,
      damageType: 'fire',
      attackRoll: attackResult.attackRoll,
      isCrit: attackResult.isCrit,
      rolls: damageResult.rolls,
      narrative
    };
  }
};

/**
 * 2. Sacred Flame - DEX save, 1d8 radiant, ignores cover
 */
const SACRED_FLAME = {
  id: 'sacred_flame',
  name: 'Sacred Flame',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 60,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  saveType: 'DEX',
  baseDamage: '1d8',
  damageType: 'radiant',
  ignoresCover: true,
  description: 'Flame-like radiance descends on a creature. Target makes DEX save or takes 1d8 radiant damage. Gains no benefit from cover.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d8', level);
    
    const saveResult = resolveSpellSave(caster, target, 'DEX', scaledDamage, { noHalfDamage: true });
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, saveResult.damage, 'radiant');
    
    let narrative = saveResult.save.success
      ? `Divine flame descends upon ${target.name}, but they leap aside! (Saved)`
      : `Sacred radiance engulfs ${target.name} for **${actualDamage} radiant damage**!`;
    
    if (modified && !saveResult.save.success) {
      narrative += ` (${modifier})`;
    }
    
    return {
      success: true,
      hits: !saveResult.save.success,
      damage: actualDamage,
      damageType: 'radiant',
      save: saveResult.save,
      dc: saveResult.dc,
      rolls: saveResult.rolls,
      ignoresCover: true,
      narrative
    };
  }
};

/**
 * 3. Eldritch Blast - Attack roll, 1d10 force
 */
const ELDRITCH_BLAST = {
  id: 'eldritch_blast',
  name: 'Eldritch Blast',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 120,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  attackType: 'ranged',
  baseDamage: '1d10',
  damageType: 'force',
  description: 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack. On hit, deal 1d10 force damage.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    
    // Eldritch Blast creates multiple beams at higher levels
    let numBeams = 1;
    if (level >= 17) numBeams = 4;
    else if (level >= 11) numBeams = 3;
    else if (level >= 5) numBeams = 2;
    
    const beamResults = [];
    let totalDamage = 0;
    
    for (let i = 0; i < numBeams; i++) {
      const attackResult = rollSpellAttack(caster, target, options.advantage, options.disadvantage);
      
      if (attackResult.hits) {
        const damageResult = rollSpellDamage('1d10', attackResult.isCrit);
        const { actualDamage } = applyDamageWithResistances(target, damageResult.damage, 'force');
        totalDamage += actualDamage;
        
        beamResults.push({
          hit: true,
          damage: actualDamage,
          isCrit: attackResult.isCrit,
          rolls: damageResult.rolls
        });
      } else {
        beamResults.push({
          hit: false,
          damage: 0
        });
      }
    }
    
    const hitsCount = beamResults.filter(b => b.hit).length;
    let narrative;
    
    if (numBeams === 1) {
      narrative = hitsCount > 0
        ? `${caster.name || 'The warlock'} fires a crackling beam of eldritch energy at ${target.name} for **${totalDamage} force damage**!`
        : `${caster.name || 'The warlock'} fires an eldritch beam at ${target.name}... but it misses!`;
    } else {
      narrative = `${caster.name || 'The warlock'} unleashes ${numBeams} beams of eldritch power! ${hitsCount} strike ${target.name} for **${totalDamage} force damage**!`;
    }
    
    return {
      success: true,
      hits: hitsCount > 0,
      damage: totalDamage,
      damageType: 'force',
      beams: beamResults,
      numBeams,
      narrative
    };
  }
};

/**
 * 4. Vicious Mockery - WIS save, 1d4 psychic + disadvantage
 */
const VICIOUS_MOCKERY = {
  id: 'vicious_mockery',
  name: 'Vicious Mockery',
  level: 0,
  school: 'enchantment',
  castingTime: '1 action',
  range: 60,
  components: ['V'],
  duration: 'Instantaneous',
  saveType: 'WIS',
  baseDamage: '1d4',
  damageType: 'psychic',
  description: 'You unleash a string of insults laced with subtle enchantments. Target makes WIS save or takes 1d4 psychic damage and has disadvantage on next attack roll.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d4', level);
    
    const saveResult = resolveSpellSave(caster, target, 'WIS', scaledDamage, { noHalfDamage: true });
    
    let narrative;
    if (saveResult.save.success) {
      narrative = `${caster.name || 'The bard'} hurls a vicious insult at ${target.name}, but they shake it off!`;
    } else {
      // Apply disadvantage on next attack
      applyStatusEffect(target, {
        type: 'disadvantage_next_attack',
        duration: 1,
        source: 'vicious_mockery'
      });
      
      narrative = `${caster.name || 'The bard'} delivers a devastating insult! ${target.name} takes **${saveResult.damage} psychic damage** and reels in shame! (Disadvantage on next attack)`;
    }
    
    return {
      success: true,
      hits: !saveResult.save.success,
      damage: saveResult.damage,
      damageType: 'psychic',
      save: saveResult.save,
      dc: saveResult.dc,
      rolls: saveResult.rolls,
      effect: saveResult.save.success ? null : 'disadvantage_next_attack',
      narrative
    };
  }
};

/**
 * 5. Produce Flame - Attack roll, 1d8 fire
 */
const PRODUCE_FLAME = {
  id: 'produce_flame',
  name: 'Produce Flame',
  level: 0,
  school: 'conjuration',
  castingTime: '1 action',
  range: 30,
  components: ['V', 'S'],
  duration: '10 minutes',
  attackType: 'ranged',
  baseDamage: '1d8',
  damageType: 'fire',
  description: 'A flickering flame appears in your hand. You can hurl it at a creature within 30 feet. Make a ranged spell attack. On hit, deal 1d8 fire damage.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d8', level);
    
    const attackResult = rollSpellAttack(caster, target, options.advantage, options.disadvantage);
    
    if (!attackResult.hits) {
      return {
        success: true,
        hits: false,
        damage: 0,
        attackRoll: attackResult.attackRoll,
        narrative: `${caster.name || 'The druid'} hurls a ball of flame at ${target.name}... but it sails wide!`
      };
    }
    
    const damageResult = rollSpellDamage(scaledDamage, attackResult.isCrit);
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, damageResult.damage, 'fire');
    
    let narrative = `${caster.name || 'The druid'} hurls a flickering flame that strikes ${target.name} for **${actualDamage} fire damage**!`;
    if (modified) narrative += ` (${modifier})`;
    
    return {
      success: true,
      hits: true,
      damage: actualDamage,
      damageType: 'fire',
      attackRoll: attackResult.attackRoll,
      isCrit: attackResult.isCrit,
      rolls: damageResult.rolls,
      narrative
    };
  }
};

/**
 * 6. Ray of Frost - Attack roll, 1d8 cold, reduce speed 10ft
 */
const RAY_OF_FROST = {
  id: 'ray_of_frost',
  name: 'Ray of Frost',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 60,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  attackType: 'ranged',
  baseDamage: '1d8',
  damageType: 'cold',
  description: 'A frigid beam of blue-white light streaks toward a creature. On hit, deal 1d8 cold damage and reduce speed by 10 feet until start of your next turn.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d8', level);
    
    const attackResult = rollSpellAttack(caster, target, options.advantage, options.disadvantage);
    
    if (!attackResult.hits) {
      return {
        success: true,
        hits: false,
        damage: 0,
        attackRoll: attackResult.attackRoll,
        narrative: `${caster.name || 'The caster'} fires a beam of frost at ${target.name}... but it misses!`
      };
    }
    
    const damageResult = rollSpellDamage(scaledDamage, attackResult.isCrit);
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, damageResult.damage, 'cold');
    
    // Apply speed reduction
    applyStatusEffect(target, {
      type: 'speed_reduction',
      amount: 10,
      duration: 1,
      source: 'ray_of_frost'
    });
    
    let narrative = `${caster.name || 'The caster'} blasts ${target.name} with freezing energy for **${actualDamage} cold damage**! Ice crystals form, reducing their speed by 10 feet!`;
    if (modified) narrative += ` (${modifier})`;
    
    return {
      success: true,
      hits: true,
      damage: actualDamage,
      damageType: 'cold',
      attackRoll: attackResult.attackRoll,
      isCrit: attackResult.isCrit,
      rolls: damageResult.rolls,
      effect: 'speed_reduction',
      narrative
    };
  }
};

/**
 * 7. Shocking Grasp - Melee attack, 1d8 lightning, advantage if metal
 */
const SHOCKING_GRASP = {
  id: 'shocking_grasp',
  name: 'Shocking Grasp',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 5, // touch
  components: ['V', 'S'],
  duration: 'Instantaneous',
  attackType: 'melee',
  baseDamage: '1d8',
  damageType: 'lightning',
  description: 'Lightning springs from your hand to deliver a shock. On hit, deal 1d8 lightning damage, and target cannot take reactions until start of its next turn. Advantage if target wears metal armor.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d8', level);
    
    // Check if target wears metal armor (simplified: AC >= 14 suggests metal)
    const hasMetalArmor = (target.ac || 10) >= 14;
    const advantage = options.advantage || hasMetalArmor;
    
    const attackResult = rollSpellAttack(caster, target, advantage, options.disadvantage);
    
    if (!attackResult.hits) {
      return {
        success: true,
        hits: false,
        damage: 0,
        attackRoll: attackResult.attackRoll,
        narrative: `${caster.name || 'The caster'} reaches for ${target.name} with crackling fingers... but misses!`
      };
    }
    
    const damageResult = rollSpellDamage(scaledDamage, attackResult.isCrit);
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, damageResult.damage, 'lightning');
    
    // Apply reaction prevention
    applyStatusEffect(target, {
      type: 'no_reactions',
      duration: 1,
      source: 'shocking_grasp'
    });
    
    let narrative = `${caster.name || 'The caster'} touches ${target.name} with a crackling hand! Lightning surges for **${actualDamage} lightning damage**! ${target.name} cannot take reactions!`;
    if (hasMetalArmor && !options.advantage) narrative = `${target.name}'s metal armor conducts the shock! ` + narrative;
    if (modified) narrative += ` (${modifier})`;
    
    return {
      success: true,
      hits: true,
      damage: actualDamage,
      damageType: 'lightning',
      attackRoll: attackResult.attackRoll,
      isCrit: attackResult.isCrit,
      rolls: damageResult.rolls,
      effect: 'no_reactions',
      hadAdvantage: hasMetalArmor,
      narrative
    };
  }
};

/**
 * 8. Acid Splash - DEX save, 1d6 acid, 2 targets within 5ft
 */
const ACID_SPLASH = {
  id: 'acid_splash',
  name: 'Acid Splash',
  level: 0,
  school: 'conjuration',
  castingTime: '1 action',
  range: 60,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  saveType: 'DEX',
  baseDamage: '1d6',
  damageType: 'acid',
  targets: 2,
  description: 'You hurl a bubble of acid. Choose one or two creatures within 5 feet of each other. Each must make DEX save or take 1d6 acid damage.',
  
  cast: (caster, targets, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d6', level);
    
    // Ensure targets is an array
    if (!Array.isArray(targets)) {
      targets = [targets];
    }
    
    // Limit to 2 targets
    const actualTargets = targets.slice(0, 2);
    const results = [];
    let totalDamage = 0;
    
    for (const target of actualTargets) {
      const saveResult = resolveSpellSave(caster, target, 'DEX', scaledDamage, { noHalfDamage: true });
      const { actualDamage } = applyDamageWithResistances(target, saveResult.damage, 'acid');
      
      results.push({
        target: target.name,
        saved: saveResult.save.success,
        damage: actualDamage
      });
      
      totalDamage += actualDamage;
    }
    
    const narrative = actualTargets.length === 1
      ? results[0].saved
        ? `${caster.name || 'The caster'} hurls acid at ${actualTargets[0].name}, but they dodge!`
        : `${caster.name || 'The caster'} splashes ${actualTargets[0].name} with acid for **${results[0].damage} damage**!`
      : `${caster.name || 'The caster'} hurls a bubble of acid that explodes! ${results.filter(r => !r.saved).map(r => r.target).join(' and ')} ${results.filter(r => !r.saved).length === 1 ? 'takes' : 'take'} acid damage! (Total: **${totalDamage} damage**)`;
    
    return {
      success: true,
      hits: results.some(r => !r.saved),
      damage: totalDamage,
      damageType: 'acid',
      targets: results,
      narrative
    };
  }
};

/**
 * 9. Poison Spray - CON save, 1d12 poison, 10ft
 */
const POISON_SPRAY = {
  id: 'poison_spray',
  name: 'Poison Spray',
  level: 0,
  school: 'conjuration',
  castingTime: '1 action',
  range: 10,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  saveType: 'CON',
  baseDamage: '1d12',
  damageType: 'poison',
  description: 'You extend your hand toward a creature and project a puff of noxious gas. Target makes CON save or takes 1d12 poison damage.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d12', level);
    
    const saveResult = resolveSpellSave(caster, target, 'CON', scaledDamage, { noHalfDamage: true });
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, saveResult.damage, 'poison');
    
    let narrative = saveResult.save.success
      ? `${caster.name || 'The caster'} exhales toxic gas at ${target.name}, but they resist the poison!`
      : `${caster.name || 'The caster'} sprays ${target.name} with noxious poison for **${actualDamage} poison damage**!`;
    
    if (modified && !saveResult.save.success) narrative += ` (${modifier})`;
    
    return {
      success: true,
      hits: !saveResult.save.success,
      damage: actualDamage,
      damageType: 'poison',
      save: saveResult.save,
      dc: saveResult.dc,
      rolls: saveResult.rolls,
      narrative
    };
  }
};

/**
 * 10. Chill Touch - Attack roll, 1d8 necrotic, prevent healing
 */
const CHILL_TOUCH = {
  id: 'chill_touch',
  name: 'Chill Touch',
  level: 0,
  school: 'necromancy',
  castingTime: '1 action',
  range: 120,
  components: ['V', 'S'],
  duration: '1 round',
  attackType: 'ranged',
  baseDamage: '1d8',
  damageType: 'necrotic',
  description: 'You create a ghostly, skeletal hand. On hit, deal 1d8 necrotic damage and target cannot regain HP until start of your next turn. Undead have disadvantage on attacks against you.',
  
  cast: (caster, target, options = {}) => {
    const level = caster.level || caster.stats?.level || 1;
    const scaledDamage = getScaledCantripDice('1d8', level);
    
    const attackResult = rollSpellAttack(caster, target, options.advantage, options.disadvantage);
    
    if (!attackResult.hits) {
      return {
        success: true,
        hits: false,
        damage: 0,
        attackRoll: attackResult.attackRoll,
        narrative: `${caster.name || 'The caster'} conjures a spectral hand that grasps at ${target.name}... but misses!`
      };
    }
    
    const damageResult = rollSpellDamage(scaledDamage, attackResult.isCrit);
    const { actualDamage, modified, modifier } = applyDamageWithResistances(target, damageResult.damage, 'necrotic');
    
    // Apply healing prevention
    applyStatusEffect(target, {
      type: 'no_healing',
      duration: 1,
      source: 'chill_touch'
    });
    
    // Apply disadvantage if undead
    const isUndead = target.special?.includes('undead') || target.type === 'undead';
    if (isUndead) {
      applyStatusEffect(target, {
        type: 'disadvantage_on_attacks',
        duration: 1,
        source: 'chill_touch'
      });
    }
    
    let narrative = `${caster.name || 'The caster'} conjures a spectral hand that clutches ${target.name} for **${actualDamage} necrotic damage**! Life force drains away, preventing healing!`;
    if (isUndead) narrative += ` The undead creature recoils in fear!`;
    if (modified) narrative += ` (${modifier})`;
    
    return {
      success: true,
      hits: true,
      damage: actualDamage,
      damageType: 'necrotic',
      attackRoll: attackResult.attackRoll,
      isCrit: attackResult.isCrit,
      rolls: damageResult.rolls,
      effect: 'no_healing',
      undeadEffect: isUndead,
      narrative
    };
  }
};

// ============================================================================
// UTILITY CANTRIPS (10 total)
// ============================================================================

/**
 * 11. Mage Hand - Utility, manipulate objects
 */
const MAGE_HAND = {
  id: 'mage_hand',
  name: 'Mage Hand',
  level: 0,
  school: 'conjuration',
  castingTime: '1 action',
  range: 30,
  components: ['V', 'S'],
  duration: '1 minute',
  description: 'A spectral, floating hand appears. You can use an action to control it to manipulate objects, open doors, or retrieve items.',
  
  cast: (caster, target, options = {}) => {
    return {
      success: true,
      utility: true,
      effect: 'mage_hand',
      duration: 10, // rounds
      narrative: `${caster.name || 'The caster'} conjures a spectral hand that floats nearby, ready to assist!`
    };
  }
};

/**
 * 12. Light - Create light source
 */
const LIGHT = {
  id: 'light',
  name: 'Light',
  level: 0,
  school: 'evocation',
  castingTime: '1 action',
  range: 5, // touch
  components: ['V', 'M'],
  duration: '1 hour',
  description: 'You touch an object and it sheds bright light in a 20-foot radius and dim light for an additional 20 feet.',
  
  cast: (caster, target, options = {}) => {
    return {
      success: true,
      utility: true,
      effect: 'light',
      radius: 20,
      duration: 600, // rounds
      narrative: `${caster.name || 'The caster'} touches an object and it begins to glow with magical light!`
    };
  }
};

/**
 * 13. Prestidigitation - Minor effects
 */
const PRESTIDIGITATION = {
  id: 'prestidigitation',
  name: 'Prestidigitation',
  level: 0,
  school: 'transmutation',
  castingTime: '1 action',
  range: 10,
  components: ['V', 'S'],
  duration: '1 hour',
  description: 'You create a minor magical effect: sensory effect, light/extinguish flame, clean/soil, chill/warm, or create trinket.',
  
  cast: (caster, target, options = {}) => {
    const effect = options.effect || 'sensory';
    const effects = {
      sensory: 'creates a harmless sensory effect',
      light: 'lights or extinguishes a small flame',
      clean: 'cleans or soils a small object',
      temperature: 'warms or chills a small object',
      trinket: 'creates a small illusory trinket'
    };
    
    return {
      success: true,
      utility: true,
      effect: 'prestidigitation',
      subEffect: effect,
      narrative: `${caster.name || 'The caster'} ${effects[effect] || effects.sensory}!`
    };
  }
};

/**
 * 14. Mending - Repair objects
 */
const MENDING = {
  id: 'mending',
  name: 'Mending',
  level: 0,
  school: 'transmutation',
  castingTime: '1 minute',
  range: 5, // touch
  components: ['V', 'S', 'M'],
  duration: 'Instantaneous',
  description: 'This spell repairs a single break or tear in an object you touch.',
  
  cast: (caster, target, options = {}) => {
    return {
      success: true,
      utility: true,
      effect: 'mending',
      narrative: `${caster.name || 'The caster'} channels magic to repair the damaged item, making it whole once more!`
    };
  }
};

/**
 * 15. Guidance - +1d4 to ability check (Cleric)
 */
const GUIDANCE = {
  id: 'guidance',
  name: 'Guidance',
  level: 0,
  school: 'divination',
  castingTime: '1 action',
  range: 5, // touch
  components: ['V', 'S'],
  duration: '1 minute (concentration)',
  description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.',
  
  cast: (caster, target, options = {}) => {
    applyStatusEffect(target, {
      type: 'guidance',
      bonus: '1d4',
      duration: 10, // rounds
      source: 'guidance'
    });
    
    return {
      success: true,
      utility: true,
      effect: 'guidance',
      target: target.name,
      narrative: `${caster.name || 'The cleric'} touches ${target.name}, guiding them with divine insight! (+1d4 to next ability check)`
    };
  }
};

/**
 * 16. Resistance - +1d4 to save (Cleric)
 */
const RESISTANCE = {
  id: 'resistance',
  name: 'Resistance',
  level: 0,
  school: 'abjuration',
  castingTime: '1 action',
  range: 5, // touch
  components: ['V', 'S', 'M'],
  duration: '1 minute (concentration)',
  description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one saving throw of its choice.',
  
  cast: (caster, target, options = {}) => {
    applyStatusEffect(target, {
      type: 'resistance',
      bonus: '1d4',
      duration: 10, // rounds
      source: 'resistance'
    });
    
    return {
      success: true,
      utility: true,
      effect: 'resistance',
      target: target.name,
      narrative: `${caster.name || 'The cleric'} touches ${target.name}, fortifying them with divine protection! (+1d4 to next save)`
    };
  }
};

/**
 * 17. Thaumaturgy - Divine effects
 */
const THAUMATURGY = {
  id: 'thaumaturgy',
  name: 'Thaumaturgy',
  level: 0,
  school: 'transmutation',
  castingTime: '1 action',
  range: 30,
  components: ['V'],
  duration: '1 minute',
  description: 'You manifest a minor wonder: amplify voice, cause flames to flicker, create harmless tremors, create sound, open/close unlocked doors, or alter your appearance.',
  
  cast: (caster, target, options = {}) => {
    const effect = options.effect || 'voice';
    const effects = {
      voice: 'booms their voice to three times normal volume',
      flames: 'causes nearby flames to flicker and dance',
      tremors: 'creates harmless tremors in the ground',
      sound: 'creates an instantaneous sound',
      doors: 'causes unlocked doors to fly open or slam shut',
      appearance: 'alters their eyes to glow with divine power'
    };
    
    return {
      success: true,
      utility: true,
      effect: 'thaumaturgy',
      subEffect: effect,
      narrative: `${caster.name || 'The cleric'} ${effects[effect] || effects.voice}!`
    };
  }
};

/**
 * 18. Druidcraft - Nature effects
 */
const DRUIDCRAFT = {
  id: 'druidcraft',
  name: 'Druidcraft',
  level: 0,
  school: 'transmutation',
  castingTime: '1 action',
  range: 30,
  components: ['V', 'S'],
  duration: 'Instantaneous',
  description: 'You create a minor magical effect: predict weather, make flower bloom, create sensory effect, light/extinguish flame.',
  
  cast: (caster, target, options = {}) => {
    const effect = options.effect || 'weather';
    const effects = {
      weather: 'senses the weather for the next 24 hours',
      bloom: 'causes a flower to bloom',
      sensory: 'creates a harmless sensory effect',
      flame: 'lights or extinguishes a small flame'
    };
    
    return {
      success: true,
      utility: true,
      effect: 'druidcraft',
      subEffect: effect,
      narrative: `${caster.name || 'The druid'} ${effects[effect] || effects.weather}!`
    };
  }
};

/**
 * 19. Minor Illusion - Create illusion
 */
const MINOR_ILLUSION = {
  id: 'minor_illusion',
  name: 'Minor Illusion',
  level: 0,
  school: 'illusion',
  castingTime: '1 action',
  range: 30,
  components: ['S', 'M'],
  duration: '1 minute',
  description: 'You create a sound or an image of an object within range. The illusion lasts for 1 minute. Physical interaction reveals it as an illusion.',
  
  cast: (caster, target, options = {}) => {
    const illusionType = options.type || 'sound';
    
    return {
      success: true,
      utility: true,
      effect: 'minor_illusion',
      illusionType,
      duration: 10, // rounds
      narrative: illusionType === 'sound'
        ? `${caster.name || 'The caster'} creates an illusory sound that echoes through the area!`
        : `${caster.name || 'The caster'} weaves an illusory image into existence!`
    };
  }
};

/**
 * 20. Blade Ward - Resistance to physical damage
 */
const BLADE_WARD = {
  id: 'blade_ward',
  name: 'Blade Ward',
  level: 0,
  school: 'abjuration',
  castingTime: '1 action',
  range: 0, // self
  components: ['V', 'S'],
  duration: '1 round',
  description: 'You extend your hand and trace a sigil of warding in the air. Until the end of your next turn, you have resistance against bludgeoning, piercing, and slashing damage.',
  
  cast: (caster, target, options = {}) => {
    const actualTarget = target || caster;
    
    applyStatusEffect(actualTarget, {
      type: 'blade_ward',
      resistances: ['bludgeoning', 'piercing', 'slashing'],
      duration: 1,
      source: 'blade_ward'
    });
    
    return {
      success: true,
      utility: true,
      effect: 'blade_ward',
      narrative: `${caster.name || 'The caster'} traces a protective sigil! They gain resistance to physical damage!`
    };
  }
};

// ============================================================================
// CANTRIP REGISTRY
// ============================================================================

const CANTRIPS = {
  // Damage cantrips
  fire_bolt: FIRE_BOLT,
  sacred_flame: SACRED_FLAME,
  eldritch_blast: ELDRITCH_BLAST,
  vicious_mockery: VICIOUS_MOCKERY,
  produce_flame: PRODUCE_FLAME,
  ray_of_frost: RAY_OF_FROST,
  shocking_grasp: SHOCKING_GRASP,
  acid_splash: ACID_SPLASH,
  poison_spray: POISON_SPRAY,
  chill_touch: CHILL_TOUCH,
  
  // Utility cantrips
  mage_hand: MAGE_HAND,
  light: LIGHT,
  prestidigitation: PRESTIDIGITATION,
  mending: MENDING,
  guidance: GUIDANCE,
  resistance: RESISTANCE,
  thaumaturgy: THAUMATURGY,
  druidcraft: DRUIDCRAFT,
  minor_illusion: MINOR_ILLUSION,
  blade_ward: BLADE_WARD
};

/**
 * Get cantrip by ID
 */
function getCantrip(cantripId) {
  return CANTRIPS[cantripId] || null;
}

/**
 * Cast a cantrip
 */
function castCantrip(cantripId, caster, target, options = {}) {
  const cantrip = getCantrip(cantripId);
  
  if (!cantrip) {
    return {
      success: false,
      error: `Unknown cantrip: ${cantripId}`
    };
  }
  
  return cantrip.cast(caster, target, options);
}

/**
 * List all cantrips
 */
function listCantrips() {
  return Object.values(CANTRIPS).map(c => ({
    id: c.id,
    name: c.name,
    school: c.school,
    attackType: c.attackType,
    saveType: c.saveType,
    damageType: c.damageType,
    baseDamage: c.baseDamage,
    range: c.range,
    description: c.description
  }));
}

/**
 * Get damage cantrips
 */
function getDamageCantrips() {
  return Object.values(CANTRIPS).filter(c => c.baseDamage);
}

/**
 * Get utility cantrips
 */
function getUtilityCantrips() {
  return Object.values(CANTRIPS).filter(c => !c.baseDamage);
}

module.exports = {
  CANTRIPS,
  getCantrip,
  castCantrip,
  listCantrips,
  getDamageCantrips,
  getUtilityCantrips
};
