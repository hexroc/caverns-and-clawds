/**
 * Caverns & Clawds - Spell Database
 * 
 * Original underwater-themed spells for the C&C TTRPG system.
 * All distances in hexes (1 hex = 5 feet).
 */

// ============================================================================
// SPELL RANGES (in hexes, 1 hex = 5 feet)
// ============================================================================

const RANGE = {
  SELF: 0,
  TOUCH: 1,
  FIVE_FT: 1,
  TEN_FT: 2,
  FIFTEEN_FT: 3,
  THIRTY_FT: 6,
  SIXTY_FT: 12,
  NINETY_FT: 18,
  ONE_TWENTY_FT: 24,
  ONE_FIFTY_FT: 30,
  THREE_HUNDRED_FT: 60,
  UNLIMITED: 999
};

// ============================================================================
// AREA EFFECT SHAPES
// ============================================================================

const AREA_SHAPES = {
  SINGLE: 'single',
  CONE: 'cone',
  SPHERE: 'sphere',
  CUBE: 'cube',
  LINE: 'line',
  CYLINDER: 'cylinder',
  SELF_RADIUS: 'self_radius'
};

// ============================================================================
// SPELL SCHOOLS (C&C Themed)
// ============================================================================

const SCHOOLS = {
  ABJURATION: 'abjuration',      // Shell Magic - protection & wards
  CONJURATION: 'conjuration',    // Current Magic - summoning & teleportation
  DIVINATION: 'divination',      // Depth Sense - knowledge & foresight
  ENCHANTMENT: 'enchantment',    // Siren Song - mind-affecting
  EVOCATION: 'evocation',        // Tempest Magic - raw elemental power
  ILLUSION: 'illusion',          // Mirage Craft - deception & shadows
  NECROMANCY: 'necromancy',      // Drowned Arts - death & undeath
  TRANSMUTATION: 'transmutation' // Tideweaving - transformation & alteration
};

// ============================================================================
// SPELLS DATABASE - CAVERNS & CLAWDS ORIGINAL
// ============================================================================

const SPELLS = {
  
  // ============ CANTRIPS (Level 0) ============
  
  thermalLance: {
    id: 'thermalLance',
    name: 'Thermal Lance',
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
    scaling: { 5: '2d10', 11: '3d10', 17: '4d10' },
    classes: ['tidecaller'],
    description: 'Make a ranged spell attack against a creature within range. On hit, deal 1d10 fire damage. Damage increases at higher levels: 2d10 at 5th, 3d10 at 11th, 4d10 at 17th.',
    visual: 'thermal_lance'
  },
  
  freezingCurrent: {
    id: 'freezingCurrent',
    name: 'Freezing Current',
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
    classes: ['tidecaller'],
    description: 'Make a ranged spell attack. On hit, deal 1d8 cold damage and reduce the target\'s speed by 10 feet until the start of your next turn. Damage scales: 2d8 at 5th, 3d8 at 11th, 4d8 at 17th level.',
    visual: 'ice_beam'
  },
  
  abyssalBeam: {
    id: 'abyssalBeam',
    name: 'Abyssal Beam',
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
    scaling: { 5: '2 beams', 11: '3 beams', 17: '4 beams' },
    description: 'Make a ranged spell attack dealing 1d10 force damage. At 5th level you fire 2 beams, at 11th level 3 beams, at 17th level 4 beams. Each beam can target the same or different creatures.',
    visual: 'abyssal_beam',
    classes: ['depthtouched']
  },
  
  corrosiveSpray: {
    id: 'corrosiveSpray',
    name: 'Corrosive Spray',
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
    description: 'You conjure a spray of caustic brine that sizzles through water and shell alike. Can target two creatures within 5 feet of each other.',
    visual: 'acid_spray',
    classes: ['tidecaller']
  },
  
  bioluminescentFlare: {
    id: 'bioluminescentFlare',
    name: 'Bioluminescent Flare',
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
    description: 'Divine light borrowed from the anglerfish descends upon your target, ignoring shadows and obstacles.',
    visual: 'bio_flare',
    classes: ['shellpriest']
  },
  
  spectralTentacle: {
    id: 'spectralTentacle',
    name: 'Spectral Tentacle',
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
    description: 'A ghostly octopus tentacle reaches from the spirit depths, draining life force with its touch.',
    visual: 'ghost_tentacle',
    classes: ['tidecaller', 'depthtouched']
  },
  
  electricTouch: {
    id: 'electricTouch',
    name: 'Electric Touch',
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
    effect: 'Advantage if target has metal armor or weapons. Target cannot take reactions until start of its next turn.',
    scaling: { 5: '2d8', 11: '3d8', 17: '4d8' },
    description: 'You channel the power of the electric eel, shocking your target with a touch that disrupts their nervous system.',
    visual: 'eel_shock',
    classes: ['tidecaller']
  },

  cuttingRemark: {
    id: 'cuttingRemark',
    name: 'Cutting Remark',
    level: 0,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V'],
    save: 'WIS',
    damage: '1d4',
    damageType: 'psychic',
    effect: 'Target has disadvantage on next attack roll',
    scaling: { 5: '2d4', 11: '3d4', 17: '4d4' },
    classes: ['shantysinger'],
    description: 'Your insults cut deeper than any claw. The target\'s confidence crumbles like wet sand.',
    visual: 'word_daggers'
  },

  shimmerTrick: {
    id: 'shimmerTrick',
    name: 'Shimmer Trick',
    level: 0,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    area: { shape: AREA_SHAPES.CUBE, size: 1 },
    duration: '1 minute',
    components: ['S', 'M'],
    effect: 'Create a sound or image. Investigation check to determine illusion.',
    classes: ['shantysinger', 'depthtouched', 'tidecaller'],
    description: 'Light refracts through your will, creating a minor visual or auditory illusion within the water.',
    visual: 'shimmer'
  },

  spectralClaw: {
    id: 'spectralClaw',
    name: 'Spectral Claw',
    level: 0,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    duration: '1 minute',
    components: ['V', 'S'],
    effect: 'A ghostly claw can manipulate objects, open doors, retrieve items up to 10 lbs',
    classes: ['shantyinger', 'depthtouched', 'tidecaller'],
    description: 'A translucent lobster claw materializes, carrying out simple tasks at your command.',
    visual: 'ghost_claw'
  },
  
  // ============ 1ST LEVEL SPELLS ============
  
  boilingBlast: {
    id: 'boilingBlast',
    name: 'Boiling Blast',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.CONE, size: 3 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '3d6',
    damageType: 'fire',
    halfOnSave: true,
    upcast: '+1d6 per slot above 1st',
    description: 'Superheated water erupts from your claws in a scalding cone, cooking anything in its path.',
    visual: 'boiling_cone',
    classes: ['tidecaller']
  },
  
  pressureBarrage: {
    id: 'pressureBarrage',
    name: 'Pressure Barrage',
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
    upcast: '+1 bolt per slot above 1st',
    description: 'Create 3 bolts of force that automatically hit (no attack roll). Each deals 1d4+1 force damage. You can target one creature or split between multiple. Upcast: +1 bolt per spell level above 1st.',
    visual: 'pressure_bolts',
    classes: ['tidecaller']
  },
  
  shockwave: {
    id: 'shockwave',
    name: 'Shockwave',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.CUBE, size: 3 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'CON',
    damage: '2d8',
    damageType: 'thunder',
    halfOnSave: true,
    effect: 'On failed save, pushed 10 feet away',
    upcast: '+1d8 per slot above 1st',
    description: 'All creatures in a 15-foot cube originating from you must make a CON save. On failure: 2d8 thunder damage and pushed 10 feet away. On success: half damage, no push. Upcast: +1d8 per level above 1st.',
    visual: 'shockwave',
    classes: ['tidecaller', 'shantysingerr']
  },
  
  tidalMending: {
    id: 'tidalMending',
    name: 'Tidal Mending',
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
    description: 'Touch a creature to restore 1d8 + your spellcasting modifier hit points. Has no effect on undead or constructs. Upcast: +1d8 healing per spell level above 1st.',
    visual: 'healing_tide',
    classes: ['shellpriest', 'shantysingerr', 'crusader']
  },
  
  shellBarrier: {
    id: 'shellBarrier',
    name: 'Shell Barrier',
    level: 1,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 reaction',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 round',
    components: ['V', 'S'],
    effect: '+5 AC until start of next turn, including against triggering attack. Immune to pressure barrage.',
    description: 'An invisible shell of hardened water materializes to deflect the incoming attack.',
    visual: 'shell_barrier',
    classes: ['tidecaller']
  },
  
  soporificSpores: {
    id: 'soporificSpores',
    name: 'Soporific Spores',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.NINETY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 4 },
    duration: '1 minute',
    components: ['V', 'S', 'M'],
    effect: 'Roll 5d8; creatures with fewest HP first fall unconscious',
    upcast: '+2d8 HP per slot above 1st',
    description: 'You release a cloud of narcotic coral spores that drift through the water, inducing deep slumber.',
    visual: 'sleep_spores',
    classes: ['tidecaller', 'shantysingerr']
  },

  abyssalMark: {
    id: 'abyssalMark',
    name: 'Abyssal Mark',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 bonus action',
    range: RANGE.NINETY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour (concentration)',
    components: ['V', 'S', 'M'],
    bonusDamage: '1d6',
    bonusDamageType: 'necrotic',
    effect: 'Target has disadvantage on ability checks of chosen type',
    classes: ['depthtouched'],
    description: 'You brand a creature with a mark from the abyss. Your attacks tear at their very essence.',
    visual: 'dark_mark'
  },

  frozenShell: {
    id: 'frozenShell',
    name: 'Frozen Shell',
    level: 1,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour',
    components: ['V', 'S', 'M'],
    tempHp: 5,
    coldDamage: 5,
    upcast: '+5 temp HP and +5 cold damage per slot above 1st',
    classes: ['depthtouched'],
    description: 'Polar ice encases your shell. Attackers who strike you feel the chill of the arctic depths.',
    visual: 'ice_shell'
  },

  scaldingRetort: {
    id: 'scaldingRetort',
    name: 'Scalding Retort',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 reaction',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '2d10',
    damageType: 'fire',
    halfOnSave: true,
    trigger: 'When damaged by a creature',
    upcast: '+1d10 per slot above 1st',
    classes: ['depthtouched'],
    description: 'Boiling water erupts around the creature that harmed you, punishing their aggression.',
    visual: 'steam_burst'
  },

  mendingChant: {
    id: 'mendingChant',
    name: 'Mending Chant',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 bonus action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V'],
    healing: '1d4',
    healingMod: 'spellcasting',
    upcast: '+1d4 per slot above 1st',
    classes: ['shantysingerr', 'shellpriest'],
    description: 'Your song carries restorative power across the currents to an ally in need.',
    visual: 'healing_notes'
  },

  cacophonyOfTheDeep: {
    id: 'cacophonyOfTheDeep',
    name: 'Cacophony of the Deep',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V'],
    save: 'WIS',
    damage: '3d6',
    damageType: 'psychic',
    halfOnSave: true,
    effect: 'On failed save, target must use reaction to move away',
    upcast: '+1d6 per slot above 1st',
    classes: ['shantysingerr'],
    description: 'Discordant whale songs assault the target\'s mind, driving them to flee.',
    visual: 'sonic_assault'
  },

  bioluminescentBurst: {
    id: 'bioluminescentBurst',
    name: 'Bioluminescent Burst',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.CUBE, size: 4 },
    duration: '1 minute (concentration)',
    components: ['V'],
    save: 'DEX',
    effect: 'Creatures outlined in light. Attacks against them have advantage. Invisible creatures revealed.',
    classes: ['shantysingerr'],
    description: 'Creatures in the area glow with deep-sea bioluminescence, making them easy targets.',
    visual: 'glow_outline'
  },

  anthemOfCourage: {
    id: 'anthemOfCourage',
    name: 'Anthem of Courage',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S'],
    effect: 'Target immune to frightened. Gains temp HP equal to spellcasting mod each turn.',
    upcast: '+1 target per slot above 1st',
    classes: ['shantysingerr', 'crusader'],
    description: 'Your battle hymn fills an ally with the courage of legendary crustacean warriors.',
    visual: 'courage_aura'
  },

  oceansBlessing: {
    id: 'oceansBlessing',
    name: 'Ocean\'s Blessing',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 bonus action',
    range: RANGE.SELF,
    duration: '1 minute (concentration)',
    components: ['V', 'S'],
    bonusDamage: '1d4',
    bonusDamageType: 'radiant',
    effect: 'Your weapon attacks deal extra radiant damage',
    classes: ['crusader'],
    description: 'Divine currents empower your weapons with the ocean\'s righteous fury.',
    visual: 'weapon_glow'
  },

  aegisOfTheDeep: {
    id: 'aegisOfTheDeep',
    name: 'Aegis of the Deep',
    level: 1,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 bonus action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '10 minutes (concentration)',
    components: ['V', 'S', 'M'],
    acBonus: 2,
    classes: ['crusader', 'shellpriest'],
    description: 'A shimmering barrier of blessed water surrounds a creature, granting +2 AC.',
    visual: 'faith_shield'
  },

  commandingWord: {
    id: 'commandingWord',
    name: 'Commanding Word',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 round',
    components: ['V'],
    save: 'WIS',
    effect: 'Speak one-word command: Approach, Drop, Flee, Grovel, Halt',
    upcast: '+1 target per slot above 1st',
    classes: ['crusader', 'shellpriest'],
    description: 'You speak with divine authority. The target must obey or suffer the consequences.',
    visual: 'command_word'
  },

  tidalBlessing: {
    id: 'tidalBlessing',
    name: 'Tidal Blessing',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    maxTargets: 3,
    effect: 'Targets add 1d4 to attack rolls and saving throws',
    upcast: '+1 target per slot above 1st',
    classes: ['crusader', 'shellpriest'],
    description: 'The favor of the ocean spirits enhances up to three allies.',
    visual: 'holy_blessing'
  },

  alluringPresence: {
    id: 'alluringPresence',
    name: 'Alluring Presence',
    level: 1,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour',
    components: ['V', 'S'],
    save: 'WIS',
    effect: 'Target regards you as friendly. Advantage on save if in combat.',
    upcast: '+1 target per slot above 1st',
    classes: ['shantysingerr', 'depthtouched', 'tidecaller'],
    description: 'You exude an irresistible charm, like a siren\'s call through the waves.',
    visual: 'charm_hearts'
  },

  arcaneSight: {
    id: 'arcaneSight',
    name: 'Arcane Sight',
    level: 1,
    school: SCHOOLS.DIVINATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SELF_RADIUS, radius: 6 },
    duration: '10 minutes (concentration)',
    components: ['V', 'S'],
    ritual: true,
    effect: 'Sense magic within 30ft. Use action to see aura and determine school.',
    classes: ['tidecaller', 'shantysingerr', 'shellpriest', 'crusader'],
    description: 'Your eyes glow faintly as you perceive the magical currents flowing through everything.',
    visual: 'magic_sight'
  },

  loreReading: {
    id: 'loreReading',
    name: 'Lore Reading',
    level: 1,
    school: SCHOOLS.DIVINATION,
    castingTime: '1 minute',
    range: RANGE.TOUCH,
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    ritual: true,
    effect: 'Learn properties of magic item, or spells affecting creature',
    classes: ['tidecaller', 'shantysingerr'],
    description: 'You commune with the ocean\'s ancient memory to learn an item\'s secrets.',
    visual: 'identify_glow'
  },

  gentleDescent: {
    id: 'gentleDescent',
    name: 'Gentle Descent',
    level: 1,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 reaction',
    range: RANGE.SIXTY_FT,
    duration: '1 minute',
    components: ['V', 'M'],
    maxTargets: 5,
    trigger: 'When you or a creature within 60ft falls',
    effect: 'Falling speed reduced to 60ft/round, no fall damage',
    classes: ['tidecaller', 'shantysingerr'],
    description: 'Supportive currents slow falling creatures, letting them drift down safely.',
    visual: 'float_down'
  },

  prismaticSphere: {
    id: 'prismaticSphere',
    name: 'Prismatic Sphere',
    level: 1,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.NINETY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    attackType: 'ranged',
    damage: '3d8',
    damageType: 'choose: acid, cold, fire, lightning, poison, thunder',
    upcast: '+1d8 per slot above 1st',
    classes: ['tidecaller'],
    description: 'You hurl an orb of concentrated elemental energy, choosing its destructive nature.',
    visual: 'chromatic_orb'
  },
  
  // ============ 2ND LEVEL SPELLS ============
  
  solarRays: {
    id: 'solarRays',
    name: 'Solar Rays',
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
    description: 'You channel beams of concentrated sunlight through the water, searing your targets.',
    visual: 'solar_rays',
    classes: ['tidecaller']
  },
  
  sonicBurst: {
    id: 'sonicBurst',
    name: 'Sonic Burst',
    level: 2,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 2 },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'CON',
    damage: '3d8',
    damageType: 'thunder',
    halfOnSave: true,
    effect: 'Creatures made of inorganic material have disadvantage',
    upcast: '+1d8 per slot above 2nd',
    description: 'A devastating sonic pulse erupts from a point you choose, cracking shells and shattering stone.',
    visual: 'sonic_ring',
    classes: ['tidecaller', 'shantysingerr']
  },
  
  pressureHold: {
    id: 'pressureHold',
    name: 'Pressure Hold',
    level: 2,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Concentration, 1 minute',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    condition: 'paralyzed',
    effect: 'Target paralyzed by crushing pressure. Repeats save at end of each turn.',
    upcast: '+1 target per slot above 2nd',
    description: 'You invoke the crushing pressure of the deep, immobilizing a humanoid in place.',
    visual: 'pressure_chains',
    classes: ['tidecaller', 'shantysingerr', 'shellpriest', 'depthtouched']
  },

  abyssalShroud: {
    id: 'abyssalShroud',
    name: 'Abyssal Shroud',
    level: 2,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 3 },
    duration: '10 minutes (concentration)',
    components: ['V', 'M'],
    effect: 'Magical darkness that even darkvision cannot penetrate',
    classes: ['depthtouched', 'tidecaller'],
    description: 'Inky darkness from the lightless depths spreads from a point, blinding all within.',
    visual: 'void_sphere'
  },

  currentShift: {
    id: 'currentShift',
    name: 'Current Shift',
    level: 2,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 bonus action',
    range: RANGE.SELF,
    teleportRange: RANGE.THIRTY_FT,
    duration: 'Instantaneous',
    components: ['V'],
    effect: 'Teleport up to 30 feet to an unoccupied space you can see',
    classes: ['depthtouched', 'tidecaller', 'shantysingerr'],
    description: 'You dissolve into the current and reform nearby in an instant.',
    visual: 'mist_teleport'
  },

  sirensWhisper: {
    id: 'sirensWhisper',
    name: 'Siren\'s Whisper',
    level: 2,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '8 hours (concentration)',
    components: ['V', 'M'],
    save: 'WIS',
    effect: 'Suggest a course of activity to a creature that can hear you',
    classes: ['depthtouched', 'shantysingerr', 'tidecaller'],
    description: 'Your words carry an irresistible compulsion, like the legendary sirens of old.',
    visual: 'mind_whisper'
  },

  thermalVent: {
    id: 'thermalVent',
    name: 'Thermal Vent',
    level: 2,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'CON',
    damage: '2d8',
    damageType: 'fire',
    effect: 'Metal becomes red-hot. If held/worn, disadvantage on attacks and ability checks.',
    upcast: '+1d8 per slot above 2nd',
    classes: ['shantysingerr'],
    description: 'You superheat a metal object with volcanic intensity, forcing the holder to drop it or suffer.',
    visual: 'metal_glow'
  },

  fortifyingTide: {
    id: 'fortifyingTide',
    name: 'Fortifying Tide',
    level: 2,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '8 hours',
    components: ['V', 'S', 'M'],
    maxTargets: 3,
    hpBoost: 5,
    effect: 'Increase maximum HP and current HP by 5',
    upcast: '+5 HP per slot above 2nd',
    classes: ['crusader', 'shellpriest'],
    description: 'Bolstering energy from the ocean\'s depths increases the vitality of your allies.',
    visual: 'hp_boost'
  },

  cleansingWaters: {
    id: 'cleansingWaters',
    name: 'Cleansing Waters',
    level: 2,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    effect: 'End one disease or condition: blinded, deafened, paralyzed, poisoned',
    classes: ['crusader', 'shellpriest', 'shantysingerr'],
    description: 'Pure water flows through your touch, washing away ailments and toxins.',
    visual: 'cleanse_glow'
  },

  enchantedEdge: {
    id: 'enchantedEdge',
    name: 'Enchanted Edge',
    level: 2,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 bonus action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour (concentration)',
    components: ['V', 'S'],
    attackBonus: 1,
    damageBonus: 1,
    effect: 'Weapon becomes magical with +1 to attack and damage',
    upcast: '+2 at 4th level, +3 at 6th level',
    classes: ['crusader', 'tidecaller'],
    description: 'Arcane power flows into a weapon, making it strike with supernatural precision.',
    visual: 'magic_weapon_glow'
  },

  kelpSnare: {
    id: 'kelpSnare',
    name: 'Kelp Snare',
    level: 2,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.CUBE, size: 4 },
    duration: '1 hour (concentration)',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    condition: 'restrained',
    effect: 'Difficult terrain. Creatures starting turn there or entering must save or be restrained.',
    classes: ['tidecaller'],
    description: 'Thick, grasping kelp erupts from the seafloor, entangling all who enter.',
    visual: 'kelp_spread'
  },

  illusoryDoubles: {
    id: 'illusoryDoubles',
    name: 'Illusory Doubles',
    level: 2,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.SELF,
    duration: '1 minute',
    components: ['V', 'S'],
    effect: 'Create 3 duplicates. Attacks may target a duplicate instead (destroyed on hit).',
    classes: ['tidecaller', 'depthtouched'],
    description: 'You create shimmering afterimages of yourself that confuse attackers.',
    visual: 'mirror_copies'
  },

  vanishingAct: {
    id: 'vanishingAct',
    name: 'Vanishing Act',
    level: 2,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    duration: '1 hour (concentration)',
    components: ['V', 'S', 'M'],
    effect: 'Target becomes invisible until they attack or cast a spell',
    upcast: '+1 target per slot above 2nd',
    classes: ['tidecaller', 'shantysingerr', 'depthtouched'],
    description: 'Light bends around the target, rendering them invisible to the naked eye.',
    visual: 'fade_out'
  },
  
  // ============ 3RD LEVEL SPELLS ============
  
  depthCharge: {
    id: 'depthCharge',
    name: 'Depth Charge',
    level: 3,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_FIFTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 4 },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '8d6',
    damageType: 'fire',
    halfOnSave: true,
    effect: 'Creates a steam cloud that obscures vision for 1 round',
    upcast: '+1d6 per slot above 3rd',
    description: 'Choose a point within 150ft. Each creature in a 20-foot radius must make a DEX save. On failure: 8d6 fire damage. On success: half damage. The area is obscured by steam until the end of your next turn. Upcast: +1d6 damage per level above 3rd.',
    visual: 'depth_charge',
    classes: ['tidecaller']
  },
  
  electricTorrent: {
    id: 'electricTorrent',
    name: 'Electric Torrent',
    level: 3,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.LINE, length: 20, width: 1 },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '8d6',
    damageType: 'lightning',
    halfOnSave: true,
    upcast: '+1d6 per slot above 3rd',
    description: 'A 100-foot long, 5-foot wide line of lightning extends from you. Each creature in the line makes a DEX save. On failure: 8d6 lightning damage. On success: half damage. Upcast: +1d6 damage per level above 3rd.',
    visual: 'electric_torrent',
    classes: ['tidecaller']
  },
  
  arcaneInterruption: {
    id: 'arcaneInterruption',
    name: 'Arcane Interruption',
    level: 3,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 reaction',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['S'],
    effect: 'Interrupt a spell of 3rd level or lower. For higher, check: d20 + spellcasting ability vs 10 + spell level.',
    upcast: 'Auto-counters spells of slot level or lower',
    description: 'You disrupt the magical currents, unraveling a spell as it forms.',
    visual: 'counter_flash',
    classes: ['tidecaller', 'depthtouched']
  },

  mawOfTheDeep: {
    id: 'mawOfTheDeep',
    name: 'Maw of the Deep',
    level: 3,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.ONE_FIFTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 4 },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '2d6',
    damageType: 'cold',
    startOfTurnDamage: '2d6 acid (no save)',
    effect: 'Pitch black void. Creatures take cold damage on entry, acid damage at start of turn.',
    classes: ['depthtouched'],
    description: 'A sphere of crushing darkness filled with gnashing spectral teeth materializes—a window to the hungering void.',
    visual: 'void_maw'
  },

  predatorsPresence: {
    id: 'predatorsPresence',
    name: 'Predator\'s Presence',
    level: 3,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.CONE, length: 6 },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    effect: 'Creatures must drop what they\'re holding and Dash away. Can repeat save at end of turn.',
    classes: ['depthtouched', 'shantysingerr', 'tidecaller'],
    description: 'You project the terrifying presence of an apex predator. Prey instincts take over.',
    visual: 'terror_wave'
  },

  mesmerizingDance: {
    id: 'mesmerizingDance',
    name: 'Mesmerizing Dance',
    level: 3,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.CUBE, size: 6 },
    duration: '1 minute (concentration)',
    components: ['S', 'M'],
    save: 'WIS',
    condition: 'charmed, incapacitated',
    effect: 'Creatures charmed and incapacitated by swirling patterns. Taking damage ends effect.',
    classes: ['shantysingerr', 'depthtouched', 'tidecaller'],
    description: 'Weaving patterns of bioluminescent light entrance all who behold them.',
    visual: 'swirl_colors'
  },

  breathOfLife: {
    id: 'breathOfLife',
    name: 'Breath of Life',
    level: 3,
    school: SCHOOLS.NECROMANCY,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    materialCost: '300 gold worth of pearls',
    effect: 'Creature dead less than 1 minute returns to life with 1 HP',
    classes: ['crusader', 'shellpriest'],
    description: 'You touch a recently fallen creature, breathing the ocean\'s life force back into them.',
    visual: 'resurrection_light'
  },

  bannerOfTheDeep: {
    id: 'bannerOfTheDeep',
    name: 'Banner of the Deep',
    level: 3,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SELF_RADIUS, radius: 6 },
    duration: '1 minute (concentration)',
    components: ['V'],
    bonusDamage: '1d4',
    bonusDamageType: 'radiant',
    effect: 'You and allies within 30ft deal extra radiant damage on weapon attacks',
    classes: ['crusader'],
    description: 'Divine power radiates from you like a battle standard, empowering nearby allies.',
    visual: 'holy_aura'
  },

  arcaneFlight: {
    id: 'arcaneFlight',
    name: 'Arcane Flight',
    level: 3,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    duration: '10 minutes (concentration)',
    components: ['V', 'S', 'M'],
    effect: 'Target gains 60ft flying speed',
    upcast: '+1 target per slot above 3rd',
    classes: ['tidecaller', 'depthtouched'],
    description: 'You grant a creature the ability to soar through water with supernatural grace.',
    visual: 'flight_aura'
  },

  temporalSurge: {
    id: 'temporalSurge',
    name: 'Temporal Surge',
    level: 3,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.THIRTY_FT,
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    effect: 'Double speed, +2 AC, advantage on DEX saves, extra action (Attack/Dash/Disengage/Hide/Use Object)',
    drawback: 'When spell ends, can\'t move or act until next turn',
    classes: ['tidecaller'],
    description: 'You accelerate time around a creature, granting them incredible swiftness.',
    visual: 'time_blur'
  },

  temporalDrag: {
    id: 'temporalDrag',
    name: 'Temporal Drag',
    level: 3,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.CUBE, size: 8 },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    maxTargets: 6,
    effect: 'Half speed, -2 AC, -2 DEX saves, no reactions, only one attack per turn, 50% chance spell takes 2 turns',
    classes: ['tidecaller'],
    description: 'Time itself thickens like viscous water, slowing all caught within.',
    visual: 'time_slow'
  },

  arcaneUnraveling: {
    id: 'arcaneUnraveling',
    name: 'Arcane Unraveling',
    level: 3,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    effect: 'End spells of 3rd level or lower. Higher spells require ability check (DC 10 + spell level).',
    upcast: 'Automatically end spells of slot level or lower',
    classes: ['tidecaller', 'shantysingerr', 'shellpriest', 'crusader', 'depthtouched'],
    description: 'You tear at the fabric of magic, unweaving enchantments and curses.',
    visual: 'dispel_burst'
  },
  
  // ============ 4TH LEVEL SPELLS ============
  
  hailOfShells: {
    id: 'hailOfShells',
    name: 'Hail of Shells',
    level: 4,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.THREE_HUNDRED_FT,
    area: { shape: AREA_SHAPES.CYLINDER, radius: 4, height: 8 },
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
    description: 'Razor-sharp shell fragments and arctic ice rain down from above, shredding and freezing the area.',
    visual: 'shell_storm',
    classes: ['tidecaller']
  },

  voidExile: {
    id: 'voidExile',
    name: 'Void Exile',
    level: 4,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'CHA',
    effect: 'Target is banished to a harmless pocket dimension. Returns when spell ends unless extraplanar.',
    upcast: '+1 target per slot above 4th',
    classes: ['depthtouched', 'shellpriest', 'crusader'],
    description: 'You tear open a rift and cast your target into a timeless void between worlds.',
    visual: 'portal_banish'
  },

  riftStep: {
    id: 'riftStep',
    name: 'Rift Step',
    level: 4,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    teleportRange: 500,
    duration: 'Instantaneous',
    components: ['V'],
    effect: 'Teleport yourself and one willing creature up to 500 feet',
    classes: ['depthtouched', 'shantysingerr', 'tidecaller'],
    description: 'You tear through the fabric of space, emerging at a destination you can visualize.',
    visual: 'rift_teleport'
  },

  totalConcealment: {
    id: 'totalConcealment',
    name: 'Total Concealment',
    level: 4,
    school: SCHOOLS.ILLUSION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S'],
    effect: 'Target becomes invisible. Does not end when attacking or casting spells.',
    classes: ['shantysingerr', 'tidecaller'],
    description: 'Perfect invisibility shrouds the target, persisting even through violent action.',
    visual: 'full_invisible'
  },

  shapeshiftingCurrent: {
    id: 'shapeshiftingCurrent',
    name: 'Shapeshifting Current',
    level: 4,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour (concentration)',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    effect: 'Transform creature into a beast of CR equal to or less than target\'s level',
    classes: ['shantysingerr', 'tidecaller'],
    description: 'You reshape a creature\'s form, transforming them into another beast entirely.',
    visual: 'morph_swirl'
  },

  lastBreath: {
    id: 'lastBreath',
    name: 'Last Breath',
    level: 4,
    school: SCHOOLS.ABJURATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '8 hours',
    components: ['V', 'S'],
    effect: 'First time target drops to 0 HP, drops to 1 HP instead. One use.',
    classes: ['crusader', 'shellpriest'],
    description: 'You ward a creature against death itself. When the killing blow lands, they barely survive.',
    visual: 'death_shield'
  },

  thermalBarrier: {
    id: 'thermalBarrier',
    name: 'Thermal Barrier',
    level: 4,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.LINE, length: 12, height: 4 },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '5d8',
    damageType: 'fire',
    halfOnSave: true,
    effect: 'Creatures within wall or entering take damage. One side radiates heat (2d8 within 10ft).',
    upcast: '+1d8 per slot above 4th',
    classes: ['tidecaller'],
    description: 'A wall of superheated water creates a deadly thermal barrier that burns all who pass.',
    visual: 'heat_wall'
  },
  
  // ============ 5TH LEVEL SPELLS ============
  
  abyssalBlast: {
    id: 'abyssalBlast',
    name: 'Abyssal Blast',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.CONE, size: 12 },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'CON',
    damage: '8d8',
    damageType: 'cold',
    halfOnSave: true,
    effect: 'Creatures killed become frozen statues',
    upcast: '+1d8 per slot above 5th',
    description: 'The killing cold of the deepest trenches erupts from your claws in a devastating cone.',
    visual: 'frost_cone',
    classes: ['tidecaller']
  },
  
  divineColumn: {
    id: 'divineColumn',
    name: 'Divine Column',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.CYLINDER, radius: 2, height: 8 },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '4d6',
    bonusDamage: '4d6',
    damageType: 'fire',
    bonusDamageType: 'radiant',
    halfOnSave: true,
    upcast: '+1d6 fire OR +1d6 radiant per slot above 5th',
    description: 'A vertical column of divine fire descends from above, carrying the ocean god\'s judgment.',
    visual: 'divine_pillar',
    classes: ['shellpriest']
  },

  crushingDepths: {
    id: 'crushingDepths',
    name: 'Crushing Depths',
    level: 5,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.NINETY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 minute (concentration)',
    components: ['V', 'S', 'M'],
    save: 'WIS',
    condition: 'paralyzed',
    repeatSave: true,
    upcast: '+1 target per slot above 5th',
    classes: ['depthtouched', 'shantysingerr', 'tidecaller'],
    description: 'The pressure of the hadal zone holds any creature motionless, regardless of their form.',
    visual: 'pressure_hold'
  },

  tidalRestoration: {
    id: 'tidalRestoration',
    name: 'Tidal Restoration',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 6 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    healing: '3d8',
    healingMod: 'spellcasting',
    maxTargets: 6,
    upcast: '+1d8 per slot above 5th',
    classes: ['shantysingerr', 'shellpriest'],
    description: 'A wave of healing energy washes over multiple creatures, mending wounds and restoring vitality.',
    visual: 'mass_heal_wave'
  },

  tsunamiStrike: {
    id: 'tsunamiStrike',
    name: 'Tsunami Strike',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.SELF_RADIUS, radius: 6 },
    duration: 'Instantaneous',
    components: ['V'],
    save: 'CON',
    damage: '5d6',
    bonusDamage: '5d6',
    damageType: 'thunder',
    bonusDamageType: 'radiant',
    halfOnSave: true,
    effect: 'Creatures knocked prone on failed save',
    classes: ['crusader'],
    description: 'You strike with divine fury, creating a holy shockwave that devastates everything nearby.',
    visual: 'holy_shockwave'
  },

  divineArmament: {
    id: 'divineArmament',
    name: 'Divine Armament',
    level: 5,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 bonus action',
    range: RANGE.TOUCH,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: '1 hour (concentration)',
    components: ['V', 'S'],
    bonusDamage: '2d8',
    bonusDamageType: 'radiant',
    light: '30ft bright, 30ft dim',
    dismissEffect: '4d8 radiant in 30ft radius, save for half, blinded on fail',
    classes: ['crusader', 'shellpriest'],
    description: 'You imbue a weapon with the ocean god\'s holy power. It blazes with divine light.',
    visual: 'holy_weapon_blaze'
  },

  toxicBloom: {
    id: 'toxicBloom',
    name: 'Toxic Bloom',
    level: 5,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.ONE_TWENTY_FT,
    area: { shape: AREA_SHAPES.SPHERE, radius: 4 },
    duration: '10 minutes (concentration)',
    components: ['V', 'S'],
    save: 'CON',
    damage: '5d8',
    damageType: 'poison',
    halfOnSave: true,
    effect: 'Cloud moves 10ft away from caster each turn. Creatures starting turn in cloud take damage.',
    upcast: '+1d8 per slot above 5th',
    classes: ['tidecaller'],
    description: 'A deadly bloom of toxic algae spreads, its poisonous cloud drifting on the currents.',
    visual: 'poison_cloud'
  },

  mindOverMatter: {
    id: 'mindOverMatter',
    name: 'Mind Over Matter',
    level: 5,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    duration: '10 minutes (concentration)',
    components: ['V', 'S'],
    effect: 'Move creature (contested check) or object (up to 1000 lbs) up to 30ft per turn',
    classes: ['tidecaller'],
    description: 'With sheer mental force, you manipulate objects and creatures at a distance.',
    visual: 'telekinesis_glow'
  },
  
  // ============ 6TH LEVEL SPELLS ============

  annihilationRay: {
    id: 'annihilationRay',
    name: 'Annihilation Ray',
    level: 6,
    school: SCHOOLS.TRANSMUTATION,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '10d6+40',
    damageType: 'force',
    effect: 'On failed save, take damage. If reduced to 0 HP, creature is utterly destroyed.',
    upcast: '+3d6 per slot above 6th',
    classes: ['tidecaller'],
    description: 'A beam of absolute destruction reduces the target to nothing but scattered atoms.',
    visual: 'annihilation_ray'
  },

  cascadingStorm: {
    id: 'cascadingStorm',
    name: 'Cascading Storm',
    level: 6,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.ONE_FIFTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S', 'M'],
    save: 'DEX',
    damage: '10d8',
    damageType: 'lightning',
    halfOnSave: true,
    maxTargets: 4,
    effect: 'Arc of lightning hits primary target, then jumps to 3 additional targets within 30ft',
    upcast: '+1 additional target per slot above 6th',
    classes: ['tidecaller'],
    description: 'Lightning cascades from target to target, chaining destruction through your enemies.',
    visual: 'chain_lightning'
  },

  veilPiercing: {
    id: 'veilPiercing',
    name: 'Veil Piercing',
    level: 6,
    school: SCHOOLS.DIVINATION,
    castingTime: '1 action',
    range: RANGE.TOUCH,
    duration: '1 hour',
    components: ['V', 'S', 'M'],
    materialCost: '25 gold worth of squid ink',
    effect: 'Truesight 120ft: see through illusions, invisibility, shapeshifters\' true form, spirit world',
    classes: ['tidecaller', 'shantysingerr', 'shellpriest', 'depthtouched'],
    description: 'You grant the ability to see through all deception—illusions, invisibility, and disguises fall away.',
    visual: 'true_sight'
  },
  
  // ============ 7TH LEVEL SPELLS ============

  touchOfOblivion: {
    id: 'touchOfOblivion',
    name: 'Touch of Oblivion',
    level: 7,
    school: SCHOOLS.NECROMANCY,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'CON',
    damage: '7d8+30',
    damageType: 'necrotic',
    halfOnSave: true,
    effect: 'Humanoid killed by this spell rises as drowned one under your control at next midnight',
    classes: ['tidecaller', 'depthtouched'],
    description: 'Negative energy courses through a creature, potentially snuffing out their life force entirely.',
    visual: 'death_touch'
  },

  rainbowDevastation: {
    id: 'rainbowDevastation',
    name: 'Rainbow Devastation',
    level: 7,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    area: { shape: AREA_SHAPES.CONE, length: 12 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    effect: 'Each creature hit by random ray (d8): 1-Red 10d6 fire, 2-Orange 10d6 acid, 3-Yellow 10d6 lightning, 4-Green 10d6 poison, 5-Blue 10d6 cold, 6-Indigo restrained/stunned/petrified, 7-Violet blinded/banished, 8-Two rays',
    classes: ['tidecaller'],
    description: 'Eight multicolored rays of devastating energy burst forth, each carrying a different doom.',
    visual: 'prismatic_spray'
  },
  
  // ============ 9TH LEVEL SPELLS ============

  cataclysm: {
    id: 'cataclysm',
    name: 'Cataclysm',
    level: 9,
    school: SCHOOLS.EVOCATION,
    castingTime: '1 action',
    range: RANGE.UNLIMITED,
    area: { shape: AREA_SHAPES.SPHERE, radius: 8, count: 4 },
    duration: 'Instantaneous',
    components: ['V', 'S'],
    save: 'DEX',
    damage: '20d6',
    bonusDamage: '20d6',
    damageType: 'fire',
    bonusDamageType: 'bludgeoning',
    halfOnSave: true,
    effect: 'Four 40ft radius impact zones strike points you choose within 1 mile',
    classes: ['tidecaller'],
    description: 'You call down the wrath of the primordial ocean—massive spheres of devastation strike from above.',
    visual: 'cataclysm'
  },

  wordOfAnnihilation: {
    id: 'wordOfAnnihilation',
    name: 'Word of Annihilation',
    level: 9,
    school: SCHOOLS.ENCHANTMENT,
    castingTime: '1 action',
    range: RANGE.SIXTY_FT,
    area: { shape: AREA_SHAPES.SINGLE },
    duration: 'Instantaneous',
    components: ['V'],
    effect: 'If target has 100 HP or less, it dies. No save.',
    classes: ['tidecaller', 'shantysingerr', 'depthtouched'],
    description: 'You speak a word of absolute power that snuffs out a creature\'s life force instantly.',
    visual: 'death_word'
  },

  realityShaping: {
    id: 'realityShaping',
    name: 'Reality Shaping',
    level: 9,
    school: SCHOOLS.CONJURATION,
    castingTime: '1 action',
    range: RANGE.SELF,
    duration: 'Instantaneous',
    components: ['V'],
    effect: 'Duplicate any 8th level or lower spell, or attempt to reshape reality (DM discretion, may have consequences)',
    classes: ['tidecaller'],
    description: 'The mightiest spell known to crustacean-kind. You bend reality itself to your will.',
    visual: 'reality_warp'
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
 */
function isInSpellRange(spell, distance) {
  if (!spell) return false;
  if (spell.range === RANGE.UNLIMITED) return true;
  if (spell.range === RANGE.SELF) return distance === 0;
  return distance <= spell.range;
}

/**
 * Get hexes affected by an area spell
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
      const sphereRadius = radius || size || 1;
      const allHexes = hexRange(target, sphereRadius);
      return allHexes.filter(h => hexDistance(target, h) <= sphereRadius);
      
    case AREA_SHAPES.CUBE:
      const cubeSize = size || 1;
      return hexRange(target, cubeSize);
      
    case AREA_SHAPES.CONE:
      const coneSize = size || 3;
      return getConeHexes(origin, target, coneSize, hexDistance, hexNeighbors);
      
    case AREA_SHAPES.LINE:
      const lineLength = length || 10;
      const lineWidth = width || 1;
      return getLineHexes(origin, target, lineLength, lineWidth, hexDistance);
      
    case AREA_SHAPES.SELF_RADIUS:
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
  
  const dx = target.q - origin.q;
  const dr = target.r - origin.r;
  
  const length = Math.sqrt(dx * dx + dr * dr);
  const dirQ = length > 0 ? dx / length : 1;
  const dirR = length > 0 ? dr / length : 0;
  
  for (let dist = 1; dist <= coneSize; dist++) {
    const widthAtDist = Math.ceil(dist / 2);
    
    const centerQ = origin.q + Math.round(dirQ * dist);
    const centerR = origin.r + Math.round(dirR * dist);
    
    affected.push({ q: centerQ, r: centerR });
    
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
  
  const dx = target.q - origin.q;
  const dr = target.r - origin.r;
  const length = Math.sqrt(dx * dx + dr * dr);
  
  if (length === 0) return [origin];
  
  const dirQ = dx / length;
  const dirR = dr / length;
  
  for (let dist = 1; dist <= lineLength; dist++) {
    const hexQ = origin.q + Math.round(dirQ * dist);
    const hexR = origin.r + Math.round(dirR * dist);
    
    affected.push({ q: hexQ, r: hexR });
    
    if (lineWidth > 1) {
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
 * Get spells by class
 */
function getSpellsByClass(className) {
  return Object.values(SPELLS).filter(s => 
    s.classes && s.classes.includes(className.toLowerCase())
  );
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
// C&C CLASS MAPPING
// ============================================================================

const CLASS_MAPPING = {
  // C&C classes to spell access
  tidecaller: 'tidecaller',     // Wizard equivalent - arcane magic
  shellpriest: 'shellpriest',   // Cleric equivalent - divine healing/protection
  depthtouched: 'depthtouched', // Warlock equivalent - pact magic
  shantysingerr: 'shantysingerr', // Bard equivalent - performance magic
  crusader: 'crusader'          // Paladin equivalent - martial divine
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SPELLS,
  RANGE,
  AREA_SHAPES,
  SCHOOLS,
  CLASS_MAPPING,
  getSpell,
  isInSpellRange,
  getAffectedHexes,
  getCantrips,
  getSpellsByLevel,
  getSpellsByClass,
  getAreaSpells,
  getSpellDamage
};
