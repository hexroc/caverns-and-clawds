/**
 * Caverns & Clawds - Hex Grid System
 * 
 * Axial coordinate hex grid for tactical combat.
 * Used in capstone dungeon battles.
 * 
 * Coordinate System: Axial (q, r)
 *   - q: column (increases right)
 *   - r: row (increases down-right)
 * 
 * Visual (pointy-top hexes):
 *       ⬡ ⬡ ⬡
 *      ⬡ ⬡ ⬡ ⬡
 *       ⬡ ⬡ ⬡
 */

// ============================================================================
// HEX MATH (Axial Coordinates)
// ============================================================================

/**
 * Create a hex coordinate
 */
function hex(q, r) {
  return { q, r, s: -q - r }; // s is derived for cube coords
}

/**
 * Hex equality check
 */
function hexEqual(a, b) {
  return a.q === b.q && a.r === b.r;
}

/**
 * Add two hex coordinates
 */
function hexAdd(a, b) {
  return hex(a.q + b.q, a.r + b.r);
}

/**
 * Subtract hex coordinates
 */
function hexSubtract(a, b) {
  return hex(a.q - b.q, a.r - b.r);
}

/**
 * Scale a hex coordinate
 */
function hexScale(h, factor) {
  return hex(h.q * factor, h.r * factor);
}

/**
 * Get the 6 neighbor directions (pointy-top orientation)
 */
const HEX_DIRECTIONS = [
  hex(1, 0),   // East
  hex(1, -1),  // Northeast
  hex(0, -1),  // Northwest
  hex(-1, 0),  // West
  hex(-1, 1),  // Southwest
  hex(0, 1),   // Southeast
];

/**
 * Get neighbor in a direction (0-5)
 */
function hexNeighbor(h, direction) {
  return hexAdd(h, HEX_DIRECTIONS[direction]);
}

/**
 * Get all 6 neighbors of a hex
 */
function hexNeighbors(h) {
  return HEX_DIRECTIONS.map(dir => hexAdd(h, dir));
}

/**
 * Calculate distance between two hexes (in hex steps)
 */
function hexDistance(a, b) {
  const diff = hexSubtract(a, b);
  return Math.max(Math.abs(diff.q), Math.abs(diff.r), Math.abs(diff.s));
}

/**
 * Linear interpolation between two hexes
 */
function hexLerp(a, b, t) {
  return hex(
    a.q + (b.q - a.q) * t,
    a.r + (b.r - a.r) * t
  );
}

/**
 * Round floating point hex to nearest integer hex
 */
function hexRound(h) {
  let q = Math.round(h.q);
  let r = Math.round(h.r);
  let s = Math.round(-h.q - h.r);
  
  const qDiff = Math.abs(q - h.q);
  const rDiff = Math.abs(r - h.r);
  const sDiff = Math.abs(s - (-h.q - h.r));
  
  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  }
  
  return hex(q, r);
}

/**
 * Get all hexes in a line from a to b (for line of sight)
 */
function hexLine(a, b) {
  const distance = hexDistance(a, b);
  if (distance === 0) return [a];
  
  const results = [];
  for (let i = 0; i <= distance; i++) {
    const t = i / distance;
    results.push(hexRound(hexLerp(a, b, t)));
  }
  return results;
}

/**
 * Get all hexes within range of center
 */
function hexRange(center, range) {
  const results = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push(hexAdd(center, hex(q, r)));
    }
  }
  return results;
}

/**
 * Get hexes forming a ring at exactly 'radius' distance from center
 */
function hexRing(center, radius) {
  if (radius === 0) return [center];
  
  const results = [];
  let current = hexAdd(center, hexScale(HEX_DIRECTIONS[4], radius)); // Start SW
  
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(current);
      current = hexNeighbor(current, i);
    }
  }
  return results;
}

// ============================================================================
// PIXEL CONVERSION (for rendering)
// ============================================================================

const HEX_SIZE = 30; // Pixels from center to corner

/**
 * Convert axial hex to pixel coordinates (pointy-top)
 */
function hexToPixel(h, size = HEX_SIZE) {
  const x = size * (Math.sqrt(3) * h.q + Math.sqrt(3) / 2 * h.r);
  const y = size * (3 / 2 * h.r);
  return { x, y };
}

/**
 * Convert pixel to axial hex (pointy-top)
 */
function pixelToHex(x, y, size = HEX_SIZE) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return hexRound(hex(q, r));
}

// ============================================================================
// TERRAIN TYPES
// ============================================================================

const TERRAIN = {
  FLOOR: { id: 'floor', walkable: true, moveCost: 1, blocksLOS: false, char: '·' },
  WALL: { id: 'wall', walkable: false, moveCost: Infinity, blocksLOS: true, char: '█' },
  WATER: { id: 'water', walkable: true, moveCost: 2, blocksLOS: false, char: '~' },
  DIFFICULT: { id: 'difficult', walkable: true, moveCost: 2, blocksLOS: false, char: '▒' },
  PIT: { id: 'pit', walkable: false, moveCost: Infinity, blocksLOS: false, char: '○' },
  DOOR: { id: 'door', walkable: true, moveCost: 1, blocksLOS: false, char: '▯' },
  CHEST: { id: 'chest', walkable: false, moveCost: Infinity, blocksLOS: false, char: '▣' },
  STAIRS_DOWN: { id: 'stairs_down', walkable: true, moveCost: 1, blocksLOS: false, char: '▼' },
  STAIRS_UP: { id: 'stairs_up', walkable: true, moveCost: 1, blocksLOS: false, char: '▲' },
};

// ============================================================================
// HEX GRID CLASS
// ============================================================================

class HexGrid {
  constructor(radius = 10) {
    this.radius = radius;
    this.hexes = new Map(); // "q,r" -> hex data
    this.entities = new Map(); // "q,r" -> entity[]
    this.initialize();
  }
  
  /**
   * Initialize grid with floor terrain
   */
  initialize() {
    const allHexes = hexRange(hex(0, 0), this.radius);
    for (const h of allHexes) {
      this.setTerrain(h, TERRAIN.FLOOR);
    }
  }
  
  /**
   * Get hex key for Map storage
   */
  _key(h) {
    return `${h.q},${h.r}`;
  }
  
  /**
   * Parse key back to hex
   */
  _parseKey(key) {
    const [q, r] = key.split(',').map(Number);
    return hex(q, r);
  }
  
  /**
   * Check if hex is within grid bounds
   */
  inBounds(h) {
    return hexDistance(hex(0, 0), h) <= this.radius;
  }
  
  /**
   * Get hex data (terrain, etc)
   */
  getHex(h) {
    if (!this.inBounds(h)) return null;
    return this.hexes.get(this._key(h)) || { terrain: TERRAIN.FLOOR };
  }
  
  /**
   * Set terrain at a hex
   */
  setTerrain(h, terrain) {
    if (!this.inBounds(h)) return false;
    const key = this._key(h);
    const existing = this.hexes.get(key) || {};
    this.hexes.set(key, { ...existing, terrain });
    return true;
  }
  
  /**
   * Get terrain at a hex
   */
  getTerrain(h) {
    const data = this.getHex(h);
    return data?.terrain || TERRAIN.FLOOR;
  }
  
  /**
   * Check if hex is walkable
   */
  isWalkable(h) {
    const terrain = this.getTerrain(h);
    if (!terrain.walkable) return false;
    
    // Check for blocking entities
    const entities = this.getEntities(h);
    return !entities.some(e => e.blocksMovement);
  }
  
  /**
   * Get movement cost for a hex
   */
  getMoveCost(h) {
    const terrain = this.getTerrain(h);
    return terrain.moveCost;
  }
  
  // === ENTITY MANAGEMENT ===
  
  /**
   * Add entity to hex
   */
  addEntity(h, entity) {
    if (!this.inBounds(h)) return false;
    
    const key = this._key(h);
    if (!this.entities.has(key)) {
      this.entities.set(key, []);
    }
    
    // Set position on entity
    entity.position = { q: h.q, r: h.r };
    this.entities.get(key).push(entity);
    return true;
  }
  
  /**
   * Remove entity from hex
   */
  removeEntity(h, entityId) {
    const key = this._key(h);
    const entities = this.entities.get(key);
    if (!entities) return false;
    
    const index = entities.findIndex(e => e.id === entityId);
    if (index === -1) return false;
    
    entities.splice(index, 1);
    if (entities.length === 0) {
      this.entities.delete(key);
    }
    return true;
  }
  
  /**
   * Get entities at hex
   */
  getEntities(h) {
    return this.entities.get(this._key(h)) || [];
  }
  
  /**
   * Find entity by ID
   */
  findEntity(entityId) {
    for (const [key, entities] of this.entities) {
      const entity = entities.find(e => e.id === entityId);
      if (entity) {
        return { entity, position: this._parseKey(key) };
      }
    }
    return null;
  }
  
  /**
   * Move entity to new hex
   */
  moveEntity(entityId, to) {
    const found = this.findEntity(entityId);
    if (!found) return { success: false, error: 'Entity not found' };
    
    if (!this.inBounds(to)) return { success: false, error: 'Out of bounds' };
    if (!this.isWalkable(to)) return { success: false, error: 'Hex not walkable' };
    
    this.removeEntity(found.position, entityId);
    this.addEntity(to, found.entity);
    
    return { success: true, from: found.position, to };
  }
  
  /**
   * Get all entities within range of a position
   */
  getEntitiesInRange(center, range) {
    const results = [];
    const hexesInRange = hexRange(center, range);
    
    for (const h of hexesInRange) {
      const entities = this.getEntities(h);
      for (const entity of entities) {
        results.push({ entity, position: h, distance: hexDistance(center, h) });
      }
    }
    
    return results.sort((a, b) => a.distance - b.distance);
  }
  
  // === LINE OF SIGHT ===
  
  /**
   * Check if there's line of sight between two hexes
   */
  hasLineOfSight(from, to) {
    const line = hexLine(from, to);
    
    // Check each hex in the line (except start and end)
    for (let i = 1; i < line.length - 1; i++) {
      const h = line[i];
      const terrain = this.getTerrain(h);
      if (terrain.blocksLOS) return false;
      
      // Check for blocking entities
      const entities = this.getEntities(h);
      if (entities.some(e => e.blocksLOS)) return false;
    }
    
    return true;
  }
  
  /**
   * Get all hexes visible from a position within range
   */
  getVisibleHexes(from, range) {
    const visible = new Set();
    visible.add(this._key(from)); // Always see your own hex
    
    const hexesInRange = hexRange(from, range);
    for (const h of hexesInRange) {
      if (this.hasLineOfSight(from, h)) {
        visible.add(this._key(h));
      }
    }
    
    return Array.from(visible).map(k => this._parseKey(k));
  }
  
  /**
   * Get all hexes within range of a center position
   * @param {Object} center - Center hex {q, r}
   * @param {number} range - Range in hexes
   * @returns {Array} Array of hex coordinates within range
   */
  getHexesInRange(center, range) {
    return hexRange(center, range).filter(h => this.inBounds(h));
  }
  
  // === PATHFINDING ===
  
  /**
   * Find path from start to goal (A* algorithm)
   */
  findPath(start, goal, maxCost = 100) {
    if (!this.inBounds(start) || !this.inBounds(goal)) return null;
    if (!this.isWalkable(goal)) return null;
    
    const frontier = [{ hex: start, priority: 0 }];
    const cameFrom = new Map();
    const costSoFar = new Map();
    
    cameFrom.set(this._key(start), null);
    costSoFar.set(this._key(start), 0);
    
    while (frontier.length > 0) {
      // Get lowest priority
      frontier.sort((a, b) => a.priority - b.priority);
      const current = frontier.shift().hex;
      
      if (hexEqual(current, goal)) {
        // Reconstruct path
        const path = [];
        let node = goal;
        while (node && !hexEqual(node, start)) {
          path.unshift(node);
          node = cameFrom.get(this._key(node));
        }
        return path;
      }
      
      for (const next of hexNeighbors(current)) {
        if (!this.inBounds(next) || !this.isWalkable(next)) continue;
        
        const newCost = costSoFar.get(this._key(current)) + this.getMoveCost(next);
        const nextKey = this._key(next);
        
        if (newCost > maxCost) continue;
        
        if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
          costSoFar.set(nextKey, newCost);
          const priority = newCost + hexDistance(next, goal);
          frontier.push({ hex: next, priority });
          cameFrom.set(nextKey, current);
        }
      }
    }
    
    return null; // No path found
  }
  
  /**
   * Get all reachable hexes within movement budget
   */
  getReachableHexes(start, movementBudget) {
    const reachable = new Map();
    const frontier = [{ hex: start, cost: 0 }];
    reachable.set(this._key(start), 0);
    
    while (frontier.length > 0) {
      const { hex: current, cost } = frontier.shift();
      
      for (const next of hexNeighbors(current)) {
        if (!this.inBounds(next) || !this.isWalkable(next)) continue;
        
        const newCost = cost + this.getMoveCost(next);
        if (newCost > movementBudget) continue;
        
        const nextKey = this._key(next);
        if (!reachable.has(nextKey) || newCost < reachable.get(nextKey)) {
          reachable.set(nextKey, newCost);
          frontier.push({ hex: next, cost: newCost });
        }
      }
    }
    
    return Array.from(reachable.entries()).map(([key, cost]) => ({
      hex: this._parseKey(key),
      cost
    }));
  }
  
  // === ASCII RENDERING ===
  
  /**
   * Render grid as ASCII for agents
   * @param {Object} viewerPos - Position of viewer (for fog of war)
   * @param {number} visionRange - How far viewer can see
   * @param {Set} visibleHexes - Pre-computed visible hexes (optional)
   */
  renderASCII(viewerPos = null, visionRange = 10, visibleHexes = null) {
    // Calculate visible hexes if not provided
    let visible = visibleHexes;
    if (!visible && viewerPos) {
      visible = new Set(
        this.getVisibleHexes(viewerPos, visionRange).map(h => this._key(h))
      );
    }
    
    const lines = [];
    
    // Render from top to bottom, left to right
    for (let r = -this.radius; r <= this.radius; r++) {
      let line = '';
      
      // Offset for pointy-top hex display
      const offset = ' '.repeat(Math.abs(r));
      line += offset;
      
      for (let q = -this.radius; q <= this.radius; q++) {
        const h = hex(q, r);
        if (!this.inBounds(h)) {
          line += '  ';
          continue;
        }
        
        const key = this._key(h);
        
        // Fog of war check
        if (visible && !visible.has(key)) {
          line += '? ';
          continue;
        }
        
        // Check for entities first
        const entities = this.getEntities(h);
        if (entities.length > 0) {
          // Show first entity's character
          line += (entities[0].char || '●') + ' ';
          continue;
        }
        
        // Show terrain
        const terrain = this.getTerrain(h);
        line += terrain.char + ' ';
      }
      
      lines.push(line.trimEnd());
    }
    
    return lines.join('\n');
  }
  
  /**
   * Get grid state as JSON (for WebSocket/spectators)
   */
  toJSON(visibleHexes = null) {
    const hexData = [];
    
    for (const [key, data] of this.hexes) {
      if (visibleHexes && !visibleHexes.has(key)) continue;
      
      const h = this._parseKey(key);
      const entities = this.getEntities(h);
      
      hexData.push({
        q: h.q,
        r: h.r,
        terrain: data.terrain.id,
        entities: entities.map(e => ({
          id: e.id,
          type: e.type,
          name: e.name,
          char: e.char,
          team: e.team
        }))
      });
    }
    
    return {
      radius: this.radius,
      hexes: hexData
    };
  }
}

// ============================================================================
// ROOM GENERATOR
// ============================================================================

/**
 * Generate a dungeon room on hex grid
 */
function generateRoom(type, size = 8, seed = null) {
  const grid = new HexGrid(size);
  
  // Create walls around edge
  const edge = hexRing(hex(0, 0), size);
  for (const h of edge) {
    grid.setTerrain(h, TERRAIN.WALL);
  }
  
  // Add features based on room type
  switch (type) {
    case 'combat':
      // Add tactical cover and obstacles
      addRandomTerrain(grid, TERRAIN.DIFFICULT, 4, seed);  // Difficult terrain patches
      addRandomTerrain(grid, TERRAIN.WALL, 2, seed);       // Rock pillars for cover
      addRandomTerrain(grid, TERRAIN.WATER, 1, seed);      // Water hazard
      break;
      
    case 'treasure':
      // Add chest in center
      grid.setTerrain(hex(0, 0), TERRAIN.CHEST);
      break;
      
    case 'trap':
      // Add pits
      addRandomTerrain(grid, TERRAIN.PIT, 4, seed);
      addRandomTerrain(grid, TERRAIN.DIFFICULT, 2, seed);
      break;
      
    case 'rest':
      // Safe room, maybe some water
      addRandomTerrain(grid, TERRAIN.WATER, 2, seed);
      break;
      
    case 'puzzle':
      // Complex terrain
      addRandomTerrain(grid, TERRAIN.WALL, 4, seed);
      addRandomTerrain(grid, TERRAIN.DOOR, 2, seed);
      break;
      
    case 'boss':
      // Large arena with pillars and hazards for tactical play
      // Add symmetrical pillars (4 corners)
      const pillarOffsets = [
        hex(Math.floor(size * 0.4), -Math.floor(size * 0.2)),
        hex(-Math.floor(size * 0.4), Math.floor(size * 0.2)),
        hex(Math.floor(size * 0.2), Math.floor(size * 0.4)),
        hex(-Math.floor(size * 0.2), -Math.floor(size * 0.4)),
      ];
      for (const offset of pillarOffsets) {
        grid.setTerrain(offset, TERRAIN.WALL);
        // Add adjacent difficult terrain (rubble)
        for (const neighbor of hexNeighbors(offset)) {
          if (grid.inBounds(neighbor) && hexDistance(neighbor, hex(0, 0)) > 2) {
            grid.setTerrain(neighbor, TERRAIN.DIFFICULT);
          }
        }
      }
      // Add water pools near edges for variety
      addRandomTerrain(grid, TERRAIN.WATER, 4, seed);
      // A few pits for danger
      addRandomTerrain(grid, TERRAIN.PIT, 2, seed);
      break;
  }
  
  return grid;
}

/**
 * Add random terrain features to grid
 */
function addRandomTerrain(grid, terrain, count, seed = null) {
  const rng = seed ? seededRandom(seed) : Math.random;
  const interior = hexRange(hex(0, 0), grid.radius - 2);
  
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * interior.length);
    const h = interior[idx];
    
    // Don't overwrite center (spawn point)
    if (hexDistance(h, hex(0, 0)) > 1) {
      grid.setTerrain(h, terrain);
    }
  }
}

/**
 * Simple seeded random for deterministic generation
 */
function seededRandom(seed) {
  let h = 0;
  if (typeof seed === 'string') {
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
    }
  } else {
    h = seed;
  }
  
  return function() {
    h |= 0;
    h = h + 0x6D2B79F5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Hex math
  hex,
  hexEqual,
  hexAdd,
  hexSubtract,
  hexScale,
  hexNeighbor,
  hexNeighbors,
  hexDistance,
  hexLine,
  hexRange,
  hexRing,
  hexRound,
  hexToPixel,
  pixelToHex,
  HEX_DIRECTIONS,
  HEX_SIZE,
  
  // Grid
  HexGrid,
  TERRAIN,
  
  // Room generation
  generateRoom,
  seededRandom,
};
