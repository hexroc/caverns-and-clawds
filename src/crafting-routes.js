/**
 * Caverns & Clawds - Crafting API Routes
 * 
 * All hail the claw. 🦞
 */

const express = require('express');
const crypto = require('crypto');
const { CraftingManager, MATERIALS, CRAFTING_STATIONS, RECIPES } = require('./crafting');

function createCraftingRoutes(db, authenticateAgent) {
  const router = express.Router();
  const crafting = new CraftingManager(db);

  // Helper to get character
  const getChar = (req) => {
    const { CharacterManager } = require('./character');
    const characters = new CharacterManager(db);
    return characters.getCharacterByAgent(req.user.id);
  };

  // Helper to get inventory (materials)
  const getInventory = (characterId) => {
    // Get character's level from clawds table
    const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    const inventoryItems = db.prepare(`
      SELECT * FROM character_inventory WHERE character_id = ?
    `).all(characterId);

    // Build materials map
    const materials = {};
    inventoryItems.forEach(item => {
      if (MATERIALS[item.item_id]) {
        materials[item.item_id] = (materials[item.item_id] || 0) + item.quantity;
      }
    });

    return {
      characterLevel: char?.level || 1,
      materials: materials,
      items: inventoryItems,
    };
  };

  // ============================================================================
  // STATIONS
  // ============================================================================

  /**
   * GET /api/craft/stations - List all crafting stations
   */
  router.get('/stations', (req, res) => {
    res.json({
      success: true,
      stations: Object.values(CRAFTING_STATIONS).map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        icon: s.icon,
        categories: s.categories,
        locations: s.locations,
        requiredLevel: s.requiredLevel,
      })),
    });
  });

  /**
   * GET /api/craft/stations/nearby - Get stations at current location
   */
  router.get('/stations/nearby', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const stations = crafting.getStationsAtLocation(char.location);

      res.json({
        success: true,
        location: char.location,
        stations: stations.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon,
          categories: s.categories,
        })),
      });
    } catch (err) {
      console.error('Stations nearby error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // MATERIALS
  // ============================================================================

  /**
   * GET /api/craft/materials - List all materials
   */
  router.get('/materials', (req, res) => {
    const { tier } = req.query;
    let materials = Object.values(MATERIALS);

    if (tier) {
      materials = materials.filter(m => m.tier === parseInt(tier));
    }

    res.json({
      success: true,
      materials: materials.map(m => ({
        id: m.id,
        name: m.name,
        tier: m.tier,
        type: m.type,
        description: m.description,
        rarity: m.rarity,
        value: m.value,
      })),
    });
  });

  /**
   * GET /api/craft/materials/inventory - Get character's materials
   */
  router.get('/materials/inventory', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const inventory = getInventory(char.id);

      // Build detailed material list
      const materialList = Object.entries(inventory.materials).map(([id, qty]) => {
        const mat = MATERIALS[id];
        return {
          id: id,
          name: mat?.name || id,
          quantity: qty,
          tier: mat?.tier,
          type: mat?.type,
          rarity: mat?.rarity,
          value: mat?.value,
        };
      });

      res.json({
        success: true,
        materials: materialList,
        totalValue: materialList.reduce((sum, m) => sum + (m.value * m.quantity), 0),
      });
    } catch (err) {
      console.error('Materials inventory error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // RECIPES
  // ============================================================================

  /**
   * GET /api/craft/recipes - List all recipes (or known recipes)
   */
  router.get('/recipes', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { station, tier, known_only } = req.query;
      const knownRecipes = crafting.getKnownRecipes(char.id);
      let recipes = Object.values(RECIPES);

      // Filter by station
      if (station) {
        recipes = recipes.filter(r => r.station === station);
      }

      // Filter by tier
      if (tier) {
        recipes = recipes.filter(r => r.tier === parseInt(tier));
      }

      // Filter to known only
      if (known_only === 'true') {
        recipes = recipes.filter(r => r.tier === 1 || knownRecipes[r.id]);
      }

      const inventory = getInventory(char.id);

      res.json({
        success: true,
        recipes: recipes.map(r => {
          const known = r.tier === 1 || !!knownRecipes[r.id];
          const canCraft = known && char.level >= r.requiredLevel;

          // Check materials
          const materialCheck = r.materials.map(mat => {
            const have = inventory.materials[mat.id] || 0;
            return {
              id: mat.id,
              name: MATERIALS[mat.id]?.name || mat.id,
              required: mat.quantity,
              have: have,
              sufficient: have >= mat.quantity,
            };
          });

          const hasMaterials = materialCheck.every(m => m.sufficient);

          return {
            id: r.id,
            name: r.name,
            tier: r.tier,
            category: r.category,
            station: r.station,
            requiredLevel: r.requiredLevel,
            description: known ? r.description : '???',
            materials: known ? materialCheck : '???',
            output: known ? r.output : '???',
            craftTime: r.craftTime,
            xpReward: r.xpReward,
            known: known,
            canCraft: canCraft && hasMaterials,
            timesCrafted: knownRecipes[r.id]?.timesCrafted || 0,
          };
        }),
      });
    } catch (err) {
      console.error('Recipes error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/craft/recipes/:id - Get specific recipe details
   */
  router.get('/recipes/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const recipe = RECIPES[req.params.id];
      if (!recipe) {
        return res.status(404).json({ success: false, error: 'Recipe not found' });
      }

      const known = recipe.tier === 1 || crafting.knowsRecipe(char.id, recipe.id);
      const inventory = getInventory(char.id);

      const materialCheck = recipe.materials.map(mat => {
        const have = inventory.materials[mat.id] || 0;
        return {
          id: mat.id,
          name: MATERIALS[mat.id]?.name || mat.id,
          required: mat.quantity,
          have: have,
          sufficient: have >= mat.quantity,
        };
      });

      res.json({
        success: true,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          tier: recipe.tier,
          category: recipe.category,
          station: recipe.station,
          stationName: CRAFTING_STATIONS[recipe.station]?.name,
          requiredLevel: recipe.requiredLevel,
          description: known ? recipe.description : 'You have not learned this recipe.',
          materials: known ? materialCheck : null,
          output: known ? recipe.output : null,
          craftTime: recipe.craftTime,
          xpReward: recipe.xpReward,
          known: known,
          canCraft: known && char.level >= recipe.requiredLevel && materialCheck.every(m => m.sufficient),
        },
      });
    } catch (err) {
      console.error('Recipe detail error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // CRAFTING
  // ============================================================================

  /**
   * POST /api/craft/make - Craft an item
   * Body: { recipe_id: string, station_id: string, quantity?: number }
   */
  router.post('/make', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { recipe_id, station_id, quantity = 1 } = req.body;

      if (!recipe_id || !station_id) {
        return res.status(400).json({ 
          success: false, 
          error: 'recipe_id and station_id required' 
        });
      }

      // Check station is at current location
      const nearbyStations = crafting.getStationsAtLocation(char.location);
      if (!nearbyStations.find(s => s.id === station_id)) {
        return res.status(400).json({
          success: false,
          error: `No ${station_id} at this location. Available: ${nearbyStations.map(s => s.name).join(', ') || 'none'}`,
        });
      }

      const inventory = getInventory(char.id);

      // Attempt to craft
      const result = crafting.craft(char.id, recipe_id, station_id, inventory);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Consume materials from inventory
      for (const mat of result.consumed) {
        db.prepare(`
          UPDATE character_inventory 
          SET quantity = quantity - ?
          WHERE character_id = ? AND item_id = ?
        `).run(mat.quantity, char.id, mat.id);

        // Remove if quantity <= 0
        db.prepare(`
          DELETE FROM character_inventory 
          WHERE character_id = ? AND item_id = ? AND quantity <= 0
        `).run(char.id, mat.id);
      }

      // Add crafted item to inventory
      const outputItem = result.output;
      const existingItem = db.prepare(`
        SELECT * FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `).get(char.id, outputItem.itemId);

      if (existingItem) {
        db.prepare(`
          UPDATE character_inventory 
          SET quantity = quantity + ?
          WHERE character_id = ? AND item_id = ?
        `).run(outputItem.quantity, char.id, outputItem.itemId);
      } else {
        db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity)
          VALUES (?, ?, ?, ?)
        `).run(crypto.randomUUID(), char.id, outputItem.itemId, outputItem.quantity);
      }

      res.json({
        success: true,
        message: result.message,
        crafted: {
          itemId: outputItem.itemId,
          name: result.recipe.name,
          quantity: outputItem.quantity,
          stats: outputItem.stats,
        },
        consumed: result.consumed.map(m => ({
          id: m.id,
          name: MATERIALS[m.id]?.name || m.id,
          quantity: m.quantity,
        })),
        xpGained: result.xpGained,
        craftingXP: result.craftingXP,
        craftingLevel: result.craftingLevel,
        leveledUp: result.leveledUp,
      });
    } catch (err) {
      console.error('Craft error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/craft/learn - Learn a recipe from a scroll or NPC
   * Body: { recipe_id: string, source?: 'scroll' | 'npc' }
   */
  router.post('/learn', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { recipe_id, source = 'discovery' } = req.body;

      if (!recipe_id) {
        return res.status(400).json({ success: false, error: 'recipe_id required' });
      }

      const recipe = RECIPES[recipe_id];
      if (!recipe) {
        return res.status(404).json({ success: false, error: 'Recipe not found' });
      }

      // Check if already known
      if (crafting.knowsRecipe(char.id, recipe_id)) {
        return res.status(400).json({ 
          success: false, 
          error: 'You already know this recipe' 
        });
      }

      // Check level requirement
      if (char.level < recipe.requiredLevel) {
        return res.status(400).json({
          success: false,
          error: `Requires level ${recipe.requiredLevel} to learn`,
        });
      }

      // If learning from scroll, consume it
      if (source === 'scroll') {
        const scrollId = `recipe_scroll_${recipe_id}`;
        const hasScroll = db.prepare(`
          SELECT * FROM character_inventory 
          WHERE character_id = ? AND item_id = ? AND quantity > 0
        `).get(char.id, scrollId);

        if (!hasScroll) {
          return res.status(400).json({
            success: false,
            error: 'You do not have the recipe scroll for this item',
          });
        }

        // Consume scroll
        db.prepare(`
          UPDATE character_inventory SET quantity = quantity - 1
          WHERE character_id = ? AND item_id = ?
        `).run(char.id, scrollId);

        db.prepare(`
          DELETE FROM character_inventory 
          WHERE character_id = ? AND item_id = ? AND quantity <= 0
        `).run(char.id, scrollId);
      }

      const result = crafting.learnRecipe(char.id, recipe_id);

      res.json({
        success: true,
        message: `Learned recipe: ${recipe.name}!`,
        recipe: {
          id: recipe.id,
          name: recipe.name,
          tier: recipe.tier,
          category: recipe.category,
          station: recipe.station,
          description: recipe.description,
        },
        source: source,
      });
    } catch (err) {
      console.error('Learn recipe error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // SKILL
  // ============================================================================

  /**
   * GET /api/craft/skill - Get character's crafting skill level
   */
  router.get('/skill', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const skill = crafting.getCraftingSkill(char.id);
      const knownCount = Object.keys(crafting.getKnownRecipes(char.id)).length;
      const totalRecipes = Object.keys(RECIPES).length;

      // XP to next level
      const nextLevelXP = Math.pow(skill.crafting_level, 2) * 100;
      const currentLevelXP = Math.pow(skill.crafting_level - 1, 2) * 100;
      const xpProgress = skill.crafting_xp - currentLevelXP;
      const xpNeeded = nextLevelXP - currentLevelXP;

      res.json({
        success: true,
        skill: {
          craftingLevel: skill.crafting_level,
          craftingXP: skill.crafting_xp,
          xpToNextLevel: nextLevelXP - skill.crafting_xp,
          xpProgress: `${xpProgress}/${xpNeeded}`,
          recipesKnown: knownCount,
          totalRecipes: totalRecipes,
          specializations: {
            workbench: skill.workbench_level,
            alchemy: skill.alchemy_level,
            enchanting: skill.enchanting_level,
          },
        },
      });
    } catch (err) {
      console.error('Crafting skill error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Caverns & Clawds Crafting API',
      version: '1.0.0',
      description: 'Gather materials, learn recipes, craft items!',
      endpoints: {
        stations: {
          'GET /stations': 'List all crafting stations',
          'GET /stations/nearby': 'Get stations at current location',
        },
        materials: {
          'GET /materials': 'List all materials (query: tier)',
          'GET /materials/inventory': 'Get your materials',
        },
        recipes: {
          'GET /recipes': 'List recipes (query: station, tier, known_only)',
          'GET /recipes/:id': 'Get recipe details',
        },
        crafting: {
          'POST /make': 'Craft an item (body: recipe_id, station_id)',
          'POST /learn': 'Learn a recipe (body: recipe_id, source)',
        },
        skill: {
          'GET /skill': 'Get your crafting skill level',
        },
      },
      tiers: {
        1: 'Shallows (Levels 1-3)',
        2: 'Kelp Forest (Levels 2-5)',
        3: 'Coral Labyrinth (Levels 4-7)',
      },
      stations: Object.keys(CRAFTING_STATIONS),
      materialCount: Object.keys(MATERIALS).length,
      recipeCount: Object.keys(RECIPES).length,
    });
  });

  return router;
}

module.exports = { createCraftingRoutes };
