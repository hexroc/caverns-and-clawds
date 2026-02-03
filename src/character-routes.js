/**
 * Clawds & Caverns - Character API Routes
 */

const express = require('express');
const { CharacterManager, RELIGIONS } = require('./character');

function createCharacterRoutes(db, authenticateAgent) {
  const router = express.Router();
  const characters = new CharacterManager(db);

  // ============================================================================
  // PUBLIC ENDPOINTS
  // ============================================================================

  /**
   * GET /api/character/races - List all playable races
   */
  router.get('/races', (req, res) => {
    res.json({
      success: true,
      races: characters.getRaces()
    });
  });

  /**
   * GET /api/character/classes - List all playable classes
   */
  router.get('/classes', (req, res) => {
    res.json({
      success: true,
      classes: characters.getClasses()
    });
  });

  /**
   * GET /api/character/religions - List all religions
   */
  router.get('/religions', (req, res) => {
    const religions = Object.entries(RELIGIONS).map(([id, r]) => ({
      id,
      name: r.name,
      description: r.description,
      blessing: r.blessing
    }));
    res.json({ success: true, religions });
  });

  // ============================================================================
  // AUTHENTICATED ENDPOINTS
  // ============================================================================

  /**
   * GET /api/character - Get your character (full sheet)
   */
  router.get('/', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      
      if (!character) {
        return res.status(404).json({
          success: false,
          error: 'No character found',
          hint: 'POST /api/character/create to make one'
        });
      }
      
      res.json({ success: true, character });
    } catch (err) {
      console.error('Get character error:', err);
      res.status(500).json({ success: false, error: 'Failed to get character' });
    }
  });

  /**
   * POST /api/character/create - Create a new character
   */
  router.post('/create', authenticateAgent, (req, res) => {
    try {
      const { name, race, class: characterClass, stats, statMethod, skills, religion, personality, speakingStyle } = req.body;
      
      if (!name || !race || !characterClass) {
        return res.status(400).json({
          success: false,
          error: 'Required fields: name, race, class, stats, skills',
          hint: 'GET /api/character/races, /classes, /religions, /personality-traits for options'
        });
      }
      
      const result = characters.createCharacter(req.user.id, {
        name,
        race,
        characterClass,
        stats,
        statMethod: statMethod || 'pointbuy',
        skillChoices: skills || [],
        religion: religion || 'none',
        personality: personality || {},
        speakingStyle: speakingStyle || ''
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.status(201).json(result);
    } catch (err) {
      console.error('Create character error:', err);
      res.status(500).json({ success: false, error: 'Failed to create character' });
    }
  });
  
  /**
   * GET /api/character/personality-traits - List personality trait options
   * Used to determine how AI characters act during events
   */
  router.get('/personality-traits', (req, res) => {
    res.json({
      success: true,
      traits: {
        courage: {
          name: 'Courage',
          description: 'How your character faces danger',
          options: ['brave', 'cautious', 'reckless']
        },
        greed: {
          name: 'Greed',
          description: 'How your character values treasure',
          options: ['greedy', 'generous', 'practical']
        },
        trust: {
          name: 'Trust',
          description: 'How your character views strangers',
          options: ['trusting', 'suspicious', 'neutral']
        },
        conflict: {
          name: 'Conflict Resolution',
          description: 'How your character handles confrontation',
          options: ['aggressive', 'diplomatic', 'cunning']
        },
        morality: {
          name: 'Morality',
          description: 'Your character\'s ethical compass',
          options: ['honorable', 'pragmatic', 'ruthless']
        }
      },
      speakingStyleExamples: [
        'Formal and eloquent',
        'Rough and direct',
        'Nervous, lots of pauses',
        'Overly cheerful',
        'Speaks in third person',
        'Heavy accent (specify)',
        'Uses nautical terms constantly'
      ],
      hint: 'Set personality: { courage: "brave", greed: "practical", ... } and speakingStyle: "description"'
    });
  });

  /**
   * DELETE /api/character - Delete your character
   */
  router.delete('/', authenticateAgent, (req, res) => {
    try {
      const result = characters.deleteCharacter(req.user.id);
      
      if (!result.success) {
        return res.status(404).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Delete character error:', err);
      res.status(500).json({ success: false, error: 'Failed to delete character' });
    }
  });

  /**
   * POST /api/character/roll-stats - Roll 4d6 drop lowest for each stat
   */
  router.post('/roll-stats', authenticateAgent, (req, res) => {
    const { rollStats } = require('./character');
    const stats = rollStats();
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    
    res.json({
      success: true,
      stats,
      total,
      message: `Rolled: STR ${stats.str}, DEX ${stats.dex}, CON ${stats.con}, INT ${stats.int}, WIS ${stats.wis}, CHA ${stats.cha} (Total: ${total})`
    });
  });

  // ============================================================================
  // GAME ACTIONS (authenticated)
  // ============================================================================

  /**
   * POST /api/character/heal - Heal HP
   */
  router.post('/heal', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'amount required (positive number)' });
      }
      
      const result = characters.updateHP(character.id, Math.abs(amount));
      res.json(result);
    } catch (err) {
      console.error('Heal error:', err);
      res.status(500).json({ success: false, error: 'Failed to heal' });
    }
  });

  /**
   * POST /api/character/damage - Take damage
   */
  router.post('/damage', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'amount required (positive number)' });
      }
      
      const result = characters.updateHP(character.id, -Math.abs(amount));
      res.json(result);
    } catch (err) {
      console.error('Damage error:', err);
      res.status(500).json({ success: false, error: 'Failed to apply damage' });
    }
  });

  /**
   * POST /api/character/xp - Award XP
   */
  router.post('/xp', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { amount } = req.body;
      if (!amount || amount < 1) {
        return res.status(400).json({ success: false, error: 'amount required (positive number)' });
      }
      
      const result = characters.addXP(character.id, amount);
      res.json(result);
    } catch (err) {
      console.error('XP error:', err);
      res.status(500).json({ success: false, error: 'Failed to award XP' });
    }
  });

  /**
   * POST /api/character/currency - Update currency
   */
  router.post('/currency', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { currency, amount } = req.body;
      if (!currency || amount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Required: currency (pearls|silver_scales|gold_shells), amount'
        });
      }
      
      const result = characters.updateCurrency(character.id, currency, amount);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Currency error:', err);
      res.status(500).json({ success: false, error: 'Failed to update currency' });
    }
  });

  // ============================================================================
  // COSMETICS
  // ============================================================================

  /**
   * GET /api/character/cosmetics - Get your equipped cosmetics
   */
  router.get('/cosmetics', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      res.json({
        success: true,
        cosmetics: character.cosmetics,
        slots: ['shell', 'claws', 'trail', 'title']
      });
    } catch (err) {
      console.error('Get cosmetics error:', err);
      res.status(500).json({ success: false, error: 'Failed to get cosmetics' });
    }
  });

  /**
   * POST /api/character/cosmetics/equip - Equip a cosmetic
   * Body: { itemId: string }
   */
  router.post('/cosmetics/equip', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { itemId } = req.body;
      if (!itemId) {
        return res.status(400).json({ success: false, error: 'itemId required' });
      }
      
      const result = characters.equipCosmetic(character.id, itemId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Equip cosmetic error:', err);
      res.status(500).json({ success: false, error: 'Failed to equip cosmetic' });
    }
  });

  /**
   * POST /api/character/cosmetics/unequip - Unequip a cosmetic slot
   * Body: { slot: 'shell' | 'claws' | 'trail' | 'title' }
   */
  router.post('/cosmetics/unequip', authenticateAgent, (req, res) => {
    try {
      const character = characters.getCharacterByAgent(req.user.id);
      if (!character) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { slot } = req.body;
      if (!slot) {
        return res.status(400).json({ success: false, error: 'slot required (shell, claws, trail, title)' });
      }
      
      const result = characters.unequipCosmetic(character.id, slot);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Unequip cosmetic error:', err);
      res.status(500).json({ success: false, error: 'Failed to unequip cosmetic' });
    }
  });

  // ============================================================================
  // PUBLIC PROFILE (must be after specific routes to avoid matching)
  // ============================================================================
  // DOCS (must be before /:id catch-all)
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns Character API',
      version: '1.0.0',
      description: 'Create and manage lobster adventurers',
      endpoints: {
        public: {
          'GET /races': 'List all playable lobster races',
          'GET /classes': 'List all playable classes',
          'GET /:id': 'View character public profile'
        },
        authenticated: {
          'GET /': 'Get your full character sheet',
          'POST /create': 'Create new character (name, race, class required)',
          'DELETE /': 'Delete your character',
          'POST /roll-stats': 'Roll 4d6 drop lowest for stats',
          'POST /heal': 'Heal HP (amount)',
          'POST /damage': 'Take damage (amount)',
          'POST /xp': 'Award XP (amount)',
          'POST /currency': 'Update currency (currency, amount)',
          'GET /cosmetics': 'Get equipped cosmetics',
          'POST /cosmetics/equip': 'Equip a cosmetic (itemId)',
          'POST /cosmetics/unequip': 'Unequip a slot (shell, claws, trail, title)'
        }
      },
      creation: {
        races: '10 lobster variants (american, european, slipper, squat, spiny, reef, pistol, calico, ghost, split)',
        classes: 'fighter, rogue, cleric, wizard',
        stats: 'Point buy only. 27 points, all start at 8. Cost: 8-13=1pt each, 14-15=2pt each. Max 15 before racial bonuses.',
        example: { str: 10, dex: 15, con: 14, int: 8, wis: 12, cha: 10 }
      }
    });
  });

  // ============================================================================
  // PUBLIC PROFILE (must be last - catches /:id)
  // ============================================================================

  /**
   * GET /api/character/:id - View any character (public profile)
   */
  router.get('/:id', (req, res) => {
    try {
      const character = characters.getCharacter(req.params.id);
      
      if (!character) {
        return res.status(404).json({ success: false, error: 'Character not found' });
      }
      
      // Public view - hide some details
      res.json({
        success: true,
        character: {
          id: character.id,
          name: character.name,
          race: character.race,
          class: character.class,
          level: character.level,
          location: character.location,
          cosmetics: character.cosmetics
        }
      });
    } catch (err) {
      console.error('Get character error:', err);
      res.status(500).json({ success: false, error: 'Failed to get character' });
    }
  });

  return router;
}

module.exports = { createCharacterRoutes };
