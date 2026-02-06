/**
 * Warlock Class Features
 * Eldritch Invocations, Pact Boons
 */

/**
 * Eldritch Invocations - Customizable abilities
 */
const ELDRITCH_INVOCATIONS = {
  agonizing_blast: {
    name: 'Agonizing Blast',
    description: 'Add CHA modifier to Eldritch Blast damage',
    prerequisite: 'Eldritch Blast cantrip',
    apply: (warlock, spell) => {
      if (spell.id !== 'eldritch_blast') return { bonus: 0 };
      
      const chaMod = Math.floor(((warlock.cha || warlock.abilities?.CHA || 10) - 10) / 2);
      return { damageBonus: chaMod, perBeam: true };
    }
  },
  
  armor_of_shadows: {
    name: 'Armor of Shadows',
    description: 'Cast Mage Armor on yourself at will',
    apply: (warlock) => {
      // Grant 13 + DEX AC (if not wearing armor)
      const hasArmor = warlock.equipment?.some(e => e.slot === 'armor' && e.equipped);
      if (hasArmor) return { acBonus: 0 };
      
      const dexMod = Math.floor(((warlock.dex || warlock.abilities?.DEX || 10) - 10) / 2);
      const mageArmorAC = 13 + dexMod;
      const currentAC = warlock.ac || 10;
      
      return { 
        acOverride: Math.max(mageArmorAC, currentAC),
        source: 'Mage Armor (Armor of Shadows)'
      };
    }
  },
  
  devils_sight: {
    name: "Devil's Sight",
    description: 'See normally in darkness (magical or nonmagical) to 120 feet',
    apply: () => {
      return { darkvision: 120, magical: true };
    }
  },
  
  eldritch_sight: {
    name: 'Eldritch Sight',
    description: 'Cast Detect Magic at will',
    apply: () => {
      return { detectMagicAtWill: true };
    }
  }
};

/**
 * Apply Eldritch Invocation
 */
function applyInvocation(warlock, invocationName, context = {}) {
  const invocation = ELDRITCH_INVOCATIONS[invocationName];
  if (!invocation) {
    return { active: false };
  }
  
  const effect = invocation.apply(warlock, context.spell);
  
  return {
    active: true,
    invocation: invocation.name,
    description: invocation.description,
    effect
  };
}

/**
 * Pact Boons - Level 3 choice
 */
const PACT_BOONS = {
  blade: {
    name: 'Pact of the Blade',
    description: 'Summon a pact weapon as an action',
    unlock: (warlock) => {
      warlock.pactWeaponAvailable = true;
    }
  },
  
  chain: {
    name: 'Pact of the Chain',
    description: 'Gain a familiar with enhanced abilities',
    unlock: (warlock) => {
      warlock.pactFamiliarAvailable = true;
    }
  },
  
  tome: {
    name: 'Pact of the Tome',
    description: 'Gain Book of Shadows with 3 extra cantrips',
    unlock: (warlock) => {
      warlock.extraCantrips = 3;
      warlock.bookOfShadows = true;
    }
  }
};

/**
 * Choose Pact Boon
 */
function choosePactBoon(warlock, boonName) {
  if (warlock.level < 3) {
    return {
      success: false,
      error: 'Pact Boon unlocks at level 3'
    };
  }
  
  const boon = PACT_BOONS[boonName];
  if (!boon) {
    return {
      success: false,
      error: `Unknown pact boon: ${boonName}`
    };
  }
  
  boon.unlock(warlock);
  warlock.pactBoon = boonName;
  
  return {
    success: true,
    boon: boon.name,
    description: boon.description
  };
}

module.exports = {
  ELDRITCH_INVOCATIONS,
  applyInvocation,
  PACT_BOONS,
  choosePactBoon
};
