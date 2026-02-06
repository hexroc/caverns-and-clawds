/**
 * Fighter Class Features
 * Action Surge, Second Wind, Fighting Styles
 */

const { roll } = require('../combat');

/**
 * Fighting Styles - Choose one combat style
 */
const FIGHTING_STYLES = {
  defense: {
    name: 'Defense',
    description: 'While wearing armor, you gain +1 AC',
    apply: (character) => {
      // Check if wearing armor
      const armor = character.equipment?.find(e => e.slot === 'armor' && e.equipped);
      if (armor) {
        return { acBonus: 1 };
      }
      return { acBonus: 0 };
    }
  },
  
  dueling: {
    name: 'Dueling',
    description: 'When wielding a one-handed melee weapon and no other weapons, +2 damage',
    apply: (character, weapon) => {
      // Check if one-handed weapon with nothing in off-hand
      const mainHand = character.equipment?.find(e => e.slot === 'main_hand' && e.equipped);
      const offHand = character.equipment?.find(e => e.slot === 'off_hand' && e.equipped);
      
      const oneHanded = mainHand && !mainHand.twoHanded;
      const nothingInOffHand = !offHand || offHand.type === 'shield';
      
      if (oneHanded && nothingInOffHand) {
        return { damageBonus: 2 };
      }
      return { damageBonus: 0 };
    }
  },
  
  great_weapon_fighting: {
    name: 'Great Weapon Fighting',
    description: 'When you roll a 1 or 2 on damage die for two-handed melee weapon, reroll (take new result)',
    apply: (character, weapon, damageRoll) => {
      // Check if two-handed weapon
      const mainHand = character.equipment?.find(e => e.slot === 'main_hand' && e.equipped);
      if (!mainHand || !mainHand.twoHanded) {
        return { rerolls: [] };
      }
      
      // Reroll 1s and 2s
      const rerolls = [];
      if (damageRoll) {
        damageRoll.forEach((die, index) => {
          if (die === 1 || die === 2) {
            const reroll = roll(mainHand.damageDie || 6);
            rerolls.push({ original: die, reroll, index });
          }
        });
      }
      
      return { rerolls };
    }
  },
  
  archery: {
    name: 'Archery',
    description: 'You gain +2 bonus to attack rolls with ranged weapons',
    apply: (character, weapon) => {
      // Check if ranged weapon
      if (weapon && weapon.range && weapon.range > 5) {
        return { attackBonus: 2 };
      }
      return { attackBonus: 0 };
    }
  },
  
  two_weapon_fighting: {
    name: 'Two-Weapon Fighting',
    description: 'Add ability modifier to damage of off-hand attacks',
    apply: (character) => {
      // This is applied when making off-hand attacks
      const strMod = Math.floor(((character.str || character.abilities?.STR || 10) - 10) / 2);
      const dexMod = Math.floor(((character.dex || character.abilities?.DEX || 10) - 10) / 2);
      const mod = Math.max(strMod, dexMod);
      
      return { offHandDamageBonus: mod };
    }
  }
};

/**
 * Apply fighting style bonuses
 */
function applyFightingStyle(character, styleName, context = {}) {
  const style = FIGHTING_STYLES[styleName];
  if (!style) {
    return { active: false, bonuses: {} };
  }
  
  const bonuses = style.apply(character, context.weapon, context.damageRoll);
  
  return {
    active: true,
    style: style.name,
    description: style.description,
    bonuses
  };
}

/**
 * Second Wind - Heal self as bonus action
 * Regain 1d10 + fighter level HP, 1/short rest
 */
function secondWind(character) {
  // Check uses
  if (!character.secondWindAvailable) {
    return {
      success: false,
      error: 'Second Wind already used (regain on short rest)'
    };
  }
  
  // Must be fighter
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'fighter') {
    return { success: false, error: 'Not a fighter' };
  }
  
  // Roll healing: 1d10 + fighter level
  const healRoll = roll(10);
  const healing = healRoll + character.level;
  
  // Apply healing
  const oldHP = character.hp || character.hp_current;
  const maxHP = character.maxHp || character.hp_max;
  const newHP = Math.min(oldHP + healing, maxHP);
  const actualHealing = newHP - oldHP;
  
  if (character.hp !== undefined) character.hp = newHP;
  if (character.hp_current !== undefined) character.hp_current = newHP;
  
  // Mark as used
  character.secondWindAvailable = false;
  
  return {
    success: true,
    healing: actualHealing,
    roll: healRoll,
    total: healing,
    oldHP,
    newHP,
    narrative: `You draw upon your reserves, regaining **${actualHealing} HP** (rolled ${healRoll} + ${character.level}).`
  };
}

/**
 * Restore Second Wind on short or long rest
 */
function restoreSecondWind(character) {
  character.secondWindAvailable = true;
  return true;
}

/**
 * Action Surge - Take one additional action on your turn
 * 1/short rest (2/short rest at level 17)
 */
function actionSurge(character) {
  // Initialize uses if not present
  if (character.actionSurgeUses === undefined) {
    character.actionSurgeUses = character.level >= 17 ? 2 : 1;
    character.actionSurgeMax = character.actionSurgeUses;
  }
  
  if (character.actionSurgeUses <= 0) {
    return {
      success: false,
      error: 'No Action Surge uses remaining (regain on short rest)'
    };
  }
  
  // Must be fighter
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'fighter') {
    return { success: false, error: 'Not a fighter' };
  }
  
  // Must be level 2+
  if (character.level < 2) {
    return { success: false, error: 'Action Surge unlocks at level 2' };
  }
  
  // Mark as used
  character.actionSurgeUses -= 1;
  
  // Grant extra action this turn
  character.actionSurgeActive = true;
  
  return {
    success: true,
    usesRemaining: character.actionSurgeUses,
    narrative: `⚡ **ACTION SURGE!** You push beyond your limits, gaining an additional action this turn!`
  };
}

/**
 * Restore Action Surge on short or long rest
 */
function restoreActionSurge(character) {
  const max = character.level >= 17 ? 2 : 1;
  character.actionSurgeUses = max;
  character.actionSurgeMax = max;
  character.actionSurgeActive = false;
  return max;
}

/**
 * Check if character can use Action Surge
 */
function canActionSurge(character) {
  const charClass = character.class?.toLowerCase() || character.class_name?.toLowerCase();
  if (charClass !== 'fighter') {
    return { can: false, reason: 'Not a fighter' };
  }
  
  if (character.level < 2) {
    return { can: false, reason: 'Action Surge unlocks at level 2' };
  }
  
  if (!character.actionSurgeUses || character.actionSurgeUses <= 0) {
    return { can: false, reason: 'No uses remaining' };
  }
  
  return { can: true, uses: character.actionSurgeUses };
}

module.exports = {
  FIGHTING_STYLES,
  applyFightingStyle,
  secondWind,
  restoreSecondWind,
  actionSurge,
  restoreActionSurge,
  canActionSurge
};
