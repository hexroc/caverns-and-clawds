/**
 * Clawds & Caverns - Procedural Room Generator
 * 
 * Generates unique, reproducible rooms from zone templates.
 * Uses seeded RNG for consistent results.
 * 
 * All hail the claw. 🦞
 */

const { ZONE_TEMPLATES, SPECIAL_ROOMS, ROOM_NAMES } = require('./room-templates');

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

/**
 * Mulberry32 - Simple seeded PRNG
 * Fast, deterministic, good distribution
 */
class SeededRandom {
  constructor(seed) {
    this.seed = this.hashString(String(seed));
  }
  
  // Convert string seed to number
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) || 1;
  }
  
  // Get next random number [0, 1)
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  
  // Random integer in range [min, max]
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  // Random element from array
  pick(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(this.next() * array.length)];
  }
  
  // Random elements from array (without replacement)
  pickMultiple(array, count) {
    const copy = [...array];
    const result = [];
    for (let i = 0; i < Math.min(count, copy.length); i++) {
      const idx = Math.floor(this.next() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
  
  // Weighted random selection
  pickWeighted(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = this.next() * totalWeight;
    
    for (const item of items) {
      random -= item.weight || 1;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }
  
  // Random boolean with probability
  chance(probability) {
    return this.next() < probability;
  }
  
  // Shuffle array in place
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// ============================================================================
// ROOM GENERATOR
// ============================================================================

class RoomGenerator {
  constructor() {
    this.oppositeDirections = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
      up: 'down',
      down: 'up',
      in: 'out',
      out: 'in',
    };
    
    this.directions = ['north', 'south', 'east', 'west'];
    this.allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
  }
  
  /**
   * Generate a unique room ID
   */
  generateRoomId(zoneType, index, seed) {
    return `${zoneType}_${seed}_${index}`;
  }
  
  /**
   * Generate a room name from template components
   */
  generateRoomName(zoneType, rng) {
    const names = ROOM_NAMES[zoneType];
    if (!names) return 'Unknown Area';
    
    const adjective = rng.pick(names.adjectives);
    const noun = rng.pick(names.nouns);
    return `${adjective} ${noun}`;
  }
  
  /**
   * Generate a room description from template
   */
  generateDescription(template, rng) {
    const prefix = rng.pick(template.prefixes);
    const main = rng.pick(template.mainDescriptions);
    const suffix = rng.pick(template.suffixes);
    
    return `${prefix} ${main}\n\n${suffix}`;
  }
  
  /**
   * Generate features for a room
   */
  generateFeatures(template, level, rng) {
    const features = [];
    const availableFeatures = template.features || [];
    
    // Base number of features scales with level
    const baseCount = Math.floor(level / 3) + 1;
    const featureCount = rng.nextInt(1, Math.min(baseCount + 1, 3));
    
    const selectedFeatures = rng.pickMultiple(availableFeatures, featureCount);
    
    for (const feature of selectedFeatures) {
      features.push({
        id: feature.id,
        name: feature.name,
        searched: false,
        searchChance: feature.searchChance,
        possibleLoot: feature.loot,
      });
    }
    
    return features;
  }
  
  /**
   * Generate hazards for a room
   */
  generateHazards(template, level, rng) {
    const hazards = [];
    const availableHazards = template.hazards || [];
    
    if (availableHazards.length === 0) return hazards;
    
    // Higher level = more likely hazards
    const hazardChance = Math.min(0.1 + (level * 0.03), 0.5);
    
    if (rng.chance(hazardChance)) {
      const hazard = rng.pick(availableHazards);
      hazards.push({
        ...hazard,
        active: true,
        revealed: false,
      });
    }
    
    return hazards;
  }
  
  /**
   * Generate potential enemy encounter for a room
   */
  generateEncounter(template, level, rng) {
    const enemies = template.enemies || [];
    if (enemies.length === 0) return null;
    
    // Encounter chance based on zone and room type
    const encounterChance = 0.3;
    
    if (!rng.chance(encounterChance)) return null;
    
    const enemy = rng.pickWeighted(enemies);
    
    // Scale enemy level
    const enemyLevel = level + rng.nextInt(-1, 1);
    
    return {
      enemyId: enemy.id,
      level: Math.max(1, enemyLevel),
      count: rng.nextInt(1, Math.ceil(level / 2)),
    };
  }
  
  /**
   * Generate a single room
   */
  generateRoom(zoneType, level, seed, index = 0) {
    const template = ZONE_TEMPLATES[zoneType];
    if (!template) {
      throw new Error(`Unknown zone type: ${zoneType}`);
    }
    
    // Create seeded RNG for this specific room
    const roomSeed = `${seed}_${zoneType}_${index}`;
    const rng = new SeededRandom(roomSeed);
    
    // Generate room components
    const id = this.generateRoomId(zoneType, index, seed);
    const name = this.generateRoomName(zoneType, rng);
    const description = this.generateDescription(template, rng);
    const features = this.generateFeatures(template, level, rng);
    const hazards = this.generateHazards(template, level, rng);
    const encounter = this.generateEncounter(template, level, rng);
    const ambient = rng.pick(template.ambients || []);
    
    // Determine room type for layout hints
    const roomTypes = template.roomTypes || { standard: 1 };
    const roomTypeEntries = Object.entries(roomTypes).map(([type, weight]) => ({ type, weight }));
    const roomType = rng.pickWeighted(roomTypeEntries).type;
    
    return {
      id,
      name,
      description,
      shortDesc: `${name} - ${template.name}`,
      zone: zoneType,
      zoneName: template.name,
      level,
      levelRange: template.levelRange,
      roomType,
      theme: template.theme,
      visibility: template.visibility,
      features,
      hazards,
      encounter,
      ambient,
      exits: {}, // Filled in during zone generation
      npcs: [],
      players: [],
      items: [], // Items dropped/left by players
      discovered: false, // Has any player found this room?
      firstDiscoveredBy: null,
      firstDiscoveredAt: null,
    };
  }
  
  /**
   * Generate an entire zone with connected rooms
   */
  generateZone(zoneType, roomCount, seed) {
    const template = ZONE_TEMPLATES[zoneType];
    if (!template) {
      throw new Error(`Unknown zone type: ${zoneType}`);
    }
    
    const rng = new SeededRandom(`${seed}_zone_${zoneType}`);
    const rooms = new Map();
    const grid = new Map(); // For spatial tracking: "x,y" -> roomId
    
    // Generate rooms
    const levelRange = template.levelRange;
    
    for (let i = 0; i < roomCount; i++) {
      // Level varies within zone range based on position
      const progress = i / roomCount;
      const levelSpan = levelRange[1] - levelRange[0];
      const baseLevel = levelRange[0] + Math.floor(progress * levelSpan);
      const level = Math.max(levelRange[0], Math.min(levelRange[1], 
        baseLevel + rng.nextInt(-1, 1)));
      
      const room = this.generateRoom(zoneType, level, seed, i);
      rooms.set(room.id, room);
    }
    
    // Connect rooms using a graph-based approach
    this.connectRooms(rooms, rng, zoneType);
    
    // Add special rooms
    this.insertSpecialRooms(rooms, zoneType, seed, rng);
    
    // Create zone entry point
    const entryRoom = rooms.values().next().value;
    entryRoom.isEntry = true;
    entryRoom.name = `${template.name} Entrance`;
    
    // Add exit back to the hub (driftwood_docks for most zones)
    entryRoom.exits.back = 'driftwood_docks';
    entryRoom.exits.return = 'driftwood_docks';
    
    return {
      id: `zone_${zoneType}_${seed}`,
      type: zoneType,
      name: template.name,
      seed,
      levelRange: template.levelRange,
      roomCount: rooms.size,
      entryRoomId: entryRoom.id,
      rooms: Object.fromEntries(rooms),
    };
  }
  
  /**
   * Connect rooms with bidirectional exits
   */
  connectRooms(rooms, rng, zoneType) {
    const roomArray = Array.from(rooms.values());
    const connected = new Set();
    const toConnect = [...roomArray];
    
    if (toConnect.length === 0) return;
    
    // Start with first room
    const firstRoom = toConnect.shift();
    connected.add(firstRoom.id);
    
    // Connect each room to an already-connected room
    while (toConnect.length > 0) {
      const room = toConnect.shift();
      
      // Find a connected room to link to
      const connectedArray = Array.from(connected);
      const targetId = rng.pick(connectedArray);
      const targetRoom = rooms.get(targetId);
      
      // Pick a direction
      const availableDirections = this.directions.filter(
        dir => !room.exits[dir] && !targetRoom.exits[this.oppositeDirections[dir]]
      );
      
      if (availableDirections.length > 0) {
        const direction = rng.pick(availableDirections);
        const opposite = this.oppositeDirections[direction];
        
        // Create bidirectional connection
        room.exits[direction] = targetRoom.id;
        targetRoom.exits[opposite] = room.id;
      } else {
        // If no cardinal directions available, use special exits
        const specialDir = `passage_${room.id.slice(-4)}`;
        const specialOpposite = `passage_${targetRoom.id.slice(-4)}`;
        room.exits[specialDir] = targetRoom.id;
        targetRoom.exits[specialOpposite] = room.id;
      }
      
      connected.add(room.id);
    }
    
    // Add extra connections for non-linear exploration (30% of rooms get extra exits)
    for (const room of roomArray) {
      if (rng.chance(0.3)) {
        const exitCount = Object.keys(room.exits).length;
        if (exitCount < 4) {
          // Find another room to connect to
          const candidates = roomArray.filter(r => 
            r.id !== room.id && 
            Object.keys(r.exits).length < 4 &&
            !Object.values(room.exits).includes(r.id)
          );
          
          if (candidates.length > 0) {
            const target = rng.pick(candidates);
            const availableDirections = this.directions.filter(
              dir => !room.exits[dir] && !target.exits[this.oppositeDirections[dir]]
            );
            
            if (availableDirections.length > 0) {
              const direction = rng.pick(availableDirections);
              const opposite = this.oppositeDirections[direction];
              room.exits[direction] = target.id;
              target.exits[opposite] = room.id;
            }
          }
        }
      }
    }
  }
  
  /**
   * Insert special rooms into the zone
   */
  insertSpecialRooms(rooms, zoneType, seed, rng) {
    const specialRooms = Object.values(SPECIAL_ROOMS).filter(r => r.zone === zoneType);
    
    for (const specialTemplate of specialRooms) {
      // Create special room
      const specialRoom = {
        id: `${zoneType}_${seed}_special_${specialTemplate.id}`,
        ...specialTemplate,
        zone: zoneType,
        zoneName: ZONE_TEMPLATES[zoneType].name,
        exits: {},
        players: [],
        items: [],
        discovered: false,
        isSpecial: true,
      };
      
      // Connect to a random existing room
      const roomArray = Array.from(rooms.values());
      const connectionTarget = rng.pick(roomArray);
      
      // Find available direction
      const availableDirections = this.directions.filter(
        dir => !connectionTarget.exits[dir]
      );
      
      if (availableDirections.length > 0) {
        const direction = rng.pick(availableDirections);
        const opposite = this.oppositeDirections[direction];
        
        specialRoom.exits[opposite] = connectionTarget.id;
        connectionTarget.exits[direction] = specialRoom.id;
      } else {
        // Use special passage name
        const passageName = `hidden_passage_to_${specialRoom.id.slice(-8)}`;
        const returnPassage = `exit_from_${specialTemplate.name.toLowerCase().replace(/\s+/g, '_')}`;
        
        specialRoom.exits[returnPassage] = connectionTarget.id;
        connectionTarget.exits[passageName] = specialRoom.id;
      }
      
      rooms.set(specialRoom.id, specialRoom);
    }
  }
  
  /**
   * Generate the Kelp Forest zone specifically
   */
  generateKelpForest(seed = 'kelp_forest_default') {
    return this.generateZone('kelp_forest', 100, seed);
  }
  
  /**
   * Search a room feature for loot
   */
  searchFeature(room, featureId, characterLevel, rng) {
    const feature = room.features.find(f => f.id === featureId);
    if (!feature) {
      return { success: false, error: 'Feature not found' };
    }
    
    if (feature.searched) {
      return { success: false, error: 'Already searched', message: 'You find nothing new.' };
    }
    
    feature.searched = true;
    
    // Check if search is successful
    if (!rng.chance(feature.searchChance)) {
      return { 
        success: true, 
        found: false, 
        message: `You search the ${feature.name} but find nothing of interest.` 
      };
    }
    
    // Pick random loot
    const lootId = rng.pick(feature.possibleLoot);
    
    // Handle special loot results
    if (lootId === 'empty' || lootId === 'nothing' || lootId === 'junk') {
      return {
        success: true,
        found: false,
        message: `You search the ${feature.name} thoroughly but find nothing valuable.`,
      };
    }
    
    if (lootId === 'trap' || lootId === 'mimic') {
      return {
        success: true,
        found: true,
        trap: true,
        trapType: lootId,
        message: `As you search the ${feature.name}, something attacks!`,
      };
    }
    
    return {
      success: true,
      found: true,
      lootId,
      message: `You search the ${feature.name} and find something!`,
    };
  }
}

// ============================================================================
// ZONE MANAGER
// ============================================================================

/**
 * Manages generated zones and room state
 */
class ZoneManager {
  constructor(db) {
    this.db = db;
    this.generator = new RoomGenerator();
    this.zones = new Map(); // In-memory zone cache
    this.initDB();
  }
  
  initDB() {
    // Procedural rooms table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS procedural_rooms (
        id TEXT PRIMARY KEY,
        zone_id TEXT NOT NULL,
        zone_type TEXT NOT NULL,
        room_data TEXT NOT NULL,
        discovered_by TEXT,
        discovered_at TEXT,
        items_json TEXT DEFAULT '[]',
        state_json TEXT DEFAULT '{}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Zone metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        seed TEXT NOT NULL,
        entry_room_id TEXT NOT NULL,
        room_count INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Player room discovery tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_discoveries (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, room_id)
      )
    `);
    
    console.log('🗺️ Zone database initialized');
  }
  
  /**
   * Get or generate a zone
   */
  getOrCreateZone(zoneType, seed = 'default') {
    const zoneId = `zone_${zoneType}_${seed}`;
    
    // Check memory cache
    if (this.zones.has(zoneId)) {
      return this.zones.get(zoneId);
    }
    
    // Check database
    const existing = this.db.prepare('SELECT * FROM zones WHERE id = ?').get(zoneId);
    if (existing) {
      // Load zone and rooms from DB
      return this.loadZoneFromDB(existing);
    }
    
    // Generate new zone
    const zone = this.generator.generateZone(zoneType, 100, seed);
    this.saveZoneToDB(zone);
    this.zones.set(zoneId, zone);
    
    return zone;
  }
  
  /**
   * Save zone to database
   */
  saveZoneToDB(zone) {
    // Save zone metadata
    this.db.prepare(`
      INSERT OR REPLACE INTO zones (id, type, name, seed, entry_room_id, room_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(zone.id, zone.type, zone.name, zone.seed, zone.entryRoomId, zone.roomCount);
    
    // Save each room
    const insertRoom = this.db.prepare(`
      INSERT OR REPLACE INTO procedural_rooms (id, zone_id, zone_type, room_data)
      VALUES (?, ?, ?, ?)
    `);
    
    for (const room of Object.values(zone.rooms)) {
      insertRoom.run(room.id, zone.id, zone.type, JSON.stringify(room));
    }
  }
  
  /**
   * Load zone from database
   */
  loadZoneFromDB(zoneMeta) {
    const rooms = this.db.prepare(
      'SELECT * FROM procedural_rooms WHERE zone_id = ?'
    ).all(zoneMeta.id);
    
    const zone = {
      id: zoneMeta.id,
      type: zoneMeta.type,
      name: zoneMeta.name,
      seed: zoneMeta.seed,
      entryRoomId: zoneMeta.entry_room_id,
      roomCount: zoneMeta.room_count,
      rooms: {},
    };
    
    for (const roomRow of rooms) {
      const roomData = JSON.parse(roomRow.room_data);
      // Merge with any runtime state
      if (roomRow.items_json) {
        roomData.items = JSON.parse(roomRow.items_json);
      }
      if (roomRow.state_json) {
        const state = JSON.parse(roomRow.state_json);
        Object.assign(roomData, state);
      }
      if (roomRow.discovered_by) {
        roomData.discovered = true;
        roomData.firstDiscoveredBy = roomRow.discovered_by;
        roomData.firstDiscoveredAt = roomRow.discovered_at;
      }
      zone.rooms[roomData.id] = roomData;
    }
    
    this.zones.set(zone.id, zone);
    return zone;
  }
  
  /**
   * Get a specific room by ID
   */
  getRoom(roomId) {
    // Parse zone info from room ID
    // Room ID format: {zoneType}_{seed}_{index} or {zoneType}_{seed}_special_{specialId}
    // Zone types may contain underscores (e.g., kelp_forest)
    
    // Try to find it in cached zones first
    for (const zone of this.zones.values()) {
      if (zone.rooms[roomId]) {
        return zone.rooms[roomId];
      }
    }
    
    // If not in cache, try to parse the room ID and load the zone
    // Known zone types: kelp_forest, coral_labyrinth, murk, abyss, ruins, shallows
    const knownZoneTypes = ['kelp_forest', 'coral_labyrinth', 'murk', 'abyss', 'ruins', 'shallows'];
    
    for (const zoneType of knownZoneTypes) {
      if (roomId.startsWith(zoneType + '_')) {
        const remainder = roomId.slice(zoneType.length + 1);
        const parts = remainder.split('_');
        if (parts.length >= 2) {
          const seed = parts[0];
          const zone = this.getOrCreateZone(zoneType, seed);
          if (zone?.rooms[roomId]) {
            return zone.rooms[roomId];
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * Mark a room as discovered by a character
   */
  discoverRoom(roomId, characterId) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    
    // Check if already discovered by this character
    const existing = this.db.prepare(
      'SELECT * FROM room_discoveries WHERE character_id = ? AND room_id = ?'
    ).get(characterId, roomId);
    
    if (existing) return false; // Already discovered
    
    // Record discovery
    const crypto = require('crypto');
    this.db.prepare(`
      INSERT INTO room_discoveries (id, character_id, room_id)
      VALUES (?, ?, ?)
    `).run(crypto.randomUUID(), characterId, roomId);
    
    // Update room if first discovery
    if (!room.discovered) {
      room.discovered = true;
      room.firstDiscoveredBy = characterId;
      room.firstDiscoveredAt = new Date().toISOString();
      
      this.db.prepare(`
        UPDATE procedural_rooms 
        SET discovered_by = ?, discovered_at = ?
        WHERE id = ?
      `).run(characterId, room.firstDiscoveredAt, roomId);
    }
    
    return true;
  }
  
  /**
   * Get all rooms discovered by a character in a zone
   */
  getDiscoveredRooms(characterId, zoneType) {
    const discoveries = this.db.prepare(`
      SELECT room_id FROM room_discoveries 
      WHERE character_id = ? AND room_id LIKE ?
    `).all(characterId, `${zoneType}_%`);
    
    return discoveries.map(d => this.getRoom(d.room_id)).filter(Boolean);
  }
  
  /**
   * Update room state (items, searched features, etc.)
   */
  updateRoomState(roomId, updates) {
    const room = this.getRoom(roomId);
    if (!room) return false;
    
    Object.assign(room, updates);
    
    this.db.prepare(`
      UPDATE procedural_rooms 
      SET items_json = ?, state_json = ?
      WHERE id = ?
    `).run(
      JSON.stringify(room.items || []),
      JSON.stringify({ features: room.features, hazards: room.hazards }),
      roomId
    );
    
    return true;
  }
  
  /**
   * Get zone entry room (for ferry/travel)
   */
  getZoneEntry(zoneType, seed = 'default') {
    const zone = this.getOrCreateZone(zoneType, seed);
    return zone?.rooms[zone.entryRoomId] || null;
  }
  
  /**
   * Generate a simple map of discovered rooms
   */
  generateMap(characterId, zoneType) {
    const discovered = this.getDiscoveredRooms(characterId, zoneType);
    
    if (discovered.length === 0) {
      return { success: false, error: 'No rooms discovered in this zone' };
    }
    
    // Build adjacency map
    const map = discovered.map(room => ({
      id: room.id,
      name: room.name,
      discovered: true,
      exits: Object.entries(room.exits || {}).map(([dir, targetId]) => ({
        direction: dir,
        targetId,
        known: discovered.some(d => d.id === targetId),
      })),
      isSpecial: room.isSpecial || false,
      isEntry: room.isEntry || false,
    }));
    
    return {
      success: true,
      zone: zoneType,
      discoveredCount: discovered.length,
      map,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  SeededRandom,
  RoomGenerator,
  ZoneManager,
};
