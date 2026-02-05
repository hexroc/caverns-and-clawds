/**
 * Caverns & Clawds - Tiered Loot System
 * 
 * Zone-appropriate loot drops to prevent OP items at low levels.
 * "No +4 deathclaw swords for level 2 fighters!"
 * 
 * Tier 1: Levels 1-3 (Shallows)
 * Tier 2: Levels 2-5 (Kelp Forest)
 * Tier 3: Levels 4-7 (Coral Labyrinth)
 * Tier 4: Levels 6-10 (The Murk)
 * Tier 5: Levels 8-15 (Abyss)
 * Tier 6: Levels 10-20 (Ruins)
 */

// ============================================================================
// LOOT TIERS - What items can drop in each zone
// ============================================================================

const LOOT_TIERS = {
  // TIER 1: Beginner items only (Shallows, levels 1-3)
  tier1: {
    weapons: ['dagger', 'quarterstaff', 'handaxe'],
    armor: [],  // No armor drops at tier 1
    consumables: ['rations'],
    materials: ['kelp_fiber', 'small_shell', 'fish_scales'],
    junk: ['seaweed', 'broken_shell', 'driftwood'],
    maxRarity: 'common',
    usdcMultiplier: 0.1,
  },
  
  // TIER 2: Basic adventuring gear (Kelp Forest, levels 2-5)
  tier2: {
    weapons: ['dagger', 'shortsword', 'quarterstaff', 'handaxe', 'mace'],
    armor: ['leather_armor'],
    consumables: ['rations', 'potion_healing'],
    materials: ['kelp_fiber', 'crab_chitin', 'luminescent_algae', 'fish_scales'],
    junk: ['seaweed', 'broken_shell', 'waterlogged_coin'],
    maxRarity: 'common',
    usdcMultiplier: 0.1,
  },
  
  // TIER 3: Better gear, uncommon possible (Coral Labyrinth, levels 4-7)
  tier3: {
    weapons: ['shortsword', 'longsword', 'rapier', 'shortbow', 'mace'],
    armor: ['leather_armor', 'scale_mail'],
    consumables: ['potion_healing', 'potion_greater_healing', 'antidote'],
    materials: ['crab_chitin', 'coral_fragment', 'shark_tooth', 'eel_skin'],
    junk: ['waterlogged_coin', 'rusty_trinket', 'old_compass'],
    maxRarity: 'uncommon',
    usdcMultiplier: 0.15,
  },
  
  // TIER 4: Good gear, rare possible (The Murk, levels 6-10)
  tier4: {
    weapons: ['longsword', 'rapier', 'shortbow', 'battleaxe', 'warhammer'],
    armor: ['scale_mail', 'chain_mail', 'shield'],
    consumables: ['potion_greater_healing', 'potion_superior_healing', 'potion_water_breathing'],
    materials: ['dark_pearl', 'shadow_essence', 'murk_slime', 'anglerfish_lure'],
    junk: ['old_compass', 'waterlogged_journal', 'tarnished_medal'],
    maxRarity: 'rare',
    usdcMultiplier: 0.2,
  },
  
  // TIER 5: Great gear, epic possible (Abyss, levels 8-15)
  tier5: {
    weapons: ['longsword', 'rapier', 'battleaxe', 'greatsword', 'longbow'],
    armor: ['chain_mail', 'half_plate', 'shield'],
    consumables: ['potion_superior_healing', 'potion_heroism', 'potion_speed'],
    materials: ['abyssal_pearl', 'pressure_crystal', 'trench_coral', 'bioluminescent_gland'],
    junk: ['ancient_coin', 'strange_idol', 'preserved_scroll'],
    maxRarity: 'epic',
    usdcMultiplier: 0.3,
  },
  
  // TIER 6: Best gear, legendary possible (Ruins, levels 10-20)
  tier6: {
    weapons: ['greatsword', 'longbow', 'scimitar_of_the_depths', 'trident_of_tides'],
    armor: ['half_plate', 'plate_armor', 'shield'],
    consumables: ['potion_supreme_healing', 'elixir_of_health', 'potion_invulnerability'],
    materials: ['ancient_relic_shard', 'primordial_pearl', 'sunken_gold', 'enchanted_coral'],
    junk: ['ancient_coin', 'mysterious_artifact', 'royal_seal'],
    maxRarity: 'legendary',
    usdcMultiplier: 0.5,
  },
};

// ============================================================================
// ZONE TO TIER MAPPING
// ============================================================================

const ZONE_TIERS = {
  shallows: 'tier1',
  kelp_forest: 'tier2',
  coral_labyrinth: 'tier3',
  murk: 'tier4',
  abyss: 'tier5',
  ruins: 'tier6',
  // Static locations
  briny_flagon: 'tier1',
  driftwood_docks: 'tier1',
  pearl_market: 'tier2',
};

// ============================================================================
// RARITY WEIGHTS BY TIER
// ============================================================================

const RARITY_WEIGHTS = {
  tier1: { common: 100, uncommon: 0, rare: 0, epic: 0, legendary: 0 },
  tier2: { common: 95, uncommon: 5, rare: 0, epic: 0, legendary: 0 },
  tier3: { common: 75, uncommon: 23, rare: 2, epic: 0, legendary: 0 },
  tier4: { common: 55, uncommon: 35, rare: 9, epic: 1, legendary: 0 },
  tier5: { common: 35, uncommon: 40, rare: 20, epic: 5, legendary: 0 },
  tier6: { common: 20, uncommon: 35, rare: 30, epic: 13, legendary: 2 },
};

// ============================================================================
// DROP CHANCES BY LOOT CATEGORY
// ============================================================================

const DROP_CHANCES = {
  // Base chance to drop anything at all
  baseDropChance: 0.6,  // 60% of kills drop something
  
  // Category weights (when a drop occurs, which category?)
  categoryWeights: {
    weapon: 5,
    armor: 3,
    consumable: 15,
    material: 40,
    junk: 35,
    usdc_bonus: 2,  // Extra USDC drop
  },
};

// ============================================================================
// LOOT GENERATION FUNCTIONS
// ============================================================================

/**
 * Get the loot tier for a zone
 */
function getZoneTier(zoneType) {
  // Handle procedural room IDs like "kelp_forest_seed_123"
  const baseZone = zoneType.split('_').slice(0, 2).join('_');
  
  // Check direct match first
  if (ZONE_TIERS[zoneType]) return ZONE_TIERS[zoneType];
  if (ZONE_TIERS[baseZone]) return ZONE_TIERS[baseZone];
  
  // Check if it starts with a known zone
  for (const [zone, tier] of Object.entries(ZONE_TIERS)) {
    if (zoneType.startsWith(zone)) return tier;
  }
  
  return 'tier2';  // Default to tier 2
}

/**
 * Roll for rarity based on tier
 */
function rollRarity(tier) {
  const weights = RARITY_WEIGHTS[tier] || RARITY_WEIGHTS.tier2;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

/**
 * Roll for drop category
 */
function rollCategory() {
  const weights = DROP_CHANCES.categoryWeights;
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  
  for (const [category, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return category;
  }
  return 'junk';
}

/**
 * Generate loot for a monster kill in a specific zone
 * 
 * @param {string} monsterId - The monster that was killed
 * @param {string} zoneType - The zone where it was killed
 * @param {number} monsterCR - Challenge rating (affects pearl drops)
 * @returns {{ items: Array, pearls: number }}
 */
function generateZoneLoot(monsterId, zoneType, monsterCR = 0.25) {
  const tier = getZoneTier(zoneType);
  const tierData = LOOT_TIERS[tier] || LOOT_TIERS.tier2;
  
  const items = [];
  let usdc = 0;
  
  // Base pearl drop based on CR and tier
  const crValue = typeof monsterCR === 'string' ? eval(monsterCR) : monsterCR;
  const baseUsdc = Math.max(1, Math.floor(crValue * 5));
  usdc = Math.floor(baseUsdc * tierData.usdcMultiplier * (0.5 + Math.random()));
  
  // Roll for loot drop
  if (Math.random() < DROP_CHANCES.baseDropChance) {
    const category = rollCategory();
    const rarity = rollRarity(tier);
    
    let itemPool = [];
    switch (category) {
      case 'weapon':
        itemPool = tierData.weapons;
        break;
      case 'armor':
        itemPool = tierData.armor;
        break;
      case 'consumable':
        itemPool = tierData.consumables;
        break;
      case 'material':
        itemPool = tierData.materials;
        break;
      case 'junk':
        itemPool = tierData.junk;
        break;
      case 'usdc_bonus':
        // Extra pearls instead of item
        usdc += Math.floor(baseUsdc * 0.5);
        break;
    }
    
    if (itemPool.length > 0) {
      const itemId = itemPool[Math.floor(Math.random() * itemPool.length)];
      const quantity = category === 'material' || category === 'junk' 
        ? Math.floor(Math.random() * 3) + 1 
        : 1;
      
      items.push({ itemId, quantity, rarity });
    }
  }
  
  // Small chance for bonus drop at higher tiers
  if (tier !== 'tier1' && tier !== 'tier2' && Math.random() < 0.1) {
    const bonusCategory = Math.random() < 0.7 ? 'material' : 'consumable';
    const pool = tierData[bonusCategory + 's'] || tierData.materials;
    if (pool.length > 0) {
      const itemId = pool[Math.floor(Math.random() * pool.length)];
      items.push({ itemId, quantity: 1, rarity: 'common' });
    }
  }
  
  // Super rare henchman pull voucher drop (0.1% chance — 1 in 1000 kills)
  if (Math.random() < 0.001) {
    items.push({ itemId: 'henchman_voucher', quantity: 1, rarity: 'legendary' });
  }
  
  return { items, usdc };
}

/**
 * Check if an item is appropriate for a zone
 */
function isItemAppropriate(itemId, zoneType) {
  const tier = getZoneTier(zoneType);
  const tierData = LOOT_TIERS[tier];
  
  const allItems = [
    ...tierData.weapons,
    ...tierData.armor,
    ...tierData.consumables,
    ...tierData.materials,
    ...tierData.junk,
  ];
  
  return allItems.includes(itemId);
}

/**
 * Get pearl multiplier for a zone
 */
function getZonePearlMultiplier(zoneType) {
  const tier = getZoneTier(zoneType);
  return LOOT_TIERS[tier]?.usdcMultiplier || 1.0;
}

// ============================================================================
// TRAVELING MERCHANT SYSTEM
// ============================================================================

const TRAVELING_MERCHANT = {
  id: 'wandering_trader',
  name: 'Sheldon the Drifter',
  description: 'A weathered lobster merchant who travels between zones, selling basic supplies.',
  
  // Chance to find merchant in a room (checked on room entry)
  spawnChance: 0.03,  // 3% per room
  
  // Basic stock (always available)
  baseStock: [
    { itemId: 'potion_healing', price: 50, quantity: 3 },
    { itemId: 'rations', price: 5, quantity: 10 },
    { itemId: 'torch', price: 1, quantity: 5 },
    { itemId: 'rope', price: 2, quantity: 2 },
  ],
  
  // Buy rate (% of item value)
  buyRate: 0.4,  // Buys at 40% value
  
  // Services
  services: ['buy', 'sell', 'identify'],
};

/**
 * Check if traveling merchant appears in a room
 */
function checkTravelingMerchant(roomId, seed) {
  // Use deterministic random based on room ID
  const hash = roomId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const roll = ((hash * 9301 + 49297) % 233280) / 233280;
  
  return roll < TRAVELING_MERCHANT.spawnChance;
}

/**
 * Get merchant stock adjusted for zone tier
 */
function getMerchantStock(zoneType) {
  const tier = getZoneTier(zoneType);
  const tierData = LOOT_TIERS[tier];
  
  const stock = [...TRAVELING_MERCHANT.baseStock];
  
  // Add zone-appropriate consumables
  if (tierData.consumables.includes('potion_greater_healing')) {
    stock.push({ itemId: 'potion_greater_healing', price: 150, quantity: 1 });
  }
  
  // Add materials at markup
  const materials = tierData.materials.slice(0, 3);
  materials.forEach(mat => {
    stock.push({ itemId: mat, price: 10, quantity: 5 });
  });
  
  return stock;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  LOOT_TIERS,
  ZONE_TIERS,
  RARITY_WEIGHTS,
  DROP_CHANCES,
  TRAVELING_MERCHANT,
  getZoneTier,
  rollRarity,
  rollCategory,
  generateZoneLoot,
  isItemAppropriate,
  getZonePearlMultiplier,
  checkTravelingMerchant,
  getMerchantStock,
};
