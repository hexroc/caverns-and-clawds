// Tileset Configuration for Caverns & Clawds
// Defines which tiles come from which position in each tileset

const TILESET_CONFIG = {
  // Primary dungeon tileset (Calciumtrice - 16x16 tiles, 512x640)
  dungeon: {
    src: '/assets/tilesets/dungeon_tileset_1.png',
    tileSize: 16,
    scale: 3, // Render at 48x48
    tiles: {
      // Floor tiles (row 1-2, various positions)
      floor: [{ x: 1, y: 5 }],  // Stone floor
      floor_cracked: [{ x: 2, y: 5 }],
      floor_moss: [{ x: 3, y: 5 }],
      
      // Wall tiles
      wall: [{ x: 0, y: 0, w: 3, h: 2 }],  // Top wall section
      wall_top: [{ x: 1, y: 0 }],
      wall_corner_tl: [{ x: 0, y: 0 }],
      wall_corner_tr: [{ x: 2, y: 0 }],
      wall_side_l: [{ x: 0, y: 1 }],
      wall_side_r: [{ x: 2, y: 1 }],
      
      // Decorations
      torch: [{ x: 20, y: 14 }],
      chest_closed: [{ x: 25, y: 30 }],
      chest_open: [{ x: 26, y: 30 }],
      barrel: [{ x: 22, y: 28 }],
      crate: [{ x: 23, y: 28 }],
      
      // Doors
      door_closed: [{ x: 0, y: 38, w: 2, h: 2 }],
      door_open: [{ x: 2, y: 38, w: 2, h: 2 }],
      
      // Stairs
      stairs_down: [{ x: 21, y: 28 }],
      stairs_up: [{ x: 20, y: 28 }]
    }
  },
  
  // Cave tileset for underwater/natural areas (256x336, 16x16)
  cave: {
    src: '/assets/tilesets/cave_tileset.png',
    tileSize: 16,
    scale: 3,
    tiles: {
      // Floor tiles
      floor: [{ x: 1, y: 4 }],
      floor_wet: [{ x: 2, y: 4 }],
      
      // Cave walls
      wall: [{ x: 0, y: 0 }],
      wall_moss: [{ x: 1, y: 0 }],
      
      // Water/lava
      water: [{ x: 12, y: 18 }, { x: 13, y: 18 }],  // Animated frames
      lava: [{ x: 0, y: 20 }, { x: 1, y: 20 }],
      
      // Stalagmites
      pillar: [{ x: 6, y: 6 }]
    }
  },
  
  // Utumno tileset for monsters and items (2048x1536, 32x32)
  utumno: {
    src: '/assets/tilesets/utumno_tileset.png',
    tileSize: 32,
    scale: 1.5,
    
    // Monster sprites (approximate positions based on the tileset)
    monsters: {
      // Sea creatures (good for C&C theme!)
      crab: { x: 37, y: 2 },
      lobster: { x: 38, y: 2 },
      octopus: { x: 39, y: 2 },
      jellyfish: { x: 35, y: 2 },
      fish: { x: 40, y: 2 },
      shark: { x: 41, y: 2 },
      
      // Classic dungeon monsters
      skeleton: { x: 1, y: 1 },
      zombie: { x: 2, y: 1 },
      ghost: { x: 3, y: 1 },
      bat: { x: 10, y: 1 },
      spider: { x: 12, y: 1 },
      slime: { x: 14, y: 1 },
      goblin: { x: 5, y: 3 },
      orc: { x: 6, y: 3 },
      troll: { x: 7, y: 3 },
      
      // Bosses
      dragon: { x: 20, y: 2, w: 2, h: 2 },
      demon: { x: 22, y: 2, w: 2, h: 2 }
    },
    
    // Item sprites
    items: {
      potion_red: { x: 0, y: 23 },
      potion_blue: { x: 1, y: 23 },
      potion_green: { x: 2, y: 23 },
      scroll: { x: 10, y: 23 },
      key: { x: 20, y: 23 },
      gold_pile: { x: 25, y: 23 },
      sword: { x: 0, y: 27 },
      shield: { x: 10, y: 27 },
      bow: { x: 20, y: 27 }
    },
    
    // Floor/terrain tiles
    tiles: {
      floor: [{ x: 0, y: 14 }],
      floor_stone: [{ x: 1, y: 14 }],
      floor_dirt: [{ x: 2, y: 14 }],
      wall: [{ x: 0, y: 13 }],
      water: [{ x: 24, y: 15 }],
      grass: [{ x: 3, y: 14 }]
    }
  }
};

// Tileset manager class
class TilesetManager {
  constructor() {
    this.tilesets = new Map();
    this.loadedImages = new Map();
    this.ready = false;
    this.onReady = null;
  }
  
  // Load all tilesets
  async loadAll() {
    const promises = [];
    
    for (const [name, config] of Object.entries(TILESET_CONFIG)) {
      promises.push(this.loadTileset(name, config));
    }
    
    await Promise.all(promises);
    this.ready = true;
    if (this.onReady) this.onReady();
    console.log('✅ All tilesets loaded');
  }
  
  // Load a single tileset
  loadTileset(name, config) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(name, img);
        this.tilesets.set(name, config);
        console.log(`Loaded tileset: ${name} (${img.width}x${img.height})`);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load tileset: ${name}`);
        resolve(); // Don't reject, just continue without this tileset
      };
      img.src = config.src;
    });
  }
  
  // Get a tile's source rectangle
  getTileRect(tilesetName, tileName, frame = 0) {
    const config = this.tilesets.get(tilesetName);
    if (!config) return null;
    
    const tileData = config.tiles?.[tileName] || config.monsters?.[tileName] || config.items?.[tileName];
    if (!tileData) return null;
    
    // Handle array of frames (for animation)
    const tile = Array.isArray(tileData) ? tileData[frame % tileData.length] : tileData;
    
    return {
      x: tile.x * config.tileSize,
      y: tile.y * config.tileSize,
      w: (tile.w || 1) * config.tileSize,
      h: (tile.h || 1) * config.tileSize,
      scale: config.scale
    };
  }
  
  // Draw a tile to canvas
  drawTile(ctx, tilesetName, tileName, destX, destY, destSize, frame = 0, options = {}) {
    const img = this.loadedImages.get(tilesetName);
    const rect = this.getTileRect(tilesetName, tileName, frame);
    
    if (!img || !rect) {
      // Fallback to solid color
      ctx.fillStyle = options.fallbackColor || '#2a2a35';
      ctx.fillRect(destX, destY, destSize, destSize);
      return false;
    }
    
    // Apply dimming for fog of war
    if (options.dimmed) {
      ctx.globalAlpha = 0.4;
    }
    
    // Draw the tile
    ctx.drawImage(
      img,
      rect.x, rect.y, rect.w, rect.h,
      destX, destY, destSize, destSize
    );
    
    // Reset alpha
    ctx.globalAlpha = 1;
    return true;
  }
  
  // Draw an entity sprite
  drawEntity(ctx, entityType, destX, destY, destSize, options = {}) {
    // Map entity types to tileset sprites
    const mapping = this.getEntitySpriteMapping(entityType);
    if (mapping) {
      return this.drawTile(ctx, mapping.tileset, mapping.sprite, destX, destY, destSize, options.frame || 0, options);
    }
    return false;
  }
  
  // Map entity types to sprite locations
  getEntitySpriteMapping(entityType) {
    const type = entityType.toLowerCase();
    
    // Sea creatures
    if (type.includes('crab')) return { tileset: 'utumno', sprite: 'crab' };
    if (type.includes('lobster')) return { tileset: 'utumno', sprite: 'lobster' };
    if (type.includes('jellyfish')) return { tileset: 'utumno', sprite: 'jellyfish' };
    if (type.includes('octopus')) return { tileset: 'utumno', sprite: 'octopus' };
    if (type.includes('fish') || type.includes('shark')) return { tileset: 'utumno', sprite: 'shark' };
    
    // Classic monsters
    if (type.includes('skeleton')) return { tileset: 'utumno', sprite: 'skeleton' };
    if (type.includes('zombie')) return { tileset: 'utumno', sprite: 'zombie' };
    if (type.includes('ghost') || type.includes('spirit')) return { tileset: 'utumno', sprite: 'ghost' };
    if (type.includes('bat')) return { tileset: 'utumno', sprite: 'bat' };
    if (type.includes('spider')) return { tileset: 'utumno', sprite: 'spider' };
    if (type.includes('slime') || type.includes('ooze')) return { tileset: 'utumno', sprite: 'slime' };
    if (type.includes('goblin')) return { tileset: 'utumno', sprite: 'goblin' };
    if (type.includes('orc')) return { tileset: 'utumno', sprite: 'orc' };
    if (type.includes('troll')) return { tileset: 'utumno', sprite: 'troll' };
    
    return null;
  }
}

// Export for use in theater.js
window.TilesetManager = TilesetManager;
window.TILESET_CONFIG = TILESET_CONFIG;
