/**
 * Clawds & Caverns - Monster Definitions
 * 
 * All the creatures that want to eat you. 🦀
 */

// Global difficulty scale (1.0 = normal, 0.5 = half difficulty)
// Adjust this to make monsters easier/harder
const DIFFICULTY_SCALE = 0.4;  // 40% of normal - much easier for economy testing

// XP by Challenge Rating (5e)
const CR_XP = {
  0: 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900
};

// ============================================================================
// MONSTER DEFINITIONS
// ============================================================================

const MONSTERS = {
  
  // === KELP FOREST (CR 1/8 - 1) ===
  
  giant_crab: {
    id: 'giant_crab',
    name: 'Giant Crab',
    description: 'A massive crustacean with claws that can crush shell and bone alike.',
    cr: '1/8',
    type: 'beast',
    size: 'medium',
    
    stats: {
      hp: 13,
      ac: 15,
      speed: 30,
      str: 13, dex: 15, con: 11, int: 1, wis: 9, cha: 3
    },
    
    attacks: [
      { 
        name: 'Claw', 
        type: 'melee',
        hit: 3, 
        damage: '1d6+1', 
        damageType: 'bludgeoning',
        range: 1, // 1 hex = 5ft melee
        description: 'Snaps with a massive claw'
      }
    ],
    
    // AI behavior for tactical combat
    aiBehavior: 'aggressive',
    attackRange: 1,
    preferRanged: false,
    
    abilities: ['amphibious', 'blindsight_30'],
    
    behavior: 'aggressive',
    
    loot: [
      { itemId: 'crab_shell_shield', chance: 0.05, quantity: 1 },
      { itemId: 'rations', chance: 0.3, quantity: [1, 3] }  // crab meat!
    ],
    
    pearls: [1, 5]  // drops 1-5 pearls
  },
  
  kelp_lurker: {
    id: 'kelp_lurker',
    name: 'Kelp Lurker',
    description: 'A serpentine predator that hides among the kelp fronds, waiting to ambush prey.',
    cr: '1/4',
    type: 'beast',
    size: 'medium',
    
    stats: {
      hp: 16,
      ac: 12,
      speed: 40,
      str: 14, dex: 14, con: 12, int: 2, wis: 10, cha: 4
    },
    
    attacks: [
      { 
        name: 'Bite', 
        type: 'melee',
        hit: 4, 
        damage: '1d8+2', 
        damageType: 'piercing',
        description: 'Lunges from the kelp with razor teeth'
      },
      {
        name: 'Constrict',
        type: 'melee',
        hit: 4,
        damage: '1d6+2',
        damageType: 'bludgeoning',
        description: 'Wraps around and squeezes',
        special: 'grapple'
      }
    ],
    
    abilities: ['ambush', 'stealth_+4'],
    
    behavior: 'ambusher',
    
    loot: [
      { itemId: 'dagger', chance: 0.02, quantity: 1 },  // found in stomach
      { itemId: 'pearls', chance: 0.2, quantity: [2, 8] }
    ],
    
    pearls: [2, 8]
  },
  
  hostile_fish_swarm: {
    id: 'hostile_fish_swarm',
    name: 'Razorfin Swarm',
    description: 'A churning mass of small fish with razor-sharp fins. Individually harmless, together deadly.',
    cr: '1/2',
    type: 'swarm',
    size: 'medium',
    
    stats: {
      hp: 28,
      ac: 13,
      speed: 40,
      str: 6, dex: 16, con: 9, int: 1, wis: 7, cha: 2
    },
    
    attacks: [
      { 
        name: 'Bites', 
        type: 'melee',
        hit: 5, 
        damage: '2d6', 
        damageType: 'piercing',
        description: 'Hundreds of tiny bites',
        special: 'half_damage_below_half_hp'
      }
    ],
    
    abilities: ['swarm', 'blood_frenzy'],
    resistances: ['bludgeoning', 'piercing', 'slashing'],
    immunities: ['charmed', 'frightened', 'grappled', 'paralyzed', 'prone', 'stunned'],
    
    behavior: 'aggressive',
    
    loot: [
      { itemId: 'rations', chance: 0.5, quantity: [2, 5] }
    ],
    
    pearls: [3, 10]
  },
  
  reef_shark: {
    id: 'reef_shark',
    name: 'Reef Shark',
    description: 'A sleek predator patrolling its territory. It circles before striking.',
    cr: '1/2',
    type: 'beast',
    size: 'medium',
    
    stats: {
      hp: 22,
      ac: 12,
      speed: 40,
      str: 14, dex: 13, con: 13, int: 1, wis: 10, cha: 4
    },
    
    attacks: [
      { 
        name: 'Bite', 
        type: 'melee',
        hit: 4, 
        damage: '1d8+2', 
        damageType: 'piercing',
        range: 1,
        description: 'Rows of serrated teeth'
      }
    ],
    
    aiBehavior: 'berserker', // Sharks rush in
    attackRange: 1,
    preferRanged: false,
    
    abilities: ['blood_frenzy', 'pack_tactics'],
    
    behavior: 'territorial',
    
    loot: [
      { itemId: 'dagger', chance: 0.05, quantity: 1 },  // shark tooth dagger
      { itemId: 'potion_healing', chance: 0.02, quantity: 1 }  // found in stomach
    ],
    
    pearls: [3, 12]
  },
  
  // === RANGED ENEMIES ===
  
  sahuagin_crossbowman: {
    id: 'sahuagin_crossbowman',
    name: 'Sahuagin Crossbowman',
    description: 'A fish-like humanoid wielding a waterproof crossbow. It prefers to attack from cover.',
    cr: '1/2',
    type: 'humanoid',
    size: 'medium',
    
    stats: {
      hp: 18,
      ac: 12,
      speed: 30,
      str: 11, dex: 14, con: 12, int: 10, wis: 10, cha: 9
    },
    
    attacks: [
      { 
        name: 'Light Crossbow', 
        type: 'ranged',
        hit: 4, 
        damage: '1d8+2', 
        damageType: 'piercing',
        range: { normal: 16, long: 64 }, // 80/320 ft
        description: 'A bolt zips through the water'
      },
      {
        name: 'Claws',
        type: 'melee',
        hit: 2,
        damage: '1d4',
        damageType: 'slashing',
        range: 1,
        description: 'Sharp clawed hands'
      }
    ],
    
    aiBehavior: 'ranged', // Keep distance, kite
    attackRange: 16, // Max effective range in hexes
    preferRanged: true,
    preferredRange: 10, // Ideal distance to maintain
    
    abilities: ['blood_frenzy'],
    
    behavior: 'ranged',
    
    loot: [
      { itemId: 'lightCrossbow', chance: 0.1, quantity: 1 },
      { itemId: 'bolt', chance: 0.5, quantity: [5, 10] }
    ],
    
    pearls: [5, 15]
  },
  
  deep_archer: {
    id: 'deep_archer',
    name: 'Deep Archer',
    description: 'An elven ghost, forever guarding the sunken treasures. Its spectral arrows pierce both body and soul.',
    cr: 2,
    type: 'undead',
    size: 'medium',
    
    stats: {
      hp: 32,
      ac: 14,
      speed: 30,
      str: 10, dex: 16, con: 10, int: 12, wis: 14, cha: 8
    },
    
    attacks: [
      { 
        name: 'Spectral Longbow', 
        type: 'ranged',
        hit: 5, 
        damage: '1d8+3', 
        damageType: 'necrotic',
        range: { normal: 30, long: 120 }, // 150/600 ft
        description: 'A ghostly arrow that chills to the bone'
      },
      {
        name: 'Ethereal Dagger',
        type: 'melee',
        hit: 3,
        damage: '1d4+1',
        damageType: 'necrotic',
        range: 1,
        description: 'A last-resort ghostly blade'
      }
    ],
    
    aiBehavior: 'ranged',
    attackRange: 30,
    preferRanged: true,
    preferredRange: 15,
    
    abilities: ['incorporeal_movement'],
    resistances: ['bludgeoning', 'piercing', 'slashing'],
    immunities: ['poison', 'exhaustion'],
    
    behavior: 'ranged',
    
    loot: [
      { itemId: 'potion_healing', chance: 0.2, quantity: 1 },
      { itemId: 'scroll_shield', chance: 0.1, quantity: 1 }
    ],
    
    pearls: [15, 30]
  },
  
  spellcasting_eel: {
    id: 'spellcasting_eel',
    name: 'Voltaic Eel',
    description: 'An enormous eel crackling with arcane lightning. It can unleash devastating electrical attacks.',
    cr: 2,
    type: 'beast',
    size: 'large',
    
    stats: {
      hp: 38,
      ac: 13,
      speed: 40,
      str: 14, dex: 14, con: 14, int: 6, wis: 12, cha: 8
    },
    
    attacks: [
      { 
        name: 'Bite', 
        type: 'melee',
        hit: 4, 
        damage: '1d10+2', 
        damageType: 'piercing',
        range: 1,
        description: 'Razor-sharp teeth'
      },
      {
        name: 'Lightning Bolt',
        type: 'spell',
        hit: null, // Save-based
        saveDC: 13,
        saveType: 'DEX',
        damage: '3d6',
        damageType: 'lightning',
        range: 12, // 60 ft
        description: 'A bolt of lightning arcs from the eel'
      }
    ],
    
    // Has both melee and ranged capability
    aiBehavior: 'ranged', // Prefers to stay at range and zap
    attackRange: 12,
    preferRanged: true,
    preferredRange: 8,
    spellcaster: true,
    cantrips: ['electricTouch'],
    spells: ['electricTorrent'],
    spellSlots: { 2: 2 },
    spellcastingMod: 2,
    
    abilities: ['amphibious', 'lightning_immunity'],
    immunities: ['lightning'],
    
    behavior: 'ranged',
    
    loot: [
      { itemId: 'potion_lightning_resistance', chance: 0.15, quantity: 1 },
      { itemId: 'rations', chance: 0.3, quantity: [2, 4] }
    ],
    
    pearls: [20, 40]
  },
  
  // === KELP FOREST BOSS ===
  
  king_crab: {
    id: 'king_crab',
    name: 'King Crab',
    description: 'An enormous crab the size of a small boat. Its shell is encrusted with barnacles and old weapons from those who failed to slay it.',
    cr: 2,
    type: 'beast',
    size: 'large',
    isBoss: true,
    
    stats: {
      hp: 52,
      ac: 17,
      speed: 25,
      str: 18, dex: 10, con: 16, int: 3, wis: 11, cha: 4
    },
    
    attacks: [
      { 
        name: 'Crushing Claw', 
        type: 'melee',
        hit: 6, 
        damage: '2d8+4', 
        damageType: 'bludgeoning',
        description: 'A claw the size of a lobster'
      },
      {
        name: 'Claw Sweep',
        type: 'melee',
        hit: 6,
        damage: '1d10+4',
        damageType: 'bludgeoning',
        description: 'Sweeps both claws in an arc',
        special: 'hits_all_adjacent'
      }
    ],
    
    abilities: ['amphibious', 'siege_monster'],
    resistances: ['bludgeoning', 'piercing'],
    
    behavior: 'defensive',
    
    loot: [
      { itemId: 'crab_shell_shield', chance: 1.0, quantity: 1 },  // guaranteed
      { itemId: 'potion_greater_healing', chance: 0.5, quantity: 1 },
      { itemId: 'longsword', chance: 0.2, quantity: 1 }  // from previous victim
    ],
    
    pearls: [25, 50]
  },
  
  // === SHIPWRECK GRAVEYARD (CR 1-3) ===
  
  drowned_sailor: {
    id: 'drowned_sailor',
    name: 'Drowned Sailor',
    description: 'The waterlogged corpse of a surface-dweller, animated by dark currents. It still clutches its rusty cutlass.',
    cr: '1/4',
    type: 'undead',
    size: 'medium',
    
    stats: {
      hp: 22,
      ac: 11,
      speed: 20,
      str: 13, dex: 6, con: 16, int: 3, wis: 6, cha: 5
    },
    
    attacks: [
      { 
        name: 'Rusty Cutlass', 
        type: 'melee',
        hit: 3, 
        damage: '1d6+1', 
        damageType: 'slashing',
        description: 'A corroded blade still sharp enough to cut'
      }
    ],
    
    abilities: ['undead_fortitude'],
    immunities: ['poison', 'exhaustion'],
    
    behavior: 'mindless',
    
    loot: [
      { itemId: 'shortsword', chance: 0.1, quantity: 1 },
      { itemId: 'rope_50ft', chance: 0.05, quantity: 1 }
    ],
    
    pearls: [2, 6]
  },
  
  // === DREADNOUGHT DEPTHS (Capstone Quest Bosses) ===
  
  dread_horror: {
    id: 'dread_horror',
    name: 'The Dreadnought Horror',
    description: 'A massive amalgamation of every soul that died on the Dreadnought, fused into a single nightmare of bone, timber, and malice. It speaks with a thousand voices.',
    cr: 6,
    type: 'undead',
    size: 'huge',
    isBoss: true,
    
    stats: {
      hp: 150,
      ac: 15,
      speed: 20,
      str: 20, dex: 8, con: 20, int: 6, wis: 10, cha: 4
    },
    
    attacks: [
      { 
        name: 'Multiattack',
        type: 'multiattack',
        attacks: ['soul_slam', 'timber_spike']
      },
      { 
        name: 'Soul Slam', 
        type: 'melee',
        hit: 8, 
        damage: '2d10+5', 
        damageType: 'bludgeoning',
        description: 'A massive fist of fused corpses'
      },
      {
        name: 'Timber Spike',
        type: 'melee',
        hit: 8,
        damage: '2d8+5',
        damageType: 'piercing',
        description: 'A spear of cursed ship timber'
      },
      {
        name: 'Wail of the Drowned',
        type: 'special',
        hit: null,
        damage: '3d6',
        damageType: 'psychic',
        description: 'All creatures within 30ft must WIS save DC 15 or take damage and be frightened',
        recharge: '5-6'
      }
    ],
    
    abilities: ['undead_fortitude', 'split_form', 'legendary_resistance_2'],
    resistances: ['bludgeoning', 'piercing', 'slashing'],
    immunities: ['poison', 'necrotic', 'exhaustion', 'charmed', 'frightened'],
    
    behavior: 'aggressive',
    
    splitForm: {
      trigger: 'half_hp',
      description: 'At 50% HP, splits into two Horror Shards (CR 3, 45 HP each)',
      spawns: ['horror_shard', 'horror_shard']
    },
    
    loot: [
      { itemId: 'soul_gem', chance: 1.0, quantity: 1 },
      { itemId: 'potion_superior_healing', chance: 0.5, quantity: 1 },
      { itemId: 'scroll_raise_dead', chance: 0.25, quantity: 1 }
    ],
    
    pearls: [100, 200]
  },
  
  horror_shard: {
    id: 'horror_shard',
    name: 'Horror Shard',
    description: 'A fragment of the Dreadnought Horror, still animated by malevolent will.',
    cr: 3,
    type: 'undead',
    size: 'large',
    
    stats: {
      hp: 45,
      ac: 13,
      speed: 30,
      str: 16, dex: 10, con: 14, int: 3, wis: 8, cha: 3
    },
    
    attacks: [
      { 
        name: 'Rend', 
        type: 'melee',
        hit: 5, 
        damage: '2d6+3', 
        damageType: 'slashing',
        description: 'Claws of bone and timber'
      }
    ],
    
    abilities: ['undead_fortitude'],
    immunities: ['poison', 'exhaustion'],
    
    behavior: 'aggressive',
    
    loot: [],
    pearls: [10, 20]
  },
  
  cursed_anchor: {
    id: 'cursed_anchor',
    name: 'Cursed Anchor Guardian',
    description: 'The Dreadnought\'s anchor, animated by the same dark magic that cursed the ship. Its chains reach out hungrily for souls.',
    cr: 4,
    type: 'construct',
    size: 'large',
    isBoss: true,
    
    stats: {
      hp: 75,
      ac: 17,
      speed: 15,
      str: 20, dex: 6, con: 18, int: 3, wis: 10, cha: 1
    },
    
    attacks: [
      { 
        name: 'Anchor Smash', 
        type: 'melee',
        hit: 7, 
        damage: '2d12+5', 
        damageType: 'bludgeoning',
        description: 'Slams its massive form down'
      },
      {
        name: 'Chain Lash',
        type: 'melee',
        hit: 7,
        damage: '2d6+5',
        damageType: 'bludgeoning',
        range: 20,
        description: 'Lashes out with cursed chains',
        special: 'On hit, target is grappled (escape DC 15)'
      },
      {
        name: 'Soul Pull',
        type: 'special',
        hit: null,
        description: 'Pulls all grappled creatures 15ft closer. WIS save DC 14 or take 2d8 necrotic damage.',
        recharge: '4-6'
      }
    ],
    
    abilities: ['immutable_form', 'false_appearance'],
    resistances: ['fire', 'cold'],
    immunities: ['poison', 'psychic', 'exhaustion', 'charmed', 'frightened', 'paralyzed', 'petrified'],
    vulnerabilities: ['thunder'],
    
    behavior: 'defensive',
    
    loot: [
      { itemId: 'chainmail', chance: 0.3, quantity: 1 },
      { itemId: 'cursed_chain_fragment', chance: 0.5, quantity: [1, 3] }
    ],
    
    pearls: [40, 80]
  },
  
  ghost_captain: {
    id: 'ghost_captain',
    name: 'Ghost Captain',
    description: 'A spectral officer who went down with his ship. He commands the drowned crew still.',
    cr: 3,
    type: 'undead',
    size: 'medium',
    isBoss: true,
    
    stats: {
      hp: 45,
      ac: 13,
      speed: 30,
      str: 7, dex: 16, con: 10, int: 12, wis: 14, cha: 17
    },
    
    attacks: [
      { 
        name: 'Spectral Saber', 
        type: 'melee',
        hit: 5, 
        damage: '2d6+3', 
        damageType: 'necrotic',
        description: 'A blade of ghostly light'
      },
      {
        name: 'Horrifying Visage',
        type: 'special',
        hit: null,
        damage: null,
        description: 'All creatures within 30ft must WIS save DC 13 or be frightened',
        special: 'frighten_aoe'
      }
    ],
    
    abilities: ['incorporeal_movement', 'ethereal_sight'],
    resistances: ['acid', 'fire', 'lightning', 'thunder', 'bludgeoning', 'piercing', 'slashing'],
    immunities: ['cold', 'necrotic', 'poison', 'exhaustion', 'charmed', 'grappled', 'paralyzed', 'prone'],
    
    behavior: 'commanding',
    
    loot: [
      { itemId: 'rapier', chance: 0.3, quantity: 1 },
      { itemId: 'scroll_invisibility', chance: 0.2, quantity: 1 },
      { itemId: 'potion_greater_healing', chance: 0.5, quantity: 1 }
    ],
    
    pearls: [30, 75]
  },
  
  // === THERMAL VENTS (CR 2-4) ===
  
  // === SHIPWRECK GRAVEYARD (CR 1-3) - Additional Monsters ===
  
  barnacle_horror: {
    id: 'barnacle_horror',
    name: 'Barnacle Horror',
    description: 'A humanoid mass of barnacles and rotting ship timber, animated by malevolent currents.',
    cr: 1,
    type: 'undead',
    size: 'medium',
    
    stats: {
      hp: 30,
      ac: 14,
      speed: 20,
      str: 15, dex: 8, con: 14, int: 3, wis: 8, cha: 5
    },
    
    attacks: [
      { 
        name: 'Barnacle Slam', 
        type: 'melee',
        hit: 4, 
        damage: '1d10+2', 
        damageType: 'bludgeoning',
        description: 'Covered in razor-sharp barnacles'
      }
    ],
    
    abilities: ['undead_fortitude'],
    resistances: ['bludgeoning', 'piercing'],
    immunities: ['poison', 'exhaustion'],
    
    behavior: 'aggressive',
    
    loot: [
      { itemId: 'potion_healing', chance: 0.1, quantity: 1 },
      { itemId: 'shield', chance: 0.05, quantity: 1 }
    ],
    
    pearls: [5, 15]
  },
  
  sea_wraith: {
    id: 'sea_wraith',
    name: 'Sea Wraith',
    description: 'The vengeful spirit of one who drowned in terror, now seeking to pull others into the depths.',
    cr: 2,
    type: 'undead',
    size: 'medium',
    
    stats: {
      hp: 36,
      ac: 12,
      speed: 30,
      str: 6, dex: 14, con: 11, int: 10, wis: 13, cha: 15
    },
    
    attacks: [
      { 
        name: 'Drowning Touch', 
        type: 'melee',
        hit: 4, 
        damage: '2d6+2', 
        damageType: 'necrotic',
        description: 'Fills lungs with spectral water'
      }
    ],
    
    abilities: ['incorporeal_movement', 'create_spawn'],
    resistances: ['acid', 'fire', 'lightning', 'thunder', 'bludgeoning', 'piercing', 'slashing'],
    immunities: ['cold', 'necrotic', 'poison', 'exhaustion', 'charmed', 'grappled', 'prone'],
    
    behavior: 'predatory',
    
    loot: [
      { itemId: 'scroll_shield', chance: 0.15, quantity: 1 },
      { itemId: 'potion_healing', chance: 0.2, quantity: 1 }
    ],
    
    pearls: [10, 25]
  },
  
  moray_terror: {
    id: 'moray_terror',
    name: 'Moray Terror',
    description: 'A massive eel that has made its lair in a sunken ship. Its jaws are lined with needle-like teeth.',
    cr: 2,
    type: 'beast',
    size: 'large',
    
    stats: {
      hp: 42,
      ac: 13,
      speed: 40,
      str: 16, dex: 14, con: 14, int: 2, wis: 12, cha: 4
    },
    
    attacks: [
      { 
        name: 'Bite', 
        type: 'melee',
        hit: 5, 
        damage: '2d8+3', 
        damageType: 'piercing',
        description: 'Rows of recurved teeth that grip and tear'
      }
    ],
    
    abilities: ['ambush', 'slippery'],
    
    behavior: 'ambusher',
    
    loot: [
      { itemId: 'dagger', chance: 0.1, quantity: 1 },
      { itemId: 'rations', chance: 0.3, quantity: [2, 4] }
    ],
    
    pearls: [8, 20]
  },
  
  treasure_mimic: {
    id: 'treasure_mimic',
    name: 'Treasure Mimic',
    description: 'A creature disguised as a treasure chest. Many adventurers have met their end reaching for false gold.',
    cr: 2,
    type: 'monstrosity',
    size: 'medium',
    
    stats: {
      hp: 58,
      ac: 12,
      speed: 15,
      str: 17, dex: 12, con: 15, int: 5, wis: 13, cha: 8
    },
    
    attacks: [
      { 
        name: 'Pseudopod', 
        type: 'melee',
        hit: 5, 
        damage: '1d8+3', 
        damageType: 'bludgeoning',
        description: 'Plus adhesive'
      },
      {
        name: 'Bite',
        type: 'melee',
        hit: 5,
        damage: '1d8+3',
        damageType: 'piercing',
        description: 'Rows of teeth inside the "lid"'
      }
    ],
    
    abilities: ['adhesive', 'false_appearance', 'grappler'],
    immunities: ['acid', 'prone'],
    
    behavior: 'ambusher',
    
    loot: [
      { itemId: 'potion_greater_healing', chance: 0.3, quantity: 1 },
      { itemId: 'longsword', chance: 0.2, quantity: 1 }
    ],
    
    pearls: [20, 40]
  },
  
  anchor_wight: {
    id: 'anchor_wight',
    name: 'Anchor Wight',
    description: 'A powerful undead sailor still bound to a massive anchor. It drags its burden as a weapon.',
    cr: 3,
    type: 'undead',
    size: 'medium',
    isBoss: false,
    
    stats: {
      hp: 55,
      ac: 14,
      speed: 20,
      str: 18, dex: 8, con: 16, int: 10, wis: 13, cha: 15
    },
    
    attacks: [
      { 
        name: 'Anchor Swing', 
        type: 'melee',
        hit: 6, 
        damage: '2d10+4', 
        damageType: 'bludgeoning',
        description: 'Swings the massive anchor in a crushing arc'
      },
      {
        name: 'Life Drain',
        type: 'melee',
        hit: 6,
        damage: '1d6+4',
        damageType: 'necrotic',
        description: 'Drains life force, healing the wight'
      }
    ],
    
    abilities: ['undead_fortitude', 'sunlight_sensitivity'],
    resistances: ['necrotic', 'bludgeoning', 'piercing', 'slashing'],
    immunities: ['poison', 'exhaustion'],
    
    behavior: 'aggressive',
    
    loot: [
      { itemId: 'chainmail', chance: 0.2, quantity: 1 },
      { itemId: 'potion_greater_healing', chance: 0.25, quantity: 1 }
    ],
    
    pearls: [15, 35]
  },
  
  // === THERMAL VENTS (CR 2-4) ===
  
  magma_crab: {
    id: 'magma_crab',
    name: 'Magma Crab',
    description: 'A crab adapted to the volcanic vents, its shell glowing with inner heat.',
    cr: 2,
    type: 'elemental',
    size: 'medium',
    
    stats: {
      hp: 34,
      ac: 16,
      speed: 25,
      str: 16, dex: 8, con: 18, int: 2, wis: 10, cha: 4
    },
    
    attacks: [
      { 
        name: 'Searing Claw', 
        type: 'melee',
        hit: 5, 
        damage: '1d8+3', 
        damageType: 'bludgeoning',
        description: 'Plus 1d6 fire damage'
      }
    ],
    
    abilities: ['heated_body', 'fire_immunity'],
    immunities: ['fire', 'poison'],
    vulnerabilities: ['cold'],
    
    behavior: 'aggressive',
    
    loot: [
      { itemId: 'potion_healing', chance: 0.1, quantity: 1 }
    ],
    
    pearls: [8, 20]
  },
  
  // === SPECIAL: LOAN SHARK (Debt Collector) - LEVEL 10 NIGHTMARE ===
  
  loan_shark: {
    id: 'loan_shark',
    name: 'The Loan Shark',
    description: 'A massive, scarred shark with cold, calculating eyes. He always collects.',
    cr: 10,  // ALWAYS level 10
    type: 'beast',
    size: 'large',
    
    stats: {
      hp: 150,
      ac: 18,
      speed: 50,  // Very fast
      str: 20, dex: 14, con: 18, int: 14, wis: 16, cha: 10
    },
    
    attacks: [
      { 
        name: 'Crushing Bite', 
        type: 'melee',
        hit: 9, 
        damage: '3d10+5', 
        damageType: 'piercing',
        description: 'Bone-crushing jaws'
      },
      {
        name: 'Tail Slam',
        type: 'melee',
        hit: 8,
        damage: '2d8+5',
        damageType: 'bludgeoning',
        description: 'Devastating tail sweep'
      }
    ],
    
    abilities: ['debt_sense', 'no_escape', 'relentless', 'backup_coming'],
    immunities: ['frightened', 'charmed'],
    
    behavior: 'relentless',
    special: {
      noFlee: true,
      debtCollector: true,
      alwaysLevel10: true,
      comesBackWithBackup: true
    },
    
    loot: [],
    pearls: [0, 0]
  },
  
  loan_shark_enforcer: {
    id: 'loan_shark_enforcer',
    name: 'Shark Enforcer',
    description: 'A vicious shark working for the Loan Shark. There to make sure you pay.',
    cr: 5,
    type: 'beast',
    size: 'medium',
    
    stats: {
      hp: 75,
      ac: 15,
      speed: 40,
      str: 16, dex: 15, con: 14, int: 8, wis: 12, cha: 6
    },
    
    attacks: [
      { 
        name: 'Bite', 
        type: 'melee',
        hit: 6, 
        damage: '2d8+3', 
        damageType: 'piercing',
        description: 'Sharp teeth tear into flesh'
      }
    ],
    
    abilities: ['pack_tactics', 'no_escape'],
    
    behavior: 'aggressive',
    special: {
      noFlee: true,
      debtCollector: true
    },
    
    loot: [],
    pearls: [0, 0]
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get XP value for a monster
 */
function getMonsterXP(monsterId) {
  const monster = MONSTERS[monsterId];
  if (!monster) return 0;
  return CR_XP[monster.cr] || 0;
}

/**
 * Roll monster loot
 */
function rollLoot(monsterId) {
  const monster = MONSTERS[monsterId];
  if (!monster) return { items: [], pearls: 0 };
  
  const items = [];
  
  // Roll for each loot entry
  for (const loot of monster.loot || []) {
    if (Math.random() < loot.chance) {
      const qty = Array.isArray(loot.quantity) 
        ? Math.floor(Math.random() * (loot.quantity[1] - loot.quantity[0] + 1)) + loot.quantity[0]
        : loot.quantity;
      
      if (qty > 0) {
        items.push({ itemId: loot.itemId, quantity: qty });
      }
    }
  }
  
  // Currency drops removed - monsters drop materials now, which are sold for USDC
  return { items, usdc: 0 };
}

/**
 * Create a combat-ready instance of a monster
 */
function spawnMonster(monsterId) {
  const template = MONSTERS[monsterId];
  if (!template) return null;
  
  // Apply difficulty scaling to HP
  const scaledHp = Math.max(1, Math.floor(template.stats.hp * DIFFICULTY_SCALE));
  
  // Scale down attack damage by reducing the hit bonus
  const scaledAttacks = template.attacks.map(atk => ({
    ...atk,
    hit: Math.max(0, Math.floor(atk.hit * DIFFICULTY_SCALE)),  // Reduce hit bonus
    // Damage dice stay same but monsters die faster with lower HP
  }));
  
  return {
    id: `${monsterId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    monsterId: template.id,
    name: template.name,
    hp: scaledHp,
    maxHp: scaledHp,
    ac: Math.max(8, template.stats.ac - 3),  // Reduce AC by 3 (min 8)
    attacks: scaledAttacks,
    alive: true
  };
}

/**
 * Roll initiative for a monster
 */
function rollMonsterInitiative(monsterId) {
  const monster = MONSTERS[monsterId];
  if (!monster) return 10;
  
  const dexMod = Math.floor((monster.stats.dex - 10) / 2);
  return Math.floor(Math.random() * 20) + 1 + dexMod;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MONSTERS,
  CR_XP,
  getMonsterXP,
  rollLoot,
  spawnMonster,
  rollMonsterInitiative
};
