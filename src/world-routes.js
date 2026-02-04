/**
 * Clawds & Caverns - World API Routes
 */

const express = require('express');
const { WorldManager, LOCATIONS, NPCS } = require('./world');
const { CharacterManager } = require('./character');
const { ZoneManager, SeededRandom } = require('./room-generator');

function createWorldRoutes(db, authenticateAgent) {
  const router = express.Router();
  const world = new WorldManager(db);
  const characters = new CharacterManager(db);
  const zoneManager = new ZoneManager(db);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);

  // ============================================================================
  // LOCATION ENDPOINTS
  // ============================================================================

  /**
   * GET /api/world/look - Look around current location
   */
  router.get('/look', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = world.look(char.location);
      res.json(result);
    } catch (err) {
      console.error('Look error:', err);
      res.status(500).json({ success: false, error: 'Failed to look around' });
    }
  });

  /**
   * GET /api/world/location/:id - Get location info (public)
   */
  router.get('/location/:id', (req, res) => {
    try {
      const location = world.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ success: false, error: 'Location not found' });
      }
      res.json({ success: true, location });
    } catch (err) {
      console.error('Get location error:', err);
      res.status(500).json({ success: false, error: 'Failed to get location' });
    }
  });

  /**
   * GET /api/world/locations - List all locations
   */
  router.get('/locations', (req, res) => {
    const locations = Object.values(LOCATIONS).map(loc => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      shortDesc: loc.shortDesc,
      levelRange: loc.levelRange
    }));
    res.json({ success: true, locations });
  });

  /**
   * POST /api/world/move - Move to adjacent location
   */
  router.post('/move', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { direction } = req.body;
      if (!direction) {
        return res.status(400).json({ 
          success: false, 
          error: 'direction required (north, south, east, west, or location name)'
        });
      }
      
      const result = world.moveCharacter(char.id, direction.toLowerCase(), char.location);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Move error:', err);
      res.status(500).json({ success: false, error: 'Failed to move' });
    }
  });

  // ============================================================================
  // NPC ENDPOINTS
  // ============================================================================

  /**
   * GET /api/world/npcs - List NPCs at current location
   */
  router.get('/npcs', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const location = LOCATIONS[char.location];
      if (!location) {
        return res.status(400).json({ success: false, error: 'Invalid location' });
      }
      
      const npcs = (location.npcs || []).map(npcId => {
        const npc = NPCS[npcId];
        return npc ? {
          id: npc.id,
          name: npc.name,
          title: npc.title,
          race: npc.race,
          description: npc.description,
          services: npc.services
        } : null;
      }).filter(Boolean);
      
      res.json({ success: true, npcs });
    } catch (err) {
      console.error('Get NPCs error:', err);
      res.status(500).json({ success: false, error: 'Failed to get NPCs' });
    }
  });

  /**
   * POST /api/world/talk - Talk to an NPC
   */
  router.post('/talk', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { npc, topic } = req.body;
      if (!npc) {
        return res.status(400).json({ success: false, error: 'npc required' });
      }
      
      // Check if NPC is at current location
      const location = LOCATIONS[char.location];
      if (!location?.npcs?.includes(npc)) {
        return res.status(400).json({ 
          success: false, 
          error: `${npc} is not here. NPCs here: ${location?.npcs?.join(', ') || 'none'}`
        });
      }
      
      const result = world.talkToNPC(npc, topic);
      res.json(result);
    } catch (err) {
      console.error('Talk error:', err);
      res.status(500).json({ success: false, error: 'Failed to talk to NPC' });
    }
  });

  // ============================================================================
  // QUEST ENDPOINTS
  // ============================================================================

  /**
   * GET /api/world/quests - Get available quests at current location
   */
  router.get('/quests', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const quests = world.getQuests(char.id, char.location);
      res.json({ success: true, quests, location: char.location });
    } catch (err) {
      console.error('Get quests error:', err);
      res.status(500).json({ success: false, error: 'Failed to get quests' });
    }
  });

  /**
   * GET /api/world/quests/active - Get your active quests
   */
  router.get('/quests/active', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const quests = world.getActiveQuests(char.id);
      res.json({ success: true, quests });
    } catch (err) {
      console.error('Get active quests error:', err);
      res.status(500).json({ success: false, error: 'Failed to get active quests' });
    }
  });

  /**
   * POST /api/world/quests/accept - Accept a quest
   */
  router.post('/quests/accept', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { questId } = req.body;
      if (!questId) {
        return res.status(400).json({ success: false, error: 'questId required' });
      }
      
      const result = world.acceptQuest(char.id, questId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Accept quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to accept quest' });
    }
  });

  // ============================================================================
  // REST ENDPOINT
  // ============================================================================

  /**
   * POST /api/world/rest - Rest at tavern or temple to heal
   */
  router.post('/rest', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Can only rest at certain locations
      const restLocations = ['briny_flagon', 'tide_temple'];
      if (!restLocations.includes(char.location)) {
        return res.status(400).json({ 
          success: false, 
          error: 'You can only rest at the tavern or temple',
          hint: 'Go to The Briny Flagon or Tide Temple'
        });
      }
      
      const previousHP = char.hp_current;
      const maxHP = char.hp_max;
      
      // Full heal at rest
      const healAmount = maxHP - previousHP;
      if (healAmount > 0) {
        characters.updateHP(char.id, healAmount);
      }
      
      const location = LOCATIONS[char.location];
      const flavor = char.location === 'briny_flagon' 
        ? 'You settle into a worn booth with a mug of seaweed ale. The warmth of the tavern seeps into your shell as you rest.'
        : 'Priestess Marina offers a blessing as you rest in the temple\'s healing waters.';
      
      res.json({
        success: true,
        message: `You rest and recover. HP restored to full.`,
        flavor,
        previousHP,
        currentHP: maxHP,
        maxHP,
        location: location.name
      });
    } catch (err) {
      console.error('Rest error:', err);
      res.status(500).json({ success: false, error: 'Failed to rest' });
    }
  });

  // ============================================================================
  // PLAYER ENDPOINTS
  // ============================================================================

  /**
   * GET /api/world/players - See players at current location
   */
  router.get('/players', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const location = world.getLocation(char.location);
      const players = location?.players || [];
      
      res.json({ 
        success: true, 
        location: char.location,
        players: players.filter(p => p.id !== char.id) // Exclude self
      });
    } catch (err) {
      console.error('Get players error:', err);
      res.status(500).json({ success: false, error: 'Failed to get players' });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns World API',
      version: '1.0.0',
      description: 'Explore the world, talk to NPCs, accept quests',
      endpoints: {
        locations: {
          'GET /look': 'Look around current location',
          'GET /location/:id': 'Get specific location info',
          'GET /locations': 'List all locations',
          'POST /move': 'Move to adjacent location (body: {direction})'
        },
        npcs: {
          'GET /npcs': 'List NPCs at current location',
          'POST /talk': 'Talk to an NPC (body: {npc, topic?})'
        },
        quests: {
          'GET /quests': 'Get available quests here',
          'GET /quests/active': 'Get your active quests',
          'POST /quests/accept': 'Accept a quest (body: {questId})'
        },
        players: {
          'GET /players': 'See other players at your location'
        }
      },
      locations: Object.keys(LOCATIONS),
      npcs: Object.keys(NPCS)
    });
  });

  return router;
}

module.exports = { createWorldRoutes };
