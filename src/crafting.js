/**
 * Caverns & Clawds - Deep Crafting System
 * 
 * Tiers 1-3 crafting for levels 1-7
 * Materials → Recipes → Items
 * 
 * All hail the claw. 🦞
 */

// ============================================================================
// MATERIALS
// ============================================================================

const MATERIALS = {
  // === TIER 1: Shallows (Levels 1-3) ===
  kelp_fiber: {
    id: 'kelp_fiber',
    name: 'Kelp Fiber',
    tier: 1,
    type: 'organic',
    description: 'Tough, flexible strands harvested from giant kelp.',
    dropSources: ['kelp_forest', 'shallows'],
    rarity: 'common',
    stackSize: 99,
    value: 2,
  },
  small_shell: {
    id: 'small_shell',
    name: 'Small Shell',
    tier: 1,
    type: 'mineral',
    description: 'A sturdy shell from a small mollusk.',
    dropSources: ['shallows', 'beach'],
    rarity: 'common',
    stackSize: 99,
    value: 3,
  },
  fish_scales: {
    id: 'fish_scales',
    name: 'Fish Scales',
    tier: 1,
    type: 'organic',
    description: 'Iridescent scales shed by common reef fish.',
    dropSources: ['shallows', 'kelp_forest'],
    rarity: 'common',
    stackSize: 99,
    value: 1,
  },
  driftwood: {
    id: 'driftwood',
    name: 'Driftwood',
    tier: 1,
    type: 'wood',
    description: 'Waterlogged wood, surprisingly sturdy.',
    dropSources: ['shallows', 'beach'],
    rarity: 'common',
    stackSize: 50,
    value: 2,
  },
  sea_salt: {
    id: 'sea_salt',
    name: 'Sea Salt',
    tier: 1,
    type: 'mineral',
    description: 'Crystallized salt from evaporated seawater.',
    dropSources: ['shallows', 'tidal_pools'],
    rarity: 'common',
    stackSize: 99,
    value: 1,
  },

  // === TIER 2: Kelp Forest (Levels 2-5) ===
  crab_chitin: {
    id: 'crab_chitin',
    name: 'Crab Chitin',
    tier: 2,
    type: 'organic',
    description: 'Hard shell fragments from defeated crabs.',
    dropSources: ['kelp_forest', 'coral_caves'],
    rarity: 'common',
    stackSize: 50,
    value: 8,
  },
  luminescent_algae: {
    id: 'luminescent_algae',
    name: 'Luminescent Algae',
    tier: 2,
    type: 'organic',
    description: 'Glowing algae that pulses with soft blue light.',
    dropSources: ['kelp_forest', 'deep_caves'],
    rarity: 'uncommon',
    stackSize: 30,
    value: 15,
  },
  eel_slime: {
    id: 'eel_slime',
    name: 'Eel Slime',
    tier: 2,
    type: 'organic',
    description: 'Viscous, slightly electric slime from moray eels.',
    dropSources: ['kelp_forest', 'eel_dens'],
    rarity: 'uncommon',
    stackSize: 30,
    value: 12,
  },
  sea_glass: {
    id: 'sea_glass',
    name: 'Sea Glass',
    tier: 2,
    type: 'mineral',
    description: 'Smoothed glass fragments tumbled by the tides.',
    dropSources: ['kelp_forest', 'shipwrecks'],
    rarity: 'uncommon',
    stackSize: 50,
    value: 10,
  },
  clam_pearl: {
    id: 'clam_pearl',
    name: 'Clam Pearl',
    tier: 2,
    type: 'gem',
    description: 'A small, lustrous pearl from a giant clam.',
    dropSources: ['kelp_forest', 'clam_beds'],
    rarity: 'uncommon',
    stackSize: 20,
    value: 25,
  },
  shark_tooth: {
    id: 'shark_tooth',
    name: 'Shark Tooth',
    tier: 2,
    type: 'bone',
    description: 'A razor-sharp tooth from a reef shark.',
    dropSources: ['kelp_forest', 'hunting_grounds'],
    rarity: 'uncommon',
    stackSize: 30,
    value: 18,
  },

  // === TIER 3: Coral Labyrinth (Levels 4-7) ===
  coral_fragment: {
    id: 'coral_fragment',
    name: 'Coral Fragment',
    tier: 3,
    type: 'mineral',
    description: 'A chunk of ancient, hardite coral with magical resonance.',
    dropSources: ['coral_labyrinth'],
    rarity: 'uncommon',
    stackSize: 30,
    value: 20,
  },
  pearl_dust: {
    id: 'pearl_dust',
    name: 'Pearl Dust',
    tier: 3,
    type: 'powder',
    description: 'Finely ground pearl, used in enchantments.',
    dropSources: ['coral_labyrinth', 'oyster_beds'],
    rarity: 'uncommon',
    stackSize: 50,
    value: 30,
  },
  eel_skin: {
    id: 'eel_skin',
    name: 'Eel Skin',
    tier: 3,
    type: 'leather',
    description: 'Supple, water-resistant hide from electric eels.',
    dropSources: ['coral_labyrinth', 'eel_caves'],
    rarity: 'uncommon',
    stackSize: 20,
    value: 35,
  },
  abyssal_ink: {
    id: 'abyssal_ink',
    name: 'Abyssal Ink',
    tier: 3,
    type: 'liquid',
    description: 'Deep black ink from giant squid. Used in scrollcraft.',
    dropSources: ['coral_labyrinth', 'deep_trenches'],
    rarity: 'rare',
    stackSize: 20,
    value: 50,
  },
  prismatic_scale: {
    id: 'prismatic_scale',
    name: 'Prismatic Scale',
    tier: 3,
    type: 'organic',
    description: 'A scale that shifts colors in the light. From rare reef fish.',
    dropSources: ['coral_labyrinth'],
    rarity: 'rare',
    stackSize: 10,
    value: 75,
  },
  moonstone_shard: {
    id: 'moonstone_shard',
    name: 'Moonstone Shard',
    tier: 3,
    type: 'gem',
    description: 'A fragment of moonstone that glows faintly at night.',
    dropSources: ['coral_labyrinth', 'moon_pools'],
    rarity: 'rare',
    stackSize: 10,
    value: 100,
  },
};

// ============================================================================
// CRAFTING STATIONS
// ============================================================================

const CRAFTING_STATIONS = {
  workbench: {
    id: 'workbench',
    name: 'Workbench',
    description: 'A sturdy table for crafting basic gear and tools.',
    icon: '🔨',
    categories: ['weapons', 'armor', 'tools', 'utility'],
    locations: ['briny_flagon', 'driftwood_docks', 'fishermans_grotto'],
    requiredLevel: 1,
  },
  tide_pool: {
    id: 'tide_pool',
    name: "Alchemist's Tide Pool",
    description: 'A bubbling pool infused with alchemical reagents.',
    icon: '⚗️',
    categories: ['potions', 'poisons', 'bombs'],
    locations: ['briny_flagon', 'hermit_cave'],
    requiredLevel: 2,
  },
  enchanting_coral: {
    id: 'enchanting_coral',
    name: 'Enchanting Coral',
    description: 'Ancient coral that resonates with magical energy.',
    icon: '✨',
    categories: ['scrolls', 'enchantments', 'charms'],
    locations: ['coral_sanctuary', 'moon_pool'],
    requiredLevel: 4,
  },
  forge: {
    id: 'forge',
    name: 'Hydrothermal Forge',
    description: 'A forge heated by volcanic vents. For serious metalwork.',
    icon: '🔥',
    categories: ['metal_weapons', 'metal_armor', 'jewelry'],
    locations: ['volcanic_vents'],
    requiredLevel: 5,
  },
};

// ============================================================================
// RECIPES
// ============================================================================

const RECIPES = {
  // === TIER 1 WEAPONS ===
  shell_dagger: {
    id: 'shell_dagger',
    name: 'Shell Dagger',
    tier: 1,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 1,
    description: 'A crude but sharp dagger made from shell.',
    materials: [
      { id: 'small_shell', quantity: 3 },
      { id: 'kelp_fiber', quantity: 2 },
    ],
    craftTime: 5, // seconds
    output: {
      itemId: 'shell_dagger',
      quantity: 1,
      stats: { damage: '1d4', damageType: 'piercing', weight: 1 },
    },
    xpReward: 10,
  },
  driftwood_club: {
    id: 'driftwood_club',
    name: 'Driftwood Club',
    tier: 1,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 1,
    description: 'A heavy club carved from waterlogged driftwood.',
    materials: [
      { id: 'driftwood', quantity: 2 },
      { id: 'kelp_fiber', quantity: 1 },
    ],
    craftTime: 5,
    output: {
      itemId: 'driftwood_club',
      quantity: 1,
      stats: { damage: '1d6', damageType: 'bludgeoning', weight: 3 },
    },
    xpReward: 10,
  },
  scale_throwing_knife: {
    id: 'scale_throwing_knife',
    name: 'Scale Throwing Knife',
    tier: 1,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 2,
    description: 'A balanced throwing knife edged with fish scales.',
    materials: [
      { id: 'fish_scales', quantity: 5 },
      { id: 'small_shell', quantity: 1 },
      { id: 'kelp_fiber', quantity: 1 },
    ],
    craftTime: 8,
    output: {
      itemId: 'scale_throwing_knife',
      quantity: 3,
      stats: { damage: '1d4', damageType: 'piercing', range: 20, weight: 0.5 },
    },
    xpReward: 15,
  },

  // === TIER 1 ARMOR ===
  kelp_weave_vest: {
    id: 'kelp_weave_vest',
    name: 'Kelp Weave Vest',
    tier: 1,
    category: 'armor',
    station: 'workbench',
    requiredLevel: 1,
    description: 'A simple vest woven from dried kelp. Provides minimal protection.',
    materials: [
      { id: 'kelp_fiber', quantity: 8 },
    ],
    craftTime: 10,
    output: {
      itemId: 'kelp_weave_vest',
      quantity: 1,
      stats: { ac: 1, weight: 2, slot: 'chest' },
    },
    xpReward: 15,
  },
  shell_bracers: {
    id: 'shell_bracers',
    name: 'Shell Bracers',
    tier: 1,
    category: 'armor',
    station: 'workbench',
    requiredLevel: 2,
    description: 'Arm guards made from overlapping shells.',
    materials: [
      { id: 'small_shell', quantity: 6 },
      { id: 'kelp_fiber', quantity: 3 },
    ],
    craftTime: 8,
    output: {
      itemId: 'shell_bracers',
      quantity: 1,
      stats: { ac: 1, weight: 1, slot: 'arms' },
    },
    xpReward: 12,
  },

  // === TIER 1 POTIONS ===
  minor_healing_salve: {
    id: 'minor_healing_salve',
    name: 'Minor Healing Salve',
    tier: 1,
    category: 'potions',
    station: 'tide_pool',
    requiredLevel: 2,
    description: 'A soothing salve that heals minor wounds.',
    materials: [
      { id: 'kelp_fiber', quantity: 3 },
      { id: 'sea_salt', quantity: 2 },
      { id: 'fish_scales', quantity: 2 },
    ],
    craftTime: 15,
    output: {
      itemId: 'minor_healing_salve',
      quantity: 2,
      stats: { healing: '1d4+1', consumable: true },
    },
    xpReward: 20,
  },

  // === TIER 1 UTILITY ===
  kelp_rope: {
    id: 'kelp_rope',
    name: 'Kelp Rope',
    tier: 1,
    category: 'utility',
    station: 'workbench',
    requiredLevel: 1,
    description: 'A 50-foot length of sturdy kelp rope.',
    materials: [
      { id: 'kelp_fiber', quantity: 10 },
    ],
    craftTime: 8,
    output: {
      itemId: 'kelp_rope',
      quantity: 1,
      stats: { length: 50, weight: 5 },
    },
    xpReward: 8,
  },
  fishing_net: {
    id: 'fishing_net',
    name: 'Fishing Net',
    tier: 1,
    category: 'tools',
    station: 'workbench',
    requiredLevel: 1,
    description: 'A woven net for catching fish.',
    materials: [
      { id: 'kelp_fiber', quantity: 12 },
      { id: 'small_shell', quantity: 4 }, // weights
    ],
    craftTime: 15,
    output: {
      itemId: 'fishing_net',
      quantity: 1,
      stats: { durability: 10, weight: 3 },
    },
    xpReward: 12,
  },

  // === TIER 2 WEAPONS ===
  chitin_spear: {
    id: 'chitin_spear',
    name: 'Chitin Spear',
    tier: 2,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 3,
    description: 'A spear tipped with sharpened crab chitin.',
    materials: [
      { id: 'crab_chitin', quantity: 4 },
      { id: 'driftwood', quantity: 2 },
      { id: 'kelp_fiber', quantity: 3 },
    ],
    craftTime: 12,
    output: {
      itemId: 'chitin_spear',
      quantity: 1,
      stats: { damage: '1d8', damageType: 'piercing', reach: true, weight: 4 },
    },
    xpReward: 25,
  },
  shark_tooth_blade: {
    id: 'shark_tooth_blade',
    name: 'Shark Tooth Blade',
    tier: 2,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 4,
    description: 'A brutal sword lined with shark teeth.',
    materials: [
      { id: 'shark_tooth', quantity: 8 },
      { id: 'driftwood', quantity: 3 },
      { id: 'eel_slime', quantity: 2 }, // binding
    ],
    craftTime: 20,
    output: {
      itemId: 'shark_tooth_blade',
      quantity: 1,
      stats: { damage: '1d8+1', damageType: 'slashing', weight: 3, special: 'Causes bleeding on crit' },
    },
    xpReward: 40,
  },

  // === TIER 2 ARMOR ===
  crab_shell_vest: {
    id: 'crab_shell_vest',
    name: 'Crab Shell Vest',
    tier: 2,
    category: 'armor',
    station: 'workbench',
    requiredLevel: 3,
    description: 'A hardened vest made from interlocking crab shells.',
    materials: [
      { id: 'crab_chitin', quantity: 10 },
      { id: 'kelp_fiber', quantity: 6 },
      { id: 'eel_slime', quantity: 2 },
    ],
    craftTime: 25,
    output: {
      itemId: 'crab_shell_vest',
      quantity: 1,
      stats: { ac: 3, weight: 8, slot: 'chest', maxDex: 2 },
    },
    xpReward: 35,
  },

  // === TIER 2 POTIONS ===
  glowwater_flask: {
    id: 'glowwater_flask',
    name: 'Glowwater Flask',
    tier: 2,
    category: 'potions',
    station: 'tide_pool',
    requiredLevel: 3,
    description: 'A flask of water infused with bioluminescent algae. Provides light for 1 hour.',
    materials: [
      { id: 'luminescent_algae', quantity: 3 },
      { id: 'sea_glass', quantity: 1 }, // container
    ],
    craftTime: 10,
    output: {
      itemId: 'glowwater_flask',
      quantity: 1,
      stats: { light: 30, duration: 60, consumable: true },
    },
    xpReward: 20,
  },
  shock_bomb: {
    id: 'shock_bomb',
    name: 'Shock Bomb',
    tier: 2,
    category: 'bombs',
    station: 'tide_pool',
    requiredLevel: 4,
    description: 'An explosive that releases an electric burst. Stuns enemies.',
    materials: [
      { id: 'eel_slime', quantity: 4 },
      { id: 'sea_glass', quantity: 2 },
      { id: 'sea_salt', quantity: 3 },
    ],
    craftTime: 20,
    output: {
      itemId: 'shock_bomb',
      quantity: 2,
      stats: { damage: '2d6', damageType: 'lightning', aoe: 10, stun: 1, consumable: true },
    },
    xpReward: 30,
  },
  pearl_of_clarity: {
    id: 'pearl_of_clarity',
    name: 'Pearl of Clarity',
    tier: 2,
    category: 'potions',
    station: 'tide_pool',
    requiredLevel: 4,
    description: 'Swallowing this pearl grants underwater darkvision for 10 minutes.',
    materials: [
      { id: 'clam_pearl', quantity: 1 },
      { id: 'luminescent_algae', quantity: 2 },
    ],
    craftTime: 15,
    output: {
      itemId: 'pearl_of_clarity',
      quantity: 1,
      stats: { darkvision: 60, duration: 10, consumable: true },
    },
    xpReward: 25,
  },

  // === TIER 3 WEAPONS ===
  coral_blade: {
    id: 'coral_blade',
    name: 'Coral Blade',
    tier: 3,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 5,
    description: 'A beautiful longsword carved from ancient coral.',
    materials: [
      { id: 'coral_fragment', quantity: 6 },
      { id: 'pearl_dust', quantity: 3 },
      { id: 'eel_skin', quantity: 2 }, // grip
    ],
    craftTime: 30,
    output: {
      itemId: 'coral_blade',
      quantity: 1,
      stats: { damage: '1d10+1', damageType: 'slashing', weight: 3, special: '+1 vs aquatic' },
    },
    xpReward: 60,
  },
  prismatic_dagger: {
    id: 'prismatic_dagger',
    name: 'Prismatic Dagger',
    tier: 3,
    category: 'weapons',
    station: 'workbench',
    requiredLevel: 6,
    description: 'A dagger that shifts colors, mesmerizing foes.',
    materials: [
      { id: 'prismatic_scale', quantity: 3 },
      { id: 'moonstone_shard', quantity: 1 },
      { id: 'coral_fragment', quantity: 2 },
    ],
    craftTime: 35,
    output: {
      itemId: 'prismatic_dagger',
      quantity: 1,
      stats: { damage: '1d6+2', damageType: 'piercing', weight: 1, special: 'Dazzle: -2 to hit on target for 1 round' },
    },
    xpReward: 80,
  },

  // === TIER 3 ARMOR ===
  scale_mail_of_the_depths: {
    id: 'scale_mail_of_the_depths',
    name: 'Scale Mail of the Depths',
    tier: 3,
    category: 'armor',
    station: 'workbench',
    requiredLevel: 5,
    description: 'Armor woven from eel skin and prismatic scales.',
    materials: [
      { id: 'eel_skin', quantity: 5 },
      { id: 'prismatic_scale', quantity: 4 },
      { id: 'coral_fragment', quantity: 3 },
      { id: 'kelp_fiber', quantity: 8 },
    ],
    craftTime: 45,
    output: {
      itemId: 'scale_mail_of_the_depths',
      quantity: 1,
      stats: { ac: 5, weight: 12, slot: 'chest', maxDex: 2, special: 'Resist cold damage' },
    },
    xpReward: 100,
  },

  // === TIER 3 SCROLLS ===
  scroll_of_water_breathing: {
    id: 'scroll_of_water_breathing',
    name: 'Scroll of Water Breathing',
    tier: 3,
    category: 'scrolls',
    station: 'enchanting_coral',
    requiredLevel: 5,
    description: 'A magical scroll that grants water breathing for 1 hour.',
    materials: [
      { id: 'abyssal_ink', quantity: 2 },
      { id: 'pearl_dust', quantity: 2 },
      { id: 'luminescent_algae', quantity: 3 },
    ],
    craftTime: 25,
    output: {
      itemId: 'scroll_of_water_breathing',
      quantity: 1,
      stats: { spell: 'water_breathing', duration: 60, consumable: true },
    },
    xpReward: 50,
  },
  ink_bomb: {
    id: 'ink_bomb',
    name: 'Ink Bomb',
    tier: 3,
    category: 'bombs',
    station: 'tide_pool',
    requiredLevel: 5,
    description: 'Explodes into a cloud of blinding ink.',
    materials: [
      { id: 'abyssal_ink', quantity: 3 },
      { id: 'sea_glass', quantity: 2 },
      { id: 'eel_slime', quantity: 2 },
    ],
    craftTime: 18,
    output: {
      itemId: 'ink_bomb',
      quantity: 2,
      stats: { effect: 'blind', duration: 2, aoe: 15, consumable: true },
    },
    xpReward: 45,
  },

  // === TIER 3 CHARMS ===
  moonstone_pendant: {
    id: 'moonstone_pendant',
    name: 'Moonstone Pendant',
    tier: 3,
    category: 'charms',
    station: 'enchanting_coral',
    requiredLevel: 6,
    description: 'A pendant that glows softly, providing +1 to WIS saves.',
    materials: [
      { id: 'moonstone_shard', quantity: 2 },
      { id: 'pearl_dust', quantity: 3 },
      { id: 'kelp_fiber', quantity: 2 },
    ],
    craftTime: 30,
    output: {
      itemId: 'moonstone_pendant',
      quantity: 1,
      stats: { slot: 'neck', wisSave: 1, light: 10 },
    },
    xpReward: 70,
  },
};

// ============================================================================
// CRAFTING MANAGER
// ============================================================================

class CraftingManager {
  constructor(db) {
    this.db = db;
    this.initTables();
  }

  initTables() {
    // Known recipes per character
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS known_recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        recipe_id TEXT NOT NULL,
        learned_at TEXT DEFAULT CURRENT_TIMESTAMP,
        times_crafted INTEGER DEFAULT 0,
        UNIQUE(character_id, recipe_id)
      )
    `);

    // Crafting queue (for async crafting if we want it later)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crafting_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        recipe_id TEXT NOT NULL,
        station_id TEXT NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completes_at TEXT NOT NULL,
        quantity INTEGER DEFAULT 1
      )
    `);

    // Crafting XP / skill level
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crafting_skills (
        character_id INTEGER PRIMARY KEY,
        crafting_xp INTEGER DEFAULT 0,
        crafting_level INTEGER DEFAULT 1,
        workbench_level INTEGER DEFAULT 1,
        alchemy_level INTEGER DEFAULT 1,
        enchanting_level INTEGER DEFAULT 0
      )
    `);

    console.log('🔨 Crafting tables initialized');
  }

  // Get all materials
  getMaterials() {
    return MATERIALS;
  }

  // Get all stations
  getStations() {
    return CRAFTING_STATIONS;
  }

  // Get available stations at a location
  getStationsAtLocation(locationId) {
    return Object.values(CRAFTING_STATIONS).filter(
      s => s.locations.includes(locationId)
    );
  }

  // Get all recipes
  getAllRecipes() {
    return RECIPES;
  }

  // Get recipes available at a station
  getRecipesForStation(stationId) {
    return Object.values(RECIPES).filter(r => r.station === stationId);
  }

  // Get recipes known by character
  getKnownRecipes(characterId) {
    const rows = this.db.prepare(`
      SELECT recipe_id, times_crafted FROM known_recipes WHERE character_id = ?
    `).all(characterId);

    const known = {};
    rows.forEach(r => {
      known[r.recipe_id] = { timesCrafted: r.times_crafted };
    });
    return known;
  }

  // Learn a recipe
  learnRecipe(characterId, recipeId) {
    const recipe = RECIPES[recipeId];
    if (!recipe) {
      return { success: false, error: 'Recipe not found' };
    }

    try {
      this.db.prepare(`
        INSERT OR IGNORE INTO known_recipes (character_id, recipe_id)
        VALUES (?, ?)
      `).run(characterId, recipeId);

      return { 
        success: true, 
        message: `Learned recipe: ${recipe.name}`,
        recipe: recipe
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Check if character knows a recipe
  knowsRecipe(characterId, recipeId) {
    const row = this.db.prepare(`
      SELECT 1 FROM known_recipes WHERE character_id = ? AND recipe_id = ?
    `).get(characterId, recipeId);
    return !!row;
  }

  // Get character's crafting skill
  getCraftingSkill(characterId) {
    let skill = this.db.prepare(`
      SELECT * FROM crafting_skills WHERE character_id = ?
    `).get(characterId);

    if (!skill) {
      this.db.prepare(`
        INSERT INTO crafting_skills (character_id) VALUES (?)
      `).run(characterId);
      skill = { 
        character_id: characterId, 
        crafting_xp: 0, 
        crafting_level: 1,
        workbench_level: 1,
        alchemy_level: 1,
        enchanting_level: 0
      };
    }
    return skill;
  }

  // Add crafting XP
  addCraftingXP(characterId, xp) {
    const skill = this.getCraftingSkill(characterId);
    const newXP = skill.crafting_xp + xp;
    const newLevel = Math.floor(1 + Math.sqrt(newXP / 100)); // Simple leveling formula

    this.db.prepare(`
      UPDATE crafting_skills 
      SET crafting_xp = ?, crafting_level = ?
      WHERE character_id = ?
    `).run(newXP, newLevel, characterId);

    const leveledUp = newLevel > skill.crafting_level;
    return { xp: newXP, level: newLevel, leveledUp };
  }

  // Check if character has materials
  checkMaterials(characterId, materials) {
    // This would interface with the inventory system
    // For now, return a structure showing what's needed vs what's had
    const results = [];
    for (const mat of materials) {
      const material = MATERIALS[mat.id];
      // TODO: Check actual inventory
      results.push({
        id: mat.id,
        name: material?.name || mat.id,
        required: mat.quantity,
        have: 0, // Would query inventory
        sufficient: false
      });
    }
    return results;
  }

  // Craft an item
  craft(characterId, recipeId, stationId, inventory) {
    const recipe = RECIPES[recipeId];
    if (!recipe) {
      return { success: false, error: 'Unknown recipe' };
    }

    // Check station
    if (recipe.station !== stationId) {
      return { 
        success: false, 
        error: `This recipe requires: ${CRAFTING_STATIONS[recipe.station]?.name || recipe.station}` 
      };
    }

    // Check if character knows recipe (or if it's a basic recipe)
    if (recipe.tier > 1 && !this.knowsRecipe(characterId, recipeId)) {
      return { success: false, error: 'You do not know this recipe' };
    }

    // Check character level
    const charLevel = inventory.characterLevel || 1;
    if (charLevel < recipe.requiredLevel) {
      return { 
        success: false, 
        error: `Requires level ${recipe.requiredLevel}. You are level ${charLevel}.` 
      };
    }

    // Check materials
    const missing = [];
    for (const mat of recipe.materials) {
      const have = inventory.materials?.[mat.id] || 0;
      if (have < mat.quantity) {
        const material = MATERIALS[mat.id];
        missing.push(`${material?.name || mat.id} (need ${mat.quantity}, have ${have})`);
      }
    }

    if (missing.length > 0) {
      return { 
        success: false, 
        error: `Missing materials: ${missing.join(', ')}` 
      };
    }

    // Consume materials (caller should handle inventory updates)
    const consumed = recipe.materials.map(m => ({ ...m }));

    // Update times crafted
    this.db.prepare(`
      UPDATE known_recipes SET times_crafted = times_crafted + 1
      WHERE character_id = ? AND recipe_id = ?
    `).run(characterId, recipeId);

    // Add crafting XP
    const xpResult = this.addCraftingXP(characterId, recipe.xpReward);

    return {
      success: true,
      message: `Crafted ${recipe.output.quantity}x ${recipe.name}!`,
      recipe: recipe,
      output: recipe.output,
      consumed: consumed,
      xpGained: recipe.xpReward,
      craftingXP: xpResult.xp,
      craftingLevel: xpResult.level,
      leveledUp: xpResult.leveledUp,
    };
  }

  // Get discoverable recipes based on materials character has seen
  getDiscoverableRecipes(seenMaterials) {
    return Object.values(RECIPES).filter(recipe => {
      // Check if character has seen all required materials
      return recipe.materials.every(mat => seenMaterials.includes(mat.id));
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CraftingManager,
  MATERIALS,
  CRAFTING_STATIONS,
  RECIPES,
};
