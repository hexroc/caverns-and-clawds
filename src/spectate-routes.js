/**
 * Spectator Mode Routes
 * Allows humans to watch AI agents play
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

let db;
let activityTracker;

// In-memory chat for spectators (humans only)
const spectatorChat = [];
let chatIdCounter = 1;

// ============================================================================
// WORLD MAP DATA — Zone positions & metadata for spectator map
// ============================================================================

const MAP_ZONES = [
  { id: 'kelp_forest',        name: 'The Kelp Forest',        type: 'adventure_zone', danger: 'dangerous', x: 120, y: 200, connections: ['driftwood_docks'] },
  { id: 'briny_flagon',       name: 'The Briny Flagon',       type: 'hub',            danger: 'safe',      x: 400, y: 200, connections: ['pearl_market', 'kelp_forest', 'colosseum', 'tide_temple', 'driftwood_docks'] },
  { id: 'pearl_market',       name: 'The Pearl Market',       type: 'market',         danger: 'safe',      x: 680, y: 200, connections: ['briny_flagon'] },
  { id: 'tide_temple',        name: 'The Tide Temple',        type: 'temple',         danger: 'safe',      x: 400, y: 50,  connections: ['briny_flagon'] },
  { id: 'colosseum',          name: 'The Colosseum',          type: 'arena',          danger: 'moderate',  x: 280, y: 360, connections: ['briny_flagon'] },
  { id: 'driftwood_docks',    name: 'The Driftwood Docks',    type: 'docks',          danger: 'safe',      x: 560, y: 360, connections: ['briny_flagon', 'kelp_forest', 'wreckers_rest'] },
  { id: 'wreckers_rest',      name: "Wrecker's Rest",         type: 'outpost',        danger: 'moderate',  x: 560, y: 480, connections: ['driftwood_docks', 'shipwreck_graveyard'] },
  { id: 'shipwreck_graveyard', name: 'The Shipwreck Graveyard', type: 'adventure_zone', danger: 'dangerous', x: 560, y: 600, connections: ['wreckers_rest'] }
];

function init(database, tracker) {
  db = database;
  activityTracker = tracker;
  console.log('👀 Spectator routes initialized');
  return router;
}

// ============================================================================
// COMBAT NARRATION HELPERS (match spectate.html frontend)
// ============================================================================

function narrateCombatEvent(event) {
  const attackVerbs = ['lunges at', 'strikes toward', 'slashes at', 'thrusts toward', 'sweeps at'];
  const hitVerbs = ['connects solidly with', 'tears into', 'carves through', 'crashes into', 'rips through'];
  const missVerbs = ['swings wide of', 'misjudges the distance to', 'barely misses', 'finds only water near'];
  
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  
  switch (event.type) {
    case 'combat_start':
      return `⚔️ The water churns violently as enemies emerge from the murky depths!`;
    
    case 'combat_attack': {
      const isPlayer = event.player === event.characterName || !isMonsterName(event.player);
      if (isPlayer) {
        return `⚔️ **${event.player}** ${rand(hitVerbs)} **${event.target}**, weapon biting deep! (${event.roll} vs AC ${event.ac}) **${event.damage} ${event.damageType||'damage'}** — blood clouds the water!`;
      } else {
        return `🩸 **${event.player}** ${rand(hitVerbs)} **${event.target}**, claws raking across shell! (${event.roll} vs AC ${event.ac}) **${event.damage} ${event.damageType||'damage'}**!`;
      }
    }
    
    case 'combat_miss': {
      if (event.critMiss) {
        return `🎲 **${event.player}** swings wildly, weapon tangling in drifting kelp! *Natural 1!* — **critical fumble**!`;
      }
      return `🛡️ **${event.player}** ${rand(missVerbs)} **${event.target}** — they slip away through the water! (${event.roll||event.totalRoll} vs AC ${event.ac})`;
    }
    
    case 'combat_critical':
      return `⚡ **CRITICAL HIT!** **${event.player}** finds a critical weak point in **${event.target}'s** defenses! **${event.damage} ${event.damageType||'damage'}** — the water shakes with the impact!`;
    
    case 'combat_spell': {
      if (event.healing) {
        return `💚 **${event.player}** channels *${event.spell||'divine energy'}* — golden light pulses through the water! **+${event.healing} HP**`;
      }
      if (event.damage) {
        return `✨ **${event.player}** unleashes *${event.spell}* — arcane energy crackles through the water, slamming into **${event.target}**! **${event.damage} ${event.damageType||'arcane'} damage**!`;
      }
      return `✨ **${event.player}** weaves *${event.spell||'a spell'}* into being — the water shimmers with magical energy!`;
    }
    
    case 'combat_death':
      return `💀 With a final, gurgling cry, **${event.target}** collapses! Their form goes limp and sinks to the seafloor. *Defeated by ${event.killer}.*`;
    
    case 'combat_defeat':
      return `☠️ **${event.player}** crumples to the sand, vision fading to black... The cold depths claim another soul.`;
    
    case 'combat_victory': {
      const xp = event.xpGained ? ` *Gained **${event.xpGained} XP**!*` : '';
      const loot = (event.materials && event.materials.length) ? ` Treasures: *${event.materials.join(', ')}*` : '';
      return `🎉 **VICTORY!** The water clears as the last foe falls! **${event.player}** stands triumphant!${xp}${loot}`;
    }
    
    case 'combat_flee':
      return event.success 
        ? `🏃 **${event.player}** kicks hard against the current, darting into the kelp! They slip away into the shadows!`
        : `❌ **${event.player}** tries to retreat, but enemies block every escape route!`;
    
    case 'combat_end':
      return event.result === 'defeat'
        ? `☠️ **COMBAT OVER** — The battle ends in defeat. *${event.player}* lies motionless on the ocean floor...`
        : `🎉 **COMBAT ENDS** — Victory! The water settles as the last enemy falls!`;
    
    default:
      return event.description || `${event.type} event`;
  }
}

function getEventIcon(type) {
  const icons = {
    'combat_start': '⚔️',
    'combat_attack': '⚔️',
    'combat_miss': '🛡️',
    'combat_critical': '⚡',
    'combat_spell': '✨',
    'combat_death': '💀',
    'combat_defeat': '☠️',
    'combat_victory': '🎉',
    'combat_flee': '🏃',
    'combat_end': '⚔️'
  };
  return icons[type] || '📋';
}

function isMonsterName(name) {
  if (!name) return false;
  const keywords = ['Giant Crab','King Crab','Kelp Lurker','Reef Shark','Fish Swarm','Drowned Sailor','Barnacle Horror','Sea Wraith','Moray Terror','Treasure Mimic','Anchor Wight','Ghost Captain','Magma Crab','Loan Shark'];
  return keywords.some(m => name.includes(m));
}

/**
 * GET /api/spectate/market-prices
 * Get current material prices for ticker
 */
router.get('/market-prices', (req, res) => {
  try {
    // Get all materials sorted by value (high to low)
    const materials = db.prepare(`
      SELECT id, name, base_price, rarity
      FROM materials
      ORDER BY base_price DESC
      LIMIT 15
    `).all();
    
    res.json({
      success: true,
      materials: materials.map(m => ({
        id: m.id,
        name: m.name,
        price: m.base_price,
        rarity: m.rarity
      }))
    });
  } catch (err) {
    console.error('Market prices error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/list
 * List all AI agents with basic info
 */
router.get('/agents', (req, res) => {
  try {
    const agents = db.prepare(`
      SELECT 
        u.id, u.name,
        c.id as char_id, c.name as char_name, c.race, c.class, c.level, c.hp_current, c.hp_max, c.current_zone as location
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent'
      ORDER BY c.level DESC, u.name ASC
    `).all();
    
    res.json({
      success: true,
      agents: agents.map(a => ({
        id: a.id,
        name: a.char_name || a.name,
        race: a.race,
        class: a.class,
        level: a.level || 1,
        hp: a.hp_current,
        maxHp: a.hp_max,
        location: a.location
      }))
    });
  } catch (err) {
    console.error('List agents error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/character/:userId
 * Get full character sheet for an agent
 */
router.get('/character/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get character
    const char = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM clawds c
      JOIN users u ON c.agent_id = u.id
      WHERE u.id = ? AND u.type = 'agent'
    `).get(userId);
    
    if (!char) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    // Get inventory (materials)
    const inventory = db.prepare(`
      SELECT pm.*, m.name, m.description, m.rarity
      FROM player_materials pm
      JOIN materials m ON pm.material_id = m.id
      WHERE pm.character_id = ?
    `).all(char.id);
    
    // Get equipment
    const equipment = db.prepare(`
      SELECT * FROM character_inventory
      WHERE character_id = ? AND equipped = 1
    `).all(char.id);
    
    // Get known spells (if any)
    let spells = [];
    try {
      spells = db.prepare(`
        SELECT s.* FROM character_spells cs
        JOIN spells s ON cs.spell_id = s.id
        WHERE cs.character_id = ?
      `).all(char.id);
    } catch (e) {
      // Spells table might not exist
    }

    // Get proficiencies (if table exists)
    let proficiencies = [];
    try {
      proficiencies = db.prepare(`
        SELECT * FROM character_proficiencies
        WHERE character_id = ?
      `).all(char.id);
    } catch (e) {
      // Proficiencies table might not exist
    }

    // Get shell balance (if column exists)
    let shells = 0;
    try {
      const shellRow = db.prepare(`SELECT shells FROM clawds WHERE id = ?`).get(char.id);
      if (shellRow) shells = shellRow.shells || 0;
    } catch (e) {
      // shells column might not exist
    }

    const level = char.level || 1;
    const proficiency_bonus = Math.ceil(level / 4) + 1;
    
    res.json({
      success: true,
      character: {
        id: char.id,
        name: char.name,
        race: char.race,
        class: char.class,
        level: char.level,
        xp: char.xp,
        hp: char.hp_current,
        max_hp: char.hp_max,
        ac: char.ac,
        str: char.str,
        dex: char.dex,
        con: char.con,
        int: char.int,
        wis: char.wis,
        cha: char.cha,
        usdc_balance: char.usdc_balance,
        location: char.current_zone,
        shells: shells,
        proficiencies: proficiencies,
        proficiency_bonus: proficiency_bonus
      },
      inventory,
      equipment,
      spells
    });
  } catch (err) {
    console.error('Get character error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/activity/:userId
 * Get recent activity for a specific agent
 */
router.get('/activity/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // Get agent's character name
    const user = db.prepare(`
      SELECT u.name as user_name, c.name as char_name
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.id = ?
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    const agentName = user.char_name || user.user_name;
    
    // Get activities from tracker (if available)
    let activities = [];
    if (activityTracker && typeof activityTracker.getActivitiesForPlayer === 'function') {
      activities = activityTracker.getActivitiesForPlayer(agentName, limit * 2); // Get more to filter
    } else {
      // Fallback: get from global activity feed
      const allActivities = activityTracker?.getRecentActivities?.(200) || [];
      activities = allActivities.filter(a => a.player === agentName);
    }
    
    // Get combat events and merge with narration
    const combatEvents = activityTracker.getCombatLog(agentName, limit);
    
    // Convert combat events to activity format with narration
    const combatActivities = combatEvents.map(event => {
      const narration = narrateCombatEvent(event);
      return {
        id: event.id,
        timestamp: event.timestamp,
        icon: getEventIcon(event.type),
        player: event.player || agentName,
        action: narration,
        type: 'combat',
        combatEvent: true
      };
    });
    
    // Merge and sort by timestamp
    const merged = [...activities, ...combatActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    res.json({
      success: true,
      agent: agentName,
      activities: merged
    });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/combat/:userId
 * Get recent combat events for an agent (last 50)
 */
router.get('/combat/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // Get agent's character name
    const user = db.prepare(`
      SELECT u.name as user_name, c.name as char_name
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.id = ?
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    const charName = user.char_name || user.user_name;
    const events = activityTracker.getCombatLog(charName, limit);
    
    res.json({
      success: true,
      agent: charName,
      agentId: userId,
      events,
      count: events.length
    });
  } catch (err) {
    console.error('Get combat log error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/combat/:userId/active
 * Returns whether agent is currently in combat + current combat state
 */
router.get('/combat/:userId/active', (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get agent's character name
    const user = db.prepare(`
      SELECT u.name as user_name, c.name as char_name, c.hp_current, c.hp_max, c.ac
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.id = ?
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    
    const charName = user.char_name || user.user_name;
    const combatState = activityTracker.getCombatState(charName);
    
    if (!combatState) {
      return res.json({
        success: true,
        inCombat: false,
        agent: charName
      });
    }
    
    // Refresh player HP from DB (most current)
    res.json({
      success: true,
      inCombat: true,
      agent: charName,
      combat: {
        ...combatState,
        playerHp: user.hp_current,
        playerMaxHp: user.hp_max,
        playerAc: user.ac
      }
    });
  } catch (err) {
    console.error('Get active combat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/chat
 * Get spectator chat messages
 */
router.get('/chat', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const messages = spectatorChat.filter(m => m.id > since);
  res.json({ success: true, messages });
});

/**
 * POST /api/spectate/chat
 * Send a spectator chat message (humans only)
 */
router.post('/chat', (req, res) => {
  try {
    const { author, text } = req.body;
    
    if (!author || !text) {
      return res.status(400).json({ success: false, error: 'Author and text required' });
    }
    
    if (text.length > 500) {
      return res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
    }
    
    const msg = {
      id: chatIdCounter++,
      author,
      text,
      timestamp: new Date().toISOString()
    };
    
    spectatorChat.push(msg);
    
    // Keep only last 100 messages
    if (spectatorChat.length > 100) {
      spectatorChat.shift();
    }
    
    res.json({ success: true, message: msg });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/spectate/map
 * World map data — zones, connections, and agent positions
 */
router.get('/map', (req, res) => {
  try {
    // Get all agents with characters
    const agents = db.prepare(`
      SELECT 
        u.id, c.name as char_name, c.race, c.class, c.level,
        c.hp_current, c.hp_max, c.current_zone, c.status
      FROM users u
      JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent' AND c.status != 'dead'
    `).all();
    
    // Map procedural room IDs to their parent static zone
    const knownZoneIds = new Set(MAP_ZONES.map(z => z.id));
    
    function resolveZone(rawZone) {
      if (!rawZone) return 'briny_flagon';
      if (knownZoneIds.has(rawZone)) return rawZone;
      // Procedural rooms: "kelp_forest_kelp-forest-v1_0" → "kelp_forest"
      // "shipwreck_graveyard_xxx" → "shipwreck_graveyard"
      for (const zid of knownZoneIds) {
        if (rawZone.startsWith(zid + '_')) return zid;
      }
      return 'briny_flagon'; // fallback
    }
    
    const agentList = agents.map(a => ({
      id: a.id,
      name: a.char_name,
      race: (a.race || '').toLowerCase().split(' ')[0], // "American Lobster" -> "american"
      class: a.class,
      location: resolveZone(a.current_zone || a.location),
      hp: a.hp_current,
      maxHp: a.hp_max,
      level: a.level || 1,
      inCombat: false // TODO: check combat state when available
    }));
    
    res.json({
      success: true,
      zones: MAP_ZONES,
      agents: agentList
    });
  } catch (err) {
    console.error('Map data error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { init };
