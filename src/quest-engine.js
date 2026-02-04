/**
 * Caverns & Clawds - Quest Engine v1
 * 
 * Template-based quest system with dynamic generation.
 * Based on QUEST-ENGINE-SPEC.md
 * 
 * Quest Types: kill, fetch, explore
 * Features: Quest board, daily refresh, progress tracking, rewards
 */

const crypto = require('crypto');

// ============================================================================
// QUEST TEMPLATES
// ============================================================================

const QUEST_TEMPLATES = {
  // === KILL QUESTS ===
  kelp_cleanup: {
    template_id: 'kelp_cleanup',
    type: 'kill',
    title_pattern: '{creature_name} Cleanup',
    description_pattern: 'The {zone_name} is overrun with {creature_name}. Clear out {count} of them to make the waters safe again.',
    flavor_text_pattern: '"Those {creature_name} are getting bold. Thin their numbers for me, will ya?"',
    completion_text_pattern: '"Good work! The waters are safer thanks to you."',
    variables: {
      creature: ['giant_crab', 'kelp_lurker', 'hostile_fish_swarm'],
      zone: ['kelp_forest'],
      count_range: [3, 8]
    },
    objectives: [
      { type: 'kill', target: '{creature}', target_name_pattern: '{creature_name}', count: -1 }
    ],
    prerequisites: { min_level: 1 },
    rewards: {
      xp_base: 50,
      xp_per_level: 10,
      usdc_base: 2.5,
      usdc_per_level: 0.5
    },
    repeatable: true,
    cooldown_hours: 20,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'easy',
    tags: ['combat', 'daily']
  },

  pest_control: {
    template_id: 'pest_control',
    type: 'kill',
    title_pattern: 'Pest Control',
    description_pattern: 'Various pests are causing trouble in {zone_name}. Eliminate {count} creatures of any kind.',
    flavor_text_pattern: '"I don\'t care what you kill, just kill {count} of them critters."',
    completion_text_pattern: '"Now that\'s what I call pest control!"',
    variables: {
      zone: ['kelp_forest', 'shipwreck_graveyard'],
      count_range: [5, 12]
    },
    objectives: [
      { type: 'kill_any', zone: '{zone}', target_name_pattern: 'any creature in {zone_name}', count: -1 }
    ],
    prerequisites: { min_level: 1 },
    rewards: {
      xp_base: 75,
      xp_per_level: 15,
      usdc_base: 4.0,
      usdc_per_level: 0.8
    },
    repeatable: true,
    cooldown_hours: 24,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'easy',
    tags: ['combat', 'daily']
  },

  shark_bounty: {
    template_id: 'shark_bounty',
    type: 'kill',
    title_pattern: 'Shark Bounty',
    description_pattern: 'Reef sharks have been spotted near the trade routes. Hunt down {count} of them.',
    flavor_text_pattern: '"Sharks mean bad business. Every one you take down saves lives."',
    completion_text_pattern: '"Fine hunting! The routes are safer now."',
    variables: {
      count_range: [2, 4]
    },
    objectives: [
      { type: 'kill', target: 'reef_shark', target_name_pattern: 'Reef Shark', count: -1 }
    ],
    prerequisites: { min_level: 2 },
    rewards: {
      xp_base: 100,
      xp_per_level: 20,
      usdc_base: 6.0,
      usdc_per_level: 1.2
    },
    repeatable: true,
    cooldown_hours: 48,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'normal',
    tags: ['combat', 'weekly']
  },

  undead_purge: {
    template_id: 'undead_purge',
    type: 'kill',
    title_pattern: 'Undead Purge',
    description_pattern: 'The drowned dead are rising in greater numbers. Put {count} of them back to rest.',
    flavor_text_pattern: '"Every storm washes more corpses into the graveyard. We need to thin their numbers."',
    completion_text_pattern: '"The dead rest easier thanks to you."',
    variables: {
      creature: ['drowned_sailor', 'barnacle_horror'],
      count_range: [5, 10]
    },
    objectives: [
      { type: 'kill', target: '{creature}', target_name_pattern: '{creature_name}', count: -1 }
    ],
    prerequisites: { min_level: 3 },
    rewards: {
      xp_base: 150,
      xp_per_level: 25,
      usdc_base: 8.0,
      usdc_per_level: 1.5,
      items: [{ item_id: 'potion_healing', quantity: 1, chance: 0.5 }]
    },
    repeatable: true,
    cooldown_hours: 24,
    zone: 'shipwreck_graveyard',
    giver_npc: 'captain_marlow',
    giver_location: 'wreckers_rest',
    difficulty: 'normal',
    tags: ['combat', 'daily']
  },

  // === EXPLORE QUESTS ===
  cartographer_kelp: {
    template_id: 'cartographer_kelp',
    type: 'explore',
    title_pattern: 'Cartographer: {zone_name}',
    description_pattern: 'The Cartographer\'s Guild needs updated maps of {zone_name}. Discover {count} new rooms.',
    flavor_text_pattern: '"Our charts are outdated. Explore the unknown and bring back what you find."',
    completion_text_pattern: '"Excellent! These discoveries will be added to the master charts."',
    variables: {
      zone: ['kelp_forest'],
      count_range: [8, 15]
    },
    objectives: [
      { type: 'explore', zone: '{zone}', target_name_pattern: 'Discover rooms in {zone_name}', count: -1 }
    ],
    prerequisites: { min_level: 1 },
    rewards: {
      xp_base: 100,
      xp_per_level: 15,
      usdc_base: 5.0,
      usdc_per_level: 1.0
    },
    repeatable: true,
    cooldown_hours: 48,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'easy',
    tags: ['exploration', 'weekly']
  },

  deep_explorer: {
    template_id: 'deep_explorer',
    type: 'explore',
    title_pattern: 'Deep Explorer',
    description_pattern: 'Venture into the unknown depths. Discover {count} rooms in any adventure zone.',
    flavor_text_pattern: '"The deep holds many secrets. Go find them."',
    completion_text_pattern: '"A true explorer! Your discoveries will help many."',
    variables: {
      count_range: [15, 25]
    },
    objectives: [
      { type: 'explore_any', target_name_pattern: 'Discover rooms in any zone', count: -1 }
    ],
    prerequisites: { min_level: 2 },
    rewards: {
      xp_base: 200,
      xp_per_level: 25,
      usdc_base: 100,
      usdc_per_level: 20
    },
    repeatable: true,
    cooldown_hours: 72,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'normal',
    tags: ['exploration', 'weekly']
  },

  graveyard_surveyor: {
    template_id: 'graveyard_surveyor',
    type: 'explore',
    title_pattern: 'Graveyard Survey',
    description_pattern: 'Chart the dangerous shipwreck graveyard. Discover {count} rooms while surviving.',
    flavor_text_pattern: '"We need maps of the graveyard. Dangerous work, but well-paid."',
    completion_text_pattern: '"You made it back! That\'s more than most can say."',
    variables: {
      count_range: [10, 18]
    },
    objectives: [
      { type: 'explore', zone: 'shipwreck_graveyard', target_name_pattern: 'Discover rooms in the Graveyard', count: -1 }
    ],
    prerequisites: { min_level: 3 },
    rewards: {
      xp_base: 175,
      xp_per_level: 30,
      usdc_base: 90,
      usdc_per_level: 18
    },
    repeatable: true,
    cooldown_hours: 48,
    zone: 'shipwreck_graveyard',
    giver_npc: 'captain_marlow',
    giver_location: 'wreckers_rest',
    difficulty: 'hard',
    tags: ['exploration', 'weekly']
  },

  // === FETCH QUESTS ===
  lost_supplies: {
    template_id: 'lost_supplies',
    type: 'fetch',
    title_pattern: 'Lost Supplies',
    description_pattern: 'A supply crate was lost in the {zone_name}. Retrieve it and bring it back.',
    flavor_text_pattern: '"We lost some supplies out there. Find the crate and bring it back - there\'s USDC in it for you."',
    completion_text_pattern: '"You found it! These supplies will help many."',
    variables: {
      zone: ['kelp_forest'],
      item: ['waterlogged_crate']
    },
    objectives: [
      { type: 'collect', target: '{item}', target_name_pattern: 'Waterlogged Crate', count: 1 },
      { type: 'deliver', target: 'barnacle_bill', target_name_pattern: 'Return to Barnacle Bill', count: 1 }
    ],
    prerequisites: { min_level: 1 },
    rewards: {
      xp_base: 75,
      xp_per_level: 12,
      usdc_base: 45,
      usdc_per_level: 0.8
    },
    time_limit_minutes: 60,
    repeatable: true,
    cooldown_hours: 12,
    zone: 'kelp_forest',
    giver_npc: 'barnacle_bill',
    giver_location: 'briny_flagon',
    difficulty: 'easy',
    tags: ['fetch', 'daily']
  },

  salvage_run: {
    template_id: 'salvage_run',
    type: 'fetch',
    title_pattern: 'Salvage Run: {item_name}',
    description_pattern: 'Salvage {item_name} from the shipwreck graveyard. Be careful - the wrecks are haunted.',
    flavor_text_pattern: '"I\'ve got buyers waiting for these parts. Get me that {item_name} and there\'s USDC in it for you."',
    completion_text_pattern: '"Perfect condition! You\'ve got a good eye for salvage."',
    variables: {
      item: ['ship_wheel', 'brass_compass', 'captain_log'],
      zone: ['shipwreck_graveyard']
    },
    objectives: [
      { type: 'collect', target: '{item}', target_name_pattern: '{item_name}', count: 1 },
      { type: 'deliver', target: 'captain_marlow', target_name_pattern: 'Return to Captain Marlow', count: 1 }
    ],
    prerequisites: { min_level: 3 },
    rewards: {
      xp_base: 125,
      xp_per_level: 20,
      usdc_base: 75,
      usdc_per_level: 1.5,
      random_items: {
        pool: ['potion_healing', 'antitoxin', 'rations'],
        count: 1
      }
    },
    time_limit_minutes: 90,
    repeatable: true,
    cooldown_hours: 24,
    zone: 'shipwreck_graveyard',
    giver_npc: 'captain_marlow',
    giver_location: 'wreckers_rest',
    difficulty: 'normal',
    tags: ['fetch', 'daily']
  },

  ancient_relic: {
    template_id: 'ancient_relic',
    type: 'fetch',
    title_pattern: 'Ancient Relic Recovery',
    description_pattern: 'An ancient relic lies buried in the depths. Find it and bring it to the temple.',
    flavor_text_pattern: '"The spirits speak of a relic lost to time. Find it, and the temple will reward you."',
    completion_text_pattern: '"The Ocean Mother smiles upon you. This relic will serve the faithful well."',
    variables: {
      item: ['ancient_relic']
    },
    objectives: [
      { type: 'collect', target: 'ancient_relic', target_name_pattern: 'Ancient Relic', count: 1 },
      { type: 'deliver', target: 'priestess_marina', target_name_pattern: 'Return to Priestess Marina', count: 1 }
    ],
    prerequisites: { min_level: 4 },
    rewards: {
      xp_base: 200,
      xp_per_level: 30,
      usdc_base: 120,
      usdc_per_level: 25,
      items: [{ item_id: 'potion_greater_healing', quantity: 1 }]
    },
    repeatable: false,
    zone: 'shipwreck_graveyard',
    giver_npc: 'priestess_marina',
    giver_location: 'tide_temple',
    difficulty: 'hard',
    tags: ['fetch', 'story']
  }
};

// Creature display names for variable interpolation
const CREATURE_NAMES = {
  giant_crab: 'Giant Crabs',
  kelp_lurker: 'Kelp Lurkers',
  hostile_fish_swarm: 'Razorfin Swarms',
  reef_shark: 'Reef Sharks',
  drowned_sailor: 'Drowned Sailors',
  barnacle_horror: 'Barnacle Horrors',
  sea_wraith: 'Sea Wraiths',
  moray_terror: 'Moray Terrors',
  treasure_mimic: 'Treasure Mimics',
  anchor_wight: 'Anchor Wights'
};

// Zone display names
const ZONE_NAMES = {
  kelp_forest: 'Kelp Forest',
  shipwreck_graveyard: 'Shipwreck Graveyard',
  wreckers_rest: "Wrecker's Rest",
  briny_flagon: 'The Briny Flagon'
};

// Item display names
const ITEM_NAMES = {
  waterlogged_crate: 'Waterlogged Crate',
  ship_wheel: 'Ship Wheel',
  brass_compass: 'Brass Compass',
  captain_log: "Captain's Log",
  ancient_relic: 'Ancient Relic'
};

// ============================================================================
// QUEST ENGINE CLASS
// ============================================================================

class QuestEngine {
  constructor(db) {
    this.db = db;
    this.initDB();
  }

  initDB() {
    // Drop and recreate quest engine tables if they have foreign key issues
    // These are NEW tables for the v2 quest engine
    try {
      // Check if quest_board has foreign key constraint (old version)
      const tableInfo = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quest_board'").get();
      if (tableInfo && tableInfo.sql && tableInfo.sql.includes('FOREIGN KEY')) {
        console.log('📜 Upgrading quest_board table (removing FK constraint)...');
        this.db.exec('DROP TABLE IF EXISTS quest_board');
      }
    } catch (e) {
      // Table doesn't exist yet, that's fine
    }
    
    try {
      const tableInfo = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='active_quests'").get();
      if (tableInfo && tableInfo.sql && tableInfo.sql.includes('REFERENCES quest_templates')) {
        console.log('📜 Upgrading active_quests table (removing FK constraint)...');
        this.db.exec('DROP TABLE IF EXISTS quest_objectives');
        this.db.exec('DROP TABLE IF EXISTS active_quests');
      }
    } catch (e) {
      // Table doesn't exist yet, that's fine
    }
    
    try {
      // Check if quest_completions is missing template_id column (from old system)
      const tableInfo = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='quest_completions'").get();
      if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('template_id')) {
        console.log('📜 Upgrading quest_completions table (adding new columns)...');
        this.db.exec('DROP TABLE IF EXISTS quest_completions');
      }
    } catch (e) {
      // Table doesn't exist yet, that's fine
    }
    
    try {
      // Check if room_discoveries is missing zone column
      const tableInfo = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='room_discoveries'").get();
      if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('zone TEXT')) {
        console.log('📜 Upgrading room_discoveries table (adding zone column)...');
        this.db.exec('DROP TABLE IF EXISTS room_discoveries');
      }
    } catch (e) {
      // Table doesn't exist yet, that's fine
    }
    
    // Note: Quest templates are stored in code (QUEST_TEMPLATES constant), not in DB
    // This allows for easy updates without DB migrations

    // Quest board instances - instantiated quests available on boards
    // Note: template_id references templates in code, not a DB table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quest_board (
        instance_id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        flavor_text TEXT,
        variables TEXT NOT NULL DEFAULT '{}',
        objectives TEXT NOT NULL DEFAULT '[]',
        rewards TEXT NOT NULL DEFAULT '{}',
        slot_type TEXT NOT NULL CHECK(slot_type IN ('daily', 'weekly', 'permanent', 'special')),
        slot_index INTEGER NOT NULL,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);

    // Active quests - quests players have accepted
    // Note: template_id references templates in code, not a DB table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS active_quests (
        quest_id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        instance_id TEXT,
        status TEXT NOT NULL DEFAULT 'accepted' 
          CHECK(status IN ('accepted', 'in_progress', 'completed', 'turned_in', 'failed', 'abandoned')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        variables TEXT NOT NULL DEFAULT '{}',
        objectives TEXT NOT NULL DEFAULT '[]',
        rewards TEXT NOT NULL DEFAULT '{}',
        accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME,
        turned_in_at DATETIME,
        failed_at DATETIME,
        expires_at DATETIME,
        quest_flags TEXT DEFAULT '{}',
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);

    // Quest progress tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quest_objectives (
        id TEXT PRIMARY KEY,
        quest_id TEXT NOT NULL,
        objective_index INTEGER NOT NULL,
        type TEXT NOT NULL,
        target TEXT,
        zone TEXT,
        current INTEGER DEFAULT 0,
        required INTEGER NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME,
        contributions TEXT DEFAULT '[]',
        FOREIGN KEY (quest_id) REFERENCES active_quests(quest_id) ON DELETE CASCADE,
        UNIQUE(quest_id, objective_index)
      )
    `);

    // Quest history - for cooldowns and stats
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quest_completions (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        quest_id TEXT,
        outcome TEXT NOT NULL CHECK(outcome IN ('completed', 'failed', 'abandoned')),
        title TEXT NOT NULL,
        rewards_granted TEXT DEFAULT '{}',
        accepted_at DATETIME,
        completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration_seconds INTEGER,
        objectives_completed INTEGER,
        objectives_total INTEGER,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);

    // Room discovery tracking for explore quests
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS room_discoveries (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        room_id TEXT NOT NULL,
        zone TEXT NOT NULL,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, room_id)
      )
    `);

    // Indexes - created separately to handle errors gracefully
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_quest_board_board ON quest_board(board_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_board_expires ON quest_board(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_active_quests_character ON active_quests(character_id)',
      'CREATE INDEX IF NOT EXISTS idx_active_quests_status ON active_quests(status)',
      'CREATE INDEX IF NOT EXISTS idx_quest_objectives_quest ON quest_objectives(quest_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_completions_char ON quest_completions(character_id)',
      'CREATE INDEX IF NOT EXISTS idx_quest_completions_tpl ON quest_completions(template_id)',
      'CREATE INDEX IF NOT EXISTS idx_room_discoveries_char ON room_discoveries(character_id)'
    ];
    
    for (const idx of indexes) {
      try {
        this.db.exec(idx);
      } catch (e) {
        // Ignore index errors for existing tables
        console.log(`Index skipped: ${e.message}`);
      }
    }

    console.log('📜 Quest Engine v1 initialized');
  }

  // ============================================================================
  // VARIABLE INTERPOLATION
  // ============================================================================

  interpolate(pattern, vars) {
    if (!pattern) return '';
    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      return vars[key] !== undefined ? vars[key] : match;
    });
  }

  getCreatureName(creatureId) {
    return CREATURE_NAMES[creatureId] || creatureId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getZoneName(zoneId) {
    return ZONE_NAMES[zoneId] || zoneId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  getItemName(itemId) {
    return ITEM_NAMES[itemId] || itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // ============================================================================
  // QUEST INSTANTIATION
  // ============================================================================

  instantiateTemplate(template, characterLevel = 1) {
    const vars = {};

    // Select random values for each variable
    if (template.variables.creature && template.variables.creature.length > 0) {
      vars.creature = template.variables.creature[Math.floor(Math.random() * template.variables.creature.length)];
      vars.creature_name = this.getCreatureName(vars.creature);
    }

    if (template.variables.zone && template.variables.zone.length > 0) {
      vars.zone = template.variables.zone[Math.floor(Math.random() * template.variables.zone.length)];
      vars.zone_name = this.getZoneName(vars.zone);
    } else {
      vars.zone = template.zone;
      vars.zone_name = this.getZoneName(template.zone);
    }

    if (template.variables.item && template.variables.item.length > 0) {
      vars.item = template.variables.item[Math.floor(Math.random() * template.variables.item.length)];
      vars.item_name = this.getItemName(vars.item);
    }

    if (template.variables.count_range) {
      const [min, max] = template.variables.count_range;
      vars.count = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Interpolate patterns
    const title = this.interpolate(template.title_pattern, vars);
    const description = this.interpolate(template.description_pattern, vars);
    const flavor_text = this.interpolate(template.flavor_text_pattern, vars);
    const completion_text = this.interpolate(template.completion_text_pattern, vars);

    // Build objectives with resolved values
    const objectives = template.objectives.map(obj => {
      const resolved = { ...obj };
      if (obj.target) {
        resolved.target = this.interpolate(obj.target, vars);
      }
      if (obj.target_name_pattern) {
        resolved.target_name = this.interpolate(obj.target_name_pattern, vars);
      }
      if (obj.zone) {
        resolved.zone = this.interpolate(obj.zone, vars);
      }
      // -1 means use the count variable
      if (obj.count === -1) {
        resolved.count = vars.count || 1;
      }
      return resolved;
    });

    // Calculate scaled rewards
    const levelDelta = Math.max(0, characterLevel - (template.prerequisites?.min_level || 1));
    const rewards = {
      xp: (template.rewards.xp_base || 0) + levelDelta * (template.rewards.xp_per_level || 0),
      usdc: (template.rewards.usdc_base || 0) + levelDelta * (template.rewards.usdc_per_level || 0),
      items: template.rewards.items || [],
      random_items: template.rewards.random_items || null
    };

    return {
      template_id: template.template_id,
      type: template.type,
      title,
      description,
      flavor_text,
      completion_text,
      variables: vars,
      objectives,
      rewards,
      prerequisites: template.prerequisites,
      time_limit_minutes: template.time_limit_minutes,
      cooldown_hours: template.cooldown_hours,
      repeatable: template.repeatable,
      zone: template.zone,
      giver_npc: template.giver_npc,
      giver_location: template.giver_location,
      difficulty: template.difficulty,
      tags: template.tags
    };
  }

  // ============================================================================
  // QUEST BOARD
  // ============================================================================

  /**
   * Get or generate the quest board for a location
   */
  getQuestBoard(location, characterLevel = 1) {
    const boardId = `board_${location}`;
    const now = new Date();
    
    // Check if we need to refresh the board
    const existingQuests = this.db.prepare(`
      SELECT * FROM quest_board 
      WHERE board_id = ? AND (expires_at IS NULL OR expires_at > ?)
      ORDER BY slot_type, slot_index
    `).all(boardId, now.toISOString());

    // If we have quests and they're not expired, return them
    if (existingQuests.length > 0) {
      return existingQuests.map(q => ({
        ...q,
        variables: JSON.parse(q.variables),
        objectives: JSON.parse(q.objectives),
        rewards: JSON.parse(q.rewards)
      }));
    }

    // Generate new board
    return this.generateQuestBoard(location, characterLevel);
  }

  /**
   * Generate fresh quests for the board
   */
  generateQuestBoard(location, characterLevel = 1) {
    const boardId = `board_${location}`;
    const now = new Date();

    // Clear expired quests
    this.db.prepare('DELETE FROM quest_board WHERE board_id = ? AND expires_at < ?')
      .run(boardId, now.toISOString());

    // Get templates available at this location
    const availableTemplates = Object.values(QUEST_TEMPLATES).filter(t => 
      t.giver_location === location &&
      (t.prerequisites?.min_level || 1) <= characterLevel + 2 // Show quests slightly above level too
    );

    if (availableTemplates.length === 0) {
      return [];
    }

    const quests = [];
    const usedTemplates = new Set();

    // Generate daily quests (3-5)
    const dailyTemplates = availableTemplates.filter(t => t.tags?.includes('daily'));
    const dailyCount = Math.min(dailyTemplates.length, Math.floor(Math.random() * 3) + 3);
    
    for (let i = 0; i < dailyCount; i++) {
      const available = dailyTemplates.filter(t => !usedTemplates.has(t.template_id));
      if (available.length === 0) break;
      
      const template = available[Math.floor(Math.random() * available.length)];
      usedTemplates.add(template.template_id);
      
      const instance = this.instantiateTemplate(template, characterLevel);
      const instanceId = crypto.randomUUID();
      
      // Calculate expiry (midnight tomorrow)
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      this.db.prepare(`
        INSERT INTO quest_board (instance_id, board_id, template_id, title, description, flavor_text, 
          variables, objectives, rewards, slot_type, slot_index, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'daily', ?, ?)
      `).run(
        instanceId, boardId, template.template_id, instance.title, instance.description,
        instance.flavor_text, JSON.stringify(instance.variables), JSON.stringify(instance.objectives),
        JSON.stringify(instance.rewards), i, tomorrow.toISOString()
      );

      quests.push({
        instance_id: instanceId,
        board_id: boardId,
        template_id: template.template_id,
        ...instance,
        slot_type: 'daily',
        slot_index: i,
        expires_at: tomorrow.toISOString()
      });
    }

    // Generate weekly quests (1-2)
    const weeklyTemplates = availableTemplates.filter(t => t.tags?.includes('weekly'));
    const weeklyCount = Math.min(weeklyTemplates.length, Math.floor(Math.random() * 2) + 1);

    for (let i = 0; i < weeklyCount; i++) {
      const available = weeklyTemplates.filter(t => !usedTemplates.has(t.template_id));
      if (available.length === 0) break;

      const template = available[Math.floor(Math.random() * available.length)];
      usedTemplates.add(template.template_id);

      const instance = this.instantiateTemplate(template, characterLevel);
      const instanceId = crypto.randomUUID();

      // Calculate expiry (next Sunday)
      const nextSunday = new Date(now);
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
      nextSunday.setHours(0, 0, 0, 0);

      this.db.prepare(`
        INSERT INTO quest_board (instance_id, board_id, template_id, title, description, flavor_text,
          variables, objectives, rewards, slot_type, slot_index, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'weekly', ?, ?)
      `).run(
        instanceId, boardId, template.template_id, instance.title, instance.description,
        instance.flavor_text, JSON.stringify(instance.variables), JSON.stringify(instance.objectives),
        JSON.stringify(instance.rewards), i, nextSunday.toISOString()
      );

      quests.push({
        instance_id: instanceId,
        board_id: boardId,
        template_id: template.template_id,
        ...instance,
        slot_type: 'weekly',
        slot_index: i,
        expires_at: nextSunday.toISOString()
      });
    }

    // Add permanent/story quests (non-repeatable)
    const storyTemplates = availableTemplates.filter(t => 
      t.tags?.includes('story') && !t.repeatable
    );

    for (let i = 0; i < storyTemplates.length; i++) {
      const template = storyTemplates[i];
      const instance = this.instantiateTemplate(template, characterLevel);
      const instanceId = crypto.randomUUID();

      this.db.prepare(`
        INSERT INTO quest_board (instance_id, board_id, template_id, title, description, flavor_text,
          variables, objectives, rewards, slot_type, slot_index, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'permanent', ?, NULL)
      `).run(
        instanceId, boardId, template.template_id, instance.title, instance.description,
        instance.flavor_text, JSON.stringify(instance.variables), JSON.stringify(instance.objectives),
        JSON.stringify(instance.rewards), i
      );

      quests.push({
        instance_id: instanceId,
        board_id: boardId,
        template_id: template.template_id,
        ...instance,
        slot_type: 'permanent',
        slot_index: i,
        expires_at: null
      });
    }

    return quests;
  }

  // ============================================================================
  // QUEST ACCEPTANCE
  // ============================================================================

  /**
   * Accept a quest from the board
   */
  acceptQuest(characterId, instanceId) {
    // Get character
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) {
      return { success: false, error: 'Character not found' };
    }

    // Get the board instance
    const boardQuest = this.db.prepare('SELECT * FROM quest_board WHERE instance_id = ?').get(instanceId);
    if (!boardQuest) {
      return { success: false, error: 'Quest not found on board' };
    }

    // Check if quest is expired
    if (boardQuest.expires_at && new Date(boardQuest.expires_at) < new Date()) {
      return { success: false, error: 'Quest has expired' };
    }

    // Get template for prerequisite check
    const template = QUEST_TEMPLATES[boardQuest.template_id];
    if (!template) {
      return { success: false, error: 'Quest template not found' };
    }

    // Check level requirement
    if (template.prerequisites?.min_level && char.level < template.prerequisites.min_level) {
      return { success: false, error: `Requires level ${template.prerequisites.min_level}` };
    }

    // Check if already have this quest active
    const existingActive = this.db.prepare(`
      SELECT * FROM active_quests 
      WHERE character_id = ? AND template_id = ? AND status IN ('accepted', 'in_progress')
    `).get(characterId, boardQuest.template_id);

    if (existingActive) {
      return { success: false, error: 'Quest already active' };
    }

    // Check cooldown for repeatable quests
    if (template.cooldown_hours) {
      const lastCompletion = this.db.prepare(`
        SELECT * FROM quest_completions 
        WHERE character_id = ? AND template_id = ? 
        ORDER BY completed_at DESC LIMIT 1
      `).get(characterId, boardQuest.template_id);

      if (lastCompletion) {
        const cooldownEnd = new Date(lastCompletion.completed_at);
        cooldownEnd.setHours(cooldownEnd.getHours() + template.cooldown_hours);
        
        if (new Date() < cooldownEnd) {
          const hoursLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60));
          return { success: false, error: `Quest on cooldown. Available in ${hoursLeft} hours.` };
        }
      }
    }

    // Check if non-repeatable quest was already completed
    if (!template.repeatable) {
      const completed = this.db.prepare(`
        SELECT * FROM quest_completions 
        WHERE character_id = ? AND template_id = ? AND outcome = 'completed'
      `).get(characterId, boardQuest.template_id);

      if (completed) {
        return { success: false, error: 'Quest already completed (non-repeatable)' };
      }
    }

    // Check max active quests
    const activeCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM active_quests 
      WHERE character_id = ? AND status IN ('accepted', 'in_progress')
    `).get(characterId).count;

    if (activeCount >= 10) {
      return { success: false, error: 'Maximum active quests reached (10)' };
    }

    // Create active quest
    const questId = crypto.randomUUID();
    const objectives = JSON.parse(boardQuest.objectives);
    const now = new Date();

    // Calculate expiry if timed
    let expiresAt = null;
    if (template.time_limit_minutes) {
      expiresAt = new Date(now.getTime() + template.time_limit_minutes * 60 * 1000);
    }

    this.db.prepare(`
      INSERT INTO active_quests (quest_id, character_id, template_id, instance_id, status,
        title, description, variables, objectives, rewards, accepted_at, expires_at)
      VALUES (?, ?, ?, ?, 'accepted', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      questId, characterId, boardQuest.template_id, instanceId,
      boardQuest.title, boardQuest.description, boardQuest.variables,
      boardQuest.objectives, boardQuest.rewards, now.toISOString(),
      expiresAt ? expiresAt.toISOString() : null
    );

    // Create objective tracking entries
    objectives.forEach((obj, index) => {
      this.db.prepare(`
        INSERT INTO quest_objectives (id, quest_id, objective_index, type, target, zone, current, required)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        crypto.randomUUID(), questId, index, obj.type, obj.target || null, obj.zone || null, obj.count
      );
    });

    // Remove from board if it's a non-permanent slot
    if (boardQuest.slot_type !== 'permanent') {
      this.db.prepare('DELETE FROM quest_board WHERE instance_id = ?').run(instanceId);
    }

    return {
      success: true,
      message: `Quest accepted: ${boardQuest.title}`,
      quest: {
        quest_id: questId,
        title: boardQuest.title,
        description: boardQuest.description,
        flavor_text: boardQuest.flavor_text,
        objectives: objectives.map((o, i) => ({
          type: o.type,
          target_name: o.target_name,
          current: 0,
          required: o.count,
          complete: false
        })),
        rewards: JSON.parse(boardQuest.rewards),
        expires_at: expiresAt ? expiresAt.toISOString() : null
      }
    };
  }

  // ============================================================================
  // ACTIVE QUESTS
  // ============================================================================

  /**
   * Get all active quests for a character
   */
  getActiveQuests(characterId) {
    const quests = this.db.prepare(`
      SELECT * FROM active_quests 
      WHERE character_id = ? AND status IN ('accepted', 'in_progress', 'completed')
      ORDER BY accepted_at DESC
    `).all(characterId);

    return quests.map(q => {
      const objectives = this.db.prepare(`
        SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY objective_index
      `).all(q.quest_id);

      const template = QUEST_TEMPLATES[q.template_id];

      return {
        quest_id: q.quest_id,
        template_id: q.template_id,
        title: q.title,
        description: q.description,
        status: q.status,
        zone: template?.zone,
        objectives: objectives.map(o => ({
          type: o.type,
          target: o.target,
          target_name: JSON.parse(q.objectives)[o.objective_index]?.target_name,
          current: o.current,
          required: o.required,
          complete: o.completed
        })),
        rewards: JSON.parse(q.rewards),
        accepted_at: q.accepted_at,
        expires_at: q.expires_at,
        can_turn_in: q.status === 'completed',
        turn_in_location: template?.giver_location
      };
    });
  }

  /**
   * Get a specific active quest
   */
  getActiveQuest(questId) {
    const q = this.db.prepare('SELECT * FROM active_quests WHERE quest_id = ?').get(questId);
    if (!q) return null;

    const objectives = this.db.prepare(`
      SELECT * FROM quest_objectives WHERE quest_id = ? ORDER BY objective_index
    `).all(questId);

    const template = QUEST_TEMPLATES[q.template_id];

    return {
      ...q,
      variables: JSON.parse(q.variables),
      objectives: objectives.map(o => ({
        type: o.type,
        target: o.target,
        zone: o.zone,
        current: o.current,
        required: o.required,
        complete: o.completed,
        target_name: JSON.parse(q.objectives)[o.objective_index]?.target_name
      })),
      rewards: JSON.parse(q.rewards),
      template,
      turn_in_location: template?.giver_location
    };
  }

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  /**
   * Record a kill for quest progress
   */
  recordKill(characterId, creatureType, zone) {
    const updates = [];

    // Get active kill quests for this character
    const activeQuests = this.db.prepare(`
      SELECT aq.*, qo.id as obj_id, qo.objective_index, qo.type as obj_type, 
             qo.target, qo.zone as obj_zone, qo.current, qo.required, qo.completed
      FROM active_quests aq
      JOIN quest_objectives qo ON aq.quest_id = qo.quest_id
      WHERE aq.character_id = ? 
        AND aq.status IN ('accepted', 'in_progress')
        AND qo.type IN ('kill', 'kill_any')
        AND qo.completed = 0
    `).all(characterId);

    for (const quest of activeQuests) {
      let counts = false;

      if (quest.obj_type === 'kill' && quest.target === creatureType) {
        counts = true;
      } else if (quest.obj_type === 'kill_any') {
        // Check zone match if specified
        if (!quest.obj_zone || quest.obj_zone === zone) {
          counts = true;
        }
      }

      if (counts) {
        const newCount = quest.current + 1;
        const completed = newCount >= quest.required;

        this.db.prepare(`
          UPDATE quest_objectives SET current = ?, completed = ?, completed_at = ?
          WHERE id = ?
        `).run(newCount, completed ? 1 : 0, completed ? new Date().toISOString() : null, quest.obj_id);

        // Update quest status
        this.updateQuestStatus(quest.quest_id);

        // Get target name for display
        const objectives = JSON.parse(quest.objectives);
        const targetName = objectives[quest.objective_index]?.target_name || creatureType;

        updates.push({
          questId: quest.quest_id,
          questName: quest.title,
          objective: targetName,
          current: newCount,
          required: quest.required,
          complete: completed
        });

        // Check if entire quest is complete
        const allComplete = this.checkQuestComplete(quest.quest_id);
        if (allComplete) {
          updates.push({
            questId: quest.quest_id,
            questName: quest.title,
            questComplete: true,
            message: `📜 Quest Complete: ${quest.title}! Return to turn in for your reward.`
          });
        }
      }
    }

    return updates;
  }

  /**
   * Record room discovery for explore quests
   */
  recordDiscovery(characterId, roomId, zone) {
    const updates = [];

    // Check if this room was already discovered by this character
    const existing = this.db.prepare(`
      SELECT * FROM room_discoveries WHERE character_id = ? AND room_id = ?
    `).get(characterId, roomId);

    if (existing) {
      return updates; // Already discovered, no progress
    }

    // Record the discovery
    this.db.prepare(`
      INSERT INTO room_discoveries (id, character_id, room_id, zone)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), characterId, roomId, zone);

    // Get active explore quests
    const activeQuests = this.db.prepare(`
      SELECT aq.*, qo.id as obj_id, qo.objective_index, qo.type as obj_type,
             qo.zone as obj_zone, qo.current, qo.required, qo.completed
      FROM active_quests aq
      JOIN quest_objectives qo ON aq.quest_id = qo.quest_id
      WHERE aq.character_id = ?
        AND aq.status IN ('accepted', 'in_progress')
        AND qo.type IN ('explore', 'explore_any')
        AND qo.completed = 0
    `).all(characterId);

    for (const quest of activeQuests) {
      let counts = false;

      if (quest.obj_type === 'explore' && quest.obj_zone === zone) {
        counts = true;
      } else if (quest.obj_type === 'explore_any') {
        counts = true;
      }

      if (counts) {
        const newCount = quest.current + 1;
        const completed = newCount >= quest.required;

        this.db.prepare(`
          UPDATE quest_objectives SET current = ?, completed = ?, completed_at = ?
          WHERE id = ?
        `).run(newCount, completed ? 1 : 0, completed ? new Date().toISOString() : null, quest.obj_id);

        this.updateQuestStatus(quest.quest_id);

        const objectives = JSON.parse(quest.objectives);
        const targetName = objectives[quest.objective_index]?.target_name || `rooms in ${zone}`;

        updates.push({
          questId: quest.quest_id,
          questName: quest.title,
          objective: targetName,
          current: newCount,
          required: quest.required,
          complete: completed
        });

        if (this.checkQuestComplete(quest.quest_id)) {
          updates.push({
            questId: quest.quest_id,
            questName: quest.title,
            questComplete: true,
            message: `📜 Quest Complete: ${quest.title}! Return to turn in for your reward.`
          });
        }
      }
    }

    return updates;
  }

  /**
   * Record item collection for fetch quests
   */
  recordItemCollected(characterId, itemId) {
    const updates = [];

    const activeQuests = this.db.prepare(`
      SELECT aq.*, qo.id as obj_id, qo.objective_index, qo.type as obj_type,
             qo.target, qo.current, qo.required, qo.completed
      FROM active_quests aq
      JOIN quest_objectives qo ON aq.quest_id = qo.quest_id
      WHERE aq.character_id = ?
        AND aq.status IN ('accepted', 'in_progress')
        AND qo.type = 'collect'
        AND qo.target = ?
        AND qo.completed = 0
    `).all(characterId, itemId);

    for (const quest of activeQuests) {
      const newCount = quest.current + 1;
      const completed = newCount >= quest.required;

      this.db.prepare(`
        UPDATE quest_objectives SET current = ?, completed = ?, completed_at = ?
        WHERE id = ?
      `).run(newCount, completed ? 1 : 0, completed ? new Date().toISOString() : null, quest.obj_id);

      this.updateQuestStatus(quest.quest_id);

      const objectives = JSON.parse(quest.objectives);
      const targetName = objectives[quest.objective_index]?.target_name || itemId;

      updates.push({
        questId: quest.quest_id,
        questName: quest.title,
        objective: targetName,
        current: newCount,
        required: quest.required,
        complete: completed
      });

      // For fetch quests, don't mark as complete until delivered
    }

    return updates;
  }

  /**
   * Record delivery for fetch quests
   */
  recordDelivery(characterId, npcId, location) {
    const updates = [];

    const activeQuests = this.db.prepare(`
      SELECT aq.*, qo.id as obj_id, qo.objective_index, qo.type as obj_type,
             qo.target, qo.current, qo.required, qo.completed
      FROM active_quests aq
      JOIN quest_objectives qo ON aq.quest_id = qo.quest_id
      WHERE aq.character_id = ?
        AND aq.status IN ('accepted', 'in_progress')
        AND qo.type = 'deliver'
        AND (qo.target = ? OR qo.target IS NULL)
        AND qo.completed = 0
    `).all(characterId, npcId);

    for (const quest of activeQuests) {
      // Check that previous collect objective is complete
      const prevObjective = this.db.prepare(`
        SELECT * FROM quest_objectives WHERE quest_id = ? AND objective_index = ?
      `).get(quest.quest_id, quest.objective_index - 1);

      if (prevObjective && !prevObjective.completed) {
        continue; // Can't deliver if not collected
      }

      const newCount = 1;
      const completed = true;

      this.db.prepare(`
        UPDATE quest_objectives SET current = ?, completed = ?, completed_at = ?
        WHERE id = ?
      `).run(newCount, 1, new Date().toISOString(), quest.obj_id);

      this.updateQuestStatus(quest.quest_id);

      updates.push({
        questId: quest.quest_id,
        questName: quest.title,
        objective: 'Delivery',
        current: 1,
        required: 1,
        complete: true
      });

      if (this.checkQuestComplete(quest.quest_id)) {
        updates.push({
          questId: quest.quest_id,
          questName: quest.title,
          questComplete: true,
          message: `📜 Quest Complete: ${quest.title}!`
        });
      }
    }

    return updates;
  }

  /**
   * Update quest status based on objective completion
   */
  updateQuestStatus(questId) {
    const quest = this.db.prepare('SELECT * FROM active_quests WHERE quest_id = ?').get(questId);
    if (!quest) return;

    // Check if any objectives have progress
    const hasProgress = this.db.prepare(`
      SELECT COUNT(*) as count FROM quest_objectives WHERE quest_id = ? AND current > 0
    `).get(questId).count > 0;

    // Update to in_progress if just started
    if (quest.status === 'accepted' && hasProgress) {
      this.db.prepare(`
        UPDATE active_quests SET status = 'in_progress', started_at = ?
        WHERE quest_id = ?
      `).run(new Date().toISOString(), questId);
    }

    // Check if all objectives complete
    if (this.checkQuestComplete(questId)) {
      this.db.prepare(`
        UPDATE active_quests SET status = 'completed', completed_at = ?
        WHERE quest_id = ?
      `).run(new Date().toISOString(), questId);
    }
  }

  /**
   * Check if all objectives are complete
   */
  checkQuestComplete(questId) {
    const incomplete = this.db.prepare(`
      SELECT COUNT(*) as count FROM quest_objectives WHERE quest_id = ? AND completed = 0
    `).get(questId).count;
    return incomplete === 0;
  }

  // ============================================================================
  // QUEST COMPLETION
  // ============================================================================

  /**
   * Turn in a completed quest
   */
  completeQuest(characterId, questId) {
    const quest = this.getActiveQuest(questId);
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    if (quest.character_id !== characterId) {
      return { success: false, error: 'This is not your quest' };
    }

    if (quest.status !== 'completed') {
      return { success: false, error: 'Quest not ready for turn-in (objectives incomplete)' };
    }

    // Get character
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) {
      return { success: false, error: 'Character not found' };
    }

    // Award rewards
    const rewards = quest.rewards;
    let xpGained = rewards.xp || 0;
    let usdcGained = rewards.usdc || 0;
    const itemsReceived = [];

    // Apply religion bonuses
    if (char.religion === 'none') {
      usdcGained = Math.ceil(usdcGained * 1.0001);
    }

    // Calculate new XP and check for level up
    const newXP = char.xp + xpGained;
    let newLevel = char.level;
    let leveledUp = false;

    const xpThresholds = {
      1: 0, 2: 100, 3: 300, 4: 600, 5: 1000,
      6: 1500, 7: 2500, 8: 4000, 9: 6000, 10: 9000
    };

    while (newLevel < 20 && newXP >= (xpThresholds[newLevel + 1] || 999999)) {
      newLevel++;
      leveledUp = true;
    }

    // Update character
    this.db.prepare('UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?')
      .run(newXP, newLevel, usdcGained, characterId);

    // Grant items
    if (rewards.items) {
      for (const item of rewards.items) {
        if (item.chance && Math.random() > item.chance) continue;
        
        const existing = this.db.prepare(
          'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
        ).get(characterId, item.item_id);

        if (existing) {
          this.db.prepare('UPDATE character_inventory SET quantity = quantity + ? WHERE id = ?')
            .run(item.quantity || 1, existing.id);
        } else {
          this.db.prepare(`
            INSERT INTO character_inventory (id, character_id, item_id, quantity)
            VALUES (?, ?, ?, ?)
          `).run(crypto.randomUUID(), characterId, item.item_id, item.quantity || 1);
        }
        itemsReceived.push(item.item_id);
      }
    }

    // Grant random items
    if (rewards.random_items && rewards.random_items.pool.length > 0) {
      for (let i = 0; i < rewards.random_items.count; i++) {
        const itemId = rewards.random_items.pool[Math.floor(Math.random() * rewards.random_items.pool.length)];
        
        const existing = this.db.prepare(
          'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
        ).get(characterId, itemId);

        if (existing) {
          this.db.prepare('UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?')
            .run(existing.id);
        } else {
          this.db.prepare(`
            INSERT INTO character_inventory (id, character_id, item_id, quantity)
            VALUES (?, ?, ?, 1)
          `).run(crypto.randomUUID(), characterId, itemId);
        }
        itemsReceived.push(itemId);
      }
    }

    // Update quest status
    this.db.prepare(`
      UPDATE active_quests SET status = 'turned_in', turned_in_at = ?
      WHERE quest_id = ?
    `).run(new Date().toISOString(), questId);

    // Record in history
    const duration = quest.started_at 
      ? Math.floor((new Date() - new Date(quest.started_at)) / 1000)
      : 0;

    this.db.prepare(`
      INSERT INTO quest_completions (id, character_id, template_id, quest_id, outcome, title,
        rewards_granted, accepted_at, duration_seconds, objectives_completed, objectives_total)
      VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(), characterId, quest.template_id, questId, quest.title,
      JSON.stringify({ xp: xpGained, usdc: usdcGained, items: itemsReceived }),
      quest.accepted_at, duration, quest.objectives.length, quest.objectives.length
    );

    // Build response messages
    const messages = [
      `📜 **Quest Complete: ${quest.title}**`,
      `⭐ +${xpGained} XP`,
      `🔮 +${usdcGained} USDC`
    ];

    if (itemsReceived.length > 0) {
      messages.push(`📦 Received: ${itemsReceived.join(', ')}`);
    }

    if (leveledUp) {
      messages.push(`🆙 **LEVEL UP!** You are now level ${newLevel}!`);
    }

    return {
      success: true,
      quest: {
        quest_id: questId,
        title: quest.title,
        status: 'turned_in'
      },
      rewards: {
        xp_gained: xpGained,
        pearls_gained: usdcGained,
        items_received: itemsReceived
      },
      level_up: leveledUp,
      new_level: newLevel,
      completion_text: quest.template?.completion_text_pattern 
        ? this.interpolate(quest.template.completion_text_pattern, JSON.parse(quest.variables))
        : '"Thank you for your service!"',
      messages
    };
  }

  // ============================================================================
  // QUEST ABANDONMENT
  // ============================================================================

  /**
   * Abandon an active quest
   */
  abandonQuest(characterId, questId) {
    const quest = this.db.prepare(`
      SELECT * FROM active_quests WHERE quest_id = ? AND character_id = ?
    `).get(questId, characterId);

    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    if (quest.status === 'turned_in') {
      return { success: false, error: 'Cannot abandon a completed quest' };
    }

    // Update status
    this.db.prepare(`
      UPDATE active_quests SET status = 'abandoned', failed_at = ?
      WHERE quest_id = ?
    `).run(new Date().toISOString(), questId);

    // Record in history
    this.db.prepare(`
      INSERT INTO quest_completions (id, character_id, template_id, quest_id, outcome, title,
        accepted_at, objectives_completed, objectives_total)
      VALUES (?, ?, ?, ?, 'abandoned', ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(), characterId, quest.template_id, questId, quest.title,
      quest.accepted_at, 0, JSON.parse(quest.objectives).length
    );

    const template = QUEST_TEMPLATES[quest.template_id];
    let cooldownUntil = null;
    
    if (template?.cooldown_hours) {
      cooldownUntil = new Date();
      cooldownUntil.setHours(cooldownUntil.getHours() + Math.ceil(template.cooldown_hours / 2)); // Half cooldown for abandon
    }

    return {
      success: true,
      quest_id: questId,
      title: quest.title,
      status: 'abandoned',
      cooldown_until: cooldownUntil?.toISOString() || null,
      message: `Quest abandoned: ${quest.title}`
    };
  }

  // ============================================================================
  // QUEST HISTORY
  // ============================================================================

  /**
   * Get quest completion history
   */
  getQuestHistory(characterId, options = {}) {
    const { outcome, limit = 50, offset = 0 } = options;

    let query = `
      SELECT * FROM quest_completions 
      WHERE character_id = ?
    `;
    const params = [characterId];

    if (outcome) {
      query += ' AND outcome = ?';
      params.push(outcome);
    }

    query += ' ORDER BY completed_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const history = this.db.prepare(query).all(...params);

    // Get stats
    const stats = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN outcome = 'completed' THEN 1 ELSE 0 END) as total_completed,
        SUM(CASE WHEN outcome = 'failed' THEN 1 ELSE 0 END) as total_failed,
        SUM(CASE WHEN outcome = 'abandoned' THEN 1 ELSE 0 END) as total_abandoned,
        MIN(duration_seconds) as fastest_completion
      FROM quest_completions WHERE character_id = ?
    `).get(characterId);

    return {
      stats,
      history: history.map(h => ({
        ...h,
        rewards_granted: JSON.parse(h.rewards_granted || '{}')
      }))
    };
  }
}

module.exports = { 
  QuestEngine, 
  QUEST_TEMPLATES,
  CREATURE_NAMES,
  ZONE_NAMES,
  ITEM_NAMES
};
