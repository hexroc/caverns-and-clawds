/**
 * Caverns & Clawds - Capstone Dungeon System
 * 
 * The Dreadnought's Depths - A cooperative dungeon capstone.
 * 
 * Features:
 * - Level 6 cap until capstone completed
 * - Party system for up to 3 agents
 * - 15 rooms across 3 floors + boss arena
 * - The Dreadnought boss fight with phases
 * - Victory rewards: XP, achievement, legendary loot
 */

const { v4: uuidv4 } = require('uuid');
const { HexGrid, hex, hexDistance, hexNeighbors, TERRAIN, generateRoom, seededRandom } = require('./hex-grid');
const { TacticalCombat, EVENT_DELAYS } = require('./tactical-combat');

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_CAP = 6;
const MAX_PARTY_SIZE = 3;
const MAX_PARTY_DEATHS = 3;
const ROOMS_PER_FLOOR = 5;
const TOTAL_FLOORS = 3;

// XP thresholds for level 6 (5e)
const XP_FOR_LEVEL_6 = 6500;
const XP_FOR_LEVEL_7 = 14000;

// ============================================================================
// ROOM TEMPLATES
// ============================================================================

const ROOM_TYPES = {
  combat: {
    name: 'Combat Room',
    description: 'Enemies lurk in the darkness ahead.',
    gridRadius: 10,
    hasCombat: true
  },
  trap: {
    name: 'Trap Room',
    description: 'This chamber feels... dangerous.',
    gridRadius: 8,
    hasTrap: true
  },
  rest: {
    name: 'Rest Alcove',
    description: 'A safe space to catch your breath.',
    gridRadius: 6,
    allowsRest: true
  },
  treasure: {
    name: 'Treasure Chamber',
    description: 'Glittering pearls and ancient artifacts catch the light.',
    gridRadius: 8,
    hasTreasure: true
  },
  puzzle: {
    name: 'Puzzle Room',
    description: 'Ancient mechanisms await solving.',
    gridRadius: 10,
    hasPuzzle: true
  },
  boss: {
    name: 'Boss Arena',
    description: 'The Dreadnought awaits.',
    gridRadius: 15,
    isBoss: true
  },
  stairs: {
    name: 'Stairway',
    description: 'A passage leading deeper into the abyss.',
    gridRadius: 6,
    hasStairs: true
  }
};

// Room distribution per floor
const FLOOR_LAYOUTS = [
  // Floor 1
  ['combat', 'combat', 'trap', 'treasure', 'stairs'],
  // Floor 2  
  ['combat', 'combat', 'rest', 'puzzle', 'stairs'],
  // Floor 3
  ['combat', 'combat', 'trap', 'rest', 'stairs'],
  // Boss floor
  ['boss']
];

// ============================================================================
// ENCOUNTER DEFINITIONS (for scaling)
// ============================================================================

const CAPSTONE_ENCOUNTERS = {
  floor1: [
    { monsters: ['drowned_sailor', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['barnacle_horror', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['sea_wraith'] },
    // Mixed encounter with ranged unit
    { monsters: ['sahuagin_crossbowman', 'giant_crab', 'giant_crab'] },
  ],
  floor2: [
    { monsters: ['sea_wraith', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['moray_terror', 'drowned_sailor'] },
    { monsters: ['anchor_wight'] },
    { monsters: ['treasure_mimic'] },
    // Mixed ranged/melee encounter
    { monsters: ['deep_archer', 'sahuagin_crossbowman', 'drowned_sailor'] },
  ],
  floor3: [
    { monsters: ['anchor_wight', 'barnacle_horror', 'barnacle_horror'] },
    { monsters: ['ghost_captain'] },
    { monsters: ['horror_shard', 'drowned_sailor', 'drowned_sailor'] },
    // Spellcaster encounter
    { monsters: ['spellcasting_eel', 'deep_archer'] },
    // All ranged encounter (kiting test)
    { monsters: ['deep_archer', 'sahuagin_crossbowman', 'sahuagin_crossbowman'] },
  ]
};

// ============================================================================
// THE DREADNOUGHT BOSS
// ============================================================================

const DREADNOUGHT = {
  id: 'the_dreadnought',
  name: 'The Dreadnought',
  description: 'An enormous crustacean abomination forged from the cursed shell of a thousand drowned souls. Its carapace gleams with eldritch energy.',
  char: '🦀',
  type: 'boss',
  team: 'enemy',
  
  // Base stats (scaled by party size)
  baseHp: 200,
  hpPerExtraCharacter: 50, // +50 HP per char beyond 4
  ac: 17,
  speed: 4,
  
  attackBonus: 8,
  attacks: [
    {
      id: 'crushing_claw',
      name: 'Crushing Claw',
      damage: '2d10+5',
      damageType: 'bludgeoning',
      description: 'A massive claw strike'
    },
    {
      id: 'tail_sweep',
      name: 'Tail Sweep',
      damage: '2d8',
      damageType: 'bludgeoning',
      special: 'prone',
      saveDC: 15,
      saveType: 'dex',
      description: 'Sweeps its tail in an arc, knocking targets prone'
    }
  ],
  
  attacksPerRound: 2,
  
  // Legendary actions (3 per round)
  legendaryActions: 3,
  legendaryAbilities: [
    {
      id: 'shell_slam',
      name: 'Shell Slam',
      cost: 1,
      damage: '1d8',
      damageType: 'bludgeoning',
      range: 'melee',
      description: 'All creatures in melee range take damage'
    },
    {
      id: 'summon_spawn',
      name: 'Summon Spawn',
      cost: 2,
      spawns: [
        { monsterId: 'dreadnought_spawn', count: 2 }
      ],
      description: 'Summons 2 Dreadnought Spawn'
    },
    {
      id: 'abyssal_roar',
      name: 'Abyssal Roar',
      cost: 3,
      saveDC: 14,
      saveType: 'wis',
      condition: 'frightened',
      description: 'All enemies must save or be frightened for 1 round'
    }
  ],
  
  // Phase configuration
  phases: [
    {
      phase: 1,
      hpThreshold: 1.0,
      name: 'Normal',
      description: 'The Dreadnought battles with calculated fury.'
    },
    {
      phase: 2,
      hpThreshold: 0.66,
      name: 'Regenerating',
      description: 'The Dreadnought\'s shell begins to pulse with dark energy!',
      regeneration: 10, // HP per round
      statChanges: {
        ac: 18
      }
    },
    {
      phase: 3,
      hpThreshold: 0.33,
      name: 'Berserk',
      description: 'The Dreadnought enters a berserk frenzy! Its eyes glow red!',
      attacksPerRound: 3,
      regeneration: 0,
      statChanges: {
        attackBonus: 10,
        ac: 16
      }
    }
  ],
  
  // Rewards
  xpReward: 1000,
  pearlReward: 500,
  legendaryLoot: [
    { id: 'dreadnought_claw', name: 'Dreadnought\'s Claw', type: 'weapon', rarity: 'legendary', damage: '2d8+3', description: 'A massive claw torn from the beast. +3 to hit and damage.' },
    { id: 'abyssal_shell', name: 'Abyssal Shell', type: 'armor', rarity: 'legendary', ac: 18, description: 'Armor forged from the Dreadnought\'s carapace. AC 18, fire resistance.' },
    { id: 'eye_of_deep', name: 'Eye of the Deep', type: 'accessory', rarity: 'legendary', description: 'See through magical darkness. Advantage on perception checks.' },
    { id: 'krakens_heart', name: 'Kraken\'s Heart', type: 'trinket', rarity: 'legendary', description: 'Once per day, heal 50 HP. Grants water breathing.' }
  ],
  achievement: {
    id: 'dreadnought_slayer',
    name: 'Dreadnought Slayer',
    description: 'Defeated The Dreadnought in the capstone dungeon',
    unlocksLevelCap: true
  },
  title: 'Abyssal Conqueror'
};

// Dreadnought Spawn (summoned minions)
const DREADNOUGHT_SPAWN = {
  id: 'dreadnought_spawn',
  name: 'Dreadnought Spawn',
  description: 'A smaller version of the horror, spawned from its dark shell.',
  char: '🦐',
  type: 'monster',
  team: 'enemy',
  
  hp: 25,
  ac: 13,
  speed: 6,
  attackBonus: 4,
  damage: '1d6+2',
  damageType: 'slashing',
  
  dexMod: 2
};

// ============================================================================
// TRAP DEFINITIONS
// ============================================================================

const TRAPS = [
  {
    id: 'pressure_plate',
    name: 'Pressure Plate Trap',
    description: 'A concealed pressure plate triggers a volley of bone spikes!',
    saveDC: 14,
    saveType: 'dex',
    damage: '2d6',
    damageType: 'piercing',
    detectDC: 12
  },
  {
    id: 'poison_gas',
    name: 'Poison Gas Vent',
    description: 'Toxic gas erupts from the walls!',
    saveDC: 13,
    saveType: 'con',
    damage: '3d6',
    damageType: 'poison',
    detectDC: 14
  },
  {
    id: 'collapsing_floor',
    name: 'Collapsing Floor',
    description: 'The floor gives way beneath your claws!',
    saveDC: 15,
    saveType: 'dex',
    damage: '2d10',
    damageType: 'bludgeoning',
    detectDC: 13
  }
];

// ============================================================================
// PUZZLE DEFINITIONS
// ============================================================================

const PUZZLES = [
  {
    id: 'shell_sequence',
    name: 'Shell Sequence',
    description: 'Three shells of different colors must be placed in the correct order.',
    hint: 'The sea whispers: Red sinks, Blue floats, Green stays still.',
    solution: ['red', 'green', 'blue'],
    reward: { pearls: 100, item: 'potion_greater_healing' }
  },
  {
    id: 'current_maze',
    name: 'Current Maze',
    description: 'Navigate the magical currents to reach the other side.',
    hint: 'Follow the warmest water.',
    skillCheck: { skill: 'survival', dc: 14 },
    reward: { pearls: 75 }
  }
];

// ============================================================================
// TREASURE TABLES
// ============================================================================

const TREASURE_POOLS = {
  common: [
    { id: 'potion_healing', name: 'Healing Potion', weight: 5 },
    { id: 'rations', name: 'Rations', weight: 3 },
    { id: 'torch', name: 'Torch', weight: 2 }
  ],
  uncommon: [
    { id: 'potion_greater_healing', name: 'Greater Healing Potion', weight: 4 },
    { id: 'scroll_shield', name: 'Scroll of Shield', weight: 3 },
    { id: 'pearl_bag', name: 'Bag of Pearls (50)', pearls: 50, weight: 3 }
  ],
  rare: [
    { id: 'resurrection_voucher', name: 'Resurrection Voucher', weight: 2 },
    { id: 'pearl_hoard', name: 'Pearl Hoard (200)', pearls: 200, weight: 2 }
  ]
};

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

function initCapstoneSchema(db) {
  // Capstone instances
  db.exec(`
    CREATE TABLE IF NOT EXISTS capstone_instances (
      id TEXT PRIMARY KEY,
      leader_id TEXT NOT NULL,
      status TEXT DEFAULT 'forming',
      current_floor INTEGER DEFAULT 1,
      current_room INTEGER DEFAULT 1,
      death_count INTEGER DEFAULT 0,
      rooms_cleared TEXT DEFAULT '[]',
      room_states TEXT DEFAULT '{}',
      boss_state TEXT DEFAULT NULL,
      combat_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS capstone_party (
      id TEXT PRIMARY KEY,
      capstone_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      henchman_id TEXT,
      status TEXT DEFAULT 'alive',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capstone_id) REFERENCES capstone_instances(id)
    );
    
    CREATE TABLE IF NOT EXISTS capstone_invites (
      id TEXT PRIMARY KEY,
      capstone_id TEXT NOT NULL,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capstone_id) REFERENCES capstone_instances(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_capstone_party_capstone ON capstone_party(capstone_id);
    CREATE INDEX IF NOT EXISTS idx_capstone_invites_to ON capstone_invites(to_agent_id);
  `);
}

// ============================================================================
// CAPSTONE MANAGER CLASS
// ============================================================================

class CapstoneManager {
  constructor(db) {
    this.db = db;
    this.activeCombats = new Map(); // capstoneId -> TacticalCombat
    initCapstoneSchema(db);
  }
  
  // ============================================================================
  // LEVEL CAP SYSTEM
  // ============================================================================
  
  /**
   * Check if a character is at level cap
   */
  isAtLevelCap(character) {
    // Support both clawds table (level directly) and characters table (stats.level)
    const level = character.level ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.level ?? 0;
    return level >= LEVEL_CAP;
  }
  
  /**
   * Check if character has completed capstone (unlocked level cap)
   */
  hasCompletedCapstone(characterId) {
    const achievements = this.db.prepare(`
      SELECT * FROM character_achievements 
      WHERE character_id = ? AND achievement_id = 'dreadnought_slayer'
    `).get(characterId);
    return !!achievements;
  }
  
  /**
   * Calculate XP with level cap enforcement
   */
  calculateXP(character, xpGained) {
    // Support both clawds table (level/xp directly) and characters table (stats.level/stats.xp)
    const level = character.level ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.level ?? 0;
    const currentXP = character.xp ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.xp ?? 0;
    
    // If at level cap and hasn't completed capstone, freeze XP
    if (level >= LEVEL_CAP && !this.hasCompletedCapstone(character.id)) {
      // Can't exceed the XP for level 7
      const cappedXP = Math.min(currentXP + xpGained, XP_FOR_LEVEL_7 - 1);
      return { 
        newXP: cappedXP, 
        xpGained: cappedXP - currentXP,
        capped: true,
        message: 'XP frozen at level 6 until capstone completed'
      };
    }
    
    return { 
      newXP: stats.xp + xpGained, 
      xpGained,
      capped: false 
    };
  }
  
  // ============================================================================
  // INSTANCE MANAGEMENT
  // ============================================================================
  
  /**
   * Create a new capstone instance
   */
  create(leaderId, characterId) {
    // Verify character eligibility
    const character = this.db.prepare('SELECT * FROM clawds WHERE id = ? AND agent_id = ?')
      .get(characterId, leaderId);
    
    if (!character) {
      return { success: false, error: 'Character not found' };
    }
    
    if (character.level < 5) {
      return { success: false, error: 'Character must be level 5-6 to enter capstone' };
    }
    
    if (character.level > LEVEL_CAP) {
      return { success: false, error: 'Character level too high for capstone' };
    }
    
    // Check if leader already has an active capstone
    const existing = this.db.prepare(`
      SELECT ci.* FROM capstone_instances ci
      JOIN capstone_party cp ON ci.id = cp.capstone_id
      WHERE cp.agent_id = ? AND ci.status IN ('forming', 'active')
    `).get(leaderId);
    
    if (existing) {
      return { success: false, error: 'Already in an active capstone', capstoneId: existing.id };
    }
    
    const id = uuidv4();
    const partyId = uuidv4();
    
    // Create instance
    this.db.prepare(`
      INSERT INTO capstone_instances (id, leader_id, status, current_floor, current_room, death_count)
      VALUES (?, ?, 'forming', 1, 1, 0)
    `).run(id, leaderId);
    
    // Add leader to party
    this.db.prepare(`
      INSERT INTO capstone_party (id, capstone_id, agent_id, character_id, status)
      VALUES (?, ?, ?, ?, 'alive')
    `).run(partyId, id, leaderId, characterId);
    
    return { 
      success: true, 
      capstoneId: id,
      message: 'Capstone instance created. Invite others or start when ready.',
      maxPartySize: MAX_PARTY_SIZE
    };
  }
  
  /**
   * Get capstone instance status
   */
  getStatus(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return null;
    
    const party = this.db.prepare(`
      SELECT cp.*, c.name as character_name, u.name as agent_name, c.level, c.hp_current, c.hp_max
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      JOIN users u ON cp.agent_id = u.id
      WHERE cp.capstone_id = ?
    `).all(capstoneId);
    
    const invites = this.db.prepare(`
      SELECT ci.*, u.name as from_name, u2.name as to_name
      FROM capstone_invites ci
      JOIN users u ON ci.from_agent_id = u.id
      JOIN users u2 ON ci.to_agent_id = u2.id
      WHERE ci.capstone_id = ? AND ci.status = 'pending'
    `).all(capstoneId);
    
    return {
      ...instance,
      roomsCleared: JSON.parse(instance.rooms_cleared || '[]'),
      roomStates: JSON.parse(instance.room_states || '{}'),
      party,
      pendingInvites: invites,
      deathsRemaining: MAX_PARTY_DEATHS - instance.death_count
    };
  }
  
  /**
   * Invite another agent to the party
   */
  invite(capstoneId, fromAgentId, toAgentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.leader_id !== fromAgentId) return { success: false, error: 'Only leader can invite' };
    if (instance.status !== 'forming') return { success: false, error: 'Cannot invite after dungeon started' };
    
    // Check party size
    const partyCount = this.db.prepare('SELECT COUNT(*) as count FROM capstone_party WHERE capstone_id = ?')
      .get(capstoneId).count;
    if (partyCount >= MAX_PARTY_SIZE) {
      return { success: false, error: `Party is full (max ${MAX_PARTY_SIZE})` };
    }
    
    // Check if already invited
    const existingInvite = this.db.prepare(`
      SELECT * FROM capstone_invites 
      WHERE capstone_id = ? AND to_agent_id = ? AND status = 'pending'
    `).get(capstoneId, toAgentId);
    if (existingInvite) return { success: false, error: 'Already invited' };
    
    // Check if already in party
    const inParty = this.db.prepare(`
      SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?
    `).get(capstoneId, toAgentId);
    if (inParty) return { success: false, error: 'Already in party' };
    
    const inviteId = uuidv4();
    this.db.prepare(`
      INSERT INTO capstone_invites (id, capstone_id, from_agent_id, to_agent_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(inviteId, capstoneId, fromAgentId, toAgentId);
    
    return { success: true, inviteId };
  }
  
  /**
   * Accept an invite and join the party
   */
  join(capstoneId, agentId, characterId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.status !== 'forming') return { success: false, error: 'Capstone already started' };
    
    // Check for valid invite
    const invite = this.db.prepare(`
      SELECT * FROM capstone_invites 
      WHERE capstone_id = ? AND to_agent_id = ? AND status = 'pending'
    `).get(capstoneId, agentId);
    if (!invite) return { success: false, error: 'No pending invite found' };
    
    // Verify character
    const character = this.db.prepare('SELECT * FROM clawds WHERE id = ? AND agent_id = ?')
      .get(characterId, agentId);
    if (!character) return { success: false, error: 'Character not found' };
    
    if (character.level < 5 || character.level > LEVEL_CAP) {
      return { success: false, error: 'Character must be level 5-6' };
    }
    
    // Check party isn't full
    const partyCount = this.db.prepare('SELECT COUNT(*) as count FROM capstone_party WHERE capstone_id = ?')
      .get(capstoneId).count;
    if (partyCount >= MAX_PARTY_SIZE) {
      return { success: false, error: 'Party is full' };
    }
    
    // Accept invite
    this.db.prepare(`UPDATE capstone_invites SET status = 'accepted' WHERE id = ?`).run(invite.id);
    
    // Add to party
    const partyId = uuidv4();
    this.db.prepare(`
      INSERT INTO capstone_party (id, capstone_id, agent_id, character_id, status)
      VALUES (?, ?, ?, ?, 'alive')
    `).run(partyId, capstoneId, agentId, characterId);
    
    return { success: true, message: 'Joined party successfully' };
  }
  
  /**
   * Leave the party
   */
  leave(capstoneId, agentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    // Leader can't leave, must abandon
    if (instance.leader_id === agentId) {
      return { success: false, error: 'Leader cannot leave. Use abandon to end the capstone.' };
    }
    
    // Can only leave if forming
    if (instance.status === 'active') {
      return { success: false, error: 'Cannot leave during active dungeon' };
    }
    
    this.db.prepare('DELETE FROM capstone_party WHERE capstone_id = ? AND agent_id = ?')
      .run(capstoneId, agentId);
    
    return { success: true, message: 'Left party' };
  }
  
  /**
   * Start the dungeon
   */
  start(capstoneId, agentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.leader_id !== agentId) return { success: false, error: 'Only leader can start' };
    if (instance.status !== 'forming') return { success: false, error: 'Already started' };
    
    // Generate dungeon layout
    const layout = this._generateDungeon(capstoneId);
    
    // Update status
    this.db.prepare(`
      UPDATE capstone_instances 
      SET status = 'active', started_at = datetime('now'), room_states = ?
      WHERE id = ?
    `).run(JSON.stringify(layout), capstoneId);
    
    return { 
      success: true, 
      message: 'The Dreadnought\'s Depths awaits...', 
      dungeon: layout,
      currentRoom: this._getRoomInfo(1, 1, layout)
    };
  }
  
  // ============================================================================
  // DUNGEON GENERATION
  // ============================================================================
  
  /**
   * Generate full dungeon layout
   */
  _generateDungeon(capstoneId) {
    const rng = seededRandom(capstoneId);
    const dungeon = {
      floors: []
    };
    
    for (let floor = 0; floor < TOTAL_FLOORS; floor++) {
      const floorLayout = FLOOR_LAYOUTS[floor];
      const rooms = [];
      
      // Shuffle room order (except stairs which stay at end)
      const shuffled = [...floorLayout.slice(0, -1)].sort(() => rng() - 0.5);
      shuffled.push(floorLayout[floorLayout.length - 1]);
      
      for (let room = 0; room < shuffled.length; room++) {
        const roomType = shuffled[room];
        const template = ROOM_TYPES[roomType];
        
        rooms.push({
          id: `f${floor + 1}r${room + 1}`,
          floor: floor + 1,
          room: room + 1,
          type: roomType,
          name: template.name,
          description: template.description,
          cleared: false,
          state: this._generateRoomState(roomType, floor + 1, rng)
        });
      }
      
      dungeon.floors.push({ floor: floor + 1, rooms });
    }
    
    // Add boss floor
    dungeon.floors.push({
      floor: 4,
      rooms: [{
        id: 'f4r1',
        floor: 4,
        room: 1,
        type: 'boss',
        name: 'The Dreadnought\'s Lair',
        description: 'The final chamber. The Dreadnought awaits.',
        cleared: false,
        state: { boss: DREADNOUGHT }
      }]
    });
    
    return dungeon;
  }
  
  /**
   * Generate room-specific state
   */
  _generateRoomState(roomType, floor, rng) {
    const state = {};
    
    switch (roomType) {
      case 'combat':
        const encounters = CAPSTONE_ENCOUNTERS[`floor${floor}`] || CAPSTONE_ENCOUNTERS.floor1;
        const encounter = encounters[Math.floor(rng() * encounters.length)];
        state.encounter = encounter;
        state.combat = null;
        break;
        
      case 'trap':
        state.trap = TRAPS[Math.floor(rng() * TRAPS.length)];
        state.triggered = false;
        state.detected = false;
        break;
        
      case 'treasure':
        state.treasure = this._generateTreasure(floor, rng);
        state.looted = false;
        break;
        
      case 'puzzle':
        state.puzzle = PUZZLES[Math.floor(rng() * PUZZLES.length)];
        state.solved = false;
        break;
        
      case 'rest':
        state.rested = false;
        break;
        
      case 'stairs':
        state.nextFloor = floor + 1;
        break;
    }
    
    return state;
  }
  
  /**
   * Generate treasure for a room
   */
  _generateTreasure(floor, rng) {
    const items = [];
    let pearls = Math.floor(rng() * 50) + (floor * 25);
    
    // Roll for items
    const pools = ['common', 'uncommon'];
    if (floor >= 2) pools.push('rare');
    
    for (const poolName of pools) {
      if (rng() < 0.5 + (floor * 0.1)) {
        const pool = TREASURE_POOLS[poolName];
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = rng() * totalWeight;
        
        for (const item of pool) {
          roll -= item.weight;
          if (roll <= 0) {
            if (item.pearls) {
              pearls += item.pearls;
            } else {
              items.push({ id: item.id, name: item.name });
            }
            break;
          }
        }
      }
    }
    
    return { items, pearls };
  }
  
  /**
   * Get room info
   */
  _getRoomInfo(floor, room, layout) {
    const floorData = layout.floors.find(f => f.floor === floor);
    if (!floorData) return null;
    return floorData.rooms.find(r => r.room === room);
  }
  
  // ============================================================================
  // NAVIGATION & ROOM ACTIONS
  // ============================================================================
  
  /**
   * Get current room state
   */
  getCurrentRoom(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    // Check for active combat
    const combat = this.activeCombats.get(capstoneId);
    
    return {
      success: true,
      floor: instance.current_floor,
      room: instance.current_room,
      totalFloors: TOTAL_FLOORS + 1, // +1 for boss floor
      roomsOnFloor: ROOMS_PER_FLOOR,
      roomInfo,
      combat: combat ? combat.getState('party') : null,
      deathCount: instance.death_count,
      deathsRemaining: MAX_PARTY_DEATHS - instance.death_count
    };
  }
  
  /**
   * Move to adjacent room
   */
  move(capstoneId, agentId, direction) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.status !== 'active') return { success: false, error: 'Dungeon not active' };
    
    // Verify agent is in party
    const partyMember = this.db.prepare(`
      SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?
    `).get(capstoneId, agentId);
    if (!partyMember) return { success: false, error: 'Not in party' };
    
    // Check for active combat
    if (this.activeCombats.has(capstoneId)) {
      return { success: false, error: 'Cannot move during combat' };
    }
    
    const layout = JSON.parse(instance.room_states || '{}');
    const currentRoomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    // Check if current room is cleared
    if (!currentRoomInfo.cleared && currentRoomInfo.type !== 'rest') {
      return { success: false, error: 'Clear current room before moving' };
    }
    
    let newFloor = instance.current_floor;
    let newRoom = instance.current_room;
    
    switch (direction) {
      case 'forward':
      case 'next':
        if (instance.current_room < ROOMS_PER_FLOOR) {
          newRoom++;
        } else if (currentRoomInfo.type === 'stairs') {
          newFloor++;
          newRoom = 1;
        } else {
          return { success: false, error: 'No path forward' };
        }
        break;
        
      case 'back':
      case 'previous':
        if (instance.current_room > 1) {
          newRoom--;
        } else {
          return { success: false, error: 'Cannot go back' };
        }
        break;
        
      case 'down':
        if (currentRoomInfo.type === 'stairs') {
          newFloor++;
          newRoom = 1;
        } else {
          return { success: false, error: 'No stairs here' };
        }
        break;
        
      default:
        return { success: false, error: 'Invalid direction. Use: forward, back, down' };
    }
    
    // Update position
    this.db.prepare(`
      UPDATE capstone_instances SET current_floor = ?, current_room = ? WHERE id = ?
    `).run(newFloor, newRoom, capstoneId);
    
    const newRoomInfo = this._getRoomInfo(newFloor, newRoom, layout);
    
    return {
      success: true,
      floor: newFloor,
      room: newRoom,
      roomInfo: newRoomInfo,
      message: `Entered: ${newRoomInfo.name}`
    };
  }
  
  /**
   * Get dungeon map (explored rooms)
   */
  getMap(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const clearedRooms = JSON.parse(instance.rooms_cleared || '[]');
    
    // Build map showing only visited rooms
    const map = {
      currentFloor: instance.current_floor,
      currentRoom: instance.current_room,
      floors: []
    };
    
    for (const floor of layout.floors || []) {
      const floorMap = {
        floor: floor.floor,
        rooms: floor.rooms.map(r => ({
          id: r.id,
          room: r.room,
          type: r.type,
          name: r.name,
          cleared: r.cleared || clearedRooms.includes(r.id),
          current: r.floor === instance.current_floor && r.room === instance.current_room
        }))
      };
      map.floors.push(floorMap);
    }
    
    return { success: true, map };
  }
  
  // ============================================================================
  // ROOM INTERACTIONS
  // ============================================================================
  
  /**
   * Interact with current room
   */
  interact(capstoneId, agentId, action, params = {}) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    switch (roomInfo.type) {
      case 'combat':
        return this._handleCombatRoom(capstoneId, instance, roomInfo, action, params);
      case 'trap':
        return this._handleTrapRoom(capstoneId, instance, roomInfo, action, params);
      case 'treasure':
        return this._handleTreasureRoom(capstoneId, instance, roomInfo, action, params);
      case 'puzzle':
        return this._handlePuzzleRoom(capstoneId, instance, roomInfo, action, params);
      case 'rest':
        return this._handleRestRoom(capstoneId, instance, roomInfo, action, params);
      case 'boss':
        return this._handleBossRoom(capstoneId, instance, roomInfo, action, params);
      case 'stairs':
        return { success: true, message: 'Stairs leading down. Use move direction=down to descend.', cleared: true };
      default:
        return { success: false, error: 'Unknown room type' };
    }
  }
  
  /**
   * Handle combat room
   */
  _handleCombatRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.cleared) {
      return { success: true, message: 'Room already cleared', cleared: true };
    }
    
    // Start combat if not already active
    if (!this.activeCombats.has(capstoneId) && action !== 'flee') {
      const combat = this._initiateCombat(capstoneId, instance, roomInfo.state.encounter);
      if (combat.success) {
        this.activeCombats.set(capstoneId, combat.combat);
        return {
          success: true,
          message: 'Combat initiated!',
          combat: combat.combat.getState('party')
        };
      }
      return combat;
    }
    
    // Handle combat action
    const combat = this.activeCombats.get(capstoneId);
    if (combat) {
      return this._processCombatAction(capstoneId, combat, action, params);
    }
    
    return { success: false, error: 'No active combat' };
  }
  
  /**
   * Handle trap room
   */
  _handleTrapRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.cleared) {
      return { success: true, message: 'Room already cleared', cleared: true };
    }
    
    const trap = roomInfo.state.trap;
    
    switch (action) {
      case 'search':
      case 'detect':
        // Perception/Investigation check to detect trap
        const detectRoll = Math.floor(Math.random() * 20) + 1 + (params.modifier || 0);
        if (detectRoll >= trap.detectDC) {
          roomInfo.state.detected = true;
          this._updateRoomState(instance, roomInfo);
          return {
            success: true,
            message: `You detect a ${trap.name}! (Rolled ${detectRoll} vs DC ${trap.detectDC})`,
            trap: { name: trap.name, description: trap.description }
          };
        }
        return {
          success: true,
          message: 'The room seems safe... (Rolled ' + detectRoll + ')',
          trapDetected: false
        };
        
      case 'disarm':
        if (!roomInfo.state.detected) {
          return { success: false, error: 'No trap detected to disarm' };
        }
        const disarmRoll = Math.floor(Math.random() * 20) + 1 + (params.modifier || 0);
        if (disarmRoll >= trap.saveDC) {
          roomInfo.cleared = true;
          this._updateRoomState(instance, roomInfo);
          this._markRoomCleared(capstoneId, roomInfo.id);
          return {
            success: true,
            message: `Successfully disarmed the ${trap.name}!`,
            cleared: true
          };
        }
        // Failed disarm triggers trap
        return this._triggerTrap(capstoneId, instance, roomInfo, trap);
        
      case 'proceed':
      case 'enter':
        // Walking through without checking triggers trap
        if (!roomInfo.state.triggered && !roomInfo.state.detected) {
          return this._triggerTrap(capstoneId, instance, roomInfo, trap);
        }
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        return { success: true, message: 'Room cleared.', cleared: true };
        
      default:
        return { 
          success: false, 
          error: 'Unknown action. Available: search, disarm, proceed',
          hint: roomInfo.state.detected ? 'Trap detected! Use disarm to attempt to disable it.' : null
        };
    }
  }
  
  /**
   * Trigger a trap
   */
  _triggerTrap(capstoneId, instance, roomInfo, trap) {
    roomInfo.state.triggered = true;
    
    // Get party members and deal damage
    const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
    const results = [];
    
    for (const member of party) {
      if (member.status !== 'alive') continue;
      
      // Roll save
      const saveRoll = Math.floor(Math.random() * 20) + 1;
      const saved = saveRoll >= trap.saveDC;
      
      // Roll damage
      const damageMatch = trap.damage.match(/(\d+)d(\d+)/);
      let damage = 0;
      if (damageMatch) {
        const [_, numDice, dieSize] = damageMatch;
        for (let i = 0; i < parseInt(numDice); i++) {
          damage += Math.floor(Math.random() * parseInt(dieSize)) + 1;
        }
      }
      
      if (saved) damage = Math.floor(damage / 2);
      
      results.push({
        characterId: member.character_id,
        saved,
        saveRoll,
        damage,
        damageType: trap.damageType
      });
      
      // Apply damage to character (would need character HP tracking)
    }
    
    roomInfo.cleared = true;
    this._updateRoomState(instance, roomInfo);
    this._markRoomCleared(capstoneId, roomInfo.id);
    
    return {
      success: true,
      message: `The ${trap.name} is triggered! ${trap.description}`,
      trapTriggered: true,
      results,
      cleared: true
    };
  }
  
  /**
   * Handle treasure room
   */
  _handleTreasureRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.state.looted) {
      return { success: true, message: 'Treasure already looted', cleared: true };
    }
    
    switch (action) {
      case 'loot':
      case 'take':
      case 'open':
        const treasure = roomInfo.state.treasure;
        roomInfo.state.looted = true;
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        
        // Distribute pearls to party
        const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
        const pearlsEach = Math.floor(treasure.pearls / party.length);
        
        // TODO: Actually add items and pearls to characters
        
        return {
          success: true,
          message: 'You found treasure!',
          treasure: {
            items: treasure.items,
            pearls: treasure.pearls,
            pearlsPerMember: pearlsEach
          },
          cleared: true
        };
        
      case 'search':
        return {
          success: true,
          message: 'You see a treasure cache. Use loot to collect it.',
          treasure: { items: roomInfo.state.treasure.items.length + ' items', pearls: 'Unknown amount' }
        };
        
      default:
        return { success: false, error: 'Unknown action. Available: loot, search' };
    }
  }
  
  /**
   * Handle puzzle room
   */
  _handlePuzzleRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.state.solved) {
      return { success: true, message: 'Puzzle already solved', cleared: true };
    }
    
    const puzzle = roomInfo.state.puzzle;
    
    switch (action) {
      case 'examine':
      case 'look':
        return {
          success: true,
          puzzle: {
            name: puzzle.name,
            description: puzzle.description,
            hint: puzzle.hint
          }
        };
        
      case 'solve':
      case 'attempt':
        if (puzzle.skillCheck) {
          // Skill check puzzle
          const roll = Math.floor(Math.random() * 20) + 1 + (params.modifier || 0);
          if (roll >= puzzle.skillCheck.dc) {
            roomInfo.state.solved = true;
            roomInfo.cleared = true;
            this._updateRoomState(instance, roomInfo);
            this._markRoomCleared(capstoneId, roomInfo.id);
            return {
              success: true,
              message: `Puzzle solved! (Rolled ${roll} vs DC ${puzzle.skillCheck.dc})`,
              reward: puzzle.reward,
              cleared: true
            };
          }
          return {
            success: false,
            message: `Failed to solve puzzle (Rolled ${roll} vs DC ${puzzle.skillCheck.dc}). Try again.`
          };
        } else if (puzzle.solution) {
          // Sequence puzzle
          const answer = params.answer || params.solution;
          if (!answer) {
            return { success: false, error: 'Provide answer parameter' };
          }
          
          const answerArray = Array.isArray(answer) ? answer : answer.split(',').map(s => s.trim().toLowerCase());
          if (JSON.stringify(answerArray) === JSON.stringify(puzzle.solution)) {
            roomInfo.state.solved = true;
            roomInfo.cleared = true;
            this._updateRoomState(instance, roomInfo);
            this._markRoomCleared(capstoneId, roomInfo.id);
            return {
              success: true,
              message: 'Puzzle solved!',
              reward: puzzle.reward,
              cleared: true
            };
          }
          return { success: false, message: 'Incorrect solution. The mechanism resets.' };
        }
        break;
        
      case 'skip':
        // Can skip puzzle but no reward
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        return {
          success: true,
          message: 'Skipped puzzle. No reward obtained.',
          cleared: true
        };
        
      default:
        return { success: false, error: 'Unknown action. Available: examine, solve, skip' };
    }
  }
  
  /**
   * Handle rest room
   */
  _handleRestRoom(capstoneId, instance, roomInfo, action, params) {
    switch (action) {
      case 'rest':
      case 'short_rest':
        if (roomInfo.state.rested) {
          return { success: false, error: 'Already rested in this room' };
        }
        
        roomInfo.state.rested = true;
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        
        // Heal party members
        const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
        const healed = [];
        
        for (const member of party) {
          // Restore some HP (short rest)
          healed.push({
            characterId: member.character_id,
            restored: 'Hit dice healing available'
          });
        }
        
        return {
          success: true,
          message: 'The party takes a short rest. Hit dice may be spent to heal.',
          healed,
          cleared: true
        };
        
      case 'proceed':
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        return { success: true, message: 'Moved on without resting.', cleared: true };
        
      default:
        return { success: false, error: 'Unknown action. Available: rest, proceed' };
    }
  }
  
  /**
   * Handle boss room
   */
  _handleBossRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.cleared) {
      return { success: true, message: 'The Dreadnought has been defeated!', cleared: true };
    }
    
    // Check for existing boss combat
    let combat = this.activeCombats.get(capstoneId);
    
    if (!combat && action !== 'flee') {
      // Initiate boss fight
      combat = this._initiateBossFight(capstoneId, instance);
      if (combat.success) {
        this.activeCombats.set(capstoneId, combat.combat);
        return {
          success: true,
          message: 'THE DREADNOUGHT AWAKENS!',
          boss: DREADNOUGHT,
          combat: combat.combat.getState('party')
        };
      }
      return combat;
    }
    
    if (combat) {
      return this._processBossCombatAction(capstoneId, combat, action, params);
    }
    
    return { success: false, error: 'Boss fight not active' };
  }
  
  // ============================================================================
  // COMBAT SYSTEM
  // ============================================================================
  
  /**
   * Initiate combat in a room
   */
  _initiateCombat(capstoneId, instance, encounter) {
    const party = this.db.prepare(`
      SELECT cp.*, c.name as char_name, c.hp_current, c.hp_max, c.ac, c.str, c.dex, c.class, c.level
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      WHERE cp.capstone_id = ? AND cp.status = 'alive'
    `).all(capstoneId);
    
    if (party.length === 0) {
      return { success: false, error: 'No living party members' };
    }
    
    // Create hex grid for combat
    const grid = generateRoom('combat', 10, capstoneId);
    const combat = new TacticalCombat(grid, { 
      id: `combat_${capstoneId}`, 
      maxDeaths: MAX_PARTY_DEATHS - instance.death_count,
      autoBattle: true  // Both sides use AI for spectator mode
    });
    
    // Add party members
    let partySpawnIndex = 0;
    for (const member of party) {
      const spawnPos = this._getPartySpawnPosition(partySpawnIndex++, grid);
      const strMod = Math.floor((member.str - 10) / 2);
      const dexMod = Math.floor((member.dex - 10) / 2);
      
      combat.addCombatant({
        id: member.character_id,
        name: member.char_name,
        char: '🦞',
        type: 'player',
        team: 'party',
        hp: member.hp_current || 30,
        maxHp: member.hp_max || 30,
        ac: member.ac || 14,
        speed: 6,
        attackBonus: strMod + member.level + 1,
        damage: '1d8+' + strMod,
        damageBonus: strMod,
        dexMod: dexMod,
        position: spawnPos
      });
    }
    
    // Add enemies (scaled by party size)
    const scaleFactor = this._getScaleFactor(party.length);
    let enemySpawnIndex = 0;
    
    for (const monsterId of encounter.monsters) {
      const monsterTemplate = require('./monsters').MONSTERS[monsterId];
      if (!monsterTemplate) continue;
      
      const spawnPos = this._getEnemySpawnPosition(enemySpawnIndex++, grid);
      const scaledHp = Math.floor(monsterTemplate.stats.hp * scaleFactor);
      
      combat.addCombatant({
        id: `${monsterId}_${enemySpawnIndex}`,
        name: monsterTemplate.name,
        char: monsterTemplate.aiBehavior === 'ranged' ? '🏹' : '💀',
        type: 'monster',
        team: 'enemy',
        hp: scaledHp,
        maxHp: scaledHp,
        ac: monsterTemplate.stats.ac,
        speed: Math.floor((monsterTemplate.stats.speed || 30) / 5),
        attackBonus: monsterTemplate.attacks[0]?.hit || 3,
        damage: monsterTemplate.attacks[0]?.damage || '1d6',
        damageType: monsterTemplate.attacks[0]?.damageType || 'slashing',
        dexMod: Math.floor((monsterTemplate.stats.dex - 10) / 2),
        // AI and weapon properties from monster template
        aiBehavior: monsterTemplate.aiBehavior || null,
        attackRange: monsterTemplate.attackRange || 1,
        preferRanged: monsterTemplate.preferRanged || false,
        preferredRange: monsterTemplate.preferredRange || null,
        position: spawnPos
      });
    }
    
    // Roll initiative and start
    combat.rollInitiative();
    combat.startCombat();
    
    return { success: true, combat };
  }
  
  /**
   * Initiate boss fight
   */
  _initiateBossFight(capstoneId, instance) {
    const party = this.db.prepare(`
      SELECT cp.*, c.name as char_name, c.hp_current, c.hp_max, c.ac, c.str, c.dex, c.class, c.level
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      WHERE cp.capstone_id = ? AND cp.status = 'alive'
    `).all(capstoneId);
    
    if (party.length === 0) {
      return { success: false, error: 'No living party members' };
    }
    
    // Create large boss arena
    const grid = generateRoom('boss', 15, capstoneId + '_boss');
    const combat = new TacticalCombat(grid, { 
      id: `boss_${capstoneId}`, 
      maxDeaths: MAX_PARTY_DEATHS - instance.death_count,
      autoBattle: true  // Both sides use AI for spectator mode
    });
    
    // Add party members
    let partySpawnIndex = 0;
    for (const member of party) {
      const spawnPos = this._getPartySpawnPosition(partySpawnIndex++, grid);
      const strMod = Math.floor((member.str - 10) / 2);
      const dexMod = Math.floor((member.dex - 10) / 2);
      
      combat.addCombatant({
        id: member.character_id,
        name: member.char_name,
        char: '🦞',
        type: 'player',
        team: 'party',
        hp: member.hp_current || 30,
        maxHp: member.hp_max || 30,
        ac: member.ac || 14,
        speed: 6,
        attackBonus: strMod + member.level + 1,
        damage: '1d8+' + strMod,
        damageBonus: strMod,
        dexMod: dexMod,
        position: spawnPos,
        visionRange: 12
      });
    }
    
    // Calculate boss HP scaling
    const extraChars = Math.max(0, party.length - 4);
    const bossHp = DREADNOUGHT.baseHp + (extraChars * DREADNOUGHT.hpPerExtraCharacter);
    
    // Add The Dreadnought
    const bossCombatant = combat.addCombatant({
      id: 'the_dreadnought',
      name: DREADNOUGHT.name,
      char: DREADNOUGHT.char,
      type: 'boss',
      team: 'enemy',
      hp: bossHp,
      maxHp: bossHp,
      ac: DREADNOUGHT.ac,
      speed: DREADNOUGHT.speed,
      attackBonus: DREADNOUGHT.attackBonus,
      damage: DREADNOUGHT.attacks[0].damage,
      damageBonus: 5,
      dexMod: 0,
      position: hex(0, 0), // Center of arena
      visionRange: 20,
      abilities: DREADNOUGHT.legendaryAbilities,
      attacksPerRound: DREADNOUGHT.attacksPerRound,
      legendaryActions: DREADNOUGHT.legendaryActions
    });
    
    // Setup boss phases
    combat.setBossPhases('the_dreadnought', DREADNOUGHT.phases.slice(1).map(p => ({
      ...p,
      onEnter: (combat, boss) => {
        // Phase-specific effects
        if (p.regeneration) {
          boss.regeneration = p.regeneration;
        }
        if (p.attacksPerRound) {
          boss.attacksPerRound = p.attacksPerRound;
        }
      }
    })));
    
    // Roll initiative and start
    combat.rollInitiative();
    combat.startCombat();
    
    return { success: true, combat };
  }
  
  /**
   * Process combat action
   */
  _processCombatAction(capstoneId, combat, action, params) {
    const current = combat.getCurrentCombatant();
    
    if (!current || current.team !== 'party') {
      return { 
        success: false, 
        error: 'Not your turn',
        currentTurn: current?.name,
        state: combat.getState('party')
      };
    }
    
    let result;
    switch (action) {
      case 'attack':
        result = combat.action(current.id, 'attack', params);
        break;
      case 'move':
        result = combat.action(current.id, 'move', params);
        break;
      case 'dodge':
        result = combat.action(current.id, 'dodge', params);
        break;
      case 'ability':
        result = combat.action(current.id, 'ability', params);
        break;
      case 'end_turn':
        result = combat.action(current.id, 'end_turn', params);
        break;
      default:
        return { success: false, error: 'Unknown action. Available: attack, move, dodge, ability, end_turn' };
    }
    
    // Check for combat end
    if (combat.status === 'victory') {
      return this._handleCombatVictory(capstoneId, combat, false);
    } else if (combat.status === 'defeat') {
      return this._handleCombatDefeat(capstoneId, combat);
    }
    
    return { 
      success: result.success, 
      ...result,
      state: combat.getState('party')
    };
  }
  
  /**
   * Process boss combat action (similar but with legendary action handling)
   */
  _processBossCombatAction(capstoneId, combat, action, params) {
    // Same as regular combat for player actions
    return this._processCombatAction(capstoneId, combat, action, params);
  }
  
  /**
   * Handle combat victory
   */
  _handleCombatVictory(capstoneId, combat, isBoss) {
    this.activeCombats.delete(capstoneId);
    
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    roomInfo.cleared = true;
    this._updateRoomState(instance, roomInfo);
    this._markRoomCleared(capstoneId, roomInfo.id);
    
    // Update death count if any party members died
    const newDeathCount = instance.death_count + combat.partyDeaths;
    this.db.prepare('UPDATE capstone_instances SET death_count = ? WHERE id = ?')
      .run(newDeathCount, capstoneId);
    
    if (isBoss) {
      return this._handleBossVictory(capstoneId);
    }
    
    // Roll loot
    const loot = { items: [], pearls: Math.floor(Math.random() * 20) + 10 };
    
    return {
      success: true,
      message: 'Victory! The room is cleared.',
      victory: true,
      cleared: true,
      loot,
      deathCount: newDeathCount,
      deathsRemaining: MAX_PARTY_DEATHS - newDeathCount
    };
  }
  
  /**
   * Handle boss victory - grant rewards
   */
  _handleBossVictory(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
    
    // Mark capstone completed
    this.db.prepare(`
      UPDATE capstone_instances 
      SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(capstoneId);
    
    // Grant rewards to each party member
    const rewards = [];
    for (const member of party) {
      // Grant achievement
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO character_achievements (id, character_id, achievement_id, achieved_at)
          VALUES (?, ?, 'dreadnought_slayer', datetime('now'))
        `).run(uuidv4(), member.character_id);
      } catch (e) {
        // Table might not exist yet, that's okay
      }
      
      // Roll legendary loot
      const lootRoll = Math.floor(Math.random() * DREADNOUGHT.legendaryLoot.length);
      const legendaryItem = DREADNOUGHT.legendaryLoot[lootRoll];
      
      rewards.push({
        characterId: member.character_id,
        xp: DREADNOUGHT.xpReward,
        pearls: DREADNOUGHT.pearlReward,
        achievement: DREADNOUGHT.achievement,
        title: DREADNOUGHT.title,
        legendaryItem
      });
    }
    
    this.activeCombats.delete(capstoneId);
    
    return {
      success: true,
      message: '🎉 THE DREADNOUGHT HAS BEEN DEFEATED! 🎉',
      victory: true,
      bossDefeated: true,
      rewards,
      achievement: DREADNOUGHT.achievement,
      title: DREADNOUGHT.title,
      levelCapUnlocked: true
    };
  }
  
  /**
   * Handle combat defeat
   */
  _handleCombatDefeat(capstoneId, combat) {
    this.activeCombats.delete(capstoneId);
    
    // Mark capstone as failed
    this.db.prepare(`
      UPDATE capstone_instances SET status = 'failed', completed_at = datetime('now')
      WHERE id = ?
    `).run(capstoneId);
    
    return {
      success: false,
      message: 'The party has been defeated. The Dreadnought\'s Depths claims more souls...',
      defeat: true,
      failed: true,
      deathCount: MAX_PARTY_DEATHS
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get encounter scaling factor by party size
   */
  _getScaleFactor(partySize) {
    const scaling = {
      1: 0.4,
      2: 0.6,
      3: 0.8,
      4: 1.0,
      5: 1.2,
      6: 1.4
    };
    return scaling[partySize] || 1.0;
  }
  
  /**
   * Get spawn position for party member
   */
  _getPartySpawnPosition(index, grid) {
    const positions = [
      hex(-3, 5), hex(-1, 5), hex(1, 5), hex(3, 5), hex(-2, 6), hex(2, 6)
    ];
    return positions[index % positions.length];
  }
  
  /**
   * Get spawn position for enemy
   */
  _getEnemySpawnPosition(index, grid) {
    const positions = [
      hex(0, -3), hex(-2, -2), hex(2, -2), hex(-1, -4), hex(1, -4), hex(0, -5)
    ];
    return positions[index % positions.length];
  }
  
  /**
   * Update room state in database
   */
  _updateRoomState(instance, roomInfo) {
    const layout = JSON.parse(instance.room_states || '{}');
    const floorData = layout.floors.find(f => f.floor === roomInfo.floor);
    if (floorData) {
      const roomIndex = floorData.rooms.findIndex(r => r.id === roomInfo.id);
      if (roomIndex >= 0) {
        floorData.rooms[roomIndex] = roomInfo;
      }
    }
    this.db.prepare('UPDATE capstone_instances SET room_states = ? WHERE id = ?')
      .run(JSON.stringify(layout), instance.id);
  }
  
  /**
   * Mark room as cleared
   */
  _markRoomCleared(capstoneId, roomId) {
    const instance = this.db.prepare('SELECT rooms_cleared FROM capstone_instances WHERE id = ?').get(capstoneId);
    const cleared = JSON.parse(instance.rooms_cleared || '[]');
    if (!cleared.includes(roomId)) {
      cleared.push(roomId);
      this.db.prepare('UPDATE capstone_instances SET rooms_cleared = ? WHERE id = ?')
        .run(JSON.stringify(cleared), capstoneId);
    }
  }
  
  /**
   * Start a demo combat for testing/spectating (no database required)
   */
  startDemoCombat() {
    const combatId = 'demo_' + Date.now().toString(36);
    
    // Create boss arena with terrain
    const grid = generateRoom('boss', 12, combatId);
    const combat = new TacticalCombat(grid, { 
      id: combatId, 
      maxDeaths: 3,
      autoBattle: true
    });
    
    // Add demo party (3 lobster heroes)
    combat.addCombatant({
      id: 'hero_faithful',
      name: 'Faithful',
      char: '🦞',
      type: 'player',
      team: 'party',
      hp: 45, maxHp: 45,
      ac: 16,
      speed: 6,
      weapon: 'longsword',
      attackBonus: 5,
      damage: '1d8+3',
      dexMod: 2,
      position: hex(-4, 4)
    });
    
    combat.addCombatant({
      id: 'hero_coral',
      name: 'Coral the Archer',
      char: '🦐',
      type: 'player',
      team: 'party',
      hp: 32, maxHp: 32,
      ac: 14,
      speed: 6,
      weapon: 'longbow',
      attackBonus: 6,
      damage: '1d8+4',
      dexMod: 4,
      position: hex(-5, 5)
    });
    
    combat.addCombatant({
      id: 'hero_shell',
      name: 'Shell the Spearman',
      char: '🦀',
      type: 'player',
      team: 'party',
      hp: 40, maxHp: 40,
      ac: 15,
      speed: 6,
      weapon: 'spear',
      attackBonus: 4,
      damage: '1d6+2',
      dexMod: 1,
      position: hex(-3, 3)
    });
    
    // Add enemies
    combat.addCombatant({
      id: 'enemy_spawn1',
      name: 'Dreadnought Spawn',
      char: '💀',
      type: 'monster',
      team: 'enemy',
      hp: 35, maxHp: 35,
      ac: 14,
      speed: 6,
      attackBonus: 4,
      damage: '1d10+2',
      dexMod: 1,
      position: hex(3, -3)
    });
    
    combat.addCombatant({
      id: 'enemy_archer',
      name: 'Sahuagin Crossbowman',
      char: '🏹',
      type: 'monster',
      team: 'enemy',
      hp: 22, maxHp: 22,
      ac: 12,
      speed: 6,
      weapon: 'light_crossbow',
      attackBonus: 4,
      damage: '1d8+2',
      dexMod: 2,
      aiBehavior: 'ranged',
      preferRanged: true,
      position: hex(4, -4)
    });
    
    combat.addCombatant({
      id: 'enemy_eel',
      name: 'Voltaic Eel',
      char: '⚡',
      type: 'monster',
      team: 'enemy',
      hp: 28, maxHp: 28,
      ac: 13,
      speed: 8,
      attackBonus: 5,
      damage: '2d6+2',
      damageType: 'lightning',
      dexMod: 3,
      position: hex(2, -2)
    });
    
    // Store combat for spectating
    this.activeCombats.set(combatId, combat);
    
    // Start combat
    combat.rollInitiative();
    combat.startCombat();
    
    return {
      success: true,
      combatId,
      message: 'Demo combat started! Watch at /theater.html?combat=' + combatId
    };
  }
  
  /**
   * Get active capstones (for spectating)
   */
  getActiveCapstones() {
    return this.db.prepare(`
      SELECT ci.*, u.name as leader_name,
             (SELECT COUNT(*) FROM capstone_party WHERE capstone_id = ci.id) as party_size
      FROM capstone_instances ci
      JOIN users u ON ci.leader_id = u.id
      WHERE ci.status = 'active'
      ORDER BY ci.started_at DESC
    `).all();
  }
  
  /**
   * Get a combat by ID (for spectating)
   */
  getCombat(combatId) {
    return this.activeCombats.get(combatId);
  }
  
  /**
   * Get combat state for spectators
   */
  getCombatState(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (!combat) {
      return { success: false, error: 'Combat not found' };
    }
    
    return {
      success: true,
      combat: combat.getState(),
      ascii: combat.renderASCII()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CapstoneManager,
  DREADNOUGHT,
  DREADNOUGHT_SPAWN,
  LEVEL_CAP,
  MAX_PARTY_SIZE,
  MAX_PARTY_DEATHS,
  ROOM_TYPES,
  TRAPS,
  PUZZLES,
  TREASURE_POOLS,
  initCapstoneSchema
};
