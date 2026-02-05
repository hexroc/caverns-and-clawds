/**
 * Clawds & Caverns - Character System
 * 
 * Full 5e character creation, persistence, and management.
 * All races are lobster variants. All hail the claw.
 */

const crypto = require('crypto');

// ============================================================================
// RELIGIONS
// ============================================================================

const RELIGIONS = {
  crustafarianism: {
    id: 'crustafarianism',
    name: 'Crustafarianism',
    description: 'Followers of the Great Claw believe that death is merely a molting of the soul. The faithful sometimes refuse to stay dead.',
    blessing: '1% chance to resurrect at 1 HP when killed in battle',
    effect: { type: 'battle_resurrect', chance: 0.01 }
  },
  none: {
    id: 'none',
    name: 'No Religion',
    description: 'You place your faith in USDC, not prayers. The practical path.',
    blessing: '+0.01% bonus USDC from quests',
    effect: { type: 'pearl_bonus', multiplier: 1.0001 }
  }
};

// ============================================================================
// RACE DEFINITIONS (Lobster Variants)
// ============================================================================

const RACES = {
  american: {
    name: 'American Lobster',
    description: 'Classic red-brown lobster. Versatile and adaptable.',
    traits: ['Versatile (+1 all stats)', 'Extra Training', 'Determined (Bonus Feat)'],
    statBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    size: 'Medium',
    speed: 30,
    features: ['bonus_skill', 'bonus_feat']
  },
  european: {
    name: 'European Lobster',
    description: 'Blue-tinged shell, elegant and magical.',
    traits: ['Darkvision 60ft', 'Ancient Bloodline', 'Meditation Trance', 'Keen Senses'],
    statBonuses: { dex: 2, int: 1 },
    size: 'Medium',
    speed: 30,
    features: ['darkvision_60', 'charm_resistance', 'trance', 'perception_proficiency']
  },
  slipper: {
    name: 'Slipper Lobster',
    description: 'Flat, wide shell. Stocky and tough.',
    traits: ['Darkvision 60ft', 'Toxin Resistance', 'Shell-Sense', 'Hardened Carapace'],
    statBonuses: { con: 2, wis: 1 },
    size: 'Medium',
    speed: 25,
    features: ['darkvision_60', 'poison_resistance', 'tremorsense', 'hp_bonus']
  },
  squat: {
    name: 'Squat Lobster',
    description: 'Small, colorful, and surprisingly lucky.',
    traits: ['Fortunate', 'Courageous', 'Nimble', 'Small Size'],
    statBonuses: { dex: 2, cha: 1 },
    size: 'Small',
    speed: 25,
    features: ['lucky', 'brave', 'nimble']
  },
  spiny: {
    name: 'Spiny Lobster',
    description: 'No large claws, covered in defensive spines. Fierce warriors.',
    traits: ['Darkvision 60ft', 'Undying Will', 'Brutal Strikes', 'Menacing'],
    statBonuses: { str: 2, con: 1 },
    size: 'Medium',
    speed: 30,
    features: ['darkvision_60', 'relentless_endurance', 'savage_attacks', 'intimidation_proficiency']
  },
  reef: {
    name: 'Reef Lobster',
    description: 'Vibrant tropical colors. Can unleash boiling water breath.',
    traits: ['Scalding Breath (2d6 fire, 15ft cone)', 'Heat Resistance'],
    statBonuses: { str: 2, cha: 1 },
    size: 'Medium',
    speed: 30,
    features: ['breath_weapon_fire', 'fire_resistance']
  },
  pistol: {
    name: 'Pistol Lobster',
    description: 'Small with one oversized claw. Known for devastating sonic snaps.',
    traits: ['Darkvision 60ft', 'Quick Wits', 'Sonic Snap (Shockwave cantrip)'],
    statBonuses: { int: 2, con: 1 },
    size: 'Small',
    speed: 25,
    features: ['darkvision_60', 'magic_resistance', 'cantrip_thunderclap']
  },
  calico: {
    name: 'Calico Lobster',
    description: 'Rare mottled pattern. Charming diplomats.',
    traits: ['Darkvision 60ft', 'Ancient Bloodline', 'Skill Versatility', 'Flexible Stats'],
    statBonuses: { cha: 2, dex: 1, wis: 1 },
    size: 'Medium',
    speed: 30,
    features: ['darkvision_60', 'charm_resistance', 'bonus_skills_2']
  },
  ghost: {
    name: 'Ghost Lobster',
    description: 'Albino white, nearly translucent. Dwellers of the lightless depths.',
    traits: ['Superior Darkvision 120ft', 'Sunlight Sensitivity', 'Depth Magic'],
    statBonuses: { dex: 2, cha: 1 },
    size: 'Medium',
    speed: 30,
    features: ['darkvision_120', 'sunlight_sensitivity', 'depth_magic']
  },
  split: {
    name: 'Split Lobster',
    description: 'Chimeric two-toned shell. Touched by abyssal energies.',
    traits: ['Darkvision 60ft', 'Abyssal Resistance', 'Depth Magic'],
    statBonuses: { cha: 2, int: 1 },
    size: 'Medium',
    speed: 30,
    features: ['darkvision_60', 'fire_resistance', 'abyssal_legacy']
  }
};

// ============================================================================
// CLASS DEFINITIONS (5e Core)
// ============================================================================

const CLASSES = {
  fighter: {
    name: 'Fighter',
    seaName: 'Shell Knight',
    baseClass: 'Fighter',
    description: 'Master of martial combat. Armored in chitin and coral.',
    hitDie: 10,
    primaryStat: 'str',
    saveProficiencies: ['str', 'con'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    numSkills: 2,
    startingEquipment: [
      { item: 'longsword', equipped: true, slot: 'main_hand' },
      { item: 'shield', equipped: true, slot: 'off_hand' },
      { item: 'chain_mail', equipped: true, slot: 'armor' },
      { item: 'handaxe', quantity: 2 },
      { item: 'explorers_pack' }
    ],
    features: {
      1: ['fighting_style', 'second_wind'],
      2: ['action_surge'],
      3: ['martial_archetype'],
      4: ['asi'],
      5: ['extra_attack']
    }
  },
  rogue: {
    name: 'Rogue',
    seaName: 'Shadow Swimmer',
    baseClass: 'Rogue',
    description: 'Stealthy and deadly. Strikes from the murky depths.',
    hitDie: 8,
    primaryStat: 'dex',
    saveProficiencies: ['dex', 'int'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple', 'hand_crossbow', 'longsword', 'rapier', 'shortsword'],
    skillChoices: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'performance', 'persuasion', 'sleight_of_hand', 'stealth'],
    numSkills: 4,
    startingEquipment: [
      { item: 'rapier', equipped: true, slot: 'main_hand' },
      { item: 'shortbow', quantity: 1 },
      { item: 'arrows', quantity: 20 },
      { item: 'leather_armor', equipped: true, slot: 'armor' },
      { item: 'dagger', quantity: 2 },
      { item: 'thieves_tools' },
      { item: 'burglars_pack' }
    ],
    features: {
      1: ['expertise', 'sneak_attack_1d6', 'thieves_cant'],
      2: ['cunning_action'],
      3: ['roguish_archetype', 'sneak_attack_2d6'],
      4: ['asi'],
      5: ['uncanny_dodge', 'sneak_attack_3d6']
    }
  },
  cleric: {
    name: 'Cleric',
    seaName: 'Tide Priest',
    baseClass: 'Cleric',
    description: 'Devoted followers of <a href="https://molt.church/" target="_blank">Crustafarianism</a>, channeling divine crustacean power through sacred rites.',
    hitDie: 8,
    primaryStat: 'wis',
    saveProficiencies: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'shields'],
    weaponProficiencies: ['simple'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    numSkills: 2,
    startingEquipment: [
      { item: 'mace', equipped: true, slot: 'main_hand' },
      { item: 'shield', equipped: true, slot: 'off_hand' },
      { item: 'scale_mail', equipped: true, slot: 'armor' },
      { item: 'holy_symbol' },
      { item: 'priests_pack' }
    ],
    spellcasting: {
      ability: 'wis',
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      spellSlots: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 }
      }
    },
    features: {
      1: ['spellcasting', 'divine_domain'],
      2: ['channel_divinity', 'divine_domain_feature'],
      4: ['asi'],
      5: ['destroy_undead']
    }
  },
  wizard: {
    name: 'Wizard',
    seaName: 'Coral Scholar',
    baseClass: 'Wizard',
    description: 'Arcane master studying the mystical currents of magic.',
    hitDie: 6,
    primaryStat: 'int',
    saveProficiencies: ['int', 'wis'],
    armorProficiencies: [],
    weaponProficiencies: ['dagger', 'dart', 'sling', 'quarterstaff', 'light_crossbow'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    numSkills: 2,
    startingEquipment: [
      { item: 'quarterstaff', equipped: true, slot: 'main_hand' },
      { item: 'component_pouch' },
      { item: 'spellbook' },
      { item: 'scholars_pack' }
    ],
    spellcasting: {
      ability: 'int',
      cantripsKnown: { 1: 3, 4: 4, 10: 5 },
      spellSlots: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 }
      }
    },
    features: {
      1: ['spellcasting', 'arcane_recovery'],
      2: ['arcane_tradition'],
      4: ['asi'],
      5: ['arcane_tradition_feature']
    }
  },
  warlock: {
    name: 'Warlock',
    seaName: 'Abyssal Pact',
    baseClass: 'Warlock',
    description: 'Bound to an eldritch patron of the deep. Power at a price.',
    hitDie: 8,
    primaryStat: 'cha',
    saveProficiencies: ['wis', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    numSkills: 2,
    startingEquipment: [
      { item: 'light_crossbow', equipped: true, slot: 'main_hand' },
      { item: 'bolts', quantity: 20 },
      { item: 'component_pouch' },
      { item: 'leather_armor', equipped: true, slot: 'armor' },
      { item: 'dagger', quantity: 2 },
      { item: 'scholars_pack' }
    ],
    spellcasting: {
      ability: 'cha',
      pactMagic: true, // Warlock uses pact magic (slots refresh on short rest)
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      spellsKnown: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 },
      pactSlots: { // All slots are same level, refresh on short rest
        1: { slots: 1, level: 1 },
        2: { slots: 2, level: 1 },
        3: { slots: 2, level: 2 },
        4: { slots: 2, level: 2 },
        5: { slots: 2, level: 3 }
      }
    },
    features: {
      1: ['pact_magic', 'eldritch_patron'],
      2: ['eldritch_invocations'],
      3: ['pact_boon'],
      4: ['asi'],
      5: ['eldritch_invocation_extra']
    }
  },
  paladin: {
    name: 'Paladin',
    seaName: 'Tidal Warden',
    baseClass: 'Paladin',
    description: 'Holy warriors of <a href="https://molt.church/" target="_blank">Crustafarianism</a>, sworn to protect the faithful and smite heretics with righteous fury.',
    hitDie: 10,
    primaryStat: 'str',
    secondaryStat: 'cha',
    saveProficiencies: ['wis', 'cha'],
    armorProficiencies: ['light', 'medium', 'heavy', 'shields'],
    weaponProficiencies: ['simple', 'martial'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    numSkills: 2,
    startingEquipment: [
      { item: 'longsword', equipped: true, slot: 'main_hand' },
      { item: 'shield', equipped: true, slot: 'off_hand' },
      { item: 'chain_mail', equipped: true, slot: 'armor' },
      { item: 'javelin', quantity: 5 },
      { item: 'priests_pack' },
      { item: 'holy_symbol' }
    ],
    spellcasting: {
      ability: 'cha',
      preparedCaster: true, // Prepares spells from full list
      cantripsKnown: {}, // Paladins don't get cantrips
      spellSlots: {
        2: { 1: 2 }, // Paladins get spells at level 2
        3: { 1: 3 },
        4: { 1: 3 },
        5: { 1: 4, 2: 2 }
      }
    },
    features: {
      1: ['divine_sense', 'lay_on_hands'],
      2: ['fighting_style', 'spellcasting', 'divine_smite'],
      3: ['sacred_oath', 'channel_divinity'],
      4: ['asi'],
      5: ['extra_attack']
    }
  },
  bard: {
    name: 'Bard',
    seaName: 'Reef Chanter',
    baseClass: 'Bard',
    description: 'Weaver of song-magic and tales. The voice of the deep.',
    hitDie: 8,
    primaryStat: 'cha',
    saveProficiencies: ['dex', 'cha'],
    armorProficiencies: ['light'],
    weaponProficiencies: ['simple', 'hand_crossbow', 'longsword', 'rapier', 'shortsword'],
    skillChoices: ['any'], // Bards can choose any 3 skills
    numSkills: 3,
    startingEquipment: [
      { item: 'rapier', equipped: true, slot: 'main_hand' },
      { item: 'lute' }, // Musical instrument
      { item: 'leather_armor', equipped: true, slot: 'armor' },
      { item: 'dagger' },
      { item: 'entertainers_pack' }
    ],
    spellcasting: {
      ability: 'cha',
      cantripsKnown: { 1: 2, 4: 3, 10: 4 },
      spellsKnown: { 1: 4, 2: 5, 3: 6, 4: 7, 5: 8 },
      spellSlots: {
        1: { 1: 2 },
        2: { 1: 3 },
        3: { 1: 4, 2: 2 },
        4: { 1: 4, 2: 3 },
        5: { 1: 4, 2: 3, 3: 2 }
      }
    },
    features: {
      1: ['spellcasting', 'bardic_inspiration_d6'],
      2: ['jack_of_all_trades', 'song_of_rest_d6'],
      3: ['bard_college', 'expertise'],
      4: ['asi'],
      5: ['bardic_inspiration_d8', 'font_of_inspiration']
    }
  }
};

// ============================================================================
// ITEMS DATABASE
// ============================================================================

const ITEMS = {
  // Weapons
  longsword: { name: 'Coral Longsword', type: 'weapon', damage: '1d8', damageType: 'slashing', properties: ['versatile'], value: 15 },
  shortsword: { name: 'Sharpened Spine', type: 'weapon', damage: '1d6', damageType: 'piercing', properties: ['finesse', 'light'], value: 10 },
  rapier: { name: 'Needlefish Rapier', type: 'weapon', damage: '1d8', damageType: 'piercing', properties: ['finesse'], value: 25 },
  dagger: { name: 'Claw Dagger', type: 'weapon', damage: '1d4', damageType: 'piercing', properties: ['finesse', 'light', 'thrown'], value: 2 },
  handaxe: { name: 'Chitin Hatchet', type: 'weapon', damage: '1d6', damageType: 'slashing', properties: ['light', 'thrown'], value: 5 },
  mace: { name: 'Conch Mace', type: 'weapon', damage: '1d6', damageType: 'bludgeoning', properties: [], value: 5 },
  quarterstaff: { name: 'Driftwood Staff', type: 'weapon', damage: '1d6', damageType: 'bludgeoning', properties: ['versatile'], value: 2 },
  shortbow: { name: 'Spine Bow', type: 'weapon', damage: '1d6', damageType: 'piercing', properties: ['ammunition', 'two_handed'], range: '80/320', value: 25 },
  
  // Armor
  leather_armor: { name: 'Kelp-Woven Leather', type: 'armor', armorType: 'light', ac: 11, value: 10 },
  scale_mail: { name: 'Scale Mail', type: 'armor', armorType: 'medium', ac: 14, maxDex: 2, stealthDis: true, value: 50 },
  chain_mail: { name: 'Barnacle Chain', type: 'armor', armorType: 'heavy', ac: 16, strReq: 13, stealthDis: true, value: 75 },
  shield: { name: 'Clamshell Shield', type: 'shield', acBonus: 2, value: 10 },
  
  // Ammunition
  arrows: { name: 'Spine Arrows', type: 'ammunition', value: 0.05 },
  
  // Tools
  thieves_tools: { name: "Lockpick Set", type: 'tool', value: 25 },
  
  // Packs (simplified to value)
  explorers_pack: { name: "Explorer's Pack", type: 'pack', value: 10, contents: 'Backpack, bedroll, mess kit, tinderbox, torches (10), rations (10 days), waterskin, rope' },
  burglars_pack: { name: "Burglar's Pack", type: 'pack', value: 16, contents: 'Backpack, ball bearings, string, bell, candles (5), crowbar, hammer, pitons (10), lantern, oil (2), rations (5 days), tinderbox, waterskin' },
  priests_pack: { name: "Priest's Pack", type: 'pack', value: 19, contents: 'Backpack, blanket, candles (10), tinderbox, alms box, incense (2), censer, vestments, rations (2 days), waterskin' },
  scholars_pack: { name: "Scholar's Pack", type: 'pack', value: 40, contents: 'Backpack, book of lore, ink, ink pen, parchment (10), little bag of sand, small knife' },
  
  // Misc
  holy_symbol: { name: 'Tide Amulet', type: 'focus', value: 5 },
  component_pouch: { name: 'Spell Components', type: 'focus', value: 25 },
  spellbook: { name: 'Etched Shell Spellbook', type: 'spellbook', value: 50 },
  
  // === POTIONS (Consumables) ===
  potion_healing: { 
    name: 'Potion of Healing', 
    type: 'potion', 
    rarity: 'common',
    description: 'A bubbling red liquid that smells of brine. Heals 2d4+2 HP.',
    effect: { type: 'heal', dice: '2d4+2' },
    value: 50 
  },
  potion_greater_healing: { 
    name: 'Potion of Greater Healing', 
    type: 'potion', 
    rarity: 'uncommon',
    description: 'A thick crimson elixir. Heals 4d4+4 HP.',
    effect: { type: 'heal', dice: '4d4+4' },
    value: 150 
  },
  potion_superior_healing: { 
    name: 'Potion of Superior Healing', 
    type: 'potion', 
    rarity: 'rare',
    description: 'A glowing red potion with golden flecks. Heals 8d4+8 HP.',
    effect: { type: 'heal', dice: '8d4+8' },
    value: 500 
  },
  antitoxin: { 
    name: 'Antitoxin', 
    type: 'potion', 
    rarity: 'common',
    description: 'Grants advantage on saves vs poison for 1 hour.',
    effect: { type: 'buff', condition: 'poison_advantage', duration: '1 hour' },
    value: 50 
  },
  oil_of_slipperiness: {
    name: 'Oil of Slipperiness',
    type: 'potion',
    rarity: 'uncommon',
    description: 'Coat yourself to gain Freedom of Movement for 8 hours.',
    effect: { type: 'buff', condition: 'freedom_of_movement', duration: '8 hours' },
    value: 200
  },
  potion_land_breathing: {
    name: 'Potion of Land Breathing',
    type: 'potion',
    rarity: 'uncommon',
    description: 'Survive in the cursed dry air above the waves for 1 hour. Essential for shipwreck exploration.',
    effect: { type: 'buff', condition: 'land_breathing', duration: '1 hour' },
    value: 180
  },
  
  // === SCROLLS ===
  scroll_cure_wounds: {
    name: 'Scroll of Cure Wounds',
    type: 'scroll',
    rarity: 'common',
    spellLevel: 1,
    description: 'A single-use spell scroll. Heals 1d8 + spellcasting mod HP.',
    spell: 'cure_wounds',
    value: 25
  },
  scroll_shield: {
    name: 'Scroll of Shield',
    type: 'scroll',
    rarity: 'common',
    spellLevel: 1,
    description: '+5 AC as a reaction until your next turn.',
    spell: 'shield',
    value: 25
  },
  scroll_magic_missile: {
    name: 'Scroll of Magic Missile',
    type: 'scroll',
    rarity: 'common',
    spellLevel: 1,
    description: 'Three darts of magical force. 1d4+1 damage each, auto-hit.',
    spell: 'magic_missile',
    value: 25
  },
  scroll_identify: {
    name: 'Scroll of Identify',
    type: 'scroll',
    rarity: 'common',
    spellLevel: 1,
    description: 'Learn the properties of a magic item.',
    spell: 'identify',
    value: 25
  },
  scroll_lesser_restoration: {
    name: 'Scroll of Lesser Restoration',
    type: 'scroll',
    rarity: 'uncommon',
    spellLevel: 2,
    description: 'End one disease or condition: blinded, deafened, paralyzed, or poisoned.',
    spell: 'lesser_restoration',
    value: 75
  },
  scroll_invisibility: {
    name: 'Scroll of Invisibility',
    type: 'scroll',
    rarity: 'uncommon',
    spellLevel: 2,
    description: 'Become invisible for up to 1 hour.',
    spell: 'invisibility',
    value: 120
  },
  scroll_depth_charge: {
    name: 'Scroll of Depth Charge',
    type: 'scroll',
    rarity: 'rare',
    spellLevel: 3,
    description: '8d6 fire damage in a 20ft radius. The water flash-boils in a devastating explosion.',
    spell: 'depthCharge',
    value: 300
  },
  
  // === ADVENTURING SUPPLIES ===
  torch: {
    name: 'Bioluminescent Torch',
    type: 'gear',
    description: 'Glows for 1 hour, 20ft bright light.',
    value: 1
  },
  rope_50ft: {
    name: 'Kelp Rope (50ft)',
    type: 'gear',
    description: 'Strong woven kelp rope. 50 feet.',
    value: 1
  },
  rations: {
    name: 'Rations (1 day)',
    type: 'gear',
    description: 'Dried kelp, salted fish, and algae cakes.',
    value: 0.5
  },
  healers_kit: {
    name: "Healer's Kit",
    type: 'gear',
    description: '10 uses. Stabilize a creature at 0 HP without a Medicine check.',
    uses: 10,
    value: 5
  },
  caltrops: {
    name: 'Sea Urchin Caltrops',
    type: 'gear',
    description: 'Cover a 5ft square. Creatures must save or take 1 piercing and stop.',
    value: 1
  },
  grappling_hook: {
    name: 'Anchor Hook',
    type: 'gear',
    description: 'A sturdy hook for climbing.',
    value: 2
  },
  lantern: {
    name: 'Angler Lantern',
    type: 'gear',
    description: 'Bright light 30ft, dim 30ft more. Burns oil.',
    value: 5
  },
  oil_flask: {
    name: 'Oil Flask',
    type: 'gear',
    description: 'Fuel for lanterns, or splash on enemies and ignite.',
    value: 0.5
  },
  
  // === SPECIAL ITEMS (from drops/quests) ===
  crab_shell_shield: {
    name: 'Giant Crab Shell Shield',
    type: 'shield',
    rarity: 'common',
    acBonus: 2,
    description: 'A shield carved from a giant crab\'s carapace.',
    value: 25
  },
  
  // === RESURRECTION & ACHIEVEMENT ITEMS ===
  resurrection_voucher: {
    name: 'Resurrection Voucher',
    type: 'voucher',
    rarity: 'legendary',
    description: 'A golden token blessed by the Ocean Mother. Allows resurrection with no XP penalty. Earned through achievements.',
    value: 0,
    soulbound: true
  }
};

// ============================================================================
// STAT CALCULATIONS (5e RAW)
// ============================================================================

function getModifier(score) {
  return Math.floor((score - 10) / 2);
}

function calculateAC(character, equipment) {
  let baseAC = 10;
  const dexMod = getModifier(character.dex);
  
  // Find equipped armor
  const armor = equipment.find(e => e.equipped && e.slot === 'armor');
  const shield = equipment.find(e => e.equipped && e.slot === 'off_hand' && ITEMS[e.item_id]?.type === 'shield');
  
  if (armor) {
    const armorData = ITEMS[armor.item_id];
    if (armorData) {
      if (armorData.armorType === 'light') {
        baseAC = armorData.ac + dexMod;
      } else if (armorData.armorType === 'medium') {
        baseAC = armorData.ac + Math.min(dexMod, armorData.maxDex || 2);
      } else if (armorData.armorType === 'heavy') {
        baseAC = armorData.ac;
      }
    }
  } else {
    // Unarmored
    baseAC = 10 + dexMod;
  }
  
  if (shield) {
    const shieldData = ITEMS[shield.item_id];
    baseAC += shieldData?.acBonus || 2;
  }
  
  return baseAC;
}

function calculateHP(classKey, level, conMod) {
  const classData = CLASSES[classKey];
  if (!classData) return 10;
  
  // Level 1: max hit die + CON mod
  // Level 2+: average (rounded up) + CON mod per level
  const hitDie = classData.hitDie;
  let hp = hitDie + conMod; // Level 1
  
  for (let i = 2; i <= level; i++) {
    hp += Math.ceil(hitDie / 2) + 1 + conMod; // Average + CON
  }
  
  // Slipper Lobster (Dwarf) gets +1 HP per level
  // Handle this in the character creation
  
  return Math.max(hp, 1);
}

function rollStats() {
  // 4d6 drop lowest for each stat
  const stats = {};
  const statNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  
  for (const stat of statNames) {
    const rolls = Array(4).fill(0).map(() => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    stats[stat] = rolls[0] + rolls[1] + rolls[2]; // Drop lowest
  }
  
  return stats;
}

function pointBuyStats(allocation) {
  // Standard point buy: 27 points, stats start at 8
  // Cost: 8-13 = 1pt each, 14-15 = 2pts each
  // MUST spend exactly 27 points - no hoarding!
  const stats = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
  
  // Cost to reach a score from 8
  const costTable = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  
  let totalCost = 0;
  
  for (const [stat, value] of Object.entries(allocation)) {
    if (stats[stat] === undefined) continue;
    if (value < 8 || value > 15) {
      return { error: `${stat} must be between 8 and 15` };
    }
    stats[stat] = value;
    totalCost += costTable[value] || 0;
  }
  
  // Enforce exactly 27 points spent
  if (totalCost !== 27) {
    return { 
      error: `Must spend exactly 27 points. You spent ${totalCost}.`,
      pointsSpent: totalCost,
      pointsRequired: 27
    };
  }
  
  return stats;
}

function standardArray() {
  return { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
}

// ============================================================================
// DATABASE INITIALIZATION
// ============================================================================

function initCharacterDB(db) {
  // Clawd characters table (separate from old campaign characters)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clawds (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      race TEXT NOT NULL,
      class TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      
      str INTEGER NOT NULL,
      dex INTEGER NOT NULL,
      con INTEGER NOT NULL,
      int INTEGER NOT NULL,
      wis INTEGER NOT NULL,
      cha INTEGER NOT NULL,
      
      hp_current INTEGER NOT NULL,
      hp_max INTEGER NOT NULL,
      temp_hp INTEGER DEFAULT 0,
      ac INTEGER NOT NULL,
      
      usdc_balance REAL DEFAULT 0,
      
      current_zone TEXT DEFAULT 'briny_flagon',
      
      proficiency_bonus INTEGER DEFAULT 2,
      speed INTEGER DEFAULT 30,
      
      death_saves_success INTEGER DEFAULT 0,
      death_saves_fail INTEGER DEFAULT 0,
      
      status TEXT DEFAULT 'alive',
      religion TEXT DEFAULT 'none',
      
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add status column if missing (for existing DBs)
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN status TEXT DEFAULT 'alive'`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add religion column if missing (for existing DBs)
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN religion TEXT DEFAULT 'none'`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add spell_slots column if missing (for existing DBs)
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN spell_slots TEXT DEFAULT '{}'`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add personality column for AI roleplay (JSON: {courage, greed, trust, conflict, morality})
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN personality TEXT DEFAULT '{}'`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add last_recall for hub teleport cooldown
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN last_recall INTEGER DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Add speaking_style column for AI dialogue generation
  try {
    db.exec(`ALTER TABLE clawds ADD COLUMN speaking_style TEXT DEFAULT ''`);
  } catch (e) {
    // Column already exists, ignore
  }
  
  // Inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_inventory (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      equipped INTEGER DEFAULT 0,
      slot TEXT,
      FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
    )
  `);
  
  // Skills/proficiencies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_proficiencies (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      proficiency_type TEXT NOT NULL,
      proficiency_name TEXT NOT NULL,
      expertise INTEGER DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
    )
  `);
  
  // Features table (racial + class features)
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_features (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      source TEXT NOT NULL,
      description TEXT,
      uses_max INTEGER,
      uses_current INTEGER,
      FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
    )
  `);
  
  // Cosmetics table (equipped visual effects)
  db.exec(`
    CREATE TABLE IF NOT EXISTS character_cosmetics (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL UNIQUE,
      shell_effect TEXT,
      claw_effect TEXT,
      trail_effect TEXT,
      title TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
    )
  `);
  
  console.log('🦞 Character database initialized');
}

// ============================================================================
// CHARACTER CLASS
// ============================================================================

class CharacterManager {
  constructor(db) {
    this.db = db;
    initCharacterDB(db);
  }
  
  // Get all race options
  getRaces() {
    return Object.entries(RACES).map(([key, race]) => ({
      id: key,
      name: race.name,
      baseRace: race.baseRace,
      description: race.description,
      traits: race.traits,
      statBonuses: race.statBonuses,
      size: race.size,
      speed: race.speed
    }));
  }
  
  // Get all class options
  getClasses() {
    return Object.entries(CLASSES).map(([key, cls]) => ({
      id: key,
      name: cls.name,
      seaName: cls.seaName,
      description: cls.description,
      hitDie: cls.hitDie,
      primaryStat: cls.primaryStat,
      saveProficiencies: cls.saveProficiencies,
      skillChoices: cls.skillChoices,
      numSkills: cls.numSkills
    }));
  }
  
  // Create a new character
  createCharacter(agentId, options) {
    const {
      name,
      race,
      characterClass,
      stats,
      statMethod = 'pointbuy', // Only point buy allowed
      skillChoices = [],
      religion = 'none',
      personality = {},
      speakingStyle = ''
    } = options;
    
    // Validate religion
    if (!RELIGIONS[religion]) {
      return { 
        success: false, 
        error: `Invalid religion: ${religion}`,
        availableReligions: Object.keys(RELIGIONS).map(r => ({
          id: r,
          name: RELIGIONS[r].name,
          blessing: RELIGIONS[r].blessing
        }))
      };
    }
    
    // Validate race
    const raceData = RACES[race];
    if (!raceData) {
      return { success: false, error: `Invalid race: ${race}` };
    }
    
    // Validate class
    const classData = CLASSES[characterClass];
    if (!classData) {
      return { success: false, error: `Invalid class: ${characterClass}` };
    }
    
    // Check if agent already has a character
    const existing = this.db.prepare('SELECT id FROM clawds WHERE agent_id = ?').get(agentId);
    if (existing) {
      return { success: false, error: 'You already have a character. Delete it first to create a new one.' };
    }
    
    // Calculate stats
    let baseStats;
    // Point buy only - no rolling allowed, must spend exactly 27 points
    if (!stats) {
      return { success: false, error: 'stats required. Point buy: 27 points, all start at 8. Cost: 8-13=1pt, 14-15=2pt. Must spend ALL 27 points. Example: {str:15, dex:14, con:13, int:12, wis:10, cha:8}' };
    }
    
    baseStats = pointBuyStats(stats);
    
    // Check for point buy validation error
    if (baseStats.error) {
      return { success: false, error: baseStats.error, pointsSpent: baseStats.pointsSpent, pointsRequired: 27 };
    }
    
    // Validate skills - must pick exactly the required number
    const numSkillsRequired = classData.numSkills || 2;
    if (!skillChoices || skillChoices.length !== numSkillsRequired) {
      return { 
        success: false, 
        error: `Must choose exactly ${numSkillsRequired} skills for ${classData.name}`,
        availableSkills: classData.skillChoices,
        required: numSkillsRequired,
        provided: skillChoices?.length || 0
      };
    }
    
    // Validate chosen skills are valid options
    for (const skill of skillChoices) {
      if (!classData.skillChoices.includes(skill)) {
        return {
          success: false,
          error: `Invalid skill: ${skill}. Must choose from class skill list.`,
          availableSkills: classData.skillChoices
        };
      }
    }
    
    // Apply racial bonuses
    const finalStats = { ...baseStats };
    for (const [stat, bonus] of Object.entries(raceData.statBonuses)) {
      finalStats[stat] = (finalStats[stat] || 10) + bonus;
    }
    
    // Calculate derived stats
    const conMod = getModifier(finalStats.con);
    const dexMod = getModifier(finalStats.dex);
    const hpMax = calculateHP(characterClass, 1, conMod);
    
    // Slipper Lobster (Dwarf) bonus HP
    const hpBonus = raceData.features.includes('hp_bonus') ? 1 : 0;
    const finalHpMax = hpMax + hpBonus;
    
    // Create character
    const characterId = crypto.randomUUID();
    
    // Validate personality traits
    const validTraits = {
      courage: ['brave', 'cautious', 'reckless'],
      greed: ['greedy', 'generous', 'practical'],
      trust: ['trusting', 'suspicious', 'neutral'],
      conflict: ['aggressive', 'diplomatic', 'cunning'],
      morality: ['honorable', 'pragmatic', 'ruthless']
    };
    
    const validatedPersonality = {};
    for (const [trait, value] of Object.entries(personality || {})) {
      if (validTraits[trait] && validTraits[trait].includes(value)) {
        validatedPersonality[trait] = value;
      }
    }
    
    try {
      this.db.prepare(`
        INSERT INTO clawds (
          id, agent_id, name, race, class,
          str, dex, con, int, wis, cha,
          hp_current, hp_max, ac, speed, religion,
          personality, speaking_style, usdc_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(
        characterId, agentId, name, race, characterClass,
        finalStats.str, finalStats.dex, finalStats.con, 
        finalStats.int, finalStats.wis, finalStats.cha,
        finalHpMax, finalHpMax, 10 + dexMod,
        raceData.speed, religion,
        JSON.stringify(validatedPersonality), speakingStyle || ''
      );
      
      // Add starting equipment
      for (const equip of classData.startingEquipment) {
        const itemId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          itemId, characterId, equip.item,
          equip.quantity || 1,
          equip.equipped ? 1 : 0,
          equip.slot || null
        );
      }
      
      // Calculate AC with equipment
      const equipment = this.db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ?'
      ).all(characterId);
      const ac = calculateAC(finalStats, equipment);
      this.db.prepare('UPDATE clawds SET ac = ? WHERE id = ?').run(ac, characterId);
      
      // Add skill proficiencies
      for (const skill of skillChoices.slice(0, classData.numSkills)) {
        if (classData.skillChoices.includes(skill)) {
          this.db.prepare(`
            INSERT INTO character_proficiencies (id, character_id, proficiency_type, proficiency_name)
            VALUES (?, ?, 'skill', ?)
          `).run(crypto.randomUUID(), characterId, skill);
        }
      }
      
      // Add save proficiencies
      for (const save of classData.saveProficiencies) {
        this.db.prepare(`
          INSERT INTO character_proficiencies (id, character_id, proficiency_type, proficiency_name)
          VALUES (?, ?, 'save', ?)
        `).run(crypto.randomUUID(), characterId, save);
      }
      
      // Add racial features
      for (const feature of raceData.features) {
        this.db.prepare(`
          INSERT INTO character_features (id, character_id, feature_name, source)
          VALUES (?, ?, ?, ?)
        `).run(crypto.randomUUID(), characterId, feature, 'race:' + raceData.name);
      }
      
      // Add level 1 class features
      const level1Features = classData.features[1] || [];
      for (const feature of level1Features) {
        this.db.prepare(`
          INSERT INTO character_features (id, character_id, feature_name, source)
          VALUES (?, ?, ?, ?)
        `).run(crypto.randomUUID(), characterId, feature, 'class:' + classData.name);
      }
      
      return {
        success: true,
        character: this.getCharacter(characterId)
      };
      
    } catch (err) {
      console.error('Character creation error:', err);
      return { success: false, error: 'Failed to create character' };
    }
  }
  
  // Get character by ID
  getCharacter(characterId) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return null;
    
    return this._buildCharacterSheet(char);
  }
  
  // Get character by agent ID
  getCharacterByAgent(agentId) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE agent_id = ?').get(agentId);
    if (!char) return null;
    
    return this._buildCharacterSheet(char);
  }
  
  // Build full character sheet
  _buildCharacterSheet(char) {
    const raceData = RACES[char.race];
    const classData = CLASSES[char.class];
    
    // Get inventory
    const inventory = this.db.prepare(
      'SELECT * FROM character_inventory WHERE character_id = ?'
    ).all(char.id).map(inv => ({
      ...inv,
      item: ITEMS[inv.item_id] || { name: inv.item_id, type: 'unknown' }
    }));
    
    // Get proficiencies
    const proficiencies = this.db.prepare(
      'SELECT * FROM character_proficiencies WHERE character_id = ?'
    ).all(char.id);
    
    // Get features
    const features = this.db.prepare(
      'SELECT * FROM character_features WHERE character_id = ?'
    ).all(char.id);
    
    // Calculate modifiers
    const mods = {
      str: getModifier(char.str),
      dex: getModifier(char.dex),
      con: getModifier(char.con),
      int: getModifier(char.int),
      wis: getModifier(char.wis),
      cha: getModifier(char.cha)
    };
    
    // Proficiency bonus by level
    const profBonus = Math.ceil(1 + char.level / 4);
    
    return {
      id: char.id,
      name: char.name,
      race: {
        id: char.race,
        name: raceData?.name || char.race,
        traits: raceData?.traits || []
      },
      class: {
        id: char.class,
        name: classData?.name || char.class,
        seaName: classData?.seaName || char.class,
        hitDie: classData?.hitDie || 8
      },
      level: char.level,
      xp: char.xp,
      xpToNext: this._xpForLevel(char.level + 1),
      
      stats: {
        str: { score: char.str, mod: mods.str },
        dex: { score: char.dex, mod: mods.dex },
        con: { score: char.con, mod: mods.con },
        int: { score: char.int, mod: mods.int },
        wis: { score: char.wis, mod: mods.wis },
        cha: { score: char.cha, mod: mods.cha }
      },
      
      hp: {
        current: char.hp_current,
        max: char.hp_max,
        temp: char.temp_hp
      },
      
      ac: char.ac,
      speed: char.speed,
      proficiencyBonus: profBonus,
      
      currency: {
        usdc: char.usdc_balance || 0
      },
      
      location: char.current_zone,
      
      religion: {
        id: char.religion || 'none',
        name: RELIGIONS[char.religion]?.name || 'No Religion',
        blessing: RELIGIONS[char.religion]?.blessing || '+0.01% bonus USDC'
      },
      
      deathSaves: {
        successes: char.death_saves_success,
        failures: char.death_saves_fail
      },
      
      inventory,
      proficiencies: {
        skills: proficiencies.filter(p => p.proficiency_type === 'skill').map(p => p.proficiency_name),
        saves: proficiencies.filter(p => p.proficiency_type === 'save').map(p => p.proficiency_name),
        armor: classData?.armorProficiencies || [],
        weapons: classData?.weaponProficiencies || []
      },
      features: features.map(f => ({ name: f.feature_name, source: f.source })),
      
      cosmetics: this._getCosmetics(char.id),
      
      createdAt: char.created_at,
      updatedAt: char.updated_at
    };
  }
  
  // Get equipped cosmetics
  _getCosmetics(characterId) {
    const row = this.db.prepare(
      'SELECT * FROM character_cosmetics WHERE character_id = ?'
    ).get(characterId);
    
    if (!row) {
      return { shell: null, claws: null, trail: null, title: null };
    }
    
    // Enrich with item details
    const getItemInfo = (itemId) => {
      if (!itemId) return null;
      const item = ITEMS[itemId];
      return item ? { id: itemId, name: item.name, rarity: item.rarity } : null;
    };
    
    return {
      shell: getItemInfo(row.shell_effect),
      claws: getItemInfo(row.claw_effect),
      trail: getItemInfo(row.trail_effect),
      title: getItemInfo(row.title)
    };
  }
  
  // Equip a cosmetic item
  equipCosmetic(characterId, itemId) {
    const item = ITEMS[itemId];
    if (!item) return { success: false, error: 'Item not found' };
    if (item.type !== 'cosmetic' && item.type !== 'title') {
      return { success: false, error: 'Item is not a cosmetic' };
    }
    
    // Check if player owns this item
    const owned = this.db.prepare(
      'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
    ).get(characterId, itemId);
    
    if (!owned) {
      return { success: false, error: 'You don\'t own this cosmetic' };
    }
    
    // Determine which slot
    let slot;
    if (item.type === 'title') {
      slot = 'title';
    } else {
      slot = item.slot; // 'shell', 'claws', 'trail'
    }
    
    const columnMap = {
      shell: 'shell_effect',
      claws: 'claw_effect',
      trail: 'trail_effect',
      title: 'title'
    };
    
    const column = columnMap[slot];
    if (!column) return { success: false, error: 'Unknown cosmetic slot' };
    
    // Upsert cosmetics row
    const existing = this.db.prepare(
      'SELECT * FROM character_cosmetics WHERE character_id = ?'
    ).get(characterId);
    
    if (existing) {
      this.db.prepare(`
        UPDATE character_cosmetics SET ${column} = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE character_id = ?
      `).run(itemId, characterId);
    } else {
      this.db.prepare(`
        INSERT INTO character_cosmetics (id, character_id, ${column})
        VALUES (?, ?, ?)
      `).run(crypto.randomUUID(), characterId, itemId);
    }
    
    return { 
      success: true, 
      equipped: { slot, item: { id: itemId, name: item.name } },
      message: `Equipped ${item.name} to ${slot} slot!`
    };
  }
  
  // Unequip a cosmetic slot
  unequipCosmetic(characterId, slot) {
    const columnMap = {
      shell: 'shell_effect',
      claws: 'claw_effect',
      trail: 'trail_effect',
      title: 'title'
    };
    
    const column = columnMap[slot];
    if (!column) return { success: false, error: 'Unknown cosmetic slot' };
    
    this.db.prepare(`
      UPDATE character_cosmetics SET ${column} = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE character_id = ?
    `).run(characterId);
    
    return { success: true, message: `Unequipped ${slot} cosmetic` };
  }
  
  // XP thresholds (5e)
  _xpForLevel(level) {
    const thresholds = {
      1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
      6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
      11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
      16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000
    };
    return thresholds[level] || 999999;
  }
  
  // Add XP and check for level up
  addXP(characterId, amount) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    const newXP = char.xp + amount;
    let newLevel = char.level;
    
    // Check for level ups
    while (newLevel < 20 && newXP >= this._xpForLevel(newLevel + 1)) {
      newLevel++;
    }
    
    const leveledUp = newLevel > char.level;
    
    if (leveledUp) {
      // Calculate new HP
      const classData = CLASSES[char.class];
      const conMod = getModifier(char.con);
      const hpGain = Math.ceil(classData.hitDie / 2) + 1 + conMod;
      const newHpMax = char.hp_max + hpGain * (newLevel - char.level);
      const newProfBonus = Math.ceil(1 + newLevel / 4);
      
      this.db.prepare(`
        UPDATE clawds SET xp = ?, level = ?, hp_max = ?, hp_current = hp_current + ?, 
        proficiency_bonus = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newXP, newLevel, newHpMax, hpGain * (newLevel - char.level), newProfBonus, characterId);
      
      // Add new class features
      for (let lvl = char.level + 1; lvl <= newLevel; lvl++) {
        const features = classData.features[lvl] || [];
        for (const feature of features) {
          this.db.prepare(`
            INSERT INTO character_features (id, character_id, feature_name, source)
            VALUES (?, ?, ?, 'class')
          `).run(crypto.randomUUID(), characterId, feature, classData.name);
        }
      }
    } else {
      this.db.prepare('UPDATE clawds SET xp = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newXP, characterId);
    }
    
    return {
      success: true,
      xpGained: amount,
      totalXP: newXP,
      leveledUp,
      newLevel,
      character: this.getCharacter(characterId)
    };
  }
  
  // Update HP (damage or healing)
  updateHP(characterId, amount) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    let newHP = Math.max(0, Math.min(char.hp_max, char.hp_current + amount));
    
    this.db.prepare('UPDATE clawds SET hp_current = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newHP, characterId);
    
    return {
      success: true,
      previousHP: char.hp_current,
      currentHP: newHP,
      maxHP: char.hp_max,
      change: amount,
      unconscious: newHP === 0
    };
  }
  
  // Delete character
  deleteCharacter(agentId) {
    const char = this.db.prepare('SELECT id FROM clawds WHERE agent_id = ?').get(agentId);
    if (!char) return { success: false, error: 'No character found' };
    
    this.db.prepare('DELETE FROM clawds WHERE id = ?').run(char.id);
    return { success: true, message: 'Character deleted' };
  }
  
  // Move character to zone
  moveToZone(characterId, zoneId) {
    this.db.prepare('UPDATE clawds SET current_zone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(zoneId, characterId);
    return { success: true, zone: zoneId };
  }
  
  // Update currency
  updateCurrency(characterId, currency, amount) {
    // USDC is the only currency now
    if (currency !== 'usdc') {
      return { success: false, error: 'Invalid currency. Use "usdc".' };
    }
    
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    const currentBalance = char.usdc_balance || 0;
    const newAmount = currentBalance + amount;
    if (newAmount < 0) return { success: false, error: 'Insufficient USDC' };
    
    this.db.prepare('UPDATE clawds SET usdc_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newAmount, characterId);
    
    return { success: true, currency: 'usdc', previousAmount: currentBalance, newAmount };
  }
  
  /**
   * Teleport character to hub (The Briny Flagon)
   * Used by recall command
   */
  recallToHub(characterId) {
    const now = Date.now();
    
    try {
      // Update current_zone (which maps to location in the API response)
      this.db.prepare(`
        UPDATE clawds 
        SET current_zone = 'briny_flagon', last_recall = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(now, characterId);
      
      return { success: true };
    } catch (err) {
      console.error('recallToHub error:', err);
      return { success: false, error: 'Failed to recall' };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CharacterManager,
  RACES,
  CLASSES,
  ITEMS,
  RELIGIONS,
  getModifier,
  calculateAC,
  calculateHP,
  rollStats,
  pointBuyStats,
  standardArray
};
