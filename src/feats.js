/**
 * Caverns & Clawds - Feats System
 * 
 * All feats from Baldur's Gate 3, flavored for the lobster depths.
 * Feats are gained at levels 4, 8, 12, 16, 19 (or via racial features).
 */

// ============================================================================
// FEATS DATABASE (BG3 Complete List)
// ============================================================================

const FEATS = {
  
  // === ABILITY SCORE IMPROVEMENT ===
  ability_improvement: {
    id: 'ability_improvement',
    name: 'Ability Improvement',
    seaName: 'Shell Enhancement',
    description: 'Increase one ability score by 2, or two ability scores by 1 each. Cannot exceed 20.',
    effect: {
      type: 'asi',
      options: [
        { single: 2 },  // +2 to one stat
        { split: [1, 1] }  // +1 to two stats
      ]
    }
  },

  // === COMBAT FEATS ===
  alert: {
    id: 'alert',
    name: 'Alert',
    seaName: 'Predator Senses',
    description: 'Your antennae sense danger before it strikes. +5 to Initiative. Cannot be surprised while conscious.',
    effect: {
      initiative_bonus: 5,
      immune_to_surprise: true
    }
  },

  athlete: {
    id: 'athlete',
    name: 'Athlete',
    seaName: 'Current Rider',
    description: 'Your powerful tail propels you through water with ease. +1 STR or DEX. Standing from prone costs only 5ft. Running jump distance increased.',
    prerequisites: [],
    effect: {
      ability_choice: ['str', 'dex'],
      ability_bonus: 1,
      prone_stand_cost: 5,
      jump_bonus: true
    }
  },

  charger: {
    id: 'charger',
    name: 'Charger',
    seaName: 'Torpedo Rush',
    description: 'Dash as a bonus action. If you move 10ft+ in a straight line, +5 damage on next melee attack or shove target 10ft.',
    effect: {
      dash_bonus_action: true,
      charge_damage_bonus: 5,
      charge_shove_distance: 10
    }
  },

  crossbow_expert: {
    id: 'crossbow_expert',
    name: 'Crossbow Expert',
    seaName: 'Harpoon Master',
    description: 'Master of ranged weapons in close quarters. No disadvantage on ranged attacks within 5ft. Bonus action attack with hand crossbow after attacking.',
    effect: {
      ignore_close_range_disadvantage: true,
      bonus_action_crossbow: true,
      ignore_loading: true
    }
  },

  defensive_duelist: {
    id: 'defensive_duelist',
    name: 'Defensive Duelist',
    seaName: 'Claw Parry',
    description: 'When wielding a finesse weapon, use reaction to add proficiency bonus to AC against one attack.',
    prerequisites: ['dex >= 13'],
    effect: {
      reaction_ac_bonus: 'proficiency',
      requires: 'finesse_weapon'
    }
  },

  dual_wielder: {
    id: 'dual_wielder',
    name: 'Dual Wielder',
    seaName: 'Twin Claws',
    description: 'Both claws strike as one. +1 AC while dual wielding. Can dual wield non-light weapons. Draw/stow two weapons at once.',
    effect: {
      dual_wield_ac_bonus: 1,
      dual_wield_any: true,
      quick_draw_dual: true
    }
  },

  dungeon_delver: {
    id: 'dungeon_delver',
    name: 'Dungeon Delver',
    seaName: 'Depth Crawler',
    description: 'Expert at navigating the dangerous caverns. Advantage on Perception/Investigation for traps. Advantage on saves vs traps. Resistance to trap damage.',
    effect: {
      advantage_detect_traps: true,
      advantage_save_traps: true,
      resistance_trap_damage: true
    }
  },

  durable: {
    id: 'durable',
    name: 'Durable',
    seaName: 'Hardened Carapace',
    description: 'Your shell has thickened from countless battles. +1 CON. When rolling Hit Dice to heal, minimum roll equals twice your CON modifier.',
    effect: {
      con_bonus: 1,
      hit_dice_minimum: 'con_mod * 2'
    }
  },

  great_weapon_master: {
    id: 'great_weapon_master',
    name: 'Great Weapon Master',
    seaName: 'Crusher Claw',
    description: 'Devastating power attacks with heavy weapons. On crit or kill, bonus action melee attack. Can take -5 to hit for +10 damage.',
    prerequisites: [],
    effect: {
      crit_kill_bonus_attack: true,
      power_attack: { penalty: -5, damage: 10 },
      requires: 'heavy_weapon'
    }
  },

  heavily_armored: {
    id: 'heavily_armored',
    name: 'Heavily Armored',
    seaName: 'Fortress Shell',
    description: 'You\'ve trained to bear the weight of full plate. +1 STR. Gain heavy armor proficiency.',
    prerequisites: ['medium_armor_proficiency'],
    effect: {
      str_bonus: 1,
      grants_proficiency: 'heavy_armor'
    }
  },

  heavy_armor_master: {
    id: 'heavy_armor_master',
    name: 'Heavy Armor Master',
    seaName: 'Impenetrable Shell',
    description: 'Your armor deflects glancing blows. +1 STR. While in heavy armor, reduce bludgeoning/piercing/slashing damage by 3.',
    prerequisites: ['heavy_armor_proficiency'],
    effect: {
      str_bonus: 1,
      damage_reduction: { types: ['bludgeoning', 'piercing', 'slashing'], amount: 3 }
    }
  },

  lightly_armored: {
    id: 'lightly_armored',
    name: 'Lightly Armored',
    seaName: 'Streamlined Shell',
    description: 'You\'ve learned to move in light armor. +1 STR or DEX. Gain light armor proficiency.',
    effect: {
      ability_choice: ['str', 'dex'],
      ability_bonus: 1,
      grants_proficiency: 'light_armor'
    }
  },

  lucky: {
    id: 'lucky',
    name: 'Lucky',
    seaName: 'Blessed by the Tides',
    description: 'Fortune favors your claws. 3 luck points per long rest. Spend to reroll any attack, ability check, or saving throw.',
    effect: {
      luck_points: 3,
      reroll_any: true
    }
  },

  mage_slayer: {
    id: 'mage_slayer',
    name: 'Mage Slayer',
    seaName: 'Arcane Hunter',
    description: 'Casters fear your approach. Reaction attack when adjacent creature casts spell. Advantage on saves vs spells from adjacent. Targets have disadvantage on concentration.',
    effect: {
      reaction_attack_on_cast: true,
      advantage_saves_adjacent_spells: true,
      impose_concentration_disadvantage: true
    }
  },

  magic_initiate: {
    id: 'magic_initiate',
    name: 'Magic Initiate',
    seaName: 'Touched by the Deep',
    description: 'The currents of magic flow through you. Learn 2 cantrips and one 1st-level spell from a chosen class.',
    effect: {
      class_choice: ['wizard', 'cleric', 'warlock', 'bard'],
      cantrips_learned: 2,
      spell_learned: { level: 1, casts: 1 }
    }
  },

  martial_adept: {
    id: 'martial_adept',
    name: 'Martial Adept',
    seaName: 'Combat Techniques',
    description: 'You\'ve studied advanced fighting maneuvers. Learn 2 Battle Master maneuvers. Gain 1 superiority die (d6).',
    effect: {
      maneuvers_learned: 2,
      superiority_dice: { count: 1, die: 'd6' }
    }
  },

  medium_armor_master: {
    id: 'medium_armor_master',
    name: 'Medium Armor Master',
    seaName: 'Balanced Shell',
    description: 'You move silently in medium armor. No stealth disadvantage. Max DEX bonus to AC becomes +3.',
    prerequisites: ['medium_armor_proficiency'],
    effect: {
      no_stealth_disadvantage: true,
      medium_armor_max_dex: 3
    }
  },

  mobile: {
    id: 'mobile',
    name: 'Mobile',
    seaName: 'Swift Current',
    description: 'You dart through battle like a current. +10ft speed. Dash ignores difficult terrain. No opportunity attacks from creatures you attack.',
    effect: {
      speed_bonus: 10,
      dash_ignores_difficult_terrain: true,
      no_opportunity_attack_after_melee: true
    }
  },

  moderately_armored: {
    id: 'moderately_armored',
    name: 'Moderately Armored',
    seaName: 'Reinforced Shell',
    description: 'You\'ve trained with heavier protection. +1 STR or DEX. Gain medium armor and shield proficiency.',
    prerequisites: ['light_armor_proficiency'],
    effect: {
      ability_choice: ['str', 'dex'],
      ability_bonus: 1,
      grants_proficiency: ['medium_armor', 'shields']
    }
  },

  polearm_master: {
    id: 'polearm_master',
    name: 'Polearm Master',
    seaName: 'Trident Mastery',
    description: 'Master of reach weapons. Bonus action attack with opposite end (1d4). Opportunity attack when enemies enter your reach.',
    effect: {
      bonus_action_butt_attack: { damage: '1d4', type: 'bludgeoning' },
      opportunity_attack_on_enter: true,
      applies_to: ['glaive', 'halberd', 'quarterstaff', 'spear', 'trident']
    }
  },

  resilient: {
    id: 'resilient',
    name: 'Resilient',
    seaName: 'Adaptive Shell',
    description: 'Your body has adapted to resist specific threats. +1 to chosen ability. Gain proficiency in saving throws for that ability.',
    effect: {
      ability_choice: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
      ability_bonus: 1,
      save_proficiency: 'chosen'
    }
  },

  ritual_caster: {
    id: 'ritual_caster',
    name: 'Ritual Caster',
    seaName: 'Tide Ritualist',
    description: 'You\'ve learned to cast spells as lengthy rituals. Gain a ritual book with two 1st-level ritual spells.',
    prerequisites: ['int >= 13', 'wis >= 13'],
    effect: {
      ritual_book: true,
      starting_rituals: 2
    }
  },

  savage_attacker: {
    id: 'savage_attacker',
    name: 'Savage Attacker',
    seaName: 'Primal Fury',
    description: 'Your attacks carry devastating force. Once per turn, reroll melee weapon damage dice and use either result.',
    effect: {
      reroll_melee_damage: true,
      uses_per_turn: 1
    }
  },

  sentinel: {
    id: 'sentinel',
    name: 'Sentinel',
    seaName: 'Guardian of the Reef',
    description: 'You punish those who ignore you. Opportunity attacks reduce speed to 0. Can attack creatures who attack allies within 5ft.',
    effect: {
      opportunity_attack_stops_movement: true,
      attack_when_ally_attacked: true,
      ignore_disengage: true
    }
  },

  sharpshooter: {
    id: 'sharpshooter',
    name: 'Sharpshooter',
    seaName: 'Deep Shot',
    description: 'Your aim is true across any distance. No disadvantage at long range. Ignore half/three-quarters cover. -5 to hit for +10 damage.',
    effect: {
      ignore_long_range_disadvantage: true,
      ignore_cover: true,
      power_attack: { penalty: -5, damage: 10 }
    }
  },

  shield_master: {
    id: 'shield_master',
    name: 'Shield Master',
    seaName: 'Shell Wall',
    description: 'Your shield is both weapon and fortress. Bonus action shove after Attack. Add shield AC to DEX saves vs single target. No damage on successful DEX save (half on fail).',
    effect: {
      bonus_action_shove: true,
      shield_bonus_to_dex_saves: true,
      evasion_with_shield: true
    }
  },

  skilled: {
    id: 'skilled',
    name: 'Skilled',
    seaName: 'Jack of All Currents',
    description: 'You pick up talents quickly. Gain proficiency in any 3 skills or tools.',
    effect: {
      skill_proficiencies: 3
    }
  },

  spell_sniper: {
    id: 'spell_sniper',
    name: 'Spell Sniper',
    seaName: 'Arcane Reach',
    description: 'Your spells strike from afar. Double range on attack roll spells. Ignore half/three-quarters cover. Learn one attack cantrip.',
    prerequisites: ['can_cast_spell'],
    effect: {
      double_spell_range: true,
      ignore_cover: true,
      learn_cantrip: { type: 'attack' }
    }
  },

  tavern_brawler: {
    id: 'tavern_brawler',
    name: 'Tavern Brawler',
    seaName: 'Dockside Scrapper',
    description: 'You\'ve won countless brawls in the Briny Flagon. +1 STR or CON. Proficient with improvised weapons. Unarmed strikes deal 1d4. Bonus action grapple after unarmed/improvised hit.',
    effect: {
      ability_choice: ['str', 'con'],
      ability_bonus: 1,
      improvised_weapon_proficiency: true,
      unarmed_damage: '1d4',
      bonus_action_grapple: true
    }
  },

  tough: {
    id: 'tough',
    name: 'Tough',
    seaName: 'Ironclad Shell',
    description: 'Your shell can withstand tremendous punishment. +2 HP per level (retroactive).',
    effect: {
      hp_per_level: 2,
      retroactive: true
    }
  },

  war_caster: {
    id: 'war_caster',
    name: 'War Caster',
    seaName: 'Battle Mage',
    description: 'You maintain spells amidst the chaos of battle. Advantage on concentration saves. Somatic components with hands full. Opportunity attacks can be spells.',
    prerequisites: ['can_cast_spell'],
    effect: {
      advantage_concentration: true,
      somatic_with_full_hands: true,
      spell_opportunity_attack: true
    }
  },

  weapon_master: {
    id: 'weapon_master',
    name: 'Weapon Master',
    seaName: 'Arsenal Training',
    description: 'You\'ve trained with many weapons. +1 STR or DEX. Gain proficiency with 4 weapons of your choice.',
    effect: {
      ability_choice: ['str', 'dex'],
      ability_bonus: 1,
      weapon_proficiencies: 4
    }
  },

  // === BG3 UNIQUE FEATS ===
  actor: {
    id: 'actor',
    name: 'Actor',
    seaName: 'Master of Disguise',
    description: 'A master of mimicry and deception. +1 CHA. Advantage on Deception and Performance to pass as someone else.',
    effect: {
      cha_bonus: 1,
      advantage_impersonation: true,
      mimic_speech: true
    }
  },

  elemental_adept: {
    id: 'elemental_adept',
    name: 'Elemental Adept',
    seaName: 'Elemental Mastery',
    description: 'Your spells of a chosen element are especially potent. Choose a damage type. Spells ignore resistance. Treat 1s on damage dice as 2s.',
    prerequisites: ['can_cast_spell'],
    effect: {
      element_choice: ['fire', 'cold', 'lightning', 'acid', 'thunder'],
      ignore_resistance: true,
      minimum_damage_roll: 2
    }
  },

  performer: {
    id: 'performer',
    name: 'Performer',
    seaName: 'Reef Entertainer',
    description: 'You captivate audiences with your presence. +1 CHA. Gain proficiency in Performance and one musical instrument.',
    effect: {
      cha_bonus: 1,
      grants_proficiency: ['performance', 'musical_instrument']
    }
  }
};

// ============================================================================
// FEAT REQUIREMENTS CHECKER
// ============================================================================

function canTakeFeat(character, featId) {
  const feat = FEATS[featId];
  if (!feat) return { allowed: false, reason: 'Feat not found' };
  
  if (!feat.prerequisites || feat.prerequisites.length === 0) {
    return { allowed: true };
  }
  
  for (const prereq of feat.prerequisites) {
    // Check ability score requirements
    const abilityMatch = prereq.match(/(\w+)\s*>=\s*(\d+)/);
    if (abilityMatch) {
      const [, ability, value] = abilityMatch;
      const charValue = character.stats?.[ability] || 10;
      if (charValue < parseInt(value)) {
        return { allowed: false, reason: `Requires ${ability.toUpperCase()} ${value}+` };
      }
    }
    
    // Check proficiency requirements
    if (prereq.includes('proficiency')) {
      const profType = prereq.replace('_proficiency', '');
      if (!character.proficiencies?.includes(profType)) {
        return { allowed: false, reason: `Requires ${profType} proficiency` };
      }
    }
    
    // Check spellcasting
    if (prereq === 'can_cast_spell') {
      if (!character.spellcasting) {
        return { allowed: false, reason: 'Requires ability to cast spells' };
      }
    }
  }
  
  return { allowed: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FEATS,
  canTakeFeat
};
