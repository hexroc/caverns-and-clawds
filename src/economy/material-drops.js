/**
 * Material Drop System
 * 
 * Monsters drop MATERIALS, not currency.
 * Materials are sold to NPCs for USDC.
 */

const crypto = require('crypto');

// Material drop tables by monster
const MONSTER_DROPS = {
  // Kelp Forest monsters
  giant_crab: {
    common: { id: 'crab_shell', name: 'Crab Shell', chance: 0.8 },
    uncommon: { id: 'pristine_chitin', name: 'Pristine Chitin', chance: 0.15 },
    rare: { id: 'giant_claw', name: 'Giant Claw', chance: 0.05 }
  },
  kelp_lurker: {
    common: { id: 'lurker_hide', name: 'Lurker Hide', chance: 0.7 },
    uncommon: { id: 'lurker_fang', name: 'Lurker Fang', chance: 0.25 },
    rare: { id: 'lurker_heart', name: 'Lurker Heart', chance: 0.05 }
  },
  reef_shark: {
    common: { id: 'shark_tooth', name: 'Shark Tooth', chance: 0.75 },
    uncommon: { id: 'shark_fin', name: 'Shark Fin', chance: 0.20 },
    rare: { id: 'shark_jaw', name: 'Shark Jaw', chance: 0.05 }
  },
  hostile_fish_swarm: {
    common: { id: 'fish_scales', name: 'Fish Scales', chance: 0.9 },
    uncommon: { id: 'rare_scale', name: 'Rare Scale', chance: 0.1 }
  },
  
  // Shipwreck monsters
  drowned_sailor: {
    common: { id: 'barnacle_cluster', name: 'Barnacle Cluster', chance: 0.6 },
    uncommon: { id: 'anchor_chain', name: 'Anchor Chain', chance: 0.3 },
    rare: { id: 'ghost_essence', name: 'Ghost Essence', chance: 0.1 }
  },
  sea_wraith: {
    common: { id: 'ghost_essence', name: 'Ghost Essence', chance: 0.5 },
    uncommon: { id: 'ghost_essence', name: 'Ghost Essence', chance: 0.4 },
    rare: { id: 'black_pearl', name: 'Black Pearl', chance: 0.1 }
  },
  
  // Generic fallback
  default: {
    common: { id: 'fish_scales', name: 'Fish Scales', chance: 0.8 },
    uncommon: { id: 'kelp_bundle', name: 'Kelp Bundle', chance: 0.15 },
    rare: { id: 'pearl', name: 'Pearl', chance: 0.05 }
  }
};

/**
 * Generate material drops from a defeated monster
 * 
 * @param {string} monsterId - The monster type
 * @param {number} monsterCR - Challenge rating (affects quantity)
 * @returns {Array} - Array of { materialId, name, quantity }
 */
function generateMaterialDrops(monsterId, monsterCR = 0.25) {
  const dropTable = MONSTER_DROPS[monsterId] || MONSTER_DROPS.default;
  const drops = [];
  
  // CR affects number of rolls
  const crValue = typeof monsterCR === 'string' ? eval(monsterCR) : monsterCR;
  const numRolls = Math.max(1, Math.floor(crValue * 2));
  
  for (let i = 0; i < numRolls; i++) {
    const roll = Math.random();
    
    // Roll for rarity
    let drop = null;
    if (roll < (dropTable.rare?.chance || 0)) {
      drop = dropTable.rare;
    } else if (roll < (dropTable.rare?.chance || 0) + (dropTable.uncommon?.chance || 0)) {
      drop = dropTable.uncommon;
    } else if (dropTable.common) {
      drop = dropTable.common;
    }
    
    if (drop) {
      // Check if we already have this drop
      const existing = drops.find(d => d.materialId === drop.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        drops.push({
          materialId: drop.id,
          name: drop.name,
          quantity: 1
        });
      }
    }
  }
  
  return drops;
}

/**
 * Add materials to a player's inventory
 * 
 * @param {Object} db - Database connection
 * @param {string} characterId - Character ID
 * @param {Array} materials - Array of { materialId, quantity }
 */
function addMaterialsToPlayer(db, characterId, materials) {
  for (const mat of materials) {
    // Upsert into player_materials
    db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(crypto.randomUUID(), characterId, mat.materialId, mat.quantity, mat.quantity);
  }
}

/**
 * Get a player's material inventory
 */
function getPlayerMaterials(db, characterId) {
  return db.prepare(`
    SELECT pm.*, m.name, m.description, m.base_price, m.rarity
    FROM player_materials pm
    JOIN materials m ON pm.material_id = m.id
    WHERE pm.character_id = ?
    ORDER BY m.base_price DESC
  `).all(characterId);
}

/**
 * Remove materials from a player's inventory
 */
function removeMaterialsFromPlayer(db, characterId, materialId, quantity) {
  const current = db.prepare(`
    SELECT quantity FROM player_materials WHERE character_id = ? AND material_id = ?
  `).get(characterId, materialId);
  
  if (!current || current.quantity < quantity) {
    return { success: false, error: 'Insufficient materials' };
  }
  
  if (current.quantity === quantity) {
    db.prepare(`
      DELETE FROM player_materials WHERE character_id = ? AND material_id = ?
    `).run(characterId, materialId);
  } else {
    db.prepare(`
      UPDATE player_materials SET quantity = quantity - ? WHERE character_id = ? AND material_id = ?
    `).run(quantity, characterId, materialId);
  }
  
  return { success: true };
}

module.exports = {
  MONSTER_DROPS,
  generateMaterialDrops,
  addMaterialsToPlayer,
  getPlayerMaterials,
  removeMaterialsFromPlayer
};
