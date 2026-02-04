/**
 * Clawds & Caverns - Room Templates
 * 
 * Zone templates for procedural room generation.
 * Each zone defines the building blocks for generating unique rooms.
 * 
 * All hail the claw. 🦞
 */

// ============================================================================
// ZONE TEMPLATES
// ============================================================================

const ZONE_TEMPLATES = {
  // ---------------------------------------------------------------------------
  // THE SHALLOWS (Level 1-3) - Tutorial/hub area
  // ---------------------------------------------------------------------------
  shallows: {
    id: 'shallows',
    name: 'The Shallows',
    levelRange: [1, 3],
    theme: 'warm_light',
    visibility: 'clear',
    
    // Description building blocks
    prefixes: [
      'Sunlight filters down through the crystal-clear water,',
      'Gentle currents drift through this peaceful area,',
      'Warm, shallow waters embrace you as',
      'Schools of colorful fish dart past as',
      'The sandy floor glitters with shells as',
    ],
    
    mainDescriptions: [
      'illuminating a sandy expanse dotted with colorful coral formations.',
      'revealing a garden of sea anemones swaying in the gentle flow.',
      'you swim through a corridor of smooth, sun-bleached rocks.',
      'you enter a clearing surrounded by waving sea grass.',
      'the seafloor spreads out before you, littered with shells and pebbles.',
    ],
    
    suffixes: [
      'Tiny hermit crabs scuttle between the rocks.',
      'A sea turtle drifts lazily overhead.',
      'Bubbles rise from somewhere beneath the sand.',
      'The distant sound of waves crashing echoes from above.',
      'A starfish clings to a nearby rock.',
    ],
    
    // Searchable features that can appear in rooms
    features: [
      { id: 'shell_pile', name: 'pile of shells', searchChance: 0.3, loot: ['pearl_small', 'empty'] },
      { id: 'coral_outcrop', name: 'coral outcrop', searchChance: 0.2, loot: ['coral_fragment', 'sea_snail'] },
      { id: 'sandy_mound', name: 'suspicious sandy mound', searchChance: 0.4, loot: ['buried_coin', 'crab_claw', 'empty'] },
      { id: 'sea_grass', name: 'thick sea grass', searchChance: 0.25, loot: ['kelp_fiber', 'hidden_coin'] },
      { id: 'rock_formation', name: 'rock formation', searchChance: 0.15, loot: ['geode', 'empty'] },
    ],
    
    // Hazards that can appear
    hazards: [
      { id: 'urchin_patch', name: 'sea urchin patch', damage: '1d4', avoidDC: 10, description: 'Spiny sea urchins cover the ground.' },
      { id: 'jellyfish', name: 'drifting jellyfish', damage: '1d6', avoidDC: 12, description: 'Translucent jellyfish drift through the area.' },
    ],
    
    // Enemy types that spawn here
    enemies: [
      { id: 'hermit_crab', weight: 4 },
      { id: 'aggressive_fish', weight: 3 },
      { id: 'small_octopus', weight: 2 },
      { id: 'territorial_crab', weight: 1 },
    ],
    
    // Room type weights (affects structure generation)
    roomTypes: {
      open: 0.4,       // Open sandy areas
      corridor: 0.3,   // Passages between rocks
      chamber: 0.2,    // Enclosed spaces
      clearing: 0.1,   // Wide open areas
    },
    
    // Ambient messages
    ambients: [
      'A school of silver fish swirls past you.',
      'Sunbeams dance across the sandy floor.',
      'A hermit crab peeks out from its shell, then retreats.',
      'Bubbles rise from a crack in the seafloor.',
      'The gentle current carries the scent of salt and seaweed.',
    ],
  },

  // ---------------------------------------------------------------------------
  // KELP FOREST (Level 2-5) - Dense, maze-like
  // ---------------------------------------------------------------------------
  kelp_forest: {
    id: 'kelp_forest',
    name: 'Kelp Forest',
    levelRange: [2, 5],
    theme: 'bioluminescent',
    visibility: 'filtered',
    
    prefixes: [
      'Towering kelp stalks rise around you like an underwater forest,',
      'Bioluminescent plankton drift through the dense kelp,',
      'The kelp here grows thick and wild,',
      'Filtered green light barely penetrates the canopy as',
      'You push through a curtain of swaying kelp fronds,',
    ],
    
    mainDescriptions: [
      'creating a maze of green and brown that stretches in all directions.',
      'casting an eerie blue-green glow over everything.',
      'forming natural corridors between the massive stalks.',
      'you find yourself in a small clearing amidst the forest.',
      'revealing a network of paths through the underwater jungle.',
    ],
    
    suffixes: [
      'Something clicks in the distance.',
      'The kelp sways hypnotically in an unseen current.',
      'Shadows move between the stalks just at the edge of your vision.',
      'A fish larger than you drifts silently overhead.',
      'Bioluminescent organisms pulse with soft light.',
    ],
    
    features: [
      { id: 'kelp_tangle', name: 'tangled kelp mass', searchChance: 0.35, loot: ['kelp_fiber', 'trapped_fish', 'hidden_pouch'] },
      { id: 'hollow_stalk', name: 'hollow kelp stalk', searchChance: 0.25, loot: ['pearl_medium', 'old_coin', 'empty'] },
      { id: 'glowing_patch', name: 'glowing patch', searchChance: 0.4, loot: ['bioluminescent_extract', 'glowing_moss'] },
      { id: 'fish_nest', name: 'abandoned fish nest', searchChance: 0.3, loot: ['fish_eggs', 'shiny_scale', 'empty'] },
      { id: 'root_system', name: 'exposed root system', searchChance: 0.2, loot: ['kelp_root', 'buried_treasure'] },
      { id: 'drifting_debris', name: 'drifting debris', searchChance: 0.45, loot: ['rope_scrap', 'bottle_message', 'junk'] },
    ],
    
    hazards: [
      { id: 'kelp_snare', name: 'kelp snare', damage: '0', avoidDC: 12, description: 'Thick kelp threatens to entangle you.', effect: 'restrained' },
      { id: 'camouflaged_predator', name: 'camouflaged predator', damage: '2d6', avoidDC: 14, description: 'Something lurks among the kelp.' },
      { id: 'poisonous_anemone', name: 'poisonous anemone', damage: '1d8', avoidDC: 13, description: 'A brightly colored anemone releases toxins.' },
    ],
    
    enemies: [
      { id: 'kelp_lurker', weight: 4 },
      { id: 'giant_crab', weight: 3 },
      { id: 'moray_eel', weight: 2 },
      { id: 'hostile_fish_swarm', weight: 3 },
      { id: 'mantis_shrimp', weight: 1 },
    ],
    
    roomTypes: {
      dense: 0.35,     // Thick kelp, limited movement
      clearing: 0.2,   // Open areas
      corridor: 0.25,  // Natural paths
      grove: 0.15,     // Semi-enclosed spaces
      tangle: 0.05,    // Maze-like areas
    },
    
    ambients: [
      'The kelp creaks and groans as it sways.',
      'A school of fish bursts past, fleeing something unseen.',
      'Bioluminescent sparks drift like underwater fireflies.',
      'You hear clicking sounds echoing through the forest.',
      'A shadow passes overhead - something large.',
      'The current shifts, bringing the scent of something dead.',
    ],
  },

  // ---------------------------------------------------------------------------
  // CORAL LABYRINTH (Level 4-7) - Colorful but dangerous
  // ---------------------------------------------------------------------------
  coral_labyrinth: {
    id: 'coral_labyrinth',
    name: 'Coral Labyrinth',
    levelRange: [4, 7],
    theme: 'vibrant',
    visibility: 'varied',
    
    prefixes: [
      'Brilliant coral formations tower around you,',
      'The reef here explodes with color and life,',
      'Twisting passages wind between massive coral heads,',
      'Razor-sharp coral edges gleam in the filtered light as',
      'You navigate a maze of brain coral and sea fans,',
    ],
    
    mainDescriptions: [
      'their vibrant colors almost overwhelming in intensity.',
      'but danger lurks behind every beautiful facade.',
      'creating a natural maze with no clear path.',
      'you squeeze through a narrow gap in the reef.',
      'finding yourself in a coral-walled chamber.',
    ],
    
    suffixes: [
      'Venomous lionfish patrol the area.',
      'The coral seems to pulse with alien life.',
      'Tiny cleaning fish pick at the reef.',
      'A distant rumble suggests larger predators nearby.',
      'The reef creaks ominously as currents shift.',
    ],
    
    features: [
      { id: 'coral_cave', name: 'small coral cave', searchChance: 0.3, loot: ['pearl_large', 'hidden_cache', 'moray_lair'] },
      { id: 'sea_fan', name: 'massive sea fan', searchChance: 0.2, loot: ['sea_fan_fragment', 'clinging_creature'] },
      { id: 'crevice', name: 'dark crevice', searchChance: 0.35, loot: ['octopus_ink', 'lost_ring', 'empty'] },
      { id: 'brain_coral', name: 'brain coral formation', searchChance: 0.25, loot: ['coral_sample', 'trapped_item'] },
      { id: 'sponge_cluster', name: 'cluster of sponges', searchChance: 0.4, loot: ['sponge_material', 'hidden_coin', 'parasite'] },
    ],
    
    hazards: [
      { id: 'fire_coral', name: 'fire coral', damage: '2d6', avoidDC: 14, description: 'Brushing against this coral causes searing pain.' },
      { id: 'lionfish_territory', name: 'lionfish territory', damage: '2d8', avoidDC: 15, description: 'Venomous lionfish guard this area.' },
      { id: 'collapsing_coral', name: 'unstable coral', damage: '3d6', avoidDC: 16, description: 'The coral structure here is weak.' },
    ],
    
    enemies: [
      { id: 'lionfish', weight: 3 },
      { id: 'reef_shark', weight: 2 },
      { id: 'giant_moray', weight: 2 },
      { id: 'crown_of_thorns', weight: 2 },
      { id: 'territorial_octopus', weight: 2 },
      { id: 'coral_golem', weight: 1 },
    ],
    
    roomTypes: {
      passage: 0.3,
      chamber: 0.25,
      dead_end: 0.15,
      intersection: 0.2,
      grotto: 0.1,
    },
    
    ambients: [
      'A parrotfish chomps loudly on nearby coral.',
      'The reef shifts and settles with a grinding sound.',
      'Tiny damselfish dart aggressively at your face.',
      'A cloud of silt rises as something moves in a crevice.',
      'The water here tastes slightly metallic.',
    ],
  },

  // ---------------------------------------------------------------------------
  // THE MURK (Level 6-10) - Dark, scary, limited visibility
  // ---------------------------------------------------------------------------
  murk: {
    id: 'murk',
    name: 'The Murk',
    levelRange: [6, 10],
    theme: 'dark',
    visibility: 'poor',
    
    prefixes: [
      'Darkness presses in from all sides,',
      'Visibility drops to nearly nothing as',
      'The water here is thick with sediment,',
      'Your light barely penetrates the gloom as',
      'Shapes loom in the darkness around you,',
    ],
    
    mainDescriptions: [
      'and you can barely see your own claws in front of you.',
      'you enter a realm of perpetual twilight.',
      'making every shadow a potential threat.',
      'you stumble through an unseen landscape.',
      'revealing twisted forms that might be rock... or something else.',
    ],
    
    suffixes: [
      'Something brushes against you in the dark.',
      'You hear breathing that isn\'t your own.',
      'Eyes gleam briefly in the distance, then vanish.',
      'The silence is oppressive and unnatural.',
      'Your instincts scream danger.',
    ],
    
    features: [
      { id: 'bone_pile', name: 'pile of bones', searchChance: 0.4, loot: ['bone_fragment', 'old_weapon', 'cursed_item'] },
      { id: 'sunken_chest', name: 'sunken chest', searchChance: 0.5, loot: ['gold_coins', 'magic_item', 'mimic'] },
      { id: 'strange_growth', name: 'strange growth', searchChance: 0.3, loot: ['dark_essence', 'fungal_sample', 'parasite'] },
      { id: 'vent', name: 'thermal vent', searchChance: 0.25, loot: ['vent_minerals', 'heat_stone'] },
      { id: 'corpse', name: 'recent corpse', searchChance: 0.45, loot: ['adventurer_gear', 'last_message', 'nothing'] },
    ],
    
    hazards: [
      { id: 'pressure_zone', name: 'high pressure zone', damage: '2d8', avoidDC: 16, description: 'The pressure here is crushing.' },
      { id: 'toxic_vent', name: 'toxic vent', damage: '3d6', avoidDC: 15, description: 'Poisonous gases bubble up from below.' },
      { id: 'ambush_predator', name: 'unseen predator', damage: '4d6', avoidDC: 17, description: 'Something hunts you in the darkness.' },
    ],
    
    enemies: [
      { id: 'angler_fish', weight: 3 },
      { id: 'gulper_eel', weight: 3 },
      { id: 'deep_dweller', weight: 2 },
      { id: 'shadow_crab', weight: 2 },
      { id: 'murk_horror', weight: 1 },
    ],
    
    roomTypes: {
      void: 0.3,
      cavern: 0.25,
      trench: 0.2,
      lair: 0.15,
      chasm: 0.1,
    },
    
    ambients: [
      'A distant, inhuman wail echoes through the darkness.',
      'Your light flickers and dims for no reason.',
      'The water temperature drops suddenly.',
      'You feel something watching you.',
      'Pressure builds in your ears.',
      'A bioluminescent flash reveals something enormous moving away.',
    ],
  },

  // ---------------------------------------------------------------------------
  // ABYSSAL TRENCHES (Level 8-15) - Deep, pressure mechanics
  // ---------------------------------------------------------------------------
  abyss: {
    id: 'abyss',
    name: 'Abyssal Trenches',
    levelRange: [8, 15],
    theme: 'alien',
    visibility: 'none',
    
    prefixes: [
      'The crushing depth presses against your shell,',
      'You descend into absolute darkness,',
      'The trench walls close in around you,',
      'At these depths, light is a distant memory,',
      'Ancient things stir in the abyss as',
    ],
    
    mainDescriptions: [
      'where creatures of nightmare make their home.',
      'a realm no surface dweller was meant to see.',
      'forming a vertical maze of ledges and crevasses.',
      'only bioluminescence marks the passage of predators.',
      'you enter the domain of the Leviathan.',
    ],
    
    suffixes: [
      'The pressure here would crush lesser creatures instantly.',
      'Something massive moves in the void below.',
      'Your shell groans under the immense pressure.',
      'Alien life forms drift past, unconcerned by your presence.',
      'The cold here seeps into your very soul.',
    ],
    
    features: [
      { id: 'leviathan_bone', name: 'leviathan bone', searchChance: 0.3, loot: ['leviathan_fragment', 'ancient_rune', 'curse'] },
      { id: 'pressure_crystal', name: 'pressure crystal', searchChance: 0.2, loot: ['abyssal_crystal', 'compressed_pearl'] },
      { id: 'alien_growth', name: 'alien growth', searchChance: 0.35, loot: ['void_essence', 'abyssal_sample', 'infection'] },
      { id: 'ancient_structure', name: 'ancient structure', searchChance: 0.4, loot: ['artifact_fragment', 'rune_stone', 'trap'] },
      { id: 'vent_garden', name: 'thermal vent garden', searchChance: 0.3, loot: ['vent_creature', 'heat_crystal', 'rare_mineral'] },
    ],
    
    hazards: [
      { id: 'crushing_pressure', name: 'crushing pressure', damage: '4d8', avoidDC: 18, description: 'The pressure here is lethal.' },
      { id: 'abyssal_current', name: 'abyssal current', damage: '3d8', avoidDC: 17, description: 'A powerful current threatens to sweep you into the void.' },
      { id: 'leviathan_wake', name: 'leviathan wake', damage: '6d6', avoidDC: 20, description: 'Something enormous passes nearby.' },
    ],
    
    enemies: [
      { id: 'abyssal_horror', weight: 2 },
      { id: 'pressure_beast', weight: 3 },
      { id: 'void_crawler', weight: 3 },
      { id: 'deep_one', weight: 2 },
      { id: 'trench_leviathan', weight: 1 },
    ],
    
    roomTypes: {
      ledge: 0.25,
      chasm: 0.2,
      vent_field: 0.2,
      ancient_ruin: 0.15,
      void: 0.15,
      nest: 0.05,
    },
    
    ambients: [
      'Something impossibly large moves in the darkness below.',
      'Your shell cracks slightly under the pressure.',
      'A distant roar vibrates through the water.',
      'Alien bioluminescence paints patterns in the void.',
      'You feel an ancient presence observing you.',
      'The cold here is beyond cold - it\'s the absence of all warmth.',
    ],
  },

  // ---------------------------------------------------------------------------
  // SUNKEN RUINS (Level 10-20) - Ancient civilization, puzzles
  // ---------------------------------------------------------------------------
  ruins: {
    id: 'ruins',
    name: 'Sunken Ruins',
    levelRange: [10, 20],
    theme: 'ancient',
    visibility: 'magical',
    
    prefixes: [
      'Ancient stone columns rise from the seafloor,',
      'You enter the drowned remnants of a forgotten civilization,',
      'Runes glow faintly on the walls,',
      'The architecture here predates all known history,',
      'Magical wards flicker with residual power as',
    ],
    
    mainDescriptions: [
      'covered in barnacles but still emanating power.',
      'where treasure and death wait in equal measure.',
      'hinting at the arcane knowledge buried here.',
      'built by hands - or claws - unknown.',
      'you disturb the eternal rest of something ancient.',
    ],
    
    suffixes: [
      'Ghostly lights flicker in empty windows.',
      'The stones hum with residual magic.',
      'Something stirs in the depths of the temple.',
      'Your presence has been noted by the guardians.',
      'Ancient traps may still be active.',
    ],
    
    features: [
      { id: 'altar', name: 'ancient altar', searchChance: 0.4, loot: ['ritual_item', 'cursed_artifact', 'ancient_coin'] },
      { id: 'statue', name: 'weathered statue', searchChance: 0.3, loot: ['gem_eye', 'hidden_mechanism', 'nothing'] },
      { id: 'mosaic', name: 'mosaic floor', searchChance: 0.25, loot: ['tile_fragment', 'hidden_vault', 'trap'] },
      { id: 'sarcophagus', name: 'sealed sarcophagus', searchChance: 0.5, loot: ['ancient_treasure', 'undead_guardian', 'curse'] },
      { id: 'library', name: 'ruined library', searchChance: 0.45, loot: ['spell_scroll', 'ancient_text', 'knowledge'] },
    ],
    
    hazards: [
      { id: 'magic_trap', name: 'magical trap', damage: '4d8', avoidDC: 18, description: 'Ancient wards still protect this place.' },
      { id: 'guardian_awakening', name: 'guardian awakening', damage: '5d6', avoidDC: 17, description: 'A construct stirs to life.' },
      { id: 'curse_zone', name: 'curse zone', damage: '2d10', avoidDC: 16, description: 'Dark magic permeates this area.' },
    ],
    
    enemies: [
      { id: 'stone_guardian', weight: 3 },
      { id: 'spectral_defender', weight: 3 },
      { id: 'cursed_priest', weight: 2 },
      { id: 'animated_armor', weight: 2 },
      { id: 'ancient_lich', weight: 1 },
    ],
    
    roomTypes: {
      hall: 0.25,
      chamber: 0.2,
      sanctuary: 0.15,
      vault: 0.15,
      corridor: 0.15,
      throne_room: 0.1,
    },
    
    ambients: [
      'Ghostly whispers echo from the walls.',
      'Runes pulse with fading magical energy.',
      'Dust swirls in patterns that seem almost intentional.',
      'You feel the weight of ages pressing down on you.',
      'Stone eyes seem to follow your movement.',
      'A distant bell tolls, though no bell exists here.',
    ],
  },
};

// ============================================================================
// SPECIAL ROOM TEMPLATES
// ============================================================================

const SPECIAL_ROOMS = {
  // Kelp Forest special rooms
  kelp_heart: {
    id: 'kelp_heart',
    name: 'The Kelp Heart',
    zone: 'kelp_forest',
    unique: true,
    description: `At the very center of the Kelp Forest lies this ancient clearing. A massive kelp stalk, thicker than ten lobsters could wrap their claws around, rises from a pool of pure bioluminescence. The oldest stories say this is where the first kelp sprouted, and its light has never dimmed.

The water here feels different - charged with life energy. Smaller kelp stalks bow toward the great one as if in worship. Schools of fish swim in endless spirals around the glowing pool.

This is a sacred place. Even predators give it wide berth.`,
    features: [
      { id: 'great_stalk', name: 'the Great Stalk', searchChance: 0.8, loot: ['kelp_heart_essence', 'blessing_of_growth'] },
      { id: 'luminous_pool', name: 'luminous pool', searchChance: 0.6, loot: ['pure_bioluminescence', 'healing_waters'] },
    ],
    npcs: ['kelp_guardian'],
    exits: { north: null, south: null, east: null, west: null }, // Filled during generation
    hazards: [], // Safe zone
    ambient: [
      'The great stalk pulses with warm light.',
      'Fish swim in perfect, meditative circles.',
      'You feel your wounds beginning to heal.',
      'The water here tastes sweet and pure.',
    ],
  },
  
  fishermans_grotto: {
    id: 'fishermans_grotto',
    name: 'Fisherman\'s Grotto',
    zone: 'kelp_forest',
    unique: true,
    description: `Hidden behind a curtain of kelp, this small cave serves as a refuge for those who know where to look. Salvaged fishing nets form crude hammocks, and a fire-coral heating element keeps the water pleasantly warm. Carved into the wall are tally marks - someone kept count of something here for a very long time.

Old FISHER PETE, a hermit who fled civilization decades ago, calls this place home. He trades information for supplies and occasionally offers work to those he deems trustworthy.`,
    features: [
      { id: 'supply_cache', name: 'supply cache', searchChance: 0.5, loot: ['rations', 'rope', 'old_map'] },
      { id: 'tally_wall', name: 'wall of tally marks', searchChance: 0.3, loot: ['cryptic_clue', 'nothing'] },
    ],
    npcs: ['fisher_pete'],
    exits: { out: null },
    hazards: [],
    ambient: [
      'Fisher Pete mutters to himself while sorting his catches.',
      'The heating element crackles pleasantly.',
      'Nets sway in a gentle current.',
    ],
  },
  
  eels_den: {
    id: 'eels_den',
    name: 'The Eel\'s Den',
    zone: 'kelp_forest',
    unique: true,
    description: `You've found the lair of VOLTARA THE STORM EEL, a massive moray who has claimed this section of the forest as her hunting ground. The walls of this underwater cave are lined with the shells of her victims - a grim warning to trespassers.

Voltara herself coils in the back of the den, electricity crackling along her body. Her eyes track your every movement. She's killed a hundred warriors, but rumor says she respects strength and may bargain with those who prove worthy.`,
    features: [
      { id: 'trophy_wall', name: 'wall of trophies', searchChance: 0.4, loot: ['victim_gear', 'rare_shell', 'enchanted_item'] },
      { id: 'voltara_hoard', name: 'Voltara\'s hoard', searchChance: 0.1, loot: ['lightning_pearl', 'storm_essence', 'treasure'] },
    ],
    npcs: ['voltara'],
    exits: { out: null },
    hazards: [
      { id: 'electrical_field', name: 'electrical field', damage: '3d8', avoidDC: 16, description: 'Electricity crackles through the water.' },
    ],
    ambient: [
      'Voltara\'s eyes never leave you.',
      'Electricity crackles ominously.',
      'Empty shells clatter in the current.',
      'The air tastes of ozone.',
    ],
  },
};

// ============================================================================
// ROOM NAME COMPONENTS
// ============================================================================

const ROOM_NAMES = {
  kelp_forest: {
    adjectives: ['Dense', 'Quiet', 'Twisted', 'Glowing', 'Dark', 'Sunlit', 'Murky', 'Swaying', 'Ancient', 'Wild'],
    nouns: ['Grove', 'Clearing', 'Passage', 'Thicket', 'Hollow', 'Trail', 'Bend', 'Stand', 'Tangle', 'Glade'],
  },
  coral_labyrinth: {
    adjectives: ['Colorful', 'Jagged', 'Narrow', 'Twisted', 'Dead-end', 'Branching', 'Crimson', 'Azure', 'Sharp', 'Hidden'],
    nouns: ['Passage', 'Chamber', 'Grotto', 'Alcove', 'Junction', 'Tunnel', 'Crevice', 'Gallery', 'Den', 'Maze'],
  },
  murk: {
    adjectives: ['Dark', 'Cold', 'Silent', 'Haunted', 'Empty', 'Forgotten', 'Black', 'Endless', 'Dread', 'Lightless'],
    nouns: ['Void', 'Depths', 'Expanse', 'Hollow', 'Pit', 'Chasm', 'Abyss', 'Cavern', 'Rift', 'Shadow'],
  },
  abyss: {
    adjectives: ['Crushing', 'Primordial', 'Alien', 'Eternal', 'Frozen', 'Abyssal', 'Ancient', 'Terrible', 'Void-touched', 'Forsaken'],
    nouns: ['Trench', 'Ledge', 'Vent', 'Rift', 'Maw', 'Precipice', 'Crevasse', 'Hollow', 'Sanctum', 'Tomb'],
  },
  ruins: {
    adjectives: ['Crumbling', 'Haunted', 'Ancient', 'Cursed', 'Sealed', 'Forgotten', 'Sacred', 'Defiled', 'Ruined', 'Timeless'],
    nouns: ['Hall', 'Chamber', 'Sanctuary', 'Vault', 'Temple', 'Crypt', 'Archive', 'Throne Room', 'Gallery', 'Shrine'],
  },
  shallows: {
    adjectives: ['Sunny', 'Peaceful', 'Sandy', 'Calm', 'Warm', 'Bright', 'Clear', 'Gentle', 'Serene', 'Sheltered'],
    nouns: ['Expanse', 'Bed', 'Flat', 'Pool', 'Garden', 'Shore', 'Banks', 'Stretch', 'Haven', 'Cove'],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ZONE_TEMPLATES,
  SPECIAL_ROOMS,
  ROOM_NAMES,
};
