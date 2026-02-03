// Theater Mode - Dungeon Run Spectator View with Tactical Grid

// ===== PLAYER CUSTOMIZATION =====
const PLAYER_BASES = ['🦞', '🦀', '🦐'];
const PLAYER_COLORS = {
  red: 'hue-rotate(0deg)',
  blue: 'hue-rotate(200deg)',
  green: 'hue-rotate(100deg)',
  purple: 'hue-rotate(270deg)',
  gold: 'hue-rotate(40deg) saturate(2)',
  ice: 'hue-rotate(180deg) brightness(1.3)',
  fire: 'hue-rotate(20deg) saturate(1.5)',
  shadow: 'brightness(0.5) contrast(1.5)'
};
const PLAYER_SIZES = {
  small: 0.8,
  normal: 1.0,
  large: 1.2,
  huge: 1.4
};
const PLAYER_ACCESSORIES = {
  crown: '👑',
  sword: '⚔️',
  shield: '🛡️',
  tophat: '🎩',
  skull: '💀',
  fire: '🔥',
  ice: '❄️',
  lightning: '⚡',
  star: '⭐'
};

// ===== ACTION SEQUENCER =====
// Queues all combat-related updates to pace them for watchability
class ActionSequencer {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.defaultDelay = 1200; // ms between actions
    this.enabled = true; // Can be disabled for instant mode
  }

  // Add an action to the queue
  enqueue(action) {
    if (!this.enabled) {
      // Instant mode - execute immediately
      this.execute(action);
      return;
    }
    
    this.queue.push(action);
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  // Process the next action in queue
  processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const action = this.queue.shift();
    
    // Execute the action
    this.execute(action);
    
    // Wait before processing next
    const delay = action.delay ?? this.defaultDelay;
    setTimeout(() => this.processNext(), delay);
  }

  // Execute a single action
  execute(action) {
    try {
      switch (action.type) {
        case 'entity_update':
          if (tacticalGrid && action.entity) {
            tacticalGrid.updateEntity(action.entity.id, action.entity);
          }
          break;
          
        case 'entity_move':
          if (tacticalGrid && action.entityId && action.path) {
            const entity = tacticalGrid.entities.get(action.entityId);
            if (entity) {
              tacticalGrid.animateMovement(entity, action.path);
            }
          }
          break;
          
        case 'attack_roll':
          if (dialogQueue) {
            const { roll, modifier, total, ac, hit, critical } = action;
            dialogQueue.showAttack(roll || total - (modifier || 0), modifier || 0, total, ac, hit, critical);
          }
          break;
          
        case 'damage_dealt':
          if (dialogQueue && action.amount > 0) {
            dialogQueue.showDamage(action.amount, action.damageType || 'damage', action.targetName || '');
          }
          if (tacticalGrid && action.x !== undefined && action.y !== undefined) {
            tacticalGrid.showDamageNumber(action.x, action.y, action.amount, action.damageType || 'damage');
          }
          break;
          
        case 'healing':
          if (dialogQueue && action.amount > 0) {
            dialogQueue.showHeal(action.amount, action.source || '');
          }
          if (tacticalGrid && action.x !== undefined && action.y !== undefined) {
            tacticalGrid.showDamageNumber(action.x, action.y, action.amount, 'heal');
          }
          break;
          
        case 'combat_action':
          handleCombatAction(action.action);
          break;
          
        case 'narrative':
          appendLog({
            type: 'action',
            content: action.content,
            timestamp: Date.now()
          });
          break;
          
        case 'message':
          if (dialogQueue) {
            dialogQueue.showMessage(action.text, action.portrait || '📜', action.speaker || '', action.duration || 2500);
          }
          break;
      }
    } catch (e) {
      console.error('Action sequencer error:', e, action);
    }
  }

  // Clear the queue (e.g., when changing rooms)
  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
  
  // Get queue length for debugging
  get length() {
    return this.queue.length;
  }
}

// Global sequencer instance
let actionSequencer = null;

// Get player appearance from character data
function getPlayerAppearance(characterStats) {
  const appearance = characterStats?.appearance || {};
  return {
    base: appearance.base || '🦞',
    color: appearance.color || 'red',
    size: appearance.size || 'normal',
    accessory: appearance.accessory || null
  };
}

// Get run ID from URL
const urlParams = new URLSearchParams(window.location.search);
const runId = urlParams.get('run');
const campaignId = urlParams.get('id');

// State
let ws = null;
let wsConnected = false;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let autoScroll = true;
let runStartTime = null;
let timerInterval = null;
let lastLogId = null;
let lastSeenFloor = null;
let lastSeenRoom = null;

// Tactical Grid instance
let tacticalGrid = null;

// ===== TACTICAL GRID CLASS =====
class TacticalGrid {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.overlayCanvas = null;
    this.overlayCtx = null;
    this.uiContainer = null;
    
    // Grid state
    this.grid = [];
    this.width = 0;
    this.height = 0;
    this.tileSize = 48;
    this.minTileSize = 24;
    this.maxTileSize = 96;
    
    // Camera
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.targetCamera = { x: 0, y: 0, zoom: 1 };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.lastTouch = null;
    this.pinchDistance = null;
    
    // Entities
    this.entities = new Map();
    this.playerEntity = null;
    this.activeEntity = null;
    
    // Turn state
    this.isPlayerTurn = false;
    this.movementRemaining = 30;
    this.actionUsed = false;
    this.bonusActionUsed = false;
    this.reachableTiles = new Set();
    this.attackRangeTiles = new Set();
    this.pathPreview = [];
    this.hoveredTile = null;
    this.selectedEntity = null;
    
    // Fog of war
    this.visibility = new Map(); // 'x,y' -> 'visible' | 'seen' | 'hidden'
    this.visionRadius = 8;
    
    // Animations
    this.animations = [];
    this.particles = [];
    this.damageNumbers = [];
    
    // Tileset manager - DISABLED, using CSS patterns instead
    // this.tilesetManager = window.TilesetManager ? new window.TilesetManager() : null;
    this.tilesetManager = null;
    this.tilesetsLoaded = false;
    this.activeTileset = 'dungeon'; // 'dungeon' or 'cave' based on floor theme
    this.animationFrame = 0;
    
    // Tile colors (procedural rendering - designed to look good)
    this.tileColors = {
      floor: '#4a4a5e',        // Cooler gray-blue stone floor
      wall: '#2a2a3a',         // Dark stone walls
      door: '#8b6536',         // Warm wood
      door_open: '#6b4e2a',    // Darker open door
      water: '#2a5a8a',        // Deep ocean blue
      lava: '#c43d10',         // Bright orange-red lava
      high_ground: '#5a5a6e',  // Elevated stone
      cover_half: '#4a4a58',   // Debris/rocks
      cover_full: '#3a3a4a',   // Full cover boulder
      pit: '#080810',          // Nearly black pit
      stairs_up: '#5e5e70',    // Lighter stairs
      stairs_down: '#3a3a50',  // Darker stairs down
      // Special tiles
      coral: '#c45a6a',        // Coral reef (underwater theme)
      seaweed: '#3a6a5a',      // Underwater plants
      sand: '#b8a060',         // Sandy floor
      treasure: '#d4af37'      // Gold/treasure
    };
    
    // Entity colors
    this.entityColors = {
      player: '#22c55e',
      ally: '#22c55e',
      enemy: '#dc2626',
      neutral: '#eab308',
      object: '#60a5fa'
    };
    
    this.init();
  }
  
  init() {
    // Create canvas layers
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tactical-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'tactical-overlay';
    this.container.appendChild(this.overlayCanvas);
    this.overlayCtx = this.overlayCanvas.getContext('2d');
    
    // UI container for HTML elements
    this.uiContainer = document.createElement('div');
    this.uiContainer.className = 'tactical-ui';
    this.container.appendChild(this.uiContainer);
    
    // Create turn UI
    this.createTurnUI();
    
    // Event listeners
    this.setupEventListeners();
    
    // Load tilesets - DISABLED, using CSS patterns instead
    if (false && this.tilesetManager) {
      this.tilesetManager.loadAll().then(() => {
        this.tilesetsLoaded = true;
        console.log('🎨 Tilesets ready for rendering');
      });
    }
    
    // Resize handling
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    // Animation loop
    this.animate();
  }
  
  createTurnUI() {
    this.turnUI = document.createElement('div');
    this.turnUI.className = 'turn-ui hidden';
    this.turnUI.innerHTML = `
      <div class="turn-indicator">
        <span class="turn-icon">⚔️</span>
        <span class="turn-text">Your Turn</span>
      </div>
      <div class="turn-resources">
        <div class="resource movement">
          <span class="resource-icon">🦶</span>
          <span class="resource-value" id="movement-value">30</span>
          <span class="resource-label">ft</span>
        </div>
        <div class="resource action" id="action-resource">
          <span class="resource-icon">⚔️</span>
          <span class="resource-label">Action</span>
        </div>
        <div class="resource bonus" id="bonus-resource">
          <span class="resource-icon">✨</span>
          <span class="resource-label">Bonus</span>
        </div>
        <div class="resource reaction" id="reaction-resource">
          <span class="resource-icon">🛡️</span>
          <span class="resource-label">Reaction</span>
        </div>
      </div>
      <div class="quick-actions">
        <button class="quick-action" data-action="attack" title="Attack">⚔️</button>
        <button class="quick-action" data-action="dash" title="Dash">💨</button>
        <button class="quick-action" data-action="dodge" title="Dodge">🛡️</button>
        <button class="quick-action" data-action="disengage" title="Disengage">🏃</button>
        <button class="quick-action" data-action="hide" title="Hide">👤</button>
      </div>
      <button class="end-turn-btn" id="end-turn-btn">End Turn</button>
    `;
    this.uiContainer.appendChild(this.turnUI);
    
    // Entity info popup
    this.entityInfo = document.createElement('div');
    this.entityInfo.className = 'entity-info hidden';
    this.uiContainer.appendChild(this.entityInfo);
    
    // Camera controls
    this.cameraControls = document.createElement('div');
    this.cameraControls.className = 'camera-controls';
    this.cameraControls.innerHTML = `
      <button class="camera-btn" data-action="zoom-in" title="Zoom In">+</button>
      <button class="camera-btn" data-action="zoom-out" title="Zoom Out">−</button>
      <button class="camera-btn" data-action="center" title="Center on Player">◎</button>
    `;
    this.uiContainer.appendChild(this.cameraControls);
    
    // Minimap
    this.minimap = document.createElement('div');
    this.minimap.className = 'tactical-minimap';
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 150;
    this.minimapCanvas.height = 150;
    this.minimap.appendChild(this.minimapCanvas);
    this.uiContainer.appendChild(this.minimap);
    this.minimapCtx = this.minimapCanvas.getContext('2d');
    
    // Event handlers for UI
    this.turnUI.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => this.onQuickAction(e.target.dataset.action));
    });
    
    document.getElementById('end-turn-btn')?.addEventListener('click', () => this.endTurn());
    
    this.cameraControls.querySelectorAll('.camera-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.onCameraControl(e.target.dataset.action));
    });
  }
  
  setupEventListeners() {
    // Mouse events
    this.overlayCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.overlayCanvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.overlayCanvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.overlayCanvas.addEventListener('mouseleave', () => this.onMouseLeave());
    this.overlayCanvas.addEventListener('wheel', (e) => this.onWheel(e));
    this.overlayCanvas.addEventListener('click', (e) => this.onClick(e));
    this.overlayCanvas.addEventListener('contextmenu', (e) => this.onRightClick(e));
    
    // Touch events
    this.overlayCanvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.overlayCanvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.overlayCanvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }
  
  resize() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.overlayCanvas.width = rect.width;
    this.overlayCanvas.height = rect.height;
    this.render();
  }
  
  // ===== GRID MANAGEMENT =====
  
  loadGrid(gridData) {
    this.grid = gridData.tiles || [];
    this.width = gridData.width || this.grid[0]?.length || 0;
    this.height = gridData.height || this.grid.length || 0;
    
    // Initialize visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.visibility.set(`${x},${y}`, 'hidden');
      }
    }
    
    // Center camera on grid
    this.centerCamera();
    this.render();
    this.renderMinimap();
  }
  
  getTile(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[y]?.[x] || { type: 'wall' };
  }
  
  setTile(x, y, tile) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    if (!this.grid[y]) this.grid[y] = [];
    this.grid[y][x] = tile;
    this.render();
  }
  
  // ===== ENTITY MANAGEMENT =====
  
  addEntity(entity) {
    const id = entity.id || `entity_${Date.now()}`;
    this.entities.set(id, {
      id,
      name: entity.name || 'Unknown',
      type: entity.type || 'neutral', // player, ally, enemy, neutral, object
      x: entity.x || 0,
      y: entity.y || 0,
      hp: entity.hp || 10,
      maxHp: entity.maxHp || entity.hp || 10,
      ac: entity.ac || 10,
      icon: entity.icon || '👤',
      facing: entity.facing || 'south', // north, south, east, west
      conditions: entity.conditions || [],
      threatRange: entity.threatRange || 1,
      size: entity.size || 1, // tiles occupied
      elevation: entity.elevation || 0,
      visible: true
    });
    
    if (entity.type === 'player') {
      this.playerEntity = this.entities.get(id);
      this.updateVisibility();
    }
    
    this.render();
    return id;
  }
  
  updateEntity(id, updates) {
    const entity = this.entities.get(id);
    if (!entity) return;
    
    const oldX = entity.x;
    const oldY = entity.y;
    
    Object.assign(entity, updates);
    
    // If player moved, update visibility
    if (entity === this.playerEntity && (oldX !== entity.x || oldY !== entity.y)) {
      this.updateVisibility();
    }
    
    this.render();
  }
  
  removeEntity(id) {
    this.entities.delete(id);
    this.render();
  }
  
  getEntityAt(x, y) {
    for (const entity of this.entities.values()) {
      if (entity.x === x && entity.y === y) return entity;
    }
    return null;
  }
  
  // ===== VISIBILITY / FOG OF WAR =====
  
  updateVisibility() {
    if (!this.playerEntity) return;
    
    const px = this.playerEntity.x;
    const py = this.playerEntity.y;
    
    // Use Bresenham-style ray casting for visibility
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
        
        if (dist <= this.visionRadius) {
          // Check line of sight
          if (this.hasLineOfSight(px, py, x, y)) {
            this.visibility.set(`${x},${y}`, 'visible');
          } else if (this.visibility.get(`${x},${y}`) === 'visible') {
            this.visibility.set(`${x},${y}`, 'seen');
          }
        } else if (this.visibility.get(`${x},${y}`) === 'visible') {
          this.visibility.set(`${x},${y}`, 'seen');
        }
      }
    }
    
    // Update entity visibility
    for (const entity of this.entities.values()) {
      entity.visible = this.visibility.get(`${entity.x},${entity.y}`) === 'visible';
    }
  }
  
  hasLineOfSight(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (x !== x1 || y !== y1) {
      const tile = this.getTile(x, y);
      if (tile && this.blocksVision(tile.type) && (x !== x0 || y !== y0)) {
        return false;
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
    
    return true;
  }
  
  blocksVision(tileType) {
    return ['wall', 'door'].includes(tileType);
  }
  
  // ===== MOVEMENT & PATHFINDING =====
  
  calculateReachableTiles() {
    if (!this.playerEntity || !this.isPlayerTurn) {
      this.reachableTiles.clear();
      return;
    }
    
    const start = { x: this.playerEntity.x, y: this.playerEntity.y };
    const maxDist = Math.floor(this.movementRemaining / 5); // 5ft per tile
    
    this.reachableTiles.clear();
    const visited = new Map();
    const queue = [{ ...start, dist: 0 }];
    visited.set(`${start.x},${start.y}`, 0);
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (current.dist <= maxDist) {
        this.reachableTiles.add(`${current.x},${current.y}`);
      }
      
      // Check adjacent tiles
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        // Diagonals
        { x: current.x - 1, y: current.y - 1 },
        { x: current.x + 1, y: current.y - 1 },
        { x: current.x - 1, y: current.y + 1 },
        { x: current.x + 1, y: current.y + 1 }
      ];
      
      for (const next of neighbors) {
        const key = `${next.x},${next.y}`;
        const tile = this.getTile(next.x, next.y);
        
        if (!tile || !this.isWalkable(tile.type)) continue;
        if (this.getEntityAt(next.x, next.y)) continue; // Blocked by entity
        
        const isDiagonal = next.x !== current.x && next.y !== current.y;
        const moveCost = isDiagonal ? 1.5 : 1; // Diagonal costs more
        const newDist = current.dist + moveCost;
        
        if (newDist <= maxDist && (!visited.has(key) || visited.get(key) > newDist)) {
          visited.set(key, newDist);
          queue.push({ ...next, dist: newDist });
        }
      }
    }
    
    this.render();
  }
  
  calculateAttackRange() {
    if (!this.playerEntity || !this.isPlayerTurn) {
      this.attackRangeTiles.clear();
      return;
    }
    
    // Simple melee range (adjacent tiles)
    const px = this.playerEntity.x;
    const py = this.playerEntity.y;
    
    this.attackRangeTiles.clear();
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = px + dx;
        const y = py + dy;
        const entity = this.getEntityAt(x, y);
        if (entity && entity.type === 'enemy') {
          this.attackRangeTiles.add(`${x},${y}`);
        }
      }
    }
    
    this.render();
  }
  
  findPath(startX, startY, endX, endY) {
    // A* pathfinding
    const openSet = [{ x: startX, y: startY, g: 0, f: 0, parent: null }];
    const closedSet = new Set();
    
    const heuristic = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
    
    while (openSet.length > 0) {
      // Find lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift();
      
      if (current.x === endX && current.y === endY) {
        // Reconstruct path
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }
      
      closedSet.add(`${current.x},${current.y}`);
      
      // Check neighbors
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 }
      ];
      
      for (const next of neighbors) {
        const key = `${next.x},${next.y}`;
        if (closedSet.has(key)) continue;
        
        const tile = this.getTile(next.x, next.y);
        if (!tile || !this.isWalkable(tile.type)) continue;
        
        // Allow moving to destination even if entity there (for attack)
        if (next.x !== endX || next.y !== endY) {
          if (this.getEntityAt(next.x, next.y)) continue;
        }
        
        const g = current.g + 1;
        const h = heuristic(next.x, next.y, endX, endY);
        const f = g + h;
        
        const existing = openSet.find(n => n.x === next.x && n.y === next.y);
        if (existing) {
          if (g < existing.g) {
            existing.g = g;
            existing.f = f;
            existing.parent = current;
          }
        } else {
          openSet.push({ ...next, g, f, parent: current });
        }
      }
    }
    
    return []; // No path found
  }
  
  isWalkable(tileType) {
    return ['floor', 'door_open', 'high_ground', 'cover_half', 'cover_full', 'stairs_up', 'stairs_down'].includes(tileType);
  }
  
  // ===== CAMERA CONTROLS =====
  
  centerCamera(x, y) {
    if (x === undefined && y === undefined) {
      // Center on player or grid center
      if (this.playerEntity) {
        x = this.playerEntity.x;
        y = this.playerEntity.y;
      } else {
        x = this.width / 2;
        y = this.height / 2;
      }
    }
    
    this.targetCamera.x = x * this.tileSize * this.camera.zoom - this.canvas.width / 2;
    this.targetCamera.y = y * this.tileSize * this.camera.zoom - this.canvas.height / 2;
  }
  
  smoothCameraMove() {
    const lerp = 0.15;
    this.camera.x += (this.targetCamera.x - this.camera.x) * lerp;
    this.camera.y += (this.targetCamera.y - this.camera.y) * lerp;
    this.camera.zoom += (this.targetCamera.zoom - this.camera.zoom) * lerp;
  }
  
  zoomIn() {
    this.targetCamera.zoom = Math.min(this.targetCamera.zoom * 1.2, 3);
    this.tileSize = Math.min(this.tileSize * 1.2, this.maxTileSize);
  }
  
  zoomOut() {
    this.targetCamera.zoom = Math.max(this.targetCamera.zoom / 1.2, 0.3);
    this.tileSize = Math.max(this.tileSize / 1.2, this.minTileSize);
  }
  
  screenToGrid(screenX, screenY) {
    const x = Math.floor((screenX + this.camera.x) / (this.tileSize * this.camera.zoom));
    const y = Math.floor((screenY + this.camera.y) / (this.tileSize * this.camera.zoom));
    return { x, y };
  }
  
  gridToScreen(gridX, gridY) {
    const x = gridX * this.tileSize * this.camera.zoom - this.camera.x;
    const y = gridY * this.tileSize * this.camera.zoom - this.camera.y;
    return { x, y };
  }
  
  // ===== INPUT HANDLERS =====
  
  onMouseDown(e) {
    if (e.button === 0) { // Left click
      this.isDragging = true;
      this.dragStart = { x: e.clientX + this.camera.x, y: e.clientY + this.camera.y };
    }
  }
  
  onMouseMove(e) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (this.isDragging) {
      this.targetCamera.x = this.dragStart.x - e.clientX;
      this.targetCamera.y = this.dragStart.y - e.clientY;
      this.camera.x = this.targetCamera.x;
      this.camera.y = this.targetCamera.y;
      this.render();
      
      // Hide tooltips while dragging
      if (terrainTooltip) terrainTooltip.hide();
    } else {
      // Update hovered tile
      const gridPos = this.screenToGrid(mouseX, mouseY);
      const newHovered = `${gridPos.x},${gridPos.y}`;
      
      if (newHovered !== this.hoveredTile) {
        this.hoveredTile = newHovered;
        
        // Calculate path preview if reachable
        if (this.isPlayerTurn && this.reachableTiles.has(newHovered)) {
          this.pathPreview = this.findPath(
            this.playerEntity.x, this.playerEntity.y,
            gridPos.x, gridPos.y
          );
        } else {
          this.pathPreview = [];
        }
        
        this.render();
      }
      
      // Show entity info on hover (priority over terrain)
      const entity = this.getEntityAt(gridPos.x, gridPos.y);
      if (entity && entity.visible) {
        this.showEntityInfo(entity, mouseX, mouseY);
        if (terrainTooltip) terrainTooltip.hide();
      } else {
        this.hideEntityInfo();
        
        // Show terrain tooltip
        const tile = this.getTile(gridPos.x, gridPos.y);
        const visibility = this.visibility.get(`${gridPos.x},${gridPos.y}`);
        
        if (tile && visibility !== 'hidden' && terrainTooltip) {
          // Use client coordinates for tooltip position
          terrainTooltip.show(tile.type, e.clientX, e.clientY);
        } else if (terrainTooltip) {
          terrainTooltip.hide();
        }
      }
    }
  }
  
  onMouseUp(e) {
    this.isDragging = false;
  }
  
  onMouseLeave() {
    this.isDragging = false;
    this.hoveredTile = null;
    this.pathPreview = [];
    this.hideEntityInfo();
    if (terrainTooltip) terrainTooltip.hide();
    this.render();
  }
  
  onClick(e) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const gridPos = this.screenToGrid(mouseX, mouseY);
    const key = `${gridPos.x},${gridPos.y}`;
    
    // Check if clicking on entity
    const entity = this.getEntityAt(gridPos.x, gridPos.y);
    
    if (this.isPlayerTurn) {
      if (entity && entity.type === 'enemy' && this.attackRangeTiles.has(key)) {
        // Attack enemy
        this.performAttack(entity);
      } else if (this.reachableTiles.has(key) && !entity) {
        // Move to tile
        this.movePlayerTo(gridPos.x, gridPos.y);
      }
    }
    
    if (entity) {
      this.selectedEntity = entity;
      this.showThreatRange(entity);
    } else {
      this.selectedEntity = null;
    }
    
    this.render();
  }
  
  onRightClick(e) {
    e.preventDefault();
    // Could open context menu here
  }
  
  onWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
    this.centerCamera();
  }
  
  onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      // Pinch zoom
      this.pinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  }
  
  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging && this.lastTouch) {
      const dx = this.lastTouch.x - e.touches[0].clientX;
      const dy = this.lastTouch.y - e.touches[0].clientY;
      this.camera.x += dx;
      this.camera.y += dy;
      this.targetCamera.x = this.camera.x;
      this.targetCamera.y = this.camera.y;
      this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.render();
    } else if (e.touches.length === 2 && this.pinchDistance) {
      const newDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (newDist > this.pinchDistance) {
        this.zoomIn();
      } else {
        this.zoomOut();
      }
      this.pinchDistance = newDist;
    }
  }
  
  onTouchEnd(e) {
    if (e.touches.length === 0) {
      // Tap detection
      if (!this.isDragging && this.lastTouch) {
        const rect = this.overlayCanvas.getBoundingClientRect();
        const gridPos = this.screenToGrid(
          this.lastTouch.x - rect.left,
          this.lastTouch.y - rect.top
        );
        this.onClick({ clientX: this.lastTouch.x, clientY: this.lastTouch.y });
      }
      this.isDragging = false;
      this.lastTouch = null;
    }
    this.pinchDistance = null;
  }
  
  onKeyDown(e) {
    const panSpeed = 50;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
        this.targetCamera.y -= panSpeed;
        break;
      case 'ArrowDown':
      case 's':
        this.targetCamera.y += panSpeed;
        break;
      case 'ArrowLeft':
      case 'a':
        this.targetCamera.x -= panSpeed;
        break;
      case 'ArrowRight':
      case 'd':
        this.targetCamera.x += panSpeed;
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case 'c':
        this.centerCamera();
        break;
      case 'Escape':
        this.selectedEntity = null;
        this.pathPreview = [];
        break;
      // Action pacing controls (1=slow, 2=normal, 3=fast, space=skip)
      case '1':
        if (actionSequencer) {
          actionSequencer.defaultDelay = 2000;
          actionSequencer.enabled = true;
          console.log('⏱️ Pacing: SLOW (2s)');
        }
        break;
      case '2':
        if (actionSequencer) {
          actionSequencer.defaultDelay = 1200;
          actionSequencer.enabled = true;
          console.log('⏱️ Pacing: NORMAL (1.2s)');
        }
        break;
      case '3':
        if (actionSequencer) {
          actionSequencer.defaultDelay = 500;
          actionSequencer.enabled = true;
          console.log('⏱️ Pacing: FAST (0.5s)');
        }
        break;
      case ' ':
        // Space = process all queued actions immediately
        if (actionSequencer && actionSequencer.queue.length > 0) {
          console.log(`⏩ Skipping ${actionSequencer.queue.length} queued actions`);
          while (actionSequencer.queue.length > 0) {
            const action = actionSequencer.queue.shift();
            actionSequencer.execute(action);
          }
          actionSequencer.isProcessing = false;
        }
        e.preventDefault();
        break;
    }
    this.render();
  }
  
  onCameraControl(action) {
    switch (action) {
      case 'zoom-in':
        this.zoomIn();
        break;
      case 'zoom-out':
        this.zoomOut();
        break;
      case 'center':
        this.centerCamera();
        break;
    }
    this.render();
  }
  
  onQuickAction(action) {
    if (!this.isPlayerTurn || this.actionUsed) return;
    
    switch (action) {
      case 'attack':
        // Highlight attackable targets
        this.calculateAttackRange();
        break;
      case 'dash':
        this.movementRemaining *= 2;
        this.actionUsed = true;
        this.calculateReachableTiles();
        break;
      case 'dodge':
        this.actionUsed = true;
        this.addAnimation(this.createSpellEffect(this.playerEntity.x, this.playerEntity.y, 'dodge'));
        break;
      case 'disengage':
        this.actionUsed = true;
        break;
      case 'hide':
        this.actionUsed = true;
        break;
    }
    
    this.updateTurnUI();
  }
  
  // ===== TURN MANAGEMENT =====
  
  startPlayerTurn() {
    this.isPlayerTurn = true;
    this.movementRemaining = 30;
    this.actionUsed = false;
    this.bonusActionUsed = false;
    
    this.turnUI.classList.remove('hidden');
    this.calculateReachableTiles();
    this.calculateAttackRange();
    this.updateTurnUI();
    this.centerCamera();
  }
  
  endTurn() {
    this.isPlayerTurn = false;
    this.turnUI.classList.add('hidden');
    this.reachableTiles.clear();
    this.attackRangeTiles.clear();
    this.pathPreview = [];
    this.render();
    
    // Notify server
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'end_turn' }));
    }
  }
  
  updateTurnUI() {
    document.getElementById('movement-value').textContent = this.movementRemaining;
    
    const action = document.getElementById('action-resource');
    const bonus = document.getElementById('bonus-resource');
    
    if (action) action.classList.toggle('used', this.actionUsed);
    if (bonus) bonus.classList.toggle('used', this.bonusActionUsed);
  }
  
  // ===== COMBAT =====
  
  movePlayerTo(x, y) {
    if (!this.playerEntity) return;
    
    const path = this.findPath(this.playerEntity.x, this.playerEntity.y, x, y);
    const distance = (path.length - 1) * 5; // 5ft per tile
    
    if (distance > this.movementRemaining) return;
    
    // Animate movement
    this.animateMovement(this.playerEntity, path);
    
    this.movementRemaining -= distance;
    this.calculateReachableTiles();
    this.calculateAttackRange();
    this.updateTurnUI();
  }
  
  animateMovement(entity, path) {
    if (path.length < 2) return;
    
    // Store original position for lerp
    const startPos = { x: entity.x, y: entity.y };
    let currentStep = 0;
    const stepDuration = 350; // ms per tile
    let stepStartTime = performance.now();
    
    const animate = (currentTime) => {
      if (currentStep >= path.length - 1) {
        // Animation complete
        entity.isMoving = false;
        this.render();
        this.renderMinimap();
        return;
      }
      
      entity.isMoving = true;
      
      const from = path[currentStep];
      const to = path[currentStep + 1];
      const elapsed = currentTime - stepStartTime;
      const t = Math.min(elapsed / stepDuration, 1);
      
      // Smooth easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - t, 3);
      
      // Lerp position
      entity.renderX = from.x + (to.x - from.x) * easeOut;
      entity.renderY = from.y + (to.y - from.y) * easeOut;
      
      // Update facing based on movement direction
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        entity.facing = dx > 0 ? 'east' : 'west';
      } else {
        entity.facing = dy > 0 ? 'south' : 'north';
      }
      
      // Move to next step when current step completes
      if (t >= 1) {
        entity.x = to.x;
        entity.y = to.y;
        entity.renderX = to.x;
        entity.renderY = to.y;
        currentStep++;
        stepStartTime = currentTime;
        
        if (entity === this.playerEntity) {
          this.updateVisibility();
        }
      }
      
      this.render();
      
      if (currentStep < path.length - 1 || t < 1) {
        requestAnimationFrame(animate);
      } else {
        entity.isMoving = false;
        this.renderMinimap();
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Animate entity exit (fading out when leaving room)
  animateEntityExit(entity, callback) {
    const duration = 500;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      entity.exitProgress = t;
      entity.isExiting = true;
      
      this.render();
      
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        if (callback) callback();
        this.removeEntity(entity.id);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // Animate entity entering
  animateEntityEnter(entity) {
    entity.isEntering = true;
    entity.enterProgress = 0;
    const duration = 400;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      entity.enterProgress = t;
      
      this.render();
      
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        entity.isEntering = false;
        entity.enterProgress = 1;
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  performAttack(target) {
    if (!this.playerEntity || this.actionUsed) return;
    
    this.actionUsed = true;
    
    // Attack animation
    this.addAnimation(this.createAttackLine(
      this.playerEntity.x, this.playerEntity.y,
      target.x, target.y
    ));
    
    // Simulate damage (server would calculate this)
    const damage = Math.floor(Math.random() * 8) + 1;
    target.hp = Math.max(0, target.hp - damage);
    
    // Damage number
    this.showDamageNumber(target.x, target.y, damage, 'damage');
    
    // Check death
    if (target.hp <= 0) {
      this.playDeathAnimation(target);
    }
    
    this.updateTurnUI();
    this.calculateAttackRange();
    this.render();
  }
  
  // ===== ANIMATIONS =====
  
  addAnimation(animation) {
    this.animations.push(animation);
  }
  
  createAttackLine(x1, y1, x2, y2) {
    return {
      type: 'attack_line',
      x1, y1, x2, y2,
      progress: 0,
      duration: 300,
      startTime: Date.now()
    };
  }
  
  createSpellEffect(x, y, type) {
    const colors = {
      fire: ['#ff4500', '#ff8c00', '#ffd700'],
      ice: ['#00bfff', '#87ceeb', '#ffffff'],
      lightning: ['#ffff00', '#ffffff', '#87ceeb'],
      heal: ['#00ff00', '#90ee90', '#ffffff'],
      dodge: ['#60a5fa', '#3b82f6', '#1d4ed8']
    };
    
    return {
      type: 'spell_effect',
      x, y,
      spellType: type,
      colors: colors[type] || colors.fire,
      particles: this.generateParticles(x, y, 20),
      progress: 0,
      duration: 500,
      startTime: Date.now()
    };
  }
  
  generateParticles(x, y, count) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        size: Math.random() * 4 + 2
      });
    }
    return particles;
  }
  
  showDamageNumber(x, y, amount, type) {
    const screenPos = this.gridToScreen(x + 0.5, y);
    this.damageNumbers.push({
      x: screenPos.x,
      y: screenPos.y,
      amount,
      type,
      life: 1,
      startTime: Date.now(),
      duration: 1500
    });
  }
  
  playDeathAnimation(entity) {
    this.addAnimation({
      type: 'death',
      entity,
      progress: 0,
      duration: 800,
      startTime: Date.now()
    });
    
    // Remove entity after animation
    setTimeout(() => {
      this.removeEntity(entity.id);
    }, 800);
  }
  
  showThreatRange(entity) {
    // Highlight tiles threatened by this entity
    // For simplicity, show adjacent tiles
  }
  
  showEntityInfo(entity, screenX, screenY) {
    this.entityInfo.innerHTML = `
      <div class="entity-info-header">
        <span class="entity-info-icon">${entity.icon}</span>
        <span class="entity-info-name">${escapeHtml(entity.name)}</span>
      </div>
      <div class="entity-info-stats">
        <div class="entity-info-hp">
          <span class="hp-label">HP</span>
          <div class="hp-bar-small">
            <div class="hp-fill-small ${entity.hp <= entity.maxHp * 0.25 ? 'critical' : entity.hp <= entity.maxHp * 0.5 ? 'low' : ''}" 
                 style="width: ${(entity.hp / entity.maxHp) * 100}%"></div>
          </div>
          <span class="hp-text-small">${entity.hp}/${entity.maxHp}</span>
        </div>
        <div class="entity-info-ac">AC: ${entity.ac}</div>
        ${entity.conditions.length ? `<div class="entity-info-conditions">${entity.conditions.join(', ')}</div>` : ''}
      </div>
    `;
    
    // Position popup
    this.entityInfo.style.left = `${screenX + 20}px`;
    this.entityInfo.style.top = `${screenY - 10}px`;
    this.entityInfo.classList.remove('hidden');
  }
  
  hideEntityInfo() {
    this.entityInfo.classList.add('hidden');
  }
  
  // ===== RENDERING =====
  
  animate() {
    this.smoothCameraMove();
    this.updateAnimations();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
  
  updateAnimations() {
    const now = Date.now();
    
    // Update animations
    this.animations = this.animations.filter(anim => {
      anim.progress = (now - anim.startTime) / anim.duration;
      return anim.progress < 1;
    });
    
    // Update damage numbers
    this.damageNumbers = this.damageNumbers.filter(dn => {
      dn.life = 1 - (now - dn.startTime) / dn.duration;
      return dn.life > 0;
    });
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw overlays (reachable, attack range)
    this.drawOverlays();
    
    // Draw trap overlays
    this.drawTrapOverlays();
    
    // Draw entities
    this.drawEntities();
    
    // Draw animations
    this.drawAnimations();
    
    // Draw damage numbers
    this.drawDamageNumbers();
  }
  
  drawGrid() {
    const startX = Math.floor(this.camera.x / (this.tileSize * this.camera.zoom));
    const startY = Math.floor(this.camera.y / (this.tileSize * this.camera.zoom));
    const endX = startX + Math.ceil(this.canvas.width / (this.tileSize * this.camera.zoom)) + 1;
    const endY = startY + Math.ceil(this.canvas.height / (this.tileSize * this.camera.zoom)) + 1;
    
    const tileDrawSize = this.tileSize * this.camera.zoom;
    const frame = Math.floor(Date.now() / 500) % 4; // Animation frame for water/lava
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.getTile(x, y);
        if (!tile) continue;
        
        const screenPos = this.gridToScreen(x, y);
        let visibility = this.visibility.get(`${x},${y}`) || 'hidden';
        
        // SPECTATOR MODE: If no player entity, show all tiles as 'seen'
        // This makes the dungeon visible for spectators without fog of war
        if (!this.playerEntity && visibility === 'hidden') {
          visibility = 'seen';
        }
        
        // For spectator mode, show all tiles with dimming based on visibility
        // Hidden tiles are dimmed, not completely black
        const isHidden = visibility === 'hidden';
        if (isHidden) {
          // Draw dimmed tile instead of black void
          let color = this.tileColors[tile.type] || this.tileColors.floor;
          this.ctx.fillStyle = this.dimColor(color, 0.15); // Very dim but visible
          this.ctx.fillRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
          // Add subtle pattern even for hidden tiles
          this.ctx.globalAlpha = 0.15;
          this.drawTilePattern(tile.type, screenPos.x, screenPos.y, tileDrawSize, true);
          this.ctx.globalAlpha = 1;
          // Subtle grid for hidden areas
          this.ctx.strokeStyle = 'rgba(20,20,30,0.3)';
          this.ctx.strokeRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
          continue;
        }
        
        const isDimmed = visibility === 'seen';
        const isVisible = visibility === 'visible';
        
        // Try to render with tileset first
        let rendered = false;
        if (this.tilesetsLoaded && this.tilesetManager) {
          rendered = this.drawTileFromTileset(tile.type, screenPos.x, screenPos.y, tileDrawSize, isDimmed, frame, x, y);
        }
        
        // Fallback to procedural rendering
        if (!rendered) {
          let color = this.tileColors[tile.type] || this.tileColors.floor;
          if (isDimmed) color = this.dimColor(color, 0.4);
          
          this.ctx.fillStyle = color;
          this.ctx.fillRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
          
          // Add procedural patterns
          this.drawTilePattern(tile.type, screenPos.x, screenPos.y, tileDrawSize, isDimmed);
        }
        
        // Subtle grid lines
        this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        this.ctx.strokeRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
      }
    }
  }
  
  // Render a tile from the tileset spritesheet
  drawTileFromTileset(tileType, x, y, size, dimmed, frame, gridX, gridY) {
    const tileset = this.activeTileset;
    const config = this.tilesetManager.tilesets.get(tileset);
    const img = this.tilesetManager.loadedImages.get(tileset);
    
    if (!config || !img) return false;
    
    // Map tile type to tileset position
    const tileInfo = this.getTilesetCoords(tileType, tileset, frame, gridX, gridY);
    if (!tileInfo) return false;
    
    // Apply dimming
    if (dimmed) this.ctx.globalAlpha = 0.5;
    
    // Draw tile from tileset
    this.ctx.drawImage(
      img,
      tileInfo.sx, tileInfo.sy, tileInfo.sw, tileInfo.sh,
      x, y, size, size
    );
    
    // Reset alpha
    this.ctx.globalAlpha = 1;
    return true;
  }
  
  // Get tileset coordinates for a tile type
  getTilesetCoords(tileType, tileset, frame, gridX, gridY) {
    const config = this.tilesetManager.tilesets.get(tileset);
    if (!config) return null;
    
    const ts = config.tileSize;
    
    // Dungeon tileset mapping (Calciumtrice 16x16)
    if (tileset === 'dungeon') {
      switch (tileType) {
        case 'floor':
          // Vary floor tiles based on position for visual variety
          const floorVariant = (gridX + gridY) % 4;
          if (floorVariant === 0) return { sx: 1 * ts, sy: 5 * ts, sw: ts, sh: ts };
          if (floorVariant === 1) return { sx: 2 * ts, sy: 5 * ts, sw: ts, sh: ts };
          if (floorVariant === 2) return { sx: 3 * ts, sy: 5 * ts, sw: ts, sh: ts };
          return { sx: 4 * ts, sy: 5 * ts, sw: ts, sh: ts };
          
        case 'wall':
          return { sx: 1 * ts, sy: 1 * ts, sw: ts, sh: ts };
          
        case 'door':
        case 'door_closed':
          return { sx: 0, sy: 38 * ts, sw: ts * 2, sh: ts * 2 };
          
        case 'door_open':
          return { sx: 2 * ts, sy: 38 * ts, sw: ts * 2, sh: ts * 2 };
          
        case 'stairs_down':
          return { sx: 5 * ts, sy: 7 * ts, sw: ts, sh: ts };
          
        case 'stairs_up':
          return { sx: 6 * ts, sy: 7 * ts, sw: ts, sh: ts };
          
        case 'pit':
          return { sx: 7 * ts, sy: 7 * ts, sw: ts, sh: ts };
          
        case 'water':
          // Could add animation here
          return { sx: 4 * ts, sy: 7 * ts, sw: ts, sh: ts };
          
        case 'high_ground':
          return { sx: 5 * ts, sy: 5 * ts, sw: ts, sh: ts };
          
        default:
          return null;
      }
    }
    
    // Cave tileset mapping
    if (tileset === 'cave') {
      switch (tileType) {
        case 'floor':
          const caveFloorVar = (gridX * 3 + gridY * 7) % 3;
          return { sx: (1 + caveFloorVar) * ts, sy: 4 * ts, sw: ts, sh: ts };
          
        case 'wall':
          return { sx: 0, sy: 0, sw: ts, sh: ts };
          
        case 'water':
          const waterFrame = frame % 2;
          return { sx: (12 + waterFrame) * ts, sy: 18 * ts, sw: ts, sh: ts };
          
        case 'lava':
          const lavaFrame = frame % 2;
          return { sx: lavaFrame * ts, sy: 20 * ts, sw: ts, sh: ts };
          
        default:
          return null;
      }
    }
    
    return null;
  }
  
  drawTilePattern(type, x, y, size, dimmed) {
    const alpha = dimmed ? 0.4 : 1;
    
    switch (type) {
      case 'water':
        // Animated water waves
        this.ctx.fillStyle = `rgba(60, 130, 200, ${0.4 * alpha})`;
        const waveOffset = (Date.now() / 600) % 1;
        for (let i = 0; i < 3; i++) {
          const waveY = y + size * ((i / 3 + waveOffset) % 1);
          this.ctx.beginPath();
          this.ctx.arc(x + size / 2, waveY, size / 4, 0, Math.PI);
          this.ctx.fill();
        }
        // Add shimmer
        this.ctx.fillStyle = `rgba(150, 200, 255, ${0.15 * alpha * (0.5 + 0.5 * Math.sin(Date.now() / 300))})`;
        this.ctx.fillRect(x, y, size, size);
        break;
        
      case 'lava':
        // Animated lava glow
        const glowIntensity = 0.6 + 0.3 * Math.sin(Date.now() / 200);
        this.ctx.fillStyle = `rgba(255, 80, 0, ${glowIntensity * alpha})`;
        this.ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
        
        // Lava bubbles
        this.ctx.fillStyle = `rgba(255, 200, 50, ${0.9 * alpha})`;
        const bubbleX = x + (Math.sin(Date.now() / 300 + x) + 1) * size / 4 + size / 4;
        const bubbleY = y + (Math.cos(Date.now() / 400 + y) + 1) * size / 4 + size / 4;
        this.ctx.beginPath();
        this.ctx.arc(bubbleX, bubbleY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'floor':
        // Stone floor with realistic texture
        const floorSeed = (x * 127 + y * 311) % 100;
        
        // Stone block pattern
        this.ctx.strokeStyle = `rgba(30, 30, 40, ${0.4 * alpha})`;
        this.ctx.lineWidth = 1;
        
        // Horizontal line (mortar)
        if (floorSeed % 3 !== 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y + size * 0.5);
          this.ctx.lineTo(x + size, y + size * 0.5);
          this.ctx.stroke();
        }
        
        // Vertical line (offset for brick pattern)
        const offset = (Math.floor(y / size) % 2 === 0) ? 0.5 : 0;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * offset, y);
        this.ctx.lineTo(x + size * offset, y + size);
        this.ctx.stroke();
        
        // Random subtle details (cracks, pebbles)
        if (floorSeed < 20) {
          this.ctx.fillStyle = `rgba(40, 40, 50, ${0.5 * alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(x + size * 0.3, y + size * 0.4, 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        if (floorSeed > 80 && floorSeed < 95) {
          // Small crack
          this.ctx.strokeStyle = `rgba(35, 35, 45, ${0.6 * alpha})`;
          this.ctx.beginPath();
          this.ctx.moveTo(x + size * 0.2, y + size * 0.3);
          this.ctx.lineTo(x + size * 0.5, y + size * 0.7);
          this.ctx.stroke();
        }
        
        // Occasional lighter spots (worn stone)
        if (floorSeed > 60 && floorSeed < 70) {
          this.ctx.fillStyle = `rgba(90, 90, 110, ${0.2 * alpha})`;
          this.ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.4, size * 0.4);
        }
        break;
        
      case 'wall':
        // Dungeon wall with depth effect
        const wallSeed = (x * 173 + y * 251) % 100;
        
        // Base darker color for depth
        this.ctx.fillStyle = `rgba(15, 15, 25, ${0.4 * alpha})`;
        this.ctx.fillRect(x, y, size, size);
        
        // Stone block pattern (3 rows)
        this.ctx.strokeStyle = `rgba(10, 10, 18, ${0.7 * alpha})`;
        this.ctx.lineWidth = 2;
        
        // Horizontal mortar lines
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + size * 0.33);
        this.ctx.lineTo(x + size, y + size * 0.33);
        this.ctx.moveTo(x, y + size * 0.66);
        this.ctx.lineTo(x + size, y + size * 0.66);
        this.ctx.stroke();
        
        // Vertical mortar lines (brick pattern)
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.5, y);
        this.ctx.lineTo(x + size * 0.5, y + size * 0.33);
        this.ctx.moveTo(x + size * 0.25, y + size * 0.33);
        this.ctx.lineTo(x + size * 0.25, y + size * 0.66);
        this.ctx.moveTo(x + size * 0.75, y + size * 0.33);
        this.ctx.lineTo(x + size * 0.75, y + size * 0.66);
        this.ctx.moveTo(x + size * 0.5, y + size * 0.66);
        this.ctx.lineTo(x + size * 0.5, y + size);
        this.ctx.stroke();
        
        // Occasional moss/stain
        if (wallSeed < 15) {
          this.ctx.fillStyle = `rgba(40, 60, 50, ${0.3 * alpha})`;
          this.ctx.beginPath();
          this.ctx.arc(x + size * 0.7, y + size * 0.8, size * 0.15, 0, Math.PI * 2);
          this.ctx.fill();
        }
        
        // Top highlight (light from above)
        this.ctx.fillStyle = `rgba(60, 60, 80, ${0.2 * alpha})`;
        this.ctx.fillRect(x + 2, y + 2, size - 4, 3);
        break;
        
      case 'cover_half':
        // Rock/debris indicator
        this.ctx.fillStyle = `rgba(80, 80, 90, ${0.7 * alpha})`;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.2, y + size * 0.8);
        this.ctx.lineTo(x + size * 0.5, y + size * 0.4);
        this.ctx.lineTo(x + size * 0.8, y + size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
        break;
        
      case 'cover_full':
        // Large boulder/pillar
        this.ctx.fillStyle = `rgba(70, 70, 80, ${0.8 * alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(x + size / 2, y + size / 2, size * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = `rgba(40, 40, 50, ${0.9 * alpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        break;
        
      case 'high_ground':
        // Elevated platform indicator
        this.ctx.fillStyle = `rgba(100, 100, 120, ${0.4 * alpha})`;
        this.ctx.fillRect(x + 2, y + 2, size - 4, 4);
        this.ctx.fillRect(x + 2, y + size - 6, size - 4, 4);
        break;
        
      case 'door':
        // Wooden door
        this.ctx.fillStyle = `rgba(120, 70, 30, ${alpha})`;
        this.ctx.fillRect(x + size * 0.25, y + 3, size * 0.5, size - 6);
        // Door handle
        this.ctx.fillStyle = `rgba(180, 150, 50, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.6, y + size * 0.5, 3, 0, Math.PI * 2);
        this.ctx.fill();
        // Wood grain
        this.ctx.strokeStyle = `rgba(80, 50, 20, ${0.5 * alpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size * 0.35, y + 5);
        this.ctx.lineTo(x + size * 0.35, y + size - 5);
        this.ctx.moveTo(x + size * 0.65, y + 5);
        this.ctx.lineTo(x + size * 0.65, y + size - 5);
        this.ctx.stroke();
        break;
        
      case 'stairs_up':
        // Stairs going up
        this.ctx.fillStyle = `rgba(200, 180, 120, ${0.6 * alpha})`;
        for (let i = 0; i < 4; i++) {
          const stepY = y + size * (0.8 - i * 0.2);
          const stepH = size * 0.15;
          this.ctx.fillRect(x + 4, stepY, size - 8, stepH);
        }
        // Arrow indicator
        this.ctx.fillStyle = `rgba(50, 200, 50, ${0.8 * alpha})`;
        this.ctx.font = `bold ${size * 0.35}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('▲', x + size / 2, y + size * 0.25);
        break;
        
      case 'stairs_down':
        // Stairs down indicator
        this.ctx.fillStyle = `rgba(100, 100, 150, ${0.5 * alpha})`;
        this.ctx.font = `${size * 0.5}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('▼', x + size / 2, y + size / 2);
        break;
    }
  }
  
  drawOverlays() {
    const tileDrawSize = this.tileSize * this.camera.zoom;
    
    // Draw reachable tiles
    this.overlayCtx.fillStyle = 'rgba(34, 197, 94, 0.3)';
    for (const key of this.reachableTiles) {
      const [x, y] = key.split(',').map(Number);
      const screenPos = this.gridToScreen(x, y);
      this.overlayCtx.fillRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
    }
    
    // Draw attack range tiles
    this.overlayCtx.fillStyle = 'rgba(220, 38, 38, 0.4)';
    for (const key of this.attackRangeTiles) {
      const [x, y] = key.split(',').map(Number);
      const screenPos = this.gridToScreen(x, y);
      this.overlayCtx.fillRect(screenPos.x, screenPos.y, tileDrawSize, tileDrawSize);
    }
    
    // Draw path preview
    if (this.pathPreview.length > 1) {
      this.overlayCtx.strokeStyle = '#d4af37';
      this.overlayCtx.lineWidth = 3;
      this.overlayCtx.setLineDash([5, 5]);
      this.overlayCtx.beginPath();
      
      for (let i = 0; i < this.pathPreview.length; i++) {
        const pos = this.pathPreview[i];
        const screenPos = this.gridToScreen(pos.x + 0.5, pos.y + 0.5);
        if (i === 0) {
          this.overlayCtx.moveTo(screenPos.x, screenPos.y);
        } else {
          this.overlayCtx.lineTo(screenPos.x, screenPos.y);
        }
      }
      
      this.overlayCtx.stroke();
      this.overlayCtx.setLineDash([]);
    }
    
    // Highlight hovered tile
    if (this.hoveredTile) {
      const [hx, hy] = this.hoveredTile.split(',').map(Number);
      const screenPos = this.gridToScreen(hx, hy);
      this.overlayCtx.strokeStyle = '#d4af37';
      this.overlayCtx.lineWidth = 2;
      this.overlayCtx.strokeRect(screenPos.x + 2, screenPos.y + 2, tileDrawSize - 4, tileDrawSize - 4);
    }
  }
  
  drawEntities() {
    const tileDrawSize = this.tileSize * this.camera.zoom;
    
    for (const entity of this.entities.values()) {
      if (!entity.visible) continue;
      
      // Use renderX/Y for smooth animation, fallback to actual position
      const posX = entity.renderX !== undefined ? entity.renderX : entity.x;
      const posY = entity.renderY !== undefined ? entity.renderY : entity.y;
      
      const screenPos = this.gridToScreen(posX, posY);
      const centerX = screenPos.x + tileDrawSize / 2;
      const centerY = screenPos.y + tileDrawSize / 2;
      
      // Handle exiting animation (fade out)
      if (entity.isExiting) {
        const exitEase = 1 - entity.exitProgress;
        this.ctx.globalAlpha = exitEase;
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(exitEase, exitEase);
        this.ctx.translate(-centerX, -centerY);
      }
      
      // Handle entering animation (fade in)
      if (entity.isEntering) {
        const enterEase = entity.enterProgress;
        this.ctx.globalAlpha = enterEase;
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(0.5 + 0.5 * enterEase, 0.5 + 0.5 * enterEase);
        this.ctx.translate(-centerX, -centerY);
      }
      const radius = tileDrawSize * 0.4;
      
      // Entity base color
      const color = this.entityColors[entity.type] || this.entityColors.neutral;
      
      // Draw token circle
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.hexToRgba(color, 0.9);
      this.ctx.fill();
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Draw facing direction indicator
      this.drawFacingIndicator(centerX, centerY, radius, entity.facing, color);
      
      // Draw icon
      // Apply size scaling for players
      const sizeScale = entity.appearance?.size ? (PLAYER_SIZES[entity.appearance.size] || 1.0) : 1.0;
      const iconSize = tileDrawSize * 0.4 * sizeScale;
      
      this.ctx.font = `${iconSize}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(entity.icon, centerX, centerY);
      
      // Draw accessory for players
      if (entity.type === 'player' && entity.appearance?.accessory) {
        const accessoryIcon = PLAYER_ACCESSORIES[entity.appearance.accessory];
        if (accessoryIcon) {
          this.ctx.font = `${iconSize * 0.5}px sans-serif`;
          this.ctx.fillText(accessoryIcon, centerX + iconSize * 0.3, centerY - iconSize * 0.3);
        }
      }
      
      // Draw health bar
      if (entity.maxHp > 0) {
        const barWidth = tileDrawSize * 0.8;
        const barHeight = 4;
        const barX = centerX - barWidth / 2;
        const barY = screenPos.y + tileDrawSize - 8;
        
        // Background
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health fill
        const hpPercent = entity.hp / entity.maxHp;
        let hpColor = '#22c55e';
        if (hpPercent <= 0.25) hpColor = '#dc2626';
        else if (hpPercent <= 0.5) hpColor = '#eab308';
        
        this.ctx.fillStyle = hpColor;
        this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
      }
      
      // Draw name if selected or player
      if (entity === this.selectedEntity || entity.type === 'player') {
        this.ctx.font = `bold ${tileDrawSize * 0.2}px sans-serif`;
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.textAlign = 'center';
        this.ctx.strokeText(entity.name, centerX, screenPos.y - 5);
        this.ctx.fillText(entity.name, centerX, screenPos.y - 5);
      }
      
      // Draw conditions
      if (entity.conditions.length > 0) {
        const conditionIcons = {
          poisoned: '🤢',
          stunned: '💫',
          frightened: '😱',
          blinded: '🙈',
          prone: '⬇️',
          grappled: '🤝',
          restrained: '⛓️'
        };
        
        let condX = screenPos.x + 2;
        for (const cond of entity.conditions.slice(0, 3)) {
          this.ctx.font = `${tileDrawSize * 0.2}px sans-serif`;
          this.ctx.fillText(conditionIcons[cond] || '❗', condX, screenPos.y + 12);
          condX += 10;
        }
      }
      
      // Restore context if we modified it for animations
      if (entity.isExiting || entity.isEntering) {
        this.ctx.restore();
        this.ctx.globalAlpha = 1;
      }
    }
  }
  
  // Draw trap overlays on the grid
  drawTrapOverlays() {
    if (!this.traps || this.traps.length === 0) return;
    
    const tileDrawSize = this.tileSize * this.camera.zoom;
    
    for (const trap of this.traps) {
      const visibility = this.visibility.get(`${trap.x},${trap.y}`);
      if (visibility === 'hidden') continue;
      
      const screenPos = this.gridToScreen(trap.x, trap.y);
      
      // Draw trap overlay
      const alpha = trap.triggered ? 0.6 : 0.3;
      const color = trap.triggered ? 'rgba(245, 101, 101,' : 'rgba(236, 201, 75,';
      
      this.overlayCtx.fillStyle = `${color}${alpha})`;
      this.overlayCtx.fillRect(screenPos.x + 2, screenPos.y + 2, tileDrawSize - 4, tileDrawSize - 4);
      
      // Draw trap border
      this.overlayCtx.strokeStyle = trap.triggered ? 'rgba(245, 101, 101, 0.8)' : 'rgba(236, 201, 75, 0.6)';
      this.overlayCtx.lineWidth = 2;
      this.overlayCtx.setLineDash(trap.triggered ? [] : [4, 4]);
      this.overlayCtx.strokeRect(screenPos.x + 2, screenPos.y + 2, tileDrawSize - 4, tileDrawSize - 4);
      this.overlayCtx.setLineDash([]);
      
      // Draw trap icon
      this.overlayCtx.font = `${tileDrawSize * 0.4}px sans-serif`;
      this.overlayCtx.textAlign = 'center';
      this.overlayCtx.textBaseline = 'middle';
      this.overlayCtx.fillStyle = trap.triggered ? '#f56565' : '#ecc94b';
      this.overlayCtx.fillText('⚠️', screenPos.x + tileDrawSize / 2, screenPos.y + tileDrawSize / 2);
    }
  }
  
  // Add trap to grid
  addTrap(x, y, name = 'Trap', triggered = false) {
    if (!this.traps) this.traps = [];
    this.traps.push({ x, y, name, triggered });
    this.render();
  }
  
  // Trigger trap animation
  triggerTrap(x, y) {
    if (!this.traps) return;
    const trap = this.traps.find(t => t.x === x && t.y === y);
    if (trap) {
      trap.triggered = true;
      this.render();
      
      // Flash effect
      this.addAnimation({
        type: 'trap_trigger',
        x, y,
        progress: 0,
        duration: 500,
        startTime: Date.now()
      });
    }
  }
  
  drawFacingIndicator(cx, cy, radius, facing, color) {
    const angles = {
      north: -Math.PI / 2,
      south: Math.PI / 2,
      east: 0,
      west: Math.PI
    };
    
    const angle = angles[facing] || 0;
    const indicatorRadius = radius + 5;
    
    this.ctx.beginPath();
    this.ctx.arc(
      cx + Math.cos(angle) * indicatorRadius,
      cy + Math.sin(angle) * indicatorRadius,
      4, 0, Math.PI * 2
    );
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }
  
  drawAnimations() {
    for (const anim of this.animations) {
      switch (anim.type) {
        case 'attack_line':
          this.drawAttackLine(anim);
          break;
        case 'spell_effect':
          this.drawSpellEffect(anim);
          break;
        case 'death':
          this.drawDeathAnimation(anim);
          break;
        case 'trap_trigger':
          this.drawTrapTriggerAnimation(anim);
          break;
      }
    }
  }
  
  drawTrapTriggerAnimation(anim) {
    const screenPos = this.gridToScreen(anim.x + 0.5, anim.y + 0.5);
    const tileDrawSize = this.tileSize * this.camera.zoom;
    
    // Expanding red flash
    const flashRadius = (tileDrawSize / 2) * (1 + anim.progress * 0.5);
    const alpha = 0.8 * (1 - anim.progress);
    
    this.overlayCtx.beginPath();
    this.overlayCtx.arc(screenPos.x, screenPos.y, flashRadius, 0, Math.PI * 2);
    this.overlayCtx.fillStyle = `rgba(245, 101, 101, ${alpha})`;
    this.overlayCtx.fill();
    
    // Inner flash
    if (anim.progress < 0.3) {
      const innerAlpha = 1 - anim.progress / 0.3;
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(screenPos.x, screenPos.y, tileDrawSize / 3, 0, Math.PI * 2);
      this.overlayCtx.fillStyle = `rgba(255, 255, 255, ${innerAlpha * 0.8})`;
      this.overlayCtx.fill();
    }
    
    // Warning icon shake
    const shake = (1 - anim.progress) * 5 * Math.sin(anim.progress * 20);
    this.overlayCtx.font = `${tileDrawSize * 0.5}px sans-serif`;
    this.overlayCtx.textAlign = 'center';
    this.overlayCtx.textBaseline = 'middle';
    this.overlayCtx.fillText('⚠️', screenPos.x + shake, screenPos.y);
  }
  
  drawAttackLine(anim) {
    const tileDrawSize = this.tileSize * this.camera.zoom;
    const start = this.gridToScreen(anim.x1 + 0.5, anim.y1 + 0.5);
    const end = this.gridToScreen(anim.x2 + 0.5, anim.y2 + 0.5);
    
    const progress = Math.min(anim.progress * 2, 1);
    const fadeOut = Math.max(0, (anim.progress - 0.5) * 2);
    
    const currentX = start.x + (end.x - start.x) * progress;
    const currentY = start.y + (end.y - start.y) * progress;
    
    this.overlayCtx.strokeStyle = `rgba(255, 100, 50, ${1 - fadeOut})`;
    this.overlayCtx.lineWidth = 4;
    this.overlayCtx.beginPath();
    this.overlayCtx.moveTo(start.x, start.y);
    this.overlayCtx.lineTo(currentX, currentY);
    this.overlayCtx.stroke();
    
    // Impact flash
    if (progress >= 0.9) {
      this.overlayCtx.beginPath();
      this.overlayCtx.arc(end.x, end.y, 20 * (1 - fadeOut), 0, Math.PI * 2);
      this.overlayCtx.fillStyle = `rgba(255, 200, 100, ${0.8 * (1 - fadeOut)})`;
      this.overlayCtx.fill();
    }
  }
  
  drawSpellEffect(anim) {
    const screenPos = this.gridToScreen(anim.x + 0.5, anim.y + 0.5);
    
    // Draw expanding ring
    const ringRadius = 20 + anim.progress * 40;
    this.overlayCtx.strokeStyle = anim.colors[0];
    this.overlayCtx.lineWidth = 3 * (1 - anim.progress);
    this.overlayCtx.beginPath();
    this.overlayCtx.arc(screenPos.x, screenPos.y, ringRadius, 0, Math.PI * 2);
    this.overlayCtx.stroke();
    
    // Draw particles
    for (const p of anim.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      
      if (p.life > 0) {
        this.overlayCtx.beginPath();
        this.overlayCtx.arc(
          screenPos.x + p.x,
          screenPos.y + p.y,
          p.size * p.life,
          0, Math.PI * 2
        );
        this.overlayCtx.fillStyle = this.hexToRgba(anim.colors[Math.floor(Math.random() * anim.colors.length)], p.life);
        this.overlayCtx.fill();
      }
    }
  }
  
  drawDeathAnimation(anim) {
    const entity = anim.entity;
    const screenPos = this.gridToScreen(entity.x + 0.5, entity.y + 0.5);
    
    // Fade and shrink
    this.ctx.globalAlpha = 1 - anim.progress;
    this.ctx.save();
    this.ctx.translate(screenPos.x, screenPos.y);
    this.ctx.scale(1 - anim.progress * 0.5, 1 - anim.progress * 0.5);
    this.ctx.rotate(anim.progress * Math.PI);
    
    // Draw skull
    this.ctx.font = `${this.tileSize * this.camera.zoom * 0.6}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = '#dc2626';
    this.ctx.fillText('💀', 0, 0);
    
    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }
  
  drawDamageNumbers() {
    for (const dn of this.damageNumbers) {
      const y = dn.y - (1 - dn.life) * 50;
      
      this.overlayCtx.font = `bold ${24 + (1 - dn.life) * 10}px sans-serif`;
      this.overlayCtx.textAlign = 'center';
      this.overlayCtx.globalAlpha = dn.life;
      
      // Outline
      this.overlayCtx.strokeStyle = '#000';
      this.overlayCtx.lineWidth = 3;
      this.overlayCtx.strokeText(
        dn.type === 'heal' ? `+${dn.amount}` : `-${dn.amount}`,
        dn.x, y
      );
      
      // Fill
      this.overlayCtx.fillStyle = dn.type === 'heal' ? '#22c55e' : 
                                   dn.type === 'crit' ? '#d4af37' : '#dc2626';
      this.overlayCtx.fillText(
        dn.type === 'heal' ? `+${dn.amount}` : `-${dn.amount}`,
        dn.x, y
      );
      
      this.overlayCtx.globalAlpha = 1;
    }
  }
  
  renderMinimap() {
    if (!this.width || !this.height) return;
    
    const ctx = this.minimapCtx;
    const scale = Math.min(150 / this.width, 150 / this.height);
    const offsetX = (150 - this.width * scale) / 2;
    const offsetY = (150 - this.height * scale) / 2;
    
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 150, 150);
    
    // Draw tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.getTile(x, y);
        const vis = this.visibility.get(`${x},${y}`);
        
        if (vis === 'hidden') continue;
        
        let color = this.tileColors[tile?.type] || '#2a2a35';
        if (vis === 'seen') color = this.dimColor(color, 0.5);
        
        ctx.fillStyle = color;
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
      }
    }
    
    // Draw entities
    for (const entity of this.entities.values()) {
      if (!entity.visible) continue;
      ctx.fillStyle = this.entityColors[entity.type];
      ctx.beginPath();
      ctx.arc(
        offsetX + (entity.x + 0.5) * scale,
        offsetY + (entity.y + 0.5) * scale,
        Math.max(2, scale / 2),
        0, Math.PI * 2
      );
      ctx.fill();
    }
    
    // Draw viewport rectangle
    const vpX = this.camera.x / (this.tileSize * this.camera.zoom);
    const vpY = this.camera.y / (this.tileSize * this.camera.zoom);
    const vpW = this.canvas.width / (this.tileSize * this.camera.zoom);
    const vpH = this.canvas.height / (this.tileSize * this.camera.zoom);
    
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      offsetX + vpX * scale,
      offsetY + vpY * scale,
      vpW * scale,
      vpH * scale
    );
  }
  
  // ===== UTILITY =====
  
  dimColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  }
  
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

// ===== DIALOG QUEUE SYSTEM =====
class DialogQueue {
  constructor() {
    this.queue = [];
    this.isShowing = false;
    this.currentTimeout = null;
    this.overlay = null;
    this.box = null;
    this.portrait = null;
    this.speaker = null;
    this.text = null;
    this.actions = null;
  }

  init() {
    this.overlay = document.getElementById('dialog-overlay');
    this.box = document.getElementById('dialog-box');
    this.portrait = document.getElementById('dialog-portrait');
    this.speaker = document.getElementById('dialog-speaker');
    this.text = document.getElementById('dialog-text');
    this.actions = document.getElementById('dialog-actions');
  }

  // Add dialog to queue
  enqueue(dialog) {
    this.queue.push(dialog);
    if (!this.isShowing) {
      this.showNext();
    }
  }

  // Show next dialog in queue
  showNext() {
    if (this.queue.length === 0) {
      this.hide();
      return;
    }

    this.isShowing = true;
    const dialog = this.queue.shift();
    this.display(dialog);

    // Auto-dismiss after duration (default 3s)
    const duration = dialog.duration || 3000;
    if (duration > 0 && !dialog.persistent) {
      // Add progress bar
      if (this.box) {
        const progress = document.createElement('div');
        progress.className = 'dialog-progress';
        progress.style.animationDuration = `${duration}ms`;
        this.box.appendChild(progress);
      }
      
      this.currentTimeout = setTimeout(() => {
        this.showNext();
      }, duration);
    }
  }

  display(dialog) {
    if (!this.overlay) this.init();
    if (!this.overlay) return;

    // Remove old progress bar
    const oldProgress = this.box?.querySelector('.dialog-progress');
    if (oldProgress) oldProgress.remove();

    // Set dialog type class
    this.box.className = `dialog-box ${dialog.type || ''}`;

    // Portrait
    if (this.portrait) {
      this.portrait.textContent = dialog.portrait || '';
      this.portrait.style.display = dialog.portrait ? 'flex' : 'none';
    }

    // Speaker name
    if (this.speaker) {
      this.speaker.textContent = dialog.speaker || '';
    }

    // Main text
    if (this.text) {
      this.text.innerHTML = dialog.text || '';
    }

    // Action buttons
    if (this.actions) {
      this.actions.innerHTML = '';
      if (dialog.actions && dialog.actions.length > 0) {
        dialog.actions.forEach(action => {
          const btn = document.createElement('button');
          btn.className = `dialog-btn ${action.primary ? 'primary' : ''}`;
          btn.textContent = action.label;
          btn.onclick = () => {
            if (action.callback) action.callback();
            this.dismiss();
          };
          this.actions.appendChild(btn);
        });
      }
    }

    // Show overlay
    this.overlay.classList.remove('hidden');
    
    // Force reflow for animation
    this.box.offsetHeight;
    this.box.style.animation = 'none';
    this.box.offsetHeight;
    this.box.style.animation = '';
  }

  dismiss() {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    this.showNext();
  }

  hide() {
    this.isShowing = false;
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
  }

  // Quick methods for common dialog types
  showAttack(roll, modifier, total, ac, hit, critical = false) {
    const result = hit ? (critical ? 'CRITICAL HIT!' : 'HIT!') : 'MISS!';
    const resultClass = hit ? (critical ? 'crit' : 'hit') : 'miss';
    
    this.enqueue({
      type: 'attack',
      portrait: '⚔️',
      speaker: 'Attack Roll',
      text: `🎲 <span class="roll-result">${roll}</span> + ${modifier} = <strong>${total}</strong> vs AC ${ac} — <span class="${resultClass}">${result}</span>`,
      duration: critical ? 3500 : 2500
    });
  }

  showDamage(amount, damageType = 'damage', targetName = '') {
    const icon = damageType === 'slashing' ? '🗡️' : 
                 damageType === 'piercing' ? '🏹' : 
                 damageType === 'bludgeoning' ? '🔨' : 
                 damageType === 'fire' ? '🔥' : 
                 damageType === 'cold' ? '❄️' : 
                 damageType === 'lightning' ? '⚡' : 
                 damageType === 'poison' ? '☠️' : '💥';
    
    this.enqueue({
      type: 'damage',
      portrait: icon,
      speaker: 'Damage',
      text: `Deals <span class="damage">${amount}</span> ${damageType} damage${targetName ? ` to ${targetName}` : ''}!`,
      duration: 2000
    });
  }

  showHeal(amount, sourceName = '') {
    this.enqueue({
      type: 'heal',
      portrait: '💚',
      speaker: 'Healing',
      text: `${sourceName ? sourceName + ' heals' : 'Healed'} <span class="heal">${amount}</span> HP!`,
      duration: 2000
    });
  }

  showTrap(trapName, saveType, dc, result) {
    const passed = result >= dc;
    this.enqueue({
      type: 'trap',
      portrait: '⚠️',
      speaker: 'TRAP!',
      text: `${trapName}<br>🎲 ${saveType} Save DC ${dc}: <span class="roll-result">${result}</span> — <span class="${passed ? 'hit' : 'miss'}">${passed ? 'SUCCESS!' : 'FAILED!'}</span>`,
      duration: 3500
    });
  }

  showPuzzle(puzzleName, description, result = null) {
    const dialog = {
      type: 'puzzle',
      portrait: '🔮',
      speaker: puzzleName,
      text: description,
      duration: result ? 3000 : 0,
      persistent: !result
    };

    if (result) {
      dialog.text += `<br><br>Result: <span class="${result.success ? 'hit' : 'miss'}">${result.message}</span>`;
    }

    this.enqueue(dialog);
  }

  showShop(shopkeeperName, items, playerGold, onBuy) {
    let itemsHtml = '<div class="shop-items">';
    items.forEach((item, i) => {
      const canAfford = playerGold >= item.price;
      itemsHtml += `
        <div class="shop-item" data-index="${i}">
          <div class="shop-item-info">
            <span class="shop-item-icon">${item.icon || '📦'}</span>
            <div class="shop-item-details">
              <span class="shop-item-name">${item.name}</span>
              <span class="shop-item-desc">${item.description || ''}</span>
            </div>
          </div>
          <span class="shop-item-price ${canAfford ? '' : 'miss'}">💰 ${item.price}</span>
        </div>
      `;
    });
    itemsHtml += '</div>';

    this.enqueue({
      type: 'shop',
      portrait: '🧙‍♂️',
      speaker: shopkeeperName || 'Merchant',
      text: `Welcome, traveler! Your gold: <span class="roll-result">💰 ${playerGold}</span>${itemsHtml}`,
      duration: 0,
      persistent: true,
      actions: [
        { label: 'Leave Shop', callback: () => {} }
      ]
    });
  }

  showMessage(text, portrait = '📜', speaker = '', duration = 2500) {
    this.enqueue({
      type: '',
      portrait,
      speaker,
      text,
      duration
    });
  }
}

// ===== TERRAIN INFO SYSTEM =====
const TERRAIN_INFO = {
  floor: {
    icon: '🟫',
    name: 'Stone Floor',
    effects: ['Normal movement']
  },
  wall: {
    icon: '🧱',
    name: 'Wall',
    effects: ['Impassable', 'Blocks line of sight']
  },
  water: {
    icon: '💧',
    name: 'Shallow Water',
    effects: [
      { text: 'Difficult terrain (2x movement)', type: 'warning' },
      'May extinguish fire'
    ]
  },
  deep_water: {
    icon: '🌊',
    name: 'Deep Water',
    effects: [
      { text: 'Requires swimming', type: 'warning' },
      { text: 'Drowning risk without air', type: 'warning' }
    ]
  },
  kelp: {
    icon: '🌿',
    name: 'Kelp Forest',
    effects: [
      { text: 'Difficult terrain (2x movement)', type: 'warning' },
      { text: 'Provides half cover (+2 AC)', type: 'bonus' }
    ]
  },
  coral: {
    icon: '🪸',
    name: 'Coral Reef',
    effects: [
      { text: 'Difficult terrain', type: 'warning' },
      { text: '1d4 piercing damage if moved through quickly', type: 'warning' }
    ]
  },
  sand: {
    icon: '🏖️',
    name: 'Sandy Bottom',
    effects: ['Normal movement', 'May conceal items']
  },
  rock: {
    icon: '🪨',
    name: 'Rocky Terrain',
    effects: [
      { text: 'Provides half cover (+2 AC)', type: 'bonus' }
    ]
  },
  thermal_vent: {
    icon: '🌋',
    name: 'Thermal Vent',
    effects: [
      { text: '2d6 fire damage per turn', type: 'warning' },
      { text: 'Obscures vision (heavily obscured)', type: 'warning' }
    ]
  },
  lava: {
    icon: '🔥',
    name: 'Lava / Magma',
    effects: [
      { text: '10d10 fire damage on contact', type: 'warning' },
      { text: 'Instant death for most creatures', type: 'warning' }
    ]
  },
  high_ground: {
    icon: '⬆️',
    name: 'High Ground',
    effects: [
      { text: 'Advantage on ranged attacks', type: 'bonus' },
      { text: '+2 to Perception checks', type: 'bonus' }
    ]
  },
  cover_half: {
    icon: '🛡️',
    name: 'Half Cover',
    effects: [
      { text: '+2 AC against attacks', type: 'bonus' },
      { text: '+2 DEX saves', type: 'bonus' }
    ]
  },
  cover_full: {
    icon: '🏰',
    name: 'Full Cover',
    effects: [
      { text: '+5 AC against attacks', type: 'bonus' },
      { text: '+5 DEX saves', type: 'bonus' },
      { text: 'Cannot be directly targeted', type: 'bonus' }
    ]
  },
  door: {
    icon: '🚪',
    name: 'Door (Closed)',
    effects: ['Blocks movement', 'Can be opened (action)']
  },
  door_open: {
    icon: '🚪',
    name: 'Door (Open)',
    effects: ['Normal movement']
  },
  stairs_up: {
    icon: '⬆️',
    name: 'Stairs Up',
    effects: ['Leads to previous floor']
  },
  stairs_down: {
    icon: '⬇️',
    name: 'Stairs Down',
    effects: ['Leads to next floor']
  },
  pit: {
    icon: '🕳️',
    name: 'Pit',
    effects: [
      { text: 'Fall damage (1d6 per 10ft)', type: 'warning' },
      { text: 'Climbing required to escape', type: 'warning' }
    ]
  },
  trap: {
    icon: '⚠️',
    name: 'Trap',
    effects: [
      { text: 'Triggers when stepped on', type: 'warning' },
      { text: 'May be disarmed (Thieves\' Tools)', type: '' }
    ]
  },
  difficult: {
    icon: '🌀',
    name: 'Difficult Terrain',
    effects: [
      { text: 'Costs 2x movement', type: 'warning' }
    ]
  },
  fire: {
    icon: '🔥',
    name: 'Fire',
    effects: [
      { text: '1d8 fire damage when entering', type: 'warning' },
      { text: 'Spreads to adjacent squares', type: 'warning' }
    ]
  }
};

class TerrainTooltip {
  constructor() {
    this.tooltip = null;
    this.icon = null;
    this.name = null;
    this.effects = null;
    this.visible = false;
  }

  init() {
    this.tooltip = document.getElementById('terrain-tooltip');
    this.icon = document.getElementById('terrain-icon');
    this.name = document.getElementById('terrain-name');
    this.effects = document.getElementById('terrain-effects');
  }

  show(tileType, screenX, screenY) {
    if (!this.tooltip) this.init();
    if (!this.tooltip) return;

    const info = TERRAIN_INFO[tileType] || TERRAIN_INFO.floor;
    
    if (this.icon) this.icon.textContent = info.icon;
    if (this.name) this.name.textContent = info.name;
    
    if (this.effects) {
      this.effects.innerHTML = '';
      info.effects.forEach(effect => {
        const div = document.createElement('div');
        if (typeof effect === 'string') {
          div.className = 'terrain-effect';
          div.textContent = effect;
        } else {
          div.className = `terrain-effect ${effect.type || ''}`;
          div.textContent = effect.text;
        }
        this.effects.appendChild(div);
      });
    }

    // Position tooltip
    const rect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = screenX + 15;
    let y = screenY - 10;
    
    // Keep within viewport
    if (x + 200 > viewportWidth) x = screenX - 200;
    if (y + 150 > viewportHeight) y = screenY - 150;
    if (y < 0) y = 10;
    
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    this.tooltip.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    if (this.tooltip) {
      this.tooltip.classList.add('hidden');
    }
    this.visible = false;
  }
}

// Global instances
let dialogQueue = null;
let terrainTooltip = null;

// ===== INITIALIZATION =====

document.addEventListener('DOMContentLoaded', () => {
  // Initialize dialog and tooltip systems
  dialogQueue = new DialogQueue();
  actionSequencer = new ActionSequencer();
  terrainTooltip = new TerrainTooltip();
  
  if (runId) {
    initDungeonMode();
  } else if (campaignId) {
    initCampaignMode();
  } else {
    showError('No run or campaign ID provided');
  }
});

// ===== DUNGEON MODE =====

// Polling interval reference
let pollInterval = null;

function initDungeonMode() {
  document.title = 'Dungeon Run - Caverns & Clawds';
  
  // Initialize tactical grid if container exists
  const gridContainer = document.getElementById('tactical-grid-container');
  if (gridContainer) {
    tacticalGrid = new TacticalGrid(gridContainer);
  }
  
  loadRunData();
  loadRunLog();
  connectWebSocket();
  startTimer();
  
  // Start polling for updates (backup for WebSocket - only when disconnected)
  pollInterval = setInterval(() => {
    if (!wsConnected) {
      loadRunData();
      loadRunLog();
    }
  }, 2000);
}

// Load run action log
async function loadRunLog() {
  if (!runId) return;
  
  try {
    // Clear existing logs first to prevent pollution from previous runs
    const logContainer = document.getElementById('narrative-log');
    if (logContainer) {
      logContainer.innerHTML = '';
    }
    // Reset deduplication tracking
    lastLogId = null;
    logQueue = [];
    
    const res = await fetch(`/api/runs/${runId}/log?limit=50`);
    const data = await res.json();
    
    if (data.success && data.log) {
      data.log.forEach(entry => {
        appendLog({
          id: entry.id,
          type: entry.action_type,
          content: formatLogEntry(entry),
          timestamp: entry.timestamp,
          roll: entry.result?.roll
        });
      });
    }
  } catch (err) {
    console.error('Failed to load run log:', err);
  }
}

// Format a log entry for display
function formatLogEntry(entry) {
  const result = entry.result || {};
  
  // Use rich narrative if available (stored by resolveAction)
  if (result.narrative) return result.narrative;
  if (result.message) return result.message;
  if (result.description) return result.description;
  
  // Default formatting based on action type (fallback for old entries)
  switch (entry.action_type) {
    case 'move':
      return result.moved ? `🏃 Moved to (${result.x}, ${result.y})` : 'Attempted to move';
    case 'attack':
      if (result.hit) {
        return `⚔️ Attack hit! Dealt ${result.damage || 0} damage${result.target_killed ? ' 💀 KILL!' : ''}`;
      }
      return '⚔️ Attack missed';
    case 'use_item':
      return `🧪 Used ${entry.action_data?.item || 'item'}`;
    case 'search':
      return result.found ? `🔍 Found: ${result.found}` : '🔍 Searched the area';
    case 'descend':
      return result.descended ? `🔽 Descended to floor ${result.floor}` : 'Attempted to descend';
    default:
      return `${entry.action_type}: ${JSON.stringify(result).substring(0, 50)}`;
  }
}

function createDemoGrid() {
  if (!tacticalGrid) return;
  
  // Create a sample dungeon room
  const grid = {
    width: 20,
    height: 15,
    tiles: []
  };
  
  for (let y = 0; y < 15; y++) {
    grid.tiles[y] = [];
    for (let x = 0; x < 20; x++) {
      // Walls on edges
      if (x === 0 || x === 19 || y === 0 || y === 14) {
        grid.tiles[y][x] = { type: 'wall' };
      }
      // Some interior walls
      else if ((x === 5 || x === 14) && y > 2 && y < 10) {
        grid.tiles[y][x] = { type: 'wall' };
      }
      // Water pool
      else if (x >= 7 && x <= 9 && y >= 5 && y <= 7) {
        grid.tiles[y][x] = { type: 'water' };
      }
      // Lava
      else if (x === 16 && y >= 8 && y <= 12) {
        grid.tiles[y][x] = { type: 'lava' };
      }
      // Door
      else if (x === 5 && y === 5) {
        grid.tiles[y][x] = { type: 'door' };
      }
      // High ground
      else if (x >= 11 && x <= 13 && y >= 2 && y <= 4) {
        grid.tiles[y][x] = { type: 'high_ground' };
      }
      // Cover
      else if ((x === 3 && y === 8) || (x === 17 && y === 5)) {
        grid.tiles[y][x] = { type: 'cover_half' };
      }
      else {
        grid.tiles[y][x] = { type: 'floor' };
      }
    }
  }
  
  tacticalGrid.loadGrid(grid);
  
  // Add player
  tacticalGrid.addEntity({
    id: 'player1',
    name: 'Hero',
    type: 'player',
    x: 2,
    y: 7,
    hp: 45,
    maxHp: 52,
    ac: 16,
    icon: getPlayerAppearance(run.character_stats).base,
    facing: 'east'
  });
  
  // Add enemies
  tacticalGrid.addEntity({
    id: 'goblin1',
    name: 'Goblin',
    type: 'enemy',
    x: 8,
    y: 3,
    hp: 7,
    maxHp: 7,
    ac: 13,
    icon: '👺',
    facing: 'west'
  });
  
  tacticalGrid.addEntity({
    id: 'goblin2',
    name: 'Goblin Archer',
    type: 'enemy',
    x: 12,
    y: 3,
    hp: 5,
    maxHp: 7,
    ac: 12,
    icon: '🏹',
    facing: 'south'
  });
  
  tacticalGrid.addEntity({
    id: 'orc1',
    name: 'Orc Warrior',
    type: 'enemy',
    x: 15,
    y: 10,
    hp: 15,
    maxHp: 15,
    ac: 14,
    icon: '👹',
    facing: 'west'
  });
  
  // Add ally
  tacticalGrid.addEntity({
    id: 'ally1',
    name: 'Ranger',
    type: 'ally',
    x: 3,
    y: 10,
    hp: 28,
    maxHp: 35,
    ac: 15,
    icon: '🧝',
    facing: 'north'
  });
  
  // Start player turn for demo
  tacticalGrid.startPlayerTurn();
}

async function loadRunData() {
  try {
    const res = await fetch(`/api/runs/${runId}`);
    const data = await res.json();
    
    if (!data.success) {
      showError(data.error || 'Run not found');
      return;
    }
    
    updateRunDisplay(data.run);
    
    // Fetch current room data for visualization
    try {
      const roomRes = await fetch(`/api/dungeon/today/room/${data.run.current_floor}/${data.run.current_room}`);
      const roomData = await roomRes.json();
      
      if (roomData.success && roomData.room) {
        const roomInfo = roomData.room;
        
        if (tacticalGrid) {
          // Prioritize combat_state grid if in tactical combat
          if (data.run.combat_state?.grid) {
            const combatGrid = generateGridFromCombatState(data.run.combat_state);
            if (combatGrid) {
              tacticalGrid.loadGrid(combatGrid);
            } else {
              tacticalGrid.loadGrid(generateRoomGrid(roomInfo, data.run.current_encounter));
            }
          } else {
            tacticalGrid.loadGrid(generateRoomGrid(roomInfo, data.run.current_encounter));
          }
          loadRoomEntities(data.run, roomInfo);
        }
        
        // Update scene title
        updateSceneFromRoom(roomInfo, data.run);
      }
    } catch (roomErr) {
      console.warn('Could not load room data:', roomErr);
      
      // Fallback to combat_state or encounter data
      if (tacticalGrid) {
        if (data.run.combat_state?.grid) {
          const combatGrid = generateGridFromCombatState(data.run.combat_state);
          if (combatGrid) {
            tacticalGrid.loadGrid(combatGrid);
            loadEntitiesFromCombatState(data.run);
          }
        } else if (data.run.current_encounter) {
          tacticalGrid.loadGrid(generateEncounterGrid(data.run.current_encounter));
          loadEncounterEntities(data.run);
        }
        if (data.run.current_encounter) {
          updateSceneFromEncounter(data.run.current_encounter, data.run);
        }
      }
    }
  } catch (err) {
    console.error('Failed to load run:', err);
    showError('Failed to load run data');
  }
}

// ============================================================================
// INTERESTING LEVEL GENERATOR - Creates varied, organic dungeon layouts
// ============================================================================

// Seeded RNG class for consistent level generation
class SeededRNG {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

// Room layout templates for interesting shapes
const ROOM_TEMPLATES = {
  // L-shaped room with chokepoint
  L_SHAPE: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const vertical = rng.next() > 0.5;
    const flipH = rng.next() > 0.5;
    const flipV = rng.next() > 0.5;
    
    if (vertical) {
      // Vertical L
      const armWidth = rng.nextInt(4, Math.floor(w / 2));
      const legHeight = rng.nextInt(Math.floor(h / 2), h - 3);
      
      for (let y = 1; y < h - 1; y++) {
        const startX = flipH ? w - armWidth - 1 : 1;
        const endX = flipH ? w - 1 : armWidth + 1;
        for (let x = startX; x < endX; x++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      for (let y = (flipV ? 1 : h - legHeight); y < (flipV ? legHeight : h - 1); y++) {
        for (let x = 1; x < w - 1; x++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    } else {
      // Horizontal L
      const armHeight = rng.nextInt(4, Math.floor(h / 2));
      const legWidth = rng.nextInt(Math.floor(w / 2), w - 3);
      
      for (let x = 1; x < w - 1; x++) {
        const startY = flipV ? h - armHeight - 1 : 1;
        const endY = flipV ? h - 1 : armHeight + 1;
        for (let y = startY; y < endY; y++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      for (let x = (flipH ? 1 : w - legWidth); x < (flipH ? legWidth : w - 1); x++) {
        for (let y = 1; y < h - 1; y++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    return tiles;
  },
  
  // T-shaped room with multiple approaches
  T_SHAPE: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const horizontal = rng.next() > 0.5;
    
    if (horizontal) {
      // Horizontal bar
      const barHeight = rng.nextInt(3, 5);
      const barY = rng.nextInt(2, h - barHeight - 2);
      for (let y = barY; y < barY + barHeight; y++) {
        for (let x = 1; x < w - 1; x++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      // Vertical stem
      const stemWidth = rng.nextInt(3, 5);
      const stemX = Math.floor(w / 2) - Math.floor(stemWidth / 2);
      const stemDir = rng.next() > 0.5 ? 1 : -1;
      for (let y = barY; stemDir > 0 ? y < h - 1 : y > 0; y += stemDir) {
        for (let x = stemX; x < stemX + stemWidth; x++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    } else {
      // Vertical bar
      const barWidth = rng.nextInt(3, 5);
      const barX = rng.nextInt(2, w - barWidth - 2);
      for (let x = barX; x < barX + barWidth; x++) {
        for (let y = 1; y < h - 1; y++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      // Horizontal stem
      const stemHeight = rng.nextInt(3, 5);
      const stemY = Math.floor(h / 2) - Math.floor(stemHeight / 2);
      const stemDir = rng.next() > 0.5 ? 1 : -1;
      for (let x = barX; stemDir > 0 ? x < w - 1 : x > 0; x += stemDir) {
        for (let y = stemY; y < stemY + stemHeight; y++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    return tiles;
  },
  
  // Circular/oval room (great for shrines, boss arenas)
  CIRCULAR: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const centerX = w / 2;
    const centerY = h / 2;
    const radiusX = (w - 4) / 2;
    const radiusY = (h - 4) / 2;
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        if (dx * dx + dy * dy <= 1.0) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    return tiles;
  },
  
  // Diamond/rhombus shape
  DIAMOND: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const centerX = Math.floor(w / 2);
    const centerY = Math.floor(h / 2);
    const sizeX = Math.floor(w / 2) - 2;
    const sizeY = Math.floor(h / 2) - 2;
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const dx = Math.abs(x - centerX);
        const dy = Math.abs(y - centerY);
        if (dx / sizeX + dy / sizeY <= 1.0) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    return tiles;
  },
  
  // Corridor with alcoves/side rooms (dead ends for treasure/ambushes)
  CORRIDOR_WITH_ALCOVES: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const horizontal = w > h;
    
    if (horizontal) {
      // Main corridor
      const corridorWidth = rng.nextInt(3, 5);
      const corridorY = Math.floor(h / 2) - Math.floor(corridorWidth / 2);
      for (let y = corridorY; y < corridorY + corridorWidth; y++) {
        for (let x = 1; x < w - 1; x++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      // Alcoves
      const numAlcoves = rng.nextInt(2, 4);
      for (let i = 0; i < numAlcoves; i++) {
        const alcoveX = rng.nextInt(3, w - 6);
        const alcoveWidth = rng.nextInt(2, 4);
        const alcoveDepth = rng.nextInt(2, 4);
        const topSide = rng.next() > 0.5;
        
        for (let ax = alcoveX; ax < alcoveX + alcoveWidth && ax < w - 1; ax++) {
          if (topSide) {
            for (let ay = corridorY - 1; ay > corridorY - alcoveDepth - 1 && ay > 0; ay--) {
              tiles[ay][ax] = { type: 'floor' };
            }
          } else {
            for (let ay = corridorY + corridorWidth; ay < corridorY + corridorWidth + alcoveDepth && ay < h - 1; ay++) {
              tiles[ay][ax] = { type: 'floor' };
            }
          }
        }
      }
    } else {
      // Vertical corridor with alcoves
      const corridorWidth = rng.nextInt(3, 5);
      const corridorX = Math.floor(w / 2) - Math.floor(corridorWidth / 2);
      for (let x = corridorX; x < corridorX + corridorWidth; x++) {
        for (let y = 1; y < h - 1; y++) {
          tiles[y][x] = { type: 'floor' };
        }
      }
      // Alcoves
      const numAlcoves = rng.nextInt(2, 4);
      for (let i = 0; i < numAlcoves; i++) {
        const alcoveY = rng.nextInt(3, h - 6);
        const alcoveHeight = rng.nextInt(2, 4);
        const alcoveDepth = rng.nextInt(2, 4);
        const leftSide = rng.next() > 0.5;
        
        for (let ay = alcoveY; ay < alcoveY + alcoveHeight && ay < h - 1; ay++) {
          if (leftSide) {
            for (let ax = corridorX - 1; ax > corridorX - alcoveDepth - 1 && ax > 0; ax--) {
              tiles[ay][ax] = { type: 'floor' };
            }
          } else {
            for (let ax = corridorX + corridorWidth; ax < corridorX + corridorWidth + alcoveDepth && ax < w - 1; ax++) {
              tiles[ay][ax] = { type: 'floor' };
            }
          }
        }
      }
    }
    return tiles;
  },
  
  // Multi-chamber room (connected smaller rooms)
  MULTI_CHAMBER: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    const numChambers = rng.nextInt(2, 4);
    const chambers = [];
    
    // Create chambers
    for (let i = 0; i < numChambers; i++) {
      const chamberW = rng.nextInt(4, Math.floor(w / 2));
      const chamberH = rng.nextInt(4, Math.floor(h / 2));
      const chamberX = rng.nextInt(1, w - chamberW - 1);
      const chamberY = rng.nextInt(1, h - chamberH - 1);
      
      chambers.push({ x: chamberX, y: chamberY, w: chamberW, h: chamberH });
      
      for (let y = chamberY; y < chamberY + chamberH; y++) {
        for (let x = chamberX; x < chamberX + chamberW; x++) {
          if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
            tiles[y][x] = { type: 'floor' };
          }
        }
      }
    }
    
    // Connect chambers with corridors
    for (let i = 1; i < chambers.length; i++) {
      const fromC = chambers[i - 1];
      const toC = chambers[i];
      const fromX = fromC.x + Math.floor(fromC.w / 2);
      const fromY = fromC.y + Math.floor(fromC.h / 2);
      const toX = toC.x + Math.floor(toC.w / 2);
      const toY = toC.y + Math.floor(toC.h / 2);
      
      // L-shaped corridor
      let x = fromX, y = fromY;
      while (x !== toX) {
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) tiles[y][x] = { type: 'floor' };
        x += x < toX ? 1 : -1;
      }
      while (y !== toY) {
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) tiles[y][x] = { type: 'floor' };
        y += y < toY ? 1 : -1;
      }
    }
    return tiles;
  },
  
  // Cave-like room using cellular automata
  CAVE: (w, h, rng) => {
    const tiles = [];
    
    // Initialize with random fill
    for (let y = 0; y < h; y++) {
      tiles[y] = [];
      for (let x = 0; x < w; x++) {
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          tiles[y][x] = { type: 'wall' };
        } else {
          tiles[y][x] = { type: rng.next() < 0.42 ? 'wall' : 'floor' };
        }
      }
    }
    
    // Run cellular automata iterations
    for (let iter = 0; iter < 4; iter++) {
      const newTiles = [];
      for (let y = 0; y < h; y++) {
        newTiles[y] = [];
        for (let x = 0; x < w; x++) {
          if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
            newTiles[y][x] = { type: 'wall' };
            continue;
          }
          
          // Count wall neighbors
          let walls = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx, ny = y + dy;
              if (nx < 0 || nx >= w || ny < 0 || ny >= h || tiles[ny][nx].type === 'wall') {
                walls++;
              }
            }
          }
          
          // Smoothing rules
          if (walls >= 5) {
            newTiles[y][x] = { type: 'wall' };
          } else if (walls <= 2) {
            newTiles[y][x] = { type: 'floor' };
          } else {
            newTiles[y][x] = tiles[y][x];
          }
        }
      }
      
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          tiles[y][x] = newTiles[y][x];
        }
      }
    }
    
    // Ensure center area is open (for playability)
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    
    return tiles;
  },
  
  // Arena with pillars for cover (boss fights)
  ARENA: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    
    // Open center area
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        tiles[y][x] = { type: 'floor' };
      }
    }
    
    // Add pillars in a pattern
    const pillarPattern = rng.nextInt(0, 3);
    const pillarPositions = [];
    
    switch (pillarPattern) {
      case 0: // Four corners
        pillarPositions.push(
          { x: 4, y: 3 }, { x: w - 5, y: 3 },
          { x: 4, y: h - 4 }, { x: w - 5, y: h - 4 }
        );
        break;
      case 1: // Grid pattern
        for (let py = 3; py < h - 3; py += 3) {
          for (let px = 4; px < w - 4; px += 4) {
            pillarPositions.push({ x: px, y: py });
          }
        }
        break;
      case 2: // Ring pattern
        const cx = Math.floor(w / 2);
        const cy = Math.floor(h / 2);
        const radius = Math.min(w, h) / 3;
        for (let angle = 0; angle < 360; angle += 60) {
          const rad = angle * Math.PI / 180;
          pillarPositions.push({
            x: Math.floor(cx + Math.cos(rad) * radius),
            y: Math.floor(cy + Math.sin(rad) * radius)
          });
        }
        break;
      case 3: // Random scatter
        const numPillars = rng.nextInt(4, 8);
        for (let i = 0; i < numPillars; i++) {
          pillarPositions.push({
            x: rng.nextInt(4, w - 5),
            y: rng.nextInt(3, h - 4)
          });
        }
        break;
    }
    
    for (const pos of pillarPositions) {
      if (pos.x > 1 && pos.x < w - 2 && pos.y > 1 && pos.y < h - 2) {
        tiles[pos.y][pos.x] = { type: rng.next() > 0.5 ? 'cover_full' : 'cover_half' };
      }
    }
    
    return tiles;
  },
  
  // Irregular/organic room shape
  IRREGULAR: (w, h, rng) => {
    const tiles = createWallGrid(w, h);
    
    // Start with a basic shape and erode/expand it randomly
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    
    // Create base shape using noise-like approach
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const dx = (x - cx) / (w / 2 - 3);
        const dy = (y - cy) / (h / 2 - 3);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Add noise to the distance
        const noise = (Math.sin(x * 1.5 + rng.next() * 3) * 0.2 + 
                       Math.cos(y * 1.5 + rng.next() * 3) * 0.2);
        
        if (dist + noise < 0.9) {
          tiles[y][x] = { type: 'floor' };
        }
      }
    }
    
    // Add some random protrusions
    const numProtrusions = rng.nextInt(2, 5);
    for (let i = 0; i < numProtrusions; i++) {
      const angle = rng.next() * Math.PI * 2;
      const length = rng.nextInt(2, 4);
      let px = cx + Math.floor(Math.cos(angle) * (w / 3));
      let py = cy + Math.floor(Math.sin(angle) * (h / 3));
      
      for (let j = 0; j < length; j++) {
        if (px > 1 && px < w - 2 && py > 1 && py < h - 2) {
          tiles[py][px] = { type: 'floor' };
          // Widen slightly
          if (px > 2) tiles[py][px - 1] = { type: 'floor' };
          if (px < w - 3) tiles[py][px + 1] = { type: 'floor' };
        }
        px += Math.floor(Math.cos(angle));
        py += Math.floor(Math.sin(angle));
      }
    }
    
    return tiles;
  }
};

// Helper to create a wall-filled grid
function createWallGrid(w, h) {
  const tiles = [];
  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) {
      tiles[y][x] = { type: 'wall' };
    }
  }
  return tiles;
}

// Add environmental features based on room type
function addEnvironmentalFeatures(tiles, w, h, room, rng) {
  const floorType = room.theme?.zone || 'shallow';
  
  // Add water features for underwater theme
  if (room.type !== 'boss' && rng.next() < 0.3) {
    const numPools = rng.nextInt(1, 3);
    for (let p = 0; p < numPools; p++) {
      const poolX = rng.nextInt(3, w - 5);
      const poolY = rng.nextInt(3, h - 5);
      const poolSize = rng.nextInt(1, 3);
      
      for (let dy = 0; dy < poolSize; dy++) {
        for (let dx = 0; dx < poolSize; dx++) {
          const x = poolX + dx, y = poolY + dy;
          if (x > 0 && x < w - 1 && y > 0 && y < h - 1 && tiles[y][x].type === 'floor') {
            tiles[y][x] = { type: 'water' };
          }
        }
      }
    }
  }
  
  // Add high ground for tactical advantage
  if ((room.type === 'combat' || room.type === 'boss') && rng.next() < 0.4) {
    const side = rng.nextInt(0, 3);
    const positions = [
      { x: 2, y: 2, w: 3, h: 2 }, // top-left
      { x: w - 5, y: 2, w: 3, h: 2 }, // top-right
      { x: 2, y: h - 4, w: 3, h: 2 }, // bottom-left
      { x: w - 5, y: h - 4, w: 3, h: 2 } // bottom-right
    ];
    const pos = positions[side];
    
    for (let y = pos.y; y < pos.y + pos.h; y++) {
      for (let x = pos.x; x < pos.x + pos.w; x++) {
        if (tiles[y]?.[x]?.type === 'floor') {
          tiles[y][x] = { type: 'high_ground' };
        }
      }
    }
  }
  
  // Add traps for trap rooms
  if (room.type === 'trap' && rng.next() < 0.6) {
    const numTraps = rng.nextInt(2, 5);
    for (let t = 0; t < numTraps; t++) {
      const tx = rng.nextInt(2, w - 3);
      const ty = rng.nextInt(2, h - 3);
      if (tiles[ty]?.[tx]?.type === 'floor') {
        tiles[ty][tx] = { type: 'difficult' };
      }
    }
  }
  
  // Add cover for combat rooms
  if (room.type === 'combat' || room.type === 'trap') {
    const numCover = rng.nextInt(2, 6);
    for (let c = 0; c < numCover; c++) {
      const cx = rng.nextInt(3, w - 4);
      const cy = rng.nextInt(3, h - 4);
      if (tiles[cy]?.[cx]?.type === 'floor') {
        tiles[cy][cx] = { type: rng.next() > 0.5 ? 'cover_half' : 'cover_full' };
      }
    }
  }
  
  // Shrine rooms get a central feature
  if (room.type === 'shrine') {
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    if (tiles[cy]?.[cx]) {
      tiles[cy][cx] = { type: 'high_ground' };
    }
  }
  
  // Treasure rooms get an obvious center
  if (room.type === 'treasure') {
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    if (tiles[cy]?.[cx]) {
      tiles[cy][cx] = { type: 'high_ground' };
    }
  }
  
  return tiles;
}

// Find passable tiles and add doors connecting to them
function addExits(tiles, w, h, rng) {
  const exits = [];
  
  // Find all edge floor tiles
  const edgeTiles = { north: [], south: [], east: [], west: [] };
  
  for (let x = 1; x < w - 1; x++) {
    if (tiles[1]?.[x]?.type === 'floor') edgeTiles.north.push(x);
    if (tiles[h - 2]?.[x]?.type === 'floor') edgeTiles.south.push(x);
  }
  for (let y = 1; y < h - 1; y++) {
    if (tiles[y]?.[1]?.type === 'floor') edgeTiles.west.push(y);
    if (tiles[y]?.[w - 2]?.type === 'floor') edgeTiles.east.push(y);
  }
  
  // Add 2-4 exits
  const numExits = rng.nextInt(2, 4);
  const directions = ['north', 'south', 'east', 'west'];
  
  // Always try to add north and south first
  if (edgeTiles.north.length > 0) {
    const x = rng.pick(edgeTiles.north);
    tiles[0][x] = { type: 'door_open' };
    exits.push({ dir: 'north', x, y: 0 });
  } else {
    // Carve a path north
    const x = Math.floor(w / 2);
    for (let y = 1; y < 3; y++) {
      if (tiles[y]?.[x]) tiles[y][x] = { type: 'floor' };
    }
    tiles[0][x] = { type: 'door_open' };
    exits.push({ dir: 'north', x, y: 0 });
  }
  
  if (edgeTiles.south.length > 0) {
    const x = rng.pick(edgeTiles.south);
    tiles[h - 1][x] = { type: 'door_open' };
    exits.push({ dir: 'south', x, y: h - 1 });
  } else {
    // Carve a path south
    const x = Math.floor(w / 2);
    for (let y = h - 3; y < h - 1; y++) {
      if (tiles[y]?.[x]) tiles[y][x] = { type: 'floor' };
    }
    tiles[h - 1][x] = { type: 'door_open' };
    exits.push({ dir: 'south', x, y: h - 1 });
  }
  
  // Add additional exits based on numExits
  if (numExits > 2 && edgeTiles.east.length > 0) {
    const y = rng.pick(edgeTiles.east);
    tiles[y][w - 1] = { type: 'door_open' };
    exits.push({ dir: 'east', x: w - 1, y });
  }
  
  if (numExits > 3 && edgeTiles.west.length > 0) {
    const y = rng.pick(edgeTiles.west);
    tiles[y][0] = { type: 'door_open' };
    exits.push({ dir: 'west', x: 0, y });
  }
  
  return exits;
}

// Select appropriate room template based on room type and floor
function selectRoomTemplate(room, rng) {
  const type = room.type || 'combat';
  const floor = room.floorNumber || 1;
  
  // Different room types favor different layouts
  const templateWeights = {
    combat: ['ARENA', 'CAVE', 'L_SHAPE', 'MULTI_CHAMBER', 'IRREGULAR'],
    trap: ['CORRIDOR_WITH_ALCOVES', 'L_SHAPE', 'T_SHAPE', 'MULTI_CHAMBER'],
    treasure: ['CIRCULAR', 'DIAMOND', 'CORRIDOR_WITH_ALCOVES', 'CAVE'],
    rest: ['CIRCULAR', 'CAVE', 'IRREGULAR'],
    shop: ['MULTI_CHAMBER', 'L_SHAPE', 'CORRIDOR_WITH_ALCOVES'],
    shrine: ['CIRCULAR', 'DIAMOND', 'IRREGULAR'],
    puzzle: ['T_SHAPE', 'MULTI_CHAMBER', 'DIAMOND'],
    boss: ['ARENA', 'CIRCULAR', 'CAVE'],
    start: ['CIRCULAR', 'IRREGULAR', 'CAVE'],
    descent: ['L_SHAPE', 'CORRIDOR_WITH_ALCOVES']
  };
  
  // Caves are more common on early floors, geometric shapes on later floors
  let templates = templateWeights[type] || ['ARENA', 'CAVE', 'L_SHAPE'];
  
  // Adjust based on floor
  if (floor <= 5) {
    // Early floors: more caves
    templates = ['CAVE', 'IRREGULAR', ...templates];
  } else if (floor <= 10) {
    // Mid floors: balanced
    templates = templates;
  } else if (floor <= 15) {
    // Temple floors: more geometric
    templates = ['CIRCULAR', 'DIAMOND', 'T_SHAPE', ...templates];
  } else {
    // Lair floors: arenas and boss rooms
    templates = ['ARENA', 'CIRCULAR', ...templates];
  }
  
  const templateName = rng.pick(templates);
  return ROOM_TEMPLATES[templateName] || ROOM_TEMPLATES.ARENA;
}

// Main room generation function - REPLACES the old boring square rooms!
function generateRoomGrid(room, encounter) {
  // Variable room sizes based on type
  const sizeByType = {
    boss: { w: 20, h: 16 },
    combat: { w: 17, h: 14 },
    trap: { w: 18, h: 12 },
    treasure: { w: 14, h: 11 },
    rest: { w: 14, h: 12 },
    shop: { w: 16, h: 12 },
    shrine: { w: 14, h: 14 },
    puzzle: { w: 16, h: 14 }
  };
  
  const baseSize = sizeByType[room.type] || { w: 15, h: 12 };
  
  // Seed RNG for consistent layouts
  const seed = (room.floorNumber || 1) * 1000 + (room.roomNumber || 1) * 10 + 
               (room.type?.charCodeAt(0) || 0);
  const rng = new SeededRNG(seed);
  
  // Add some size variation
  const width = baseSize.w + rng.nextInt(-2, 2);
  const height = baseSize.h + rng.nextInt(-2, 2);
  
  // Select and generate room shape
  const templateFn = selectRoomTemplate(room, rng);
  let tiles = templateFn(width, height, rng);
  
  // Add environmental features
  tiles = addEnvironmentalFeatures(tiles, width, height, room, rng);
  
  // Add exits/doors
  addExits(tiles, width, height, rng);
  
  console.log(`[LevelGen] Generated ${room.type || 'unknown'} room: ${width}x${height}`);
  
  return { width, height, tiles };
}

// Load entities from tactical combat_state if available
function loadEntitiesFromCombatState(run) {
  if (!tacticalGrid || !run.combat_state?.grid?.entities) return false;
  
  const combatEntities = run.combat_state.grid.entities;
  const appearance = getPlayerAppearance(run.character_stats);
  
  // Track which entities we've seen in this update
  const seenIds = new Set();
  
  // Update or add each entity from combat_state
  for (const entity of combatEntities) {
    const id = entity.isPlayer ? 'player' : entity.id;
    seenIds.add(id);
    
    const existing = tacticalGrid.entities.get(id);
    
    if (entity.isPlayer) {
      const newData = {
        id: 'player',
        name: entity.name || run.character_name || 'Player',
        type: 'player',
        x: entity.x,
        y: entity.y,
        hp: run.hp,
        maxHp: run.max_hp,
        ac: run.character_stats?.ac || 14,
        icon: appearance.base,
        appearance: appearance,
        facing: 'north',
        movementUsed: entity.movementUsed || 0,
        hasAction: entity.hasAction !== false
      };
      
      if (existing) {
        // Update in place if changed
        if (existing.x !== newData.x || existing.y !== newData.y || existing.hp !== newData.hp) {
          Object.assign(existing, newData);
        }
      } else {
        tacticalGrid.addEntity(newData);
      }
    } else {
      // Enemy entity
      const isDead = entity.currentHp <= 0;
      const newData = {
        id: entity.id,
        name: entity.name,
        type: isDead ? 'corpse' : 'enemy',
        x: entity.x,
        y: entity.y,
        hp: entity.currentHp,
        maxHp: entity.maxHp,
        ac: entity.ac || 12,
        icon: isDead ? '💀' : getEnemyIcon(entity.name),
        facing: 'south'
      };
      
      if (existing) {
        // Update in place if changed
        if (existing.x !== newData.x || existing.y !== newData.y || 
            existing.hp !== newData.hp || existing.type !== newData.type) {
          Object.assign(existing, newData);
        }
      } else {
        tacticalGrid.addEntity(newData);
      }
    }
  }
  
  // Remove entities that no longer exist
  const toRemove = [];
  tacticalGrid.entities.forEach((entity, id) => {
    if (!seenIds.has(id)) toRemove.push(id);
  });
  toRemove.forEach(id => tacticalGrid.entities.delete(id));
  
  // Only log if something changed
  if (toRemove.length > 0) {
    console.log('[Theater] Removed', toRemove.length, 'entities');
  }
  
  tacticalGrid.render();
  return true;
}

// Load entities from room into tactical grid (fallback when no combat_state)
function loadRoomEntities(run, room) {
  if (!tacticalGrid) return;
  
  // Try to use combat_state first (has exact tactical positions)
  if (loadEntitiesFromCombatState(run)) {
    return; // Used combat_state, done
  }
  
  // Fallback: generate positions from room data
  // Clear existing entities
  tacticalGrid.entities.clear();
  
  // Get dimensions from the loaded grid (which now has variable sizes)
  const width = tacticalGrid.width || 15;
  const height = tacticalGrid.height || 12;
  
  // Add player with appearance
  const appearance = getPlayerAppearance(run.character_stats);
  tacticalGrid.addEntity({
    id: 'player',
    name: run.character_name || run.agent_name || 'Player',
    type: 'player',
    x: Math.floor(width / 2),
    y: height - 3,
    hp: run.hp,
    maxHp: run.max_hp,
    ac: run.character_stats?.ac || run.character_stats?.AC || 10,
    icon: appearance.base,
    appearance: appearance,
    facing: 'north'
  });
  
  // Add enemies from combat rooms
  const enemies = room.enemies || (room.encounter ? [room.encounter] : []);
  if (room.type === 'combat' && enemies.length > 0) {
    // Use run's current_encounter for count if available
    const enemyCount = run.current_encounter?.count || enemies.length;
    for (let i = 0; i < enemyCount; i++) {
      const enemy = enemies[0]; // All same enemy type
      const spread = enemyCount;
      const x = Math.floor(width / 2) - Math.floor(spread / 2) + i + 1;
      
      tacticalGrid.addEntity({
        id: `enemy_${i}`,
        name: enemy.name || `Enemy ${i + 1}`,
        type: 'enemy',
        x: Math.max(2, Math.min(width - 3, x)),
        y: 3,
        hp: run.current_encounter?.hp || enemy.hp || 10,
        maxHp: enemy.maxHp || enemy.hp || 10,
        ac: enemy.ac || 12,
        icon: getEnemyIcon(enemy.type || enemy.name),
        facing: 'south'
      });
    }
  }
  
  // Add treasure indicator
  if (room.type === 'treasure' && room.loot) {
    tacticalGrid.addEntity({
      id: 'treasure',
      name: 'Treasure',
      type: 'neutral',
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
      hp: 1,
      maxHp: 1,
      icon: '💎',
      facing: 'south'
    });
  }
  
  // Add trap indicator
  if (room.type === 'trap') {
    tacticalGrid.addEntity({
      id: 'trap',
      name: room.trap?.name || 'Trap',
      type: 'neutral',
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
      hp: 1,
      maxHp: 1,
      icon: '⚠️',
      facing: 'south'
    });
  }
  
  // Add puzzle indicator
  if (room.type === 'puzzle') {
    tacticalGrid.addEntity({
      id: 'puzzle',
      name: room.puzzle?.name || 'Puzzle',
      type: 'neutral',
      x: Math.floor(width / 2),
      y: 3,
      hp: 1,
      maxHp: 1,
      icon: '🔮',
      facing: 'south'
    });
  }
  
  // Add NPC for rest/shop rooms
  if (room.type === 'rest' || room.type === 'shop') {
    tacticalGrid.addEntity({
      id: 'npc',
      name: room.type === 'shop' ? 'Merchant' : 'Campfire',
      type: 'neutral',
      x: Math.floor(width / 2),
      y: Math.floor(height / 2),
      hp: 1,
      maxHp: 1,
      icon: room.type === 'shop' ? '🧙‍♂️' : '🔥',
      facing: 'south'
    });
  }
  
  // Add traps from trap rooms
  tacticalGrid.traps = []; // Clear existing traps
  if (room.type === 'trap' && room.trap) {
    // Add trap at center of room
    tacticalGrid.addTrap(
      Math.floor(width / 2),
      Math.floor(height / 2),
      room.trap.name || 'Trap',
      room.trap.triggered || false
    );
  }
  
  // Add traps from room.traps array if present
  if (room.traps && Array.isArray(room.traps)) {
    room.traps.forEach((trap, i) => {
      tacticalGrid.addTrap(
        trap.x !== undefined ? trap.x : 3 + i * 3,
        trap.y !== undefined ? trap.y : Math.floor(height / 2),
        trap.name || `Trap ${i + 1}`,
        trap.triggered || false
      );
    });
  }
  
  tacticalGrid.updateVisibility();
  tacticalGrid.render();
  tacticalGrid.renderMinimap();
}

function updateSceneFromRoom(room, run) {
  const locationName = document.getElementById('location-name');
  const locationDesc = document.getElementById('location-desc');
  
  if (locationName) {
    const roomType = room.type ? room.type.charAt(0).toUpperCase() + room.type.slice(1) : 'Room';
    locationName.textContent = room.name || `${roomType} - Floor ${run.current_floor}, Room ${run.current_room}`;
  }
  
  if (locationDesc) {
    locationDesc.textContent = room.flavor || room.description || getRoomDescription(room);
  }
}

function getRoomDescription(room) {
  const descriptions = {
    'combat': 'Enemies await in the shadows...',
    'trap': 'You sense danger lurking nearby.',
    'treasure': 'Something valuable glints in the darkness.',
    'rest': 'A moment of peace in the dungeon.',
    'shop': 'A mysterious merchant offers their wares.',
    'boss': 'A powerful presence fills this chamber!',
    'empty': 'The room appears quiet... for now.',
    'puzzle': 'Strange mechanisms and symbols cover the walls.',
    'event': 'Something unusual catches your attention.'
  };
  
  return descriptions[room.type] || 'You explore deeper into the dungeon.';
}

// Generate grid from combat_state (uses server's tactical grid data)
function generateGridFromCombatState(combatState) {
  if (!combatState?.grid) return null;
  
  const { width, height, terrain } = combatState.grid;
  const tiles = [];
  
  // Initialize all as floor
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      // Walls on edges
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = { type: 'wall' };
      } else {
        tiles[y][x] = { type: 'floor' };
      }
    }
  }
  
  // Apply terrain from combat_state
  if (terrain && Array.isArray(terrain)) {
    for (const t of terrain) {
      if (tiles[t.y] && tiles[t.y][t.x]) {
        // Map tactical.js terrain types to theater types
        let tileType = 'floor';
        if (t.elevation > 0) {
          tileType = 'high_ground';
        } else if (t.cover === 2) {
          tileType = 'cover_half';
        } else if (t.cover >= 5) {
          tileType = 'cover_full';
        } else if (t.terrain === 'difficult') {
          tileType = 'difficult';
        } else if (t.terrain === 'water') {
          tileType = 'water';
        } else if (t.terrain === 'fire') {
          tileType = 'fire';
        } else if (t.terrain === 'pit') {
          tileType = 'pit';
        }
        tiles[t.y][t.x] = { type: tileType };
      }
    }
  }
  
  // Add exits
  tiles[0][Math.floor(width/2)] = { type: 'door_open' };
  tiles[height-1][Math.floor(width/2)] = { type: 'door_open' };
  
  console.log('[Theater] Generated grid from combat_state:', width, 'x', height);
  return { width, height, tiles };
}

// Generate a simple grid from encounter data
function generateEncounterGrid(encounter) {
  // Use the new interesting room generator!
  // Create a fake room object with encounter info
  const room = {
    type: 'combat',
    floorNumber: encounter?.floor || 1,
    roomNumber: Date.now() % 1000, // Unique seed
    theme: encounter?.theme
  };
  
  // Use the new interesting level generator
  const grid = generateRoomGrid(room, encounter);
  
  // Apply any terrain hazards from the encounter
  if (encounter?.terrain_hazards && grid.tiles) {
    const rng = new SeededRNG(Date.now());
    for (const hazard of encounter.terrain_hazards) {
      const x = rng.nextInt(2, grid.width - 3);
      const y = rng.nextInt(2, grid.height - 3);
      if (grid.tiles[y]?.[x]?.type === 'floor') {
        grid.tiles[y][x] = { type: hazard.type || 'difficult' };
      }
    }
  }
  
  // Apply custom exits if specified
  if (encounter?.exits) {
    for (const exit of encounter.exits) {
      const pos = getExitPosition(exit.direction, grid.width, grid.height);
      if (pos && grid.tiles[pos.y]?.[pos.x]) {
        grid.tiles[pos.y][pos.x] = { type: 'door_open' };
      }
    }
  }
  
  return grid;
}

function getExitPosition(direction, width, height) {
  switch (direction) {
    case 'north': return { x: Math.floor(width / 2), y: 0 };
    case 'south': return { x: Math.floor(width / 2), y: height - 1 };
    case 'east': return { x: width - 1, y: Math.floor(height / 2) };
    case 'west': return { x: 0, y: Math.floor(height / 2) };
    default: return null;
  }
}

// Load entities from encounter into tactical grid
function loadEncounterEntities(run) {
  if (!tacticalGrid) return;
  
  // Try to use combat_state first (has exact tactical positions)
  if (loadEntitiesFromCombatState(run)) {
    return; // Used combat_state, done
  }
  
  // Fallback: generate positions from encounter data
  // Clear existing entities
  tacticalGrid.entities.clear();
  
  const encounter = run.current_encounter;
  // Get dimensions from the loaded grid (which now has variable sizes)
  const width = tacticalGrid.width || 15;
  const height = tacticalGrid.height || 12;
  
  // Add player with appearance
  const appearance = getPlayerAppearance(run.character_stats);
  tacticalGrid.addEntity({
    id: 'player',
    name: run.character_name || run.agent_name || 'Player',
    type: 'player',
    x: Math.floor(width / 2),
    y: height - 3,
    hp: run.hp,
    maxHp: run.max_hp,
    ac: run.character_stats?.ac || 10,
    icon: appearance.base,
    appearance: appearance,
    facing: 'north'
  });
  
  // Add enemies from encounter
  if (encounter.enemies) {
    encounter.enemies.forEach((enemy, i) => {
      const spread = encounter.enemies.length;
      const x = Math.floor(width / 2) - Math.floor(spread / 2) + i + 1;
      
      tacticalGrid.addEntity({
        id: `enemy_${i}`,
        name: enemy.name || `Enemy ${i + 1}`,
        type: 'enemy',
        x: Math.max(2, Math.min(width - 3, x)),
        y: 3,
        hp: enemy.hp || 10,
        maxHp: enemy.max_hp || enemy.hp || 10,
        ac: enemy.ac || 12,
        icon: getEnemyIcon(enemy.type || enemy.name),
        facing: 'south'
      });
    });
  }
  
  // Add NPCs/objects
  if (encounter.npcs) {
    encounter.npcs.forEach((npc, i) => {
      tacticalGrid.addEntity({
        id: `npc_${i}`,
        name: npc.name || `NPC ${i + 1}`,
        type: 'neutral',
        x: 3 + i * 2,
        y: Math.floor(height / 2),
        hp: npc.hp || 20,
        maxHp: npc.max_hp || 20,
        ac: 10,
        icon: '👤',
        facing: 'south'
      });
    });
  }
  
  tacticalGrid.updateVisibility();
  tacticalGrid.render();
  tacticalGrid.renderMinimap();
}

function getEnemyIcon(type) {
  const icons = {
    'goblin': '👺',
    'orc': '👹',
    'skeleton': '💀',
    'zombie': '🧟',
    'spider': '🕷️',
    'rat': '🐀',
    'wolf': '🐺',
    'bat': '🦇',
    'ghost': '👻',
    'slime': '🟢',
    'dragon': '🐉',
    'troll': '🧌',
    'ogre': '👹',
    'vampire': '🧛',
    'demon': '😈',
    'boss': '👑'
  };
  
  if (!type) return '👹';
  const lower = type.toLowerCase();
  for (const [key, icon] of Object.entries(icons)) {
    if (lower.includes(key)) return icon;
  }
  return '👹';
}

function updateSceneFromEncounter(encounter, run) {
  const locationName = document.getElementById('location-name');
  const locationDesc = document.getElementById('location-desc');
  
  if (locationName) {
    locationName.textContent = encounter.name || encounter.type || `Floor ${run.current_floor}, Room ${run.current_room}`;
  }
  
  if (locationDesc) {
    locationDesc.textContent = encounter.description || getEncounterDescription(encounter);
  }
}

function getEncounterDescription(encounter) {
  if (!encounter.type) return 'You enter a new area of the dungeon.';
  
  const descriptions = {
    'combat': 'Enemies block your path!',
    'trap': 'You sense danger ahead...',
    'treasure': 'Something valuable glints in the darkness.',
    'rest': 'A moment of peace in the dungeon.',
    'shop': 'A mysterious merchant awaits.',
    'boss': 'A powerful foe guards this room!',
    'empty': 'The room appears empty... for now.',
    'puzzle': 'Strange mechanisms line the walls.',
    'event': 'Something unusual catches your attention.'
  };
  
  return descriptions[encounter.type] || 'You explore deeper into the dungeon.';
}

function updateRunDisplay(run) {
  // Nav title
  const navTitle = document.getElementById('nav-title');
  if (navTitle) {
    navTitle.textContent = `${run.agent_name}'s Run - Floor ${run.current_floor}`;
  }
  
  // Agent info
  const agentName = document.getElementById('agent-name');
  if (agentName) agentName.textContent = run.agent_name;
  
  // HP
  const hpPercent = Math.round((run.hp / run.max_hp) * 100);
  const hpText = document.getElementById('hp-text');
  const hpBar = document.getElementById('hp-bar');
  if (hpText) hpText.textContent = `${run.hp}/${run.max_hp}`;
  if (hpBar) {
    hpBar.style.width = `${hpPercent}%`;
    hpBar.className = `stat-bar-fill hp-fill ${hpPercent <= 25 ? 'critical' : hpPercent <= 50 ? 'low' : ''}`;
  }
  
  // Floor progress
  const floorPercent = Math.round((run.current_floor / 20) * 100);
  const progressText = document.getElementById('progress-text');
  const floorBar = document.getElementById('floor-bar');
  const currentFloor = document.getElementById('current-floor');
  const currentRoom = document.getElementById('current-room');
  
  if (progressText) progressText.textContent = `Floor ${run.current_floor}/20`;
  if (floorBar) floorBar.style.width = `${floorPercent}%`;
  if (currentFloor) currentFloor.textContent = run.current_floor;
  if (currentRoom) currentRoom.textContent = run.current_room || 1;
  
  // Stats
  const goldValue = document.getElementById('gold-value');
  const killsValue = document.getElementById('kills-value');
  if (goldValue) goldValue.textContent = run.gold || 0;
  if (killsValue) killsValue.textContent = run.kills || 0;
  
  // Inventory
  updateInventory(run.inventory || []);
  
  // Equipment
  updateEquipment(run.equipment || {});
  
  // Scene
  if (run.current_scene) {
    updateScene(run.current_scene);
  }
  
  // Run start time for timer
  if (run.started_at) {
    runStartTime = new Date(run.started_at);
  }
  
  // Update tactical grid from combat_state if present
  if (tacticalGrid && run.combat_state?.grid) {
    // Only reload grid if dimensions changed (new room/floor)
    const newWidth = run.combat_state.grid.width || 12;
    const newHeight = run.combat_state.grid.height || 12;
    const needsGridReload = tacticalGrid.width !== newWidth || tacticalGrid.height !== newHeight;
    
    if (needsGridReload) {
      const combatGrid = generateGridFromCombatState(run.combat_state);
      if (combatGrid) {
        tacticalGrid.loadGrid(combatGrid);
      }
    }
    // Update entity positions and HP from combat_state (incremental, no full reload)
    loadEntitiesFromCombatState(run);
  } else if (tacticalGrid && !run.current_encounter) {
    // Combat ended, clear enemies
    const entitiesToRemove = [];
    tacticalGrid.entities.forEach((entity, id) => {
      if (entity.type === 'enemy' || entity.type === 'corpse') {
        entitiesToRemove.push(id);
      }
    });
    entitiesToRemove.forEach(id => tacticalGrid.entities.delete(id));
    tacticalGrid.render();
  }
  
  // Check for death/victory
  if (run.status === 'dead') {
    showDeathScreen(run);
  } else if (run.status === 'completed') {
    showVictoryScreen(run);
  }
  
  // Update minimap if we have floor map data
  if (run.floor_map) {
    updateMinimap(run);
  } else if (run.current_floor && runId) {
    // Fetch floor map if not included
    fetchFloorMap(runId).then(mapData => {
      if (mapData) updateMinimap({ ...run, floor_map: mapData });
    });
  }
}

function updateInventory(items) {
  const container = document.getElementById('inventory');
  if (!container) return;
  
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-inventory">No items yet</div>';
    return;
  }
  
  container.innerHTML = items.map(item => `
    <div class="inventory-item" title="${escapeHtml(item.description || item.name)}">
      <span class="item-icon">${item.icon || '📦'}</span>
      ${item.quantity > 1 ? `<span class="item-qty">${item.quantity}</span>` : ''}
    </div>
  `).join('');
}

function updateEquipment(equipment) {
  const slots = ['weapon', 'armor', 'accessory'];
  
  slots.forEach(slot => {
    const el = document.querySelector(`.equipment-slot[data-slot="${slot}"]`);
    if (!el) return;
    
    const item = equipment[slot];
    if (item) {
      el.classList.remove('empty');
      el.innerHTML = `
        <span class="slot-icon">${item.icon || '⚔️'}</span>
        <span class="slot-name">${escapeHtml(item.name)}</span>
      `;
    } else {
      el.classList.add('empty');
      const icons = { weapon: '🗡️', armor: '🛡️', accessory: '💍' };
      el.innerHTML = `
        <span class="slot-icon">${icons[slot]}</span>
        <span class="slot-name">${slot.charAt(0).toUpperCase() + slot.slice(1)}</span>
      `;
    }
  });
}

function updateScene(scene) {
  const locationName = document.getElementById('location-name');
  const locationDesc = document.getElementById('location-desc');
  
  if (locationName) locationName.textContent = scene.name || 'Unknown Area';
  if (locationDesc) locationDesc.textContent = scene.description || '';
  
  // Update backdrop
  const backdrop = document.getElementById('backdrop');
  if (backdrop && scene.backdrop_class) {
    backdrop.className = `scene-backdrop dungeon-backdrop ${scene.backdrop_class}`;
  }
  
  // Update entities in tactical grid
  if (tacticalGrid && scene.entities) {
    // Clear existing and add new
    tacticalGrid.entities.clear();
    for (const entity of scene.entities) {
      tacticalGrid.addEntity(entity);
    }
  }
}

// ===== WEBSOCKET =====

function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('🔌 WebSocket connected');
      wsConnected = true;
      wsReconnectAttempts = 0;
      updateConnectionStatus('live');
      
      // Subscribe to run updates or campaign updates
      if (runId) {
        ws.send(JSON.stringify({ 
          type: 'subscribe_run', 
          runId: runId
        }));
      } else if (campaignId) {
        ws.send(JSON.stringify({ 
          type: 'subscribe', 
          campaignId: campaignId 
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      wsConnected = false;
      updateConnectionStatus('reconnecting');
      
      if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        wsReconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
        setTimeout(connectWebSocket, delay);
      } else {
        updateConnectionStatus('disconnected');
        setInterval(loadRunData, 5000);
      }
    };
    
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };
  } catch (e) {
    console.error('Failed to create WebSocket:', e);
    updateConnectionStatus('disconnected');
    setInterval(loadRunData, 5000);
  }
}

function handleWebSocketMessage(data) {
  switch (data.type) {
    case 'subscribed':
    case 'run_subscribed':
      console.log('✅ Subscribed to run/campaign');
      if (data.spectators) {
        updateSpectatorCount(data.spectators);
      }
      break;
      
    case 'run_update':
      // Clear action log and queue when floor or room changes (new area = fresh log)
      if (data.run && (data.run.current_floor !== lastSeenFloor || data.run.current_room !== lastSeenRoom)) {
        const logContainer = document.getElementById('narrative-log');
        if (logContainer && lastSeenFloor !== null) {
          logContainer.innerHTML = '';
          logQueue = [];
          lastLogId = null;
        }
        // Clear the action sequencer too
        if (actionSequencer) actionSequencer.clear();
        lastSeenFloor = data.run.current_floor;
        lastSeenRoom = data.run.current_room;
      }
      
      updateRunDisplay(data.run);
      // Add narrative to action log (filtering handled by appendLog)
      if (data.narrative) {
        appendLog({
          type: 'action',
          content: data.narrative,
          timestamp: Date.now()
        });
      }
      break;
      
    case 'grid_update':
      // Grid loads are immediate (new room/floor)
      if (tacticalGrid && data.grid) {
        // Clear action queue when loading new grid
        if (actionSequencer) actionSequencer.clear();
        tacticalGrid.loadGrid(data.grid);
      }
      break;
      
    case 'entity_update':
      // Queue entity updates for paced display
      if (actionSequencer) {
        actionSequencer.enqueue({ type: 'entity_update', entity: data.entity, delay: 800 });
      } else if (tacticalGrid && data.entity) {
        tacticalGrid.updateEntity(data.entity.id, data.entity);
      }
      break;
      
    case 'entity_move':
      // Queue movement for paced display
      if (actionSequencer) {
        actionSequencer.enqueue({ type: 'entity_move', entityId: data.entityId, path: data.path, delay: 1500 });
      } else if (tacticalGrid && data.entityId && data.path) {
        const entity = tacticalGrid.entities.get(data.entityId);
        if (entity) {
          tacticalGrid.animateMovement(entity, data.path);
        }
      }
      break;
      
    case 'combat_action':
      // Queue combat actions for paced display
      if (actionSequencer && data.action) {
        actionSequencer.enqueue({ type: 'combat_action', action: data.action, delay: 2000 });
      } else if (data.action) {
        handleCombatAction(data.action);
      }
      break;
      
    case 'attack_roll':
      // Queue attack rolls for paced display
      if (actionSequencer) {
        actionSequencer.enqueue({ 
          type: 'attack_roll', 
          ...data,
          delay: 1500 
        });
      } else if (dialogQueue) {
        const { roll, modifier, total, ac, hit, critical } = data;
        dialogQueue.showAttack(roll || total - (modifier || 0), modifier || 0, total, ac, hit, critical);
      }
      break;
      
    case 'damage_dealt':
      // Queue damage for paced display
      if (actionSequencer) {
        actionSequencer.enqueue({ 
          type: 'damage_dealt', 
          amount: data.amount,
          damageType: data.damageType,
          targetName: data.targetName,
          x: data.x,
          y: data.y,
          delay: 1200 
        });
      } else {
        if (dialogQueue && data.amount > 0) {
          dialogQueue.showDamage(data.amount, data.damageType || 'damage', data.targetName || '');
        }
        if (tacticalGrid && data.x !== undefined && data.y !== undefined) {
          tacticalGrid.showDamageNumber(data.x, data.y, data.amount, data.damageType || 'damage');
        }
      }
      break;
      
    case 'healing':
      // Queue healing for paced display
      if (actionSequencer) {
        actionSequencer.enqueue({
          type: 'healing',
          amount: data.amount,
          source: data.source,
          x: data.x,
          y: data.y,
          delay: 1000
        });
      } else if (dialogQueue && data.amount > 0) {
        dialogQueue.showHeal(data.amount, data.source || '');
      }
      break;
      
    case 'trap_triggered':
      // Show trap dialog
      if (dialogQueue) {
        dialogQueue.showTrap(
          data.trapName || 'Trap',
          data.saveType || 'DEX',
          data.dc || 13,
          data.saveResult || 10
        );
      }
      // Trigger trap animation on grid
      if (tacticalGrid && data.x !== undefined && data.y !== undefined) {
        tacticalGrid.triggerTrap(data.x, data.y);
      }
      break;
      
    case 'puzzle':
      if (dialogQueue) {
        dialogQueue.showPuzzle(data.name || 'Puzzle', data.description || '', data.result);
      }
      break;
      
    case 'shop':
      if (dialogQueue && data.items) {
        dialogQueue.showShop(data.shopkeeperName, data.items, data.playerGold || 0);
      }
      break;
      
    case 'turn_start':
      if (data.entityId && tacticalGrid) {
        const entity = tacticalGrid.entities.get(data.entityId);
        if (entity && entity.type === 'player') {
          tacticalGrid.startPlayerTurn();
        }
      }
      break;
      
    case 'action':
    case 'log':
      appendLog(data);
      // Parse log content for dialog triggers
      parseLogForDialogs(data);
      break;
      
    case 'damage':
      if (tacticalGrid && data.x !== undefined && data.y !== undefined) {
        tacticalGrid.showDamageNumber(data.x, data.y, data.amount, data.damageType || 'damage');
      }
      showDamageNumber(data);
      break;
      
    case 'dice_roll':
      showDiceRoll(data.roll);
      break;
      
    case 'death':
      showDeathScreen(data.run);
      break;
      
    case 'victory':
      showVictoryScreen(data.run);
      break;
      
    case 'spectators':
      updateSpectatorCount(data.count);
      break;
    
    case 'game_event':
      // Handle discrete game events from the new event system
      handleGameEvent(data.event);
      break;
      
    default:
      console.log('Unknown message type:', data.type);
  }
}

// Handle discrete game events for paced theater display
function handleGameEvent(event) {
  if (!event || !event.type) return;
  
  console.log('🎭 Game event:', event.type, event);
  
  switch (event.type) {
    case 'turn_start':
      // Show turn start indicator
      if (event.entityId === 'player') {
        if (tacticalGrid) tacticalGrid.startPlayerTurn();
        if (dialogQueue) {
          dialogQueue.showMessage(`${event.entityName}'s Turn`, '⚔️', 'Combat', 1500);
        }
      } else {
        // Enemy turn start
        appendLog({
          type: 'turn',
          content: `🎯 ${event.entityName}'s turn`,
          timestamp: event.timestamp
        });
      }
      break;
      
    case 'turn_end':
      appendLog({
        type: 'turn',
        content: `⏱️ ${event.entityName} ends their turn`,
        timestamp: event.timestamp
      });
      break;
      
    case 'attack_roll':
      // Show attack roll dialog
      if (dialogQueue) {
        dialogQueue.showAttack(
          event.roll,
          event.modifier,
          event.total,
          event.ac,
          event.hit,
          event.critical
        );
      }
      // Add to log
      const hitText = event.critical ? 'CRITICAL HIT!' : (event.hit ? 'HIT!' : 'Miss!');
      appendLog({
        type: 'combat',
        content: `⚔️ ${event.attacker} attacks ${event.target}: ${event.roll}+${event.modifier}=${event.total} vs AC ${event.ac} - ${hitText}`,
        timestamp: event.timestamp
      });
      break;
      
    case 'damage':
      // Show damage number and dialog
      if (dialogQueue && event.amount > 0) {
        dialogQueue.showDamage(event.amount, event.damageType || 'damage', event.target || '');
      }
      if (tacticalGrid && event.targetX !== undefined && event.targetY !== undefined) {
        tacticalGrid.showDamageNumber(event.targetX, event.targetY, event.amount, event.damageType || 'damage');
      }
      appendLog({
        type: 'damage',
        content: `💥 ${event.source} deals ${event.amount} ${event.damageType || ''} damage to ${event.target}!`,
        timestamp: event.timestamp
      });
      break;
      
    case 'death':
      // Show death animation and message
      if (tacticalGrid && event.entityId !== 'player') {
        const deadEntity = tacticalGrid.entities.get(event.entityId);
        if (deadEntity) {
          tacticalGrid.playDeathAnimation(deadEntity);
        }
      }
      if (dialogQueue) {
        const icon = event.entityId === 'player' ? '💀' : '🎉';
        const title = event.entityId === 'player' ? 'Fallen!' : 'Enemy Slain!';
        dialogQueue.showMessage(`${event.entityName} has been slain!`, icon, title, 2000);
      }
      appendLog({
        type: 'death',
        content: `💀 ${event.entityName} has fallen!`,
        timestamp: event.timestamp
      });
      break;
      
    case 'movement':
      // Show movement
      if (tacticalGrid && event.entityId) {
        const movingEntity = tacticalGrid.entities.get(event.entityId);
        if (movingEntity) {
          const path = [
            { x: event.fromX, y: event.fromY },
            { x: event.toX, y: event.toY }
          ];
          tacticalGrid.animateMovement(movingEntity, path);
        }
      }
      appendLog({
        type: 'movement',
        content: `🏃 ${event.entityName} moves ${event.distance}ft`,
        timestamp: event.timestamp
      });
      break;
      
    case 'combat_end':
      // Show victory/defeat message
      if (dialogQueue) {
        if (event.result === 'victory') {
          dialogQueue.showMessage(`Victory! +${event.xp} XP, +${event.gold} gold`, '🏆', 'Combat Won', 3000);
        } else if (event.result === 'fled') {
          dialogQueue.showMessage('Escaped from combat!', '🏃', 'Fled', 2000);
        }
      }
      appendLog({
        type: 'combat_end',
        content: event.result === 'victory' 
          ? `🏆 Victory! +${event.xp} XP, +${event.gold} gold`
          : `🏃 Fled from combat!`,
        timestamp: event.timestamp
      });
      break;
      
    case 'level_up':
      // Show level up celebration
      if (dialogQueue) {
        dialogQueue.showMessage(`Level Up! Now level ${event.newLevel}! +${event.hpGain} HP`, '🎉', 'Level Up!', 3000);
      }
      appendLog({
        type: 'level_up',
        content: `🎉 ${event.entityName} reached level ${event.newLevel}! (+${event.hpGain} max HP)`,
        timestamp: event.timestamp
      });
      break;
      
    case 'loot':
      // Show loot found
      if (dialogQueue) {
        dialogQueue.showMessage(`Found: ${event.item}`, '📦', 'Loot', 2000);
      }
      appendLog({
        type: 'loot',
        content: `📦 Found: ${event.item}`,
        timestamp: event.timestamp
      });
      break;
      
    case 'heal':
      // Show healing
      if (dialogQueue && event.amount > 0) {
        dialogQueue.showHeal(event.amount, event.source || '');
      }
      if (tacticalGrid && event.x !== undefined && event.y !== undefined) {
        tacticalGrid.showDamageNumber(event.x, event.y, event.amount, 'heal');
      }
      appendLog({
        type: 'heal',
        content: `💚 ${event.target || 'Hero'} heals for ${event.amount} HP`,
        timestamp: event.timestamp
      });
      break;
      
    default:
      console.log('Unknown game event type:', event.type);
  }
}

// Parse log entries for dialog-worthy content
function parseLogForDialogs(logData) {
  if (!dialogQueue) return;
  
  const content = logData.content || logData.message || '';
  const lowerContent = content.toLowerCase();
  
  // Attack patterns
  const attackMatch = content.match(/attack.*?(\d+)\s*\+\s*(\d+)\s*=\s*(\d+).*?vs.*?AC\s*(\d+)/i);
  if (attackMatch) {
    const [, roll, mod, total, ac] = attackMatch;
    const hit = parseInt(total) >= parseInt(ac);
    const critical = parseInt(roll) === 20;
    dialogQueue.showAttack(parseInt(roll), parseInt(mod), parseInt(total), parseInt(ac), hit, critical);
    return;
  }
  
  // Damage patterns
  const damageMatch = content.match(/deals?\s+(\d+)\s+(slashing|piercing|bludgeoning|fire|cold|lightning|poison|damage)/i);
  if (damageMatch) {
    const [, amount, type] = damageMatch;
    dialogQueue.showDamage(parseInt(amount), type.toLowerCase());
    return;
  }
  
  // Trap patterns
  const trapMatch = content.match(/trap.*?(?:DC\s*(\d+)|(\d+)\s*save)/i);
  if (trapMatch || lowerContent.includes('trap')) {
    // If we detect a trap, show a generic trap message
    if (lowerContent.includes('trap')) {
      dialogQueue.showMessage(content, '⚠️', 'Danger!', 3000);
    }
    return;
  }
  
  // Healing patterns
  const healMatch = content.match(/heal(?:s|ed)?\s+(\d+)/i);
  if (healMatch) {
    dialogQueue.showHeal(parseInt(healMatch[1]));
    return;
  }
}

function handleCombatAction(action) {
  // Queue actions with pacing delays
  const actionDelay = 1500; // 1.5 seconds between major actions
  
  switch (action.type) {
    case 'attack':
      // Show attack roll dialog first
      if (dialogQueue && action.roll) {
        dialogQueue.showAttack(
          action.roll.natural || action.roll.total - (action.roll.modifier || 0),
          action.roll.modifier || 0,
          action.roll.total,
          action.targetAC || 14,
          action.hit,
          action.critical
        );
      }
      
      // Then show animation (delayed slightly)
      setTimeout(() => {
        if (tacticalGrid) {
          tacticalGrid.addAnimation(
            tacticalGrid.createAttackLine(
              action.attacker.x, action.attacker.y,
              action.target.x, action.target.y
            )
          );
        }
      }, 500);
      
      // Show damage after attack animation
      if (action.damage && action.damage > 0) {
        setTimeout(() => {
          if (dialogQueue) {
            dialogQueue.showDamage(action.damage, action.damageType || 'damage', action.targetName || '');
          }
          if (tacticalGrid) {
            tacticalGrid.showDamageNumber(
              action.target.x, action.target.y,
              action.damage,
              action.critical ? 'crit' : 'damage'
            );
          }
        }, actionDelay);
      }
      break;
      
    case 'spell':
      // Show spell dialog
      if (dialogQueue && action.spellName) {
        dialogQueue.showMessage(
          `Casts <strong>${action.spellName}</strong>!`,
          '✨',
          action.casterName || 'Magic',
          2000
        );
      }
      
      setTimeout(() => {
        if (tacticalGrid) {
          tacticalGrid.addAnimation(
            tacticalGrid.createSpellEffect(
              action.target.x, action.target.y,
              action.spellType || 'fire'
            )
          );
        }
      }, 500);
      
      // Spell damage/effects
      if (action.damage && action.damage > 0) {
        setTimeout(() => {
          if (dialogQueue) {
            dialogQueue.showDamage(action.damage, action.spellType || 'magic');
          }
          if (tacticalGrid) {
            tacticalGrid.showDamageNumber(
              action.target.x, action.target.y,
              action.damage,
              action.critical ? 'crit' : 'damage'
            );
          }
        }, actionDelay);
      }
      break;
      
    case 'heal':
      if (dialogQueue) {
        dialogQueue.showHeal(action.amount, action.sourceName || '');
      }
      
      setTimeout(() => {
        if (tacticalGrid) {
          tacticalGrid.showDamageNumber(
            action.target.x, action.target.y,
            action.amount,
            'heal'
          );
        }
      }, 500);
      break;
      
    case 'trap':
      if (dialogQueue) {
        dialogQueue.showTrap(
          action.trapName || 'Trap',
          action.saveType || 'DEX',
          action.dc || 13,
          action.saveResult || 10
        );
      }
      
      if (tacticalGrid && action.x !== undefined && action.y !== undefined) {
        tacticalGrid.triggerTrap(action.x, action.y);
      }
      break;
      
    case 'movement':
      if (tacticalGrid && action.entityId && action.path) {
        const entity = tacticalGrid.entities.get(action.entityId);
        if (entity) {
          tacticalGrid.animateMovement(entity, action.path);
        }
      }
      break;
  }
}

function updateConnectionStatus(status) {
  const indicator = document.getElementById('connection-status');
  if (!indicator) return;
  
  const statuses = {
    live: { text: '🟢 LIVE', class: 'live' },
    reconnecting: { text: '🟡 Reconnecting...', class: 'reconnecting' },
    disconnected: { text: '🔴 Disconnected', class: 'disconnected' }
  };
  
  const s = statuses[status] || statuses.disconnected;
  indicator.textContent = s.text;
  indicator.className = `connection-indicator ${s.class}`;
}

function updateSpectatorCount(count) {
  const el = document.getElementById('spectator-count');
  if (el) el.textContent = count;
}

// ===== ACTION LOG =====

// Log queue for pacing
// ===== REBUILT ACTION LOG =====
// Clean, minimal log showing only meaningful events

let logQueue = [];
let isProcessingLog = false;
const LOG_DELAY = 600; // ms between log entries

// Log categories with icons
const LOG_ICONS = {
  combat: '⚔️',
  damage: '💥',
  death: '💀',
  heal: '💚',
  loot: '💎',
  gold: '🪙',
  shop: '🏪',
  room: '🚪',
  trap: '⚠️',
  puzzle: '🧩',
  shrine: '🙏',
  rest: '🏕️',
  levelup: '⭐',
  victory: '🎉',
  defeat: '☠️',
  boss: '👹',
  info: '📜'
};

// Patterns to SKIP (noise)
const SKIP_PATTERNS = [
  /^🏃.*moves? to/i,
  /movement remaining/i,
  /^🚶.*moves? to \(/i,
  /adjacent to/i,
  /ft away/i,
  /Use:.*type:/i,
  /Available paths/i,
  /Actions:.*move.*attack/i,
  /Specify.*coordinates/i,
  /end_turn/i,
  /^\s*•\s*\w+\s*-\s*`f\d+/i,  // Path listings like "• COMBAT - `f1_c2_r0`"
];

// Should this message be logged?
function shouldLog(content) {
  if (!content) return false;
  const text = content.trim();
  if (text.length < 5) return false;
  
  // Skip noise patterns
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  
  return true;
}

// Categorize and extract key info from log content
function categorizeLog(content) {
  const text = content.toLowerCase();
  
  // Victory/Defeat
  if (text.includes('victory') || text.includes('defeated all')) return { type: 'victory', icon: LOG_ICONS.victory };
  if (text.includes('has fallen') || text.includes('defeat')) return { type: 'defeat', icon: LOG_ICONS.defeat };
  
  // Combat
  if (text.includes('critical hit')) return { type: 'combat', icon: '💥' };
  if (text.includes('damage') && (text.includes('for **') || text.includes('deals'))) return { type: 'damage', icon: LOG_ICONS.damage };
  if (text.includes('miss') && text.includes('attack')) return { type: 'combat', icon: '🌀' };
  if (text.includes('kills') || text.includes('slain') || text.includes('defeated')) return { type: 'death', icon: LOG_ICONS.death };
  
  // Healing
  if (text.includes('heal') || text.includes('restore') || text.includes('recover')) return { type: 'heal', icon: LOG_ICONS.heal };
  
  // Loot & Gold
  if (text.includes('gold') || text.includes('🪙')) return { type: 'gold', icon: LOG_ICONS.gold };
  if (text.includes('found') || text.includes('treasure') || text.includes('💎')) return { type: 'loot', icon: LOG_ICONS.loot };
  
  // Shop
  if (text.includes('shop') || text.includes('merchant') || text.includes('purchase')) return { type: 'shop', icon: LOG_ICONS.shop };
  
  // Room types
  if (text.includes('trap') || text.includes('⚠️')) return { type: 'trap', icon: LOG_ICONS.trap };
  if (text.includes('puzzle') || text.includes('🧩')) return { type: 'puzzle', icon: LOG_ICONS.puzzle };
  if (text.includes('shrine') || text.includes('🙏')) return { type: 'shrine', icon: LOG_ICONS.shrine };
  if (text.includes('rest') || text.includes('campfire')) return { type: 'rest', icon: LOG_ICONS.rest };
  if (text.includes('boss') || text.includes('👹')) return { type: 'boss', icon: LOG_ICONS.boss };
  
  // Level up
  if (text.includes('level up') || text.includes('leveled')) return { type: 'levelup', icon: LOG_ICONS.levelup };
  
  // Combat encounter start
  if (text.includes('combat!') || text.includes('block') && text.includes('path')) return { type: 'combat', icon: LOG_ICONS.combat };
  
  // Room entry (flavor text)
  if (text.startsWith('🌊') || text.startsWith('🦐') || text.startsWith('🦀') || text.includes('cavern') || text.includes('area')) {
    return { type: 'room', icon: LOG_ICONS.room };
  }
  
  return { type: 'info', icon: LOG_ICONS.info };
}

// Simplify log content - extract the key message
function simplifyContent(content) {
  let text = content;
  
  // Remove command hints
  text = text.replace(/Use:.*$/gm, '');
  text = text.replace(/\n\n🗺️.*$/s, '');
  text = text.replace(/📋\s*\*\*Actions:\*\*.*$/gm, '');
  
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  
  return text;
}

function processLogQueue() {
  if (isProcessingLog || logQueue.length === 0) return;
  
  isProcessingLog = true;
  const log = logQueue.shift();
  
  displayLogEntry(log);
  
  setTimeout(() => {
    isProcessingLog = false;
    if (logQueue.length > 0) {
      processLogQueue();
    }
  }, LOG_DELAY);
}

function appendLog(log) {
  // Deduplicate
  if (log.id && log.id === lastLogId) return;
  lastLogId = log.id;
  
  const content = log.content || log.message || '';
  
  // Split compound narratives into discrete entries
  const entries = splitNarrative(content);
  
  for (const entry of entries) {
    if (!shouldLog(entry)) continue;
    logQueue.push({ ...log, content: entry });
  }
  
  processLogQueue();
}

// Split compound narratives into discrete log entries
function splitNarrative(content) {
  if (!content) return [];
  
  const entries = [];
  
  // Split on common boundaries
  const parts = content
    .split(/(?=⏱️|📍|⚔️\s+\w+\s+attacks|🏃|💀|🎉|☠️|💎|🏪|⚠️|🙏|🧩)/g)
    .map(p => p.trim())
    .filter(p => p.length > 3);
  
  // If split didn't work well, try newline split
  if (parts.length <= 1 && content.includes('\n')) {
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    if (lines.length > 1) {
      return lines;
    }
  }
  
  return parts.length > 0 ? parts : [content];
}

// Convert basic markdown to HTML
function formatNarrativeText(text) {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.+?)`/g, '');  // Remove code blocks (command hints)
  html = html.replace(/\n/g, '<br>');
  return html;
}

function displayLogEntry(log) {
  const container = document.getElementById('narrative-log');
  if (!container) return;
  
  const content = log.content || log.message || '';
  const simplified = simplifyContent(content);
  if (!simplified) return;
  
  const { type, icon } = categorizeLog(content);
  
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `
    <span class="log-icon">${icon}</span>
    <span class="log-content">${formatNarrativeText(simplified)}</span>
  `;
  
  // Animate entry
  entry.style.opacity = '0';
  entry.style.transform = 'translateX(-10px)';
  container.appendChild(entry);
  
  requestAnimationFrame(() => {
    entry.style.transition = 'opacity 0.3s, transform 0.3s';
    entry.style.opacity = '1';
    entry.style.transform = 'translateX(0)';
  });
  
  if (autoScroll) {
    container.scrollTop = container.scrollHeight;
  }
  
  if (log.roll) {
    showDiceRoll(log.roll);
  }
}

function toggleAutoScroll() {
  autoScroll = !autoScroll;
  const btn = document.getElementById('autoscroll-btn');
  if (btn) {
    btn.textContent = `Auto-scroll: ${autoScroll ? 'ON' : 'OFF'}`;
    btn.className = `narrative-btn ${autoScroll ? 'active' : ''}`;
  }
}

let currentLogFilter = 'all';

function setLogFilter(filter) {
  currentLogFilter = filter;
  const container = document.getElementById('narrative-log');
  if (!container) return;
  
  // Update tab buttons
  document.querySelectorAll('.log-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });
  
  // Update container filter class
  container.classList.remove('filter-all', 'filter-combat', 'filter-dialogue');
  if (filter !== 'all') {
    container.classList.add(`filter-${filter}`);
  }
}

// Classify log entry type based on content
function classifyLogEntry(content) {
  if (!content) return 'action';
  const text = content.toLowerCase();
  
  // Combat-related keywords
  if (text.includes('⚔️') || text.includes('attack') || text.includes('damage') || 
      text.includes('hit') || text.includes('miss') || text.includes('critical') ||
      text.includes('💀') || text.includes('combat') || text.includes('initiative') ||
      text.includes('end of your turn') || text.includes('🏃')) {
    return 'combat';
  }
  
  // Dialogue/narrative keywords
  if (text.includes('🏪') || text.includes('shop') || text.includes('says') ||
      text.includes('offers') || text.includes('merchant') || text.includes('welcome') ||
      text.includes('🦐') || text.includes('🦀') || text.includes('greeting')) {
    return 'dialogue';
  }
  
  // Treasure/loot
  if (text.includes('💎') || text.includes('treasure') || text.includes('found:') ||
      text.includes('gold') || text.includes('📦')) {
    return 'narrative';
  }
  
  // Traps/puzzles
  if (text.includes('⚠️') || text.includes('trap') || text.includes('puzzle') ||
      text.includes('🧩')) {
    return 'narrative';
  }
  
  return 'action';
}

// ===== EFFECTS =====

function showDiceRoll(roll) {
  const display = document.getElementById('dice-display');
  const value = document.getElementById('dice-value');
  const detail = document.getElementById('dice-detail');
  
  if (!display || !roll) return;
  
  value.textContent = roll.total;
  value.className = 'dice-value';
  
  if (roll.is_crit || (roll.rolls && roll.rolls.includes(20))) {
    value.classList.add('crit');
  } else if (roll.is_fail || (roll.rolls && roll.rolls.includes(1))) {
    value.classList.add('fail');
  }
  
  const rolls = roll.rolls ? `[${roll.rolls.join(', ')}]` : '';
  const mod = roll.modifier ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : '';
  detail.textContent = `${roll.notation || 'd20'}${rolls}${mod} = ${roll.total}`;
  
  display.classList.remove('hidden');
  
  setTimeout(() => {
    display.classList.add('hidden');
  }, 2500);
}

function showDamageNumber(data) {
  const container = document.getElementById('damage-numbers');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = `damage-number ${data.type || 'damage'}`;
  el.textContent = data.type === 'heal' ? `+${data.amount}` : `-${data.amount}`;
  el.style.left = `${data.x || 50}%`;
  el.style.top = `${data.y || 30}%`;
  
  container.appendChild(el);
  
  setTimeout(() => el.remove(), 1500);
}

// ===== DEATH / VICTORY SCREENS =====

function showDeathScreen(run) {
  const overlay = document.getElementById('death-overlay');
  if (!overlay) return;
  
  const deathFloor = document.getElementById('death-floor');
  const deathCause = document.getElementById('death-cause');
  const finalGold = document.getElementById('final-gold');
  const finalKills = document.getElementById('final-kills');
  const runTime = document.getElementById('run-time');
  
  if (deathFloor) deathFloor.textContent = `Fell on Floor ${run.current_floor || run.max_floor}`;
  if (deathCause) deathCause.textContent = run.death_cause || 'Succumbed to the darkness';
  if (finalGold) finalGold.textContent = run.gold || 0;
  if (finalKills) finalKills.textContent = run.kills || 0;
  if (runTime) runTime.textContent = formatTime(run.duration_seconds);
  
  overlay.classList.remove('hidden');
  
  setTimeout(() => {
    overlay.classList.add('active');
  }, 100);
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
}

function showVictoryScreen(run) {
  const overlay = document.getElementById('victory-overlay');
  if (!overlay) return;
  
  const victoryGold = document.getElementById('victory-gold');
  const victoryKills = document.getElementById('victory-kills');
  const victoryTime = document.getElementById('victory-time');
  
  if (victoryGold) victoryGold.textContent = run.gold || 0;
  if (victoryKills) victoryKills.textContent = run.kills || 0;
  if (victoryTime) victoryTime.textContent = formatTime(run.duration_seconds);
  
  overlay.classList.remove('hidden');
  
  setTimeout(() => {
    overlay.classList.add('active');
  }, 100);
  
  if (timerInterval) {
    clearInterval(timerInterval);
  }
}

// ===== TIMER =====

function startTimer() {
  timerInterval = setInterval(() => {
    if (!runStartTime) return;
    
    const now = new Date();
    const diff = Math.floor((now - runStartTime) / 1000);
    const timeValue = document.getElementById('time-value');
    if (timeValue) timeValue.textContent = formatTime(diff);
  }, 1000);
}

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== LEGACY CAMPAIGN MODE =====

function initCampaignMode() {
  document.title = 'Theater Mode - Caverns & Clawds';
  loadCampaign();
  connectWebSocket();
}

async function loadCampaign() {
  try {
    const res = await fetch(`/api/campaigns/${campaignId}`);
    const data = await res.json();
    
    if (!data.success && data.error) {
      showError(data.error);
      return;
    }
    
    const navTitle = document.getElementById('nav-title');
    const agentName = document.getElementById('agent-name');
    
    if (navTitle) navTitle.textContent = data.name;
    if (agentName) agentName.textContent = data.dm_name || 'DM';
    
    if (data.messages) {
      data.messages.forEach(m => {
        appendLog({
          type: m.type,
          content: m.content,
          timestamp: m.created_at
        });
      });
    }
  } catch (err) {
    console.error('Failed to load campaign:', err);
    showError('Failed to load campaign');
  }
}

// ===== UTILITIES =====

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  const theater = document.querySelector('.theater');
  if (theater) {
    // Stop polling when showing error
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    
    theater.innerHTML = `
      <div class="error-screen">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <h1>Error</h1>
          <p>${escapeHtml(message)}</p>
          <a href="/" class="error-return">← Return to Lobby</a>
        </div>
      </div>
    `;
  }
}

function showNoRunMessage() {
  const scene = document.getElementById('dungeon-scene');
  if (scene) {
    scene.innerHTML = `
      <div class="no-run-message">
        <span class="no-run-icon">🏚️</span>
        <h2>No Active Run</h2>
        <p>This run has ended or doesn't exist.</p>
        <a href="/" class="back-link">← Return to Lobby</a>
      </div>
    `;
  }
}

// ===== MINIMAP (NODE GRAPH) =====

let minimapCollapsed = false;

function toggleMinimap() {
  const container = document.getElementById('minimap-container');
  const toggle = document.getElementById('minimap-toggle');
  
  minimapCollapsed = !minimapCollapsed;
  
  if (container) {
    container.classList.toggle('collapsed', minimapCollapsed);
  }
  if (toggle) {
    toggle.textContent = minimapCollapsed ? '+' : '−';
  }
}

async function fetchFloorMap(runId) {
  try {
    const res = await fetch(`/api/runs/${runId}/map`);
    const data = await res.json();
    if (data.success && data.floorMap) {
      return data.floorMap;
    }
  } catch (err) {
    console.error('Failed to fetch floor map:', err);
  }
  return null;
}

function updateMinimap(run) {
  const svg = document.getElementById('minimap-svg');
  const edgesGroup = document.getElementById('minimap-edges');
  const nodesGroup = document.getElementById('minimap-nodes');
  
  if (!svg || !edgesGroup || !nodesGroup || !run.floor_map) return;
  
  const floorMap = run.floor_map;
  const nodes = floorMap.nodes || [];
  const edges = floorMap.edges || [];
  const currentNode = run.current_node;
  const visitedNodes = new Set(run.visited_nodes || []);
  
  // Clear existing content
  edgesGroup.innerHTML = '';
  nodesGroup.innerHTML = '';
  
  if (nodes.length === 0) return;
  
  // Calculate layout dimensions
  const svgWidth = 300;
  const svgHeight = 200;
  const padding = 30;
  const numColumns = floorMap.numColumns || 7;
  
  // Calculate node positions
  const nodePositions = new Map();
  
  // Group nodes by column
  const nodesByCol = {};
  for (const node of nodes) {
    if (!nodesByCol[node.col]) nodesByCol[node.col] = [];
    nodesByCol[node.col].push(node);
  }
  
  // Position nodes
  for (let col = 0; col < numColumns; col++) {
    const colNodes = nodesByCol[col] || [];
    const colX = padding + (col / (numColumns - 1)) * (svgWidth - 2 * padding);
    const numInCol = colNodes.length;
    
    colNodes.forEach((node, idx) => {
      const ySpacing = numInCol > 1 ? (svgHeight - 2 * padding) / (numInCol - 1) : 0;
      const yOffset = numInCol > 1 ? 0 : (svgHeight - 2 * padding) / 2;
      const nodeY = padding + yOffset + idx * ySpacing;
      nodePositions.set(node.id, { x: colX, y: nodeY });
    });
  }
  
  // Find available paths (from current node)
  const currentNodeData = nodes.find(n => n.id === currentNode);
  const availablePaths = new Set(currentNodeData?.connections || []);
  
  // Draw edges
  for (const edge of edges) {
    const fromPos = nodePositions.get(edge.from);
    const toPos = nodePositions.get(edge.to);
    
    if (!fromPos || !toPos) continue;
    
    const isAvailable = edge.from === currentNode;
    const isVisitedPath = visitedNodes.has(edge.from) && visitedNodes.has(edge.to);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', fromPos.x);
    line.setAttribute('y1', fromPos.y);
    line.setAttribute('x2', toPos.x);
    line.setAttribute('y2', toPos.y);
    line.classList.add('minimap-edge');
    
    if (isAvailable) {
      line.classList.add('available');
    } else if (isVisitedPath) {
      line.classList.add('visited');
    }
    
    edgesGroup.appendChild(line);
  }
  
  // Draw nodes
  for (const node of nodes) {
    const pos = nodePositions.get(node.id);
    if (!pos) continue;
    
    const isCurrent = node.id === currentNode;
    const isVisited = visitedNodes.has(node.id);
    const isAvailable = availablePaths.has(node.id);
    
    // Create node group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('minimap-node');
    g.classList.add(node.type);
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.setAttribute('data-node-id', node.id);
    
    if (isCurrent) g.classList.add('current');
    else if (isVisited) g.classList.add('visited');
    else if (isAvailable) g.classList.add('available');
    
    // Node background circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.classList.add('minimap-node-bg');
    circle.setAttribute('r', isCurrent ? 14 : 12);
    circle.setAttribute('cx', 0);
    circle.setAttribute('cy', 0);
    g.appendChild(circle);
    
    // Node icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.classList.add('minimap-node-icon');
    icon.setAttribute('x', 0);
    icon.setAttribute('y', 1);
    icon.textContent = node.icon || '❓';
    g.appendChild(icon);
    
    // Add click handler for available nodes
    if (isAvailable && !isCurrent) {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => {
        appendLog({ type: 'info', content: `🗺️ Path selected: ${node.type} (${node.id})` });
      });
    }
    
    nodesGroup.appendChild(g);
  }
  
  // Update title
  const minimapTitle = document.querySelector('.minimap-title');
  if (minimapTitle) {
    minimapTitle.textContent = `🗺️ Floor ${floorMap.floorNumber} - ${floorMap.theme?.name || 'Unknown'}`;
  }
}
