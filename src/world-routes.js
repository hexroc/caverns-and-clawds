/**
 * Clawds & Caverns - World API Routes
 * 
 * Supports both static locations (The Shallows hub) and procedural zones.
 */

const express = require('express');
const { WorldManager, LOCATIONS, NPCS } = require('./world');
const { CharacterManager } = require('./character');
const { ZoneManager, SeededRandom } = require('./room-generator');
const { QuestEngine } = require('./quest-engine');

function createWorldRoutes(db, authenticateAgent) {
  const router = express.Router();
  const zoneManager = new ZoneManager(db);
  const world = new WorldManager(db, zoneManager);
  const characters = new CharacterManager(db);
  
  // Ensure the connection is bidirectional
  world.setZoneManager(zoneManager);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);
  
  // ============================================================================
  // INITIALIZE KELP FOREST ON STARTUP
  // ============================================================================
  
  (function initializeKelpForest() {
    try {
      const zone = zoneManager.getOrCreateZone('kelp_forest', 'kelp-forest-v1');
      if (zone) {
        console.log(`🌿 Kelp Forest initialized: ${zone.roomCount} rooms, entry: ${zone.entryRoomId}`);
        
        // Connect Kelp Forest entry to driftwood_docks
        // The driftwood_docks already has kelp_forest exit, we just need the zone to exist
      }
    } catch (err) {
      console.error('Failed to initialize Kelp Forest:', err);
    }
  })();

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
   * POST /api/world/recall - Teleport back to hub (The Briny Flagon)
   * 10 minute cooldown between recalls
   */
  router.post('/recall', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Check cooldown (stored in character's last_recall field)
      const now = Date.now();
      const cooldownMs = 10 * 60 * 1000; // 10 minutes
      
      // Get or create recall tracking
      const recallData = db.prepare(
        'SELECT last_recall FROM clawds WHERE id = ?'
      ).get(char.id);
      
      const lastRecall = recallData?.last_recall || 0;
      const timeSince = now - lastRecall;
      
      if (timeSince < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - timeSince) / 1000 / 60);
        return res.json({
          success: false,
          error: `Recall on cooldown. ${remaining} minutes remaining.`,
          cooldownRemaining: cooldownMs - timeSince
        });
      }
      
      // Already at hub?
      if (char.location === 'briny_flagon') {
        return res.json({
          success: true,
          message: 'You are already at The Briny Flagon.',
          location: char.location
        });
      }
      
      // Teleport to hub
      db.prepare('UPDATE clawds SET location = ?, last_recall = ? WHERE id = ?')
        .run('briny_flagon', now, char.id);
      
      res.json({
        success: true,
        message: '✨ A shimmer of magic surrounds you, and you find yourself back at The Briny Flagon.',
        from: char.location,
        to: 'briny_flagon',
        cooldown: '10 minutes until next recall'
      });
    } catch (err) {
      console.error('Recall error:', err);
      res.status(500).json({ success: false, error: 'Recall failed' });
    }
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
          error: 'direction required (north, south, east, west, or location name). Use POST /recall to return to hub.'
        });
      }
      
      const result = world.moveCharacter(char.id, direction.toLowerCase(), char.location);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Track room discovery for explore quests (Quest Engine v2)
      if (result.to && result.location) {
        try {
          const questEngine = new QuestEngine(db);
          const zone = result.location.zone || result.location.id?.split('_')[0] || 'unknown';
          const exploreUpdates = questEngine.recordDiscovery(char.id, result.to, zone);
          
          if (exploreUpdates && exploreUpdates.length > 0) {
            result.questUpdates = exploreUpdates;
            // Add messages for quest progress
            result.questMessages = exploreUpdates.map(u => {
              if (u.questComplete) {
                return u.message;
              }
              return `📜 ${u.questName}: ${u.objective} (${u.current}/${u.required})`;
            });
          }
        } catch (questErr) {
          console.error('Quest tracking error:', questErr);
          // Don't fail the move if quest tracking fails
        }
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
  // PROCEDURAL ZONE ENDPOINTS
  // ============================================================================

  /**
   * GET /api/world/zones - List all available zones with room counts
   */
  router.get('/zones', (req, res) => {
    try {
      // Get available zone types from world
      const availableZones = world.getAvailableZones();
      
      // Check which zones have been generated and get their stats
      const zonesWithStats = availableZones.map(zone => {
        const existingZone = db.prepare('SELECT * FROM zones WHERE type = ?').get(zone.type);
        return {
          ...zone,
          generated: !!existingZone,
          roomCount: existingZone?.room_count || 0,
          seed: existingZone?.seed || null,
          zoneId: existingZone?.id || null
        };
      });
      
      res.json({
        success: true,
        zones: zonesWithStats,
        hint: 'Use POST /api/world/generate-zone to create a new zone, or GET /api/world/zone/:type to get/create with default settings'
      });
    } catch (err) {
      console.error('List zones error:', err);
      res.status(500).json({ success: false, error: 'Failed to list zones' });
    }
  });

  /**
   * POST /api/world/generate-zone - Generate a new procedural zone (admin/debug)
   */
  router.post('/generate-zone', authenticateAgent, (req, res) => {
    try {
      const { type, seed, roomCount = 100 } = req.body;
      
      if (!type) {
        return res.status(400).json({ 
          success: false, 
          error: 'type required (kelp_forest, coral_labyrinth, murk, abyss, ruins, shallows)'
        });
      }
      
      const validTypes = ['kelp_forest', 'coral_labyrinth', 'murk', 'abyss', 'ruins', 'shallows'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid zone type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      // Generate seed if not provided
      const zoneSeed = seed || `${type}-${Date.now()}`;
      
      // Check if zone with this seed already exists
      const existingZone = db.prepare('SELECT * FROM zones WHERE type = ? AND seed = ?').get(type, zoneSeed);
      if (existingZone) {
        return res.status(400).json({
          success: false,
          error: 'Zone with this type and seed already exists',
          existingZone: {
            id: existingZone.id,
            type: existingZone.type,
            seed: existingZone.seed,
            roomCount: existingZone.room_count
          }
        });
      }
      
      // Generate the zone
      const zone = zoneManager.getOrCreateZone(type, zoneSeed);
      
      if (!zone) {
        return res.status(500).json({ success: false, error: 'Failed to generate zone' });
      }
      
      const entryRoom = zone.rooms[zone.entryRoomId];
      
      res.json({
        success: true,
        message: `Generated ${zone.name} with ${zone.roomCount} rooms`,
        zone: {
          id: zone.id,
          type: zone.type,
          name: zone.name,
          seed: zone.seed,
          levelRange: zone.levelRange,
          roomCount: zone.roomCount,
          entryRoomId: zone.entryRoomId
        },
        entryRoom: {
          id: entryRoom.id,
          name: entryRoom.name,
          description: entryRoom.shortDesc
        },
        hint: `Players can enter via POST /api/world/enter-zone with zoneType="${type}" and seed="${zoneSeed}"`
      });
    } catch (err) {
      console.error('Generate zone error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate zone' });
    }
  });

  /**
   * GET /api/world/zone/:type - Get zone info and entry point
   */
  router.get('/zone/:type', authenticateAgent, (req, res) => {
    try {
      const { type } = req.params;
      const seed = req.query.seed || 'default';
      
      const zone = zoneManager.getOrCreateZone(type, seed);
      if (!zone) {
        return res.status(404).json({ success: false, error: 'Unknown zone type' });
      }
      
      const entryRoom = zone.rooms[zone.entryRoomId];
      
      res.json({
        success: true,
        zone: {
          id: zone.id,
          type: zone.type,
          name: zone.name,
          levelRange: zone.levelRange,
          roomCount: zone.roomCount,
        },
        entryRoom: {
          id: entryRoom.id,
          name: entryRoom.name,
          description: entryRoom.shortDesc,
        },
      });
    } catch (err) {
      console.error('Get zone error:', err);
      res.status(500).json({ success: false, error: 'Failed to get zone' });
    }
  });

  /**
   * GET /api/world/room/:id - Get procedural room details
   */
  router.get('/room/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const room = zoneManager.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      
      // Mark as discovered
      zoneManager.discoverRoom(room.id, char.id);
      
      res.json({
        success: true,
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          zone: room.zoneName,
          level: room.level,
          exits: Object.keys(room.exits),
          features: room.features.map(f => ({
            id: f.id,
            name: f.name,
            searched: f.searched,
          })),
          hazards: room.hazards.filter(h => h.revealed).map(h => ({
            name: h.name,
            description: h.description,
          })),
          npcs: room.npcs || [],
          ambient: room.ambient,
          encounter: room.encounter ? { warning: 'Something lurks here...' } : null,
        },
      });
    } catch (err) {
      console.error('Get room error:', err);
      res.status(500).json({ success: false, error: 'Failed to get room' });
    }
  });

  /**
   * GET /api/world/search - Search current room for hidden things
   */
  router.get('/search', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Check if in procedural zone (room ID format: zonetype_seed_index)
      const location = char.location;
      const isProcedural = location.includes('_') && !LOCATIONS[location];
      
      if (!isProcedural) {
        // Static location - check features
        const staticLoc = LOCATIONS[location];
        if (!staticLoc) {
          return res.status(400).json({ success: false, error: 'Unknown location' });
        }
        
        const features = staticLoc.features || [];
        return res.json({
          success: true,
          location: staticLoc.name,
          message: features.length > 0 
            ? `You can see: ${features.join(', ')}`
            : 'You search but find nothing of particular interest.',
          searchableFeatures: features,
        });
      }
      
      // Procedural room
      const room = zoneManager.getRoom(location);
      if (!room) {
        return res.status(404).json({ success: false, error: 'Room not found' });
      }
      
      // List searchable features
      const searchable = room.features.filter(f => !f.searched);
      const searched = room.features.filter(f => f.searched);
      
      res.json({
        success: true,
        location: room.name,
        zone: room.zoneName,
        message: searchable.length > 0
          ? `You spot the following that might be worth investigating: ${searchable.map(f => f.name).join(', ')}`
          : 'You have already searched everything in this room.',
        searchableFeatures: searchable.map(f => ({ id: f.id, name: f.name })),
        alreadySearched: searched.map(f => ({ id: f.id, name: f.name })),
        hiddenHazards: room.hazards.filter(h => !h.revealed).length > 0,
      });
    } catch (err) {
      console.error('Search error:', err);
      res.status(500).json({ success: false, error: 'Failed to search' });
    }
  });

  /**
   * POST /api/world/search - Search a specific feature
   */
  router.post('/search', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { featureId } = req.body;
      if (!featureId) {
        return res.status(400).json({ success: false, error: 'featureId required' });
      }
      
      const location = char.location;
      const room = zoneManager.getRoom(location);
      if (!room) {
        return res.status(400).json({ success: false, error: 'Not in a searchable location' });
      }
      
      // Create RNG for search results
      const rng = new SeededRandom(`${room.id}_${featureId}_${Date.now()}`);
      
      // Perform search
      const feature = room.features.find(f => f.id === featureId);
      if (!feature) {
        return res.status(400).json({ success: false, error: 'Feature not found in this room' });
      }
      
      if (feature.searched) {
        return res.json({
          success: true,
          alreadySearched: true,
          message: `You have already searched the ${feature.name}.`,
        });
      }
      
      // Mark as searched
      feature.searched = true;
      zoneManager.updateRoomState(room.id, { features: room.features });
      
      // Determine if search found something
      const foundSomething = rng.chance(feature.searchChance);
      
      if (!foundSomething) {
        return res.json({
          success: true,
          found: false,
          message: `You search the ${feature.name} carefully but find nothing of value.`,
        });
      }
      
      // Pick loot
      const lootId = rng.pick(feature.possibleLoot);
      
      // Handle special results
      if (lootId === 'empty' || lootId === 'nothing' || lootId === 'junk') {
        return res.json({
          success: true,
          found: false,
          message: `You search the ${feature.name} thoroughly but only find worthless debris.`,
        });
      }
      
      if (lootId === 'trap' || lootId === 'mimic') {
        // Reveal a hazard or trigger encounter
        return res.json({
          success: true,
          found: true,
          trap: true,
          trapType: lootId,
          message: `As you reach into the ${feature.name}, something attacks!`,
          // Combat system would handle this
        });
      }
      
      res.json({
        success: true,
        found: true,
        lootId,
        message: `You search the ${feature.name} and discover: ${lootId.replace(/_/g, ' ')}!`,
        // Item system would add to inventory
      });
    } catch (err) {
      console.error('Search feature error:', err);
      res.status(500).json({ success: false, error: 'Failed to search feature' });
    }
  });

  /**
   * GET /api/world/map - Return discovered rooms in current zone
   */
  router.get('/map', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const location = char.location;
      
      // Determine zone type from location
      let zoneType;
      if (LOCATIONS[location]) {
        // Static location - show static map
        return res.json({
          success: true,
          mapType: 'static',
          currentLocation: location,
          locations: Object.values(LOCATIONS).map(loc => ({
            id: loc.id,
            name: loc.name,
            type: loc.type,
            exits: Object.keys(loc.exits || {}),
            current: loc.id === location,
          })),
        });
      }
      
      // Procedural location - extract zone type
      const parts = location.split('_');
      if (parts.length >= 2) {
        zoneType = parts[0];
      }
      
      if (!zoneType) {
        return res.status(400).json({ success: false, error: 'Cannot determine zone type' });
      }
      
      const mapResult = zoneManager.generateMap(char.id, zoneType);
      
      if (!mapResult.success) {
        return res.status(400).json(mapResult);
      }
      
      // Find current room in map
      const currentRoom = mapResult.map.find(r => r.id === location);
      
      res.json({
        success: true,
        mapType: 'procedural',
        zone: zoneType,
        currentLocation: location,
        currentRoom: currentRoom ? {
          id: currentRoom.id,
          name: currentRoom.name,
          isSpecial: currentRoom.isSpecial,
        } : null,
        discoveredRooms: mapResult.discoveredCount,
        map: mapResult.map,
      });
    } catch (err) {
      console.error('Map error:', err);
      res.status(500).json({ success: false, error: 'Failed to generate map' });
    }
  });

  /**
   * POST /api/world/enter-zone - Enter a procedural zone
   */
  router.post('/enter-zone', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { zoneType, seed } = req.body;
      if (!zoneType) {
        return res.status(400).json({ success: false, error: 'zoneType required' });
      }
      
      // Check if zone exists
      const zone = zoneManager.getOrCreateZone(zoneType, seed || 'default');
      if (!zone) {
        return res.status(400).json({ success: false, error: 'Unknown zone type' });
      }
      
      // Check level requirement
      const levelRange = zone.levelRange;
      if (char.level < levelRange[0]) {
        return res.status(400).json({
          success: false,
          error: `This zone requires level ${levelRange[0]}+. You are level ${char.level}.`,
        });
      }
      
      // Move character to zone entry
      const entryRoom = zone.rooms[zone.entryRoomId];
      db.prepare('UPDATE clawds SET current_zone = ? WHERE id = ?')
        .run(entryRoom.id, char.id);
      
      // Mark as discovered
      zoneManager.discoverRoom(entryRoom.id, char.id);
      
      res.json({
        success: true,
        message: `You enter ${zone.name}.`,
        zone: {
          id: zone.id,
          name: zone.name,
          levelRange: zone.levelRange,
        },
        room: {
          id: entryRoom.id,
          name: entryRoom.name,
          description: entryRoom.description,
          exits: Object.keys(entryRoom.exits),
          features: entryRoom.features.map(f => ({ id: f.id, name: f.name })),
          ambient: entryRoom.ambient,
        },
      });
    } catch (err) {
      console.error('Enter zone error:', err);
      res.status(500).json({ success: false, error: 'Failed to enter zone' });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns World API',
      version: '2.1.0',
      description: 'Explore the world, talk to NPCs, accept quests, navigate procedural zones',
      endpoints: {
        locations: {
          'GET /look': 'Look around current location (works for static and procedural)',
          'GET /location/:id': 'Get specific location info',
          'GET /locations': 'List all static locations',
          'POST /move': 'Move to adjacent location (body: {direction}) - works across static/procedural'
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
        },
        exploration: {
          'GET /search': 'List searchable features in current room',
          'POST /search': 'Search a specific feature (body: {featureId})',
          'GET /map': 'Get map of discovered rooms in current zone'
        },
        zones: {
          'GET /zones': 'List all available zone types with generation status',
          'POST /generate-zone': 'Generate a new zone (body: {type, seed?, roomCount?})',
          'GET /zone/:type': 'Get zone info (query: seed)',
          'GET /room/:id': 'Get procedural room details',
          'POST /enter-zone': 'Enter a procedural zone (body: {zoneType, seed?})'
        }
      },
      navigation: {
        hub: 'Start at briny_flagon (The Shallows hub)',
        directions: 'Use north, south, east, west, up, down, or special exits',
        kelpForest: 'From driftwood_docks, use direction "kelp_forest" to enter',
        procedural: 'Once in procedural zone, use cardinal directions to explore'
      },
      staticLocations: Object.keys(LOCATIONS),
      proceduralZones: ['kelp_forest', 'coral_labyrinth', 'murk', 'abyss', 'ruins', 'shallows'],
      npcs: Object.keys(NPCS)
    });
  });

  return router;
}

module.exports = { createWorldRoutes };
