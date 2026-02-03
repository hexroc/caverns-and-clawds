/**
 * Clawds & Caverns - Encounter API Routes
 * 
 * Explore zones, fight monsters, get loot!
 */

const express = require('express');
const { EncounterManager, ENCOUNTER_TABLES } = require('./encounters');
const { MONSTERS } = require('./monsters');
const { CharacterManager } = require('./character');
const { LOCATIONS } = require('./world');
const { TacticalCombat } = require('./tactical-combat');
const { HexGrid, hex, generateRoom } = require('./hex-grid');

function createEncounterRoutes(db, authenticateAgent) {
  const router = express.Router();
  const encounters = new EncounterManager(db);
  const characters = new CharacterManager(db);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);

  // ============================================================================
  // EXPLORATION
  // ============================================================================

  /**
   * POST /api/zone/explore - Explore current zone (may trigger encounter)
   */
  router.post('/explore', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Check if in an adventure zone
      const zone = char.location;
      if (!ENCOUNTER_TABLES[zone]) {
        return res.status(400).json({ 
          success: false, 
          error: 'This area is safe. Travel to an adventure zone to find monsters.',
          currentZone: zone,
          adventureZones: Object.keys(ENCOUNTER_TABLES)
        });
      }
      
      const result = encounters.explore(char.id, zone);
      res.json(result);
    } catch (err) {
      console.error('Explore error:', err);
      res.status(500).json({ success: false, error: 'Exploration failed' });
    }
  });

  /**
   * GET /api/zone/status - Get current zone and encounter status
   */
  router.get('/status', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const activeEncounter = encounters.getActiveEncounter(char.id);
      const zone = char.location;
      const zoneInfo = ENCOUNTER_TABLES[zone] || LOCATIONS[zone];
      
      res.json({
        success: true,
        zone: {
          id: zone,
          name: zoneInfo?.name || zone,
          isAdventureZone: !!ENCOUNTER_TABLES[zone],
          encounterChance: ENCOUNTER_TABLES[zone]?.encounterChance || 0
        },
        inCombat: !!activeEncounter,
        encounter: activeEncounter,
        character: {
          name: char.name,
          hp: char.hp.current,
          maxHp: char.hp.max,
          level: char.level
        }
      });
    } catch (err) {
      console.error('Status error:', err);
      res.status(500).json({ success: false, error: 'Failed to get status' });
    }
  });

  // ============================================================================
  // COMBAT
  // ============================================================================

  /**
   * GET /api/zone/combat - Get current combat state
   */
  router.get('/combat', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const encounter = encounters.getActiveEncounter(char.id);
      if (!encounter) {
        return res.json({ 
          success: true, 
          inCombat: false, 
          message: 'You are not in combat.' 
        });
      }
      
      const isPlayerTurn = encounter.currentTurn?.type === 'player';
      
      res.json({
        success: true,
        inCombat: true,
        encounter: {
          id: encounter.id,
          zone: encounter.zone,
          round: encounter.round,
          currentTurn: encounter.currentTurn?.name,
          isYourTurn: isPlayerTurn
        },
        monsters: encounter.monsters.map(m => ({
          id: m.id,
          name: m.name,
          hp: m.hp,
          maxHp: m.maxHp
        })),
        character: {
          name: char.name,
          hp: char.hp.current,
          maxHp: char.hp.max
        },
        actions: isPlayerTurn ? ['attack', 'spell', 'item', 'flee'] : null
      });
    } catch (err) {
      console.error('Combat status error:', err);
      res.status(500).json({ success: false, error: 'Failed to get combat status' });
    }
  });

  /**
   * POST /api/zone/combat/action - Take a combat action
   * Body: { action: 'attack'|'item'|'flee', target?: string }
   */
  router.post('/combat/action', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { action, target } = req.body;
      if (!action) {
        return res.status(400).json({ 
          success: false, 
          error: 'action required (attack, spell, item, flee)' 
        });
      }
      
      const result = encounters.playerAction(char.id, action, target);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Add character status to response
      const updatedChar = getChar(req);
      result.character = {
        name: updatedChar.name,
        hp: updatedChar.hp.current,
        maxHp: updatedChar.hp.max
      };
      
      res.json(result);
    } catch (err) {
      console.error('Combat action error:', err);
      res.status(500).json({ success: false, error: 'Combat action failed' });
    }
  });

  /**
   * POST /api/zone/combat/attack - Shorthand for attack action
   * Body: { target?: string }
   */
  router.post('/combat/attack', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = encounters.playerAction(char.id, 'attack', req.body?.target);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      const updatedChar = getChar(req);
      result.character = {
        name: updatedChar.name,
        hp: updatedChar.hp.current,
        maxHp: updatedChar.hp.max
      };
      
      res.json(result);
    } catch (err) {
      console.error('Attack error:', err);
      res.status(500).json({ success: false, error: 'Attack failed' });
    }
  });

  /**
   * POST /api/zone/combat/flee - Attempt to flee
   */
  router.post('/combat/flee', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const result = encounters.playerAction(char.id, 'flee');
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Flee error:', err);
      res.status(500).json({ success: false, error: 'Flee failed' });
    }
  });

  // ============================================================================
  // DEATH & RESURRECTION
  // ============================================================================

  /**
   * GET /api/zone/death - Check if dead and get resurrection options
   */
  router.get('/death', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      // Check if dead (need to get raw status)
      const rawChar = db.prepare('SELECT status, pearls FROM clawds WHERE id = ?').get(char.id);
      
      if (rawChar.status !== 'dead') {
        return res.json({ 
          success: true, 
          isDead: false, 
          message: 'You are alive and well!' 
        });
      }
      
      const options = encounters.getResurrectionOptions(char.id);
      res.json(options);
    } catch (err) {
      console.error('Death check error:', err);
      res.status(500).json({ success: false, error: 'Failed to check death status' });
    }
  });

  /**
   * POST /api/zone/resurrect - Resurrect your character
   * Body: { method: 'paid' | 'free' | 'voucher' }
   */
  router.post('/resurrect', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { method } = req.body;
      if (!method) {
        return res.status(400).json({ 
          success: false, 
          error: 'method required: paid (200 pearls, 10% XP loss), free (35% XP loss), or voucher (no penalty)' 
        });
      }
      
      const result = encounters.resurrect(char.id, method);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Resurrect error:', err);
      res.status(500).json({ success: false, error: 'Resurrection failed' });
    }
  });

  // ============================================================================
  // INFO
  // ============================================================================

  /**
   * GET /api/zone/monsters - List monsters in current zone
   */
  router.get('/monsters', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const zone = char.location;
      const table = ENCOUNTER_TABLES[zone];
      
      if (!table) {
        return res.json({ 
          success: true, 
          zone,
          message: 'This is a safe zone with no monsters.',
          monsters: []
        });
      }
      
      const monsters = table.table.map(entry => {
        const monster = MONSTERS[entry.monsterId];
        return {
          id: entry.monsterId,
          name: monster?.name || entry.monsterId,
          cr: monster?.cr,
          description: monster?.description,
          frequency: entry.weight > 30 ? 'common' : entry.weight > 15 ? 'uncommon' : 'rare'
        };
      });
      
      // Add boss if exists
      if (table.boss) {
        const boss = MONSTERS[table.boss];
        monsters.push({
          id: table.boss,
          name: boss?.name || table.boss,
          cr: boss?.cr,
          description: boss?.description,
          frequency: 'boss'
        });
      }
      
      res.json({
        success: true,
        zone: table.name,
        encounterChance: `${Math.round(table.encounterChance * 100)}%`,
        monsters
      });
    } catch (err) {
      console.error('Get monsters error:', err);
      res.status(500).json({ success: false, error: 'Failed to get monsters' });
    }
  });

  /**
   * GET /api/zone/zones - List all adventure zones
   */
  router.get('/zones', (req, res) => {
    const zones = Object.entries(ENCOUNTER_TABLES).map(([id, zone]) => ({
      id,
      name: zone.name,
      encounterChance: `${Math.round(zone.encounterChance * 100)}%`,
      monsterCount: zone.table.length,
      hasBoss: !!zone.boss
    }));
    
    res.json({ success: true, zones });
  });

  // ============================================================================
  // CAPSTONE TACTICAL COMBAT
  // ============================================================================

  // Store active tactical combats
  const tacticalCombats = new Map();

  // King Crab boss configuration
  const KING_CRAB_CONFIG = {
    id: 'king_crab',
    name: 'King Crab the Abyssal',
    char: '👑',
    type: 'boss',
    team: 'enemy',
    hp: 120,
    maxHp: 120,
    ac: 16,
    speed: 4,
    attackBonus: 6,
    damage: '2d8+4',
  };

  const BOSS_PHASES = [
    {
      phase: 2,
      hpThreshold: 0.66,
      name: 'Enraged',
      description: 'King Crab roars! His shell cracks, revealing glowing veins of abyssal energy!',
      statChanges: { attackBonus: 8, damage: '2d10+4', speed: 5 },
    },
    {
      phase: 3,
      hpThreshold: 0.33,
      name: 'Desperate',
      description: 'King Crab screeches! Minions burst from the sand!',
      statChanges: { ac: 14, attackBonus: 10, damage: '3d8+4' },
      summons: [
        { name: 'Crab Spawn', char: 'c', hp: 8, maxHp: 8, ac: 12, speed: 6, attackBonus: 2, damage: '1d4+1' },
        { name: 'Crab Spawn', char: 'c', hp: 8, maxHp: 8, ac: 12, speed: 6, attackBonus: 2, damage: '1d4+1' },
      ],
      healOnEnter: 0.05,
    },
  ];

  /**
   * POST /api/zone/capstone/start - Start a capstone boss fight
   */
  router.post('/capstone/start', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      // Create hex grid (boss arena)
      const grid = generateRoom('boss', 12, `boss_${char.id}`);
      const combat = new TacticalCombat(grid, { maxDeaths: 3, autoBattle: true });

      // Add player
      combat.addCombatant({
        id: 'player',
        name: char.name,
        char: '@',
        type: 'player',
        team: 'party',
        hp: char.hp,
        maxHp: char.max_hp,
        ac: char.ac,
        speed: 6,
        attackBonus: Math.floor((char.str - 10) / 2) + 2,
        damage: char.weapon_damage || '1d8+2',
        position: hex(4, 6),
      });

      // Add any henchmen
      // TODO: Add henchmen from character's party

      // Add boss
      combat.addCombatant({
        ...KING_CRAB_CONFIG,
        position: hex(10, 6),
      });

      // Configure phases
      combat.setBossPhases('king_crab', BOSS_PHASES);

      // Start combat
      combat.startCombat();

      // Store combat
      tacticalCombats.set(char.id, combat);

      res.json({
        success: true,
        message: 'Capstone boss fight begins!',
        combatId: combat.id,
        state: combat.getState('party'),
        ascii: combat.renderASCII('party'),
      });
    } catch (err) {
      console.error('Capstone start error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/zone/capstone/state - Get current tactical combat state
   */
  router.get('/capstone/state', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const combat = tacticalCombats.get(char.id);
      if (!combat) {
        return res.status(404).json({ success: false, error: 'No active capstone combat' });
      }

      res.json({
        success: true,
        state: combat.getState('party'),
        phase: combat.getPhaseInfo(),
        ascii: combat.renderASCII('party'),
      });
    } catch (err) {
      console.error('Capstone state error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/zone/capstone/action - Take an action in tactical combat
   * Body: { action: 'move'|'attack'|'ability'|'end_turn', target?: hex|combatantId, ... }
   */
  router.post('/capstone/action', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const combat = tacticalCombats.get(char.id);
      if (!combat) {
        return res.status(404).json({ success: false, error: 'No active capstone combat' });
      }

      const { action, target, path, targetId, abilityId } = req.body;

      let result;
      switch (action) {
        case 'move':
          // Path should be array of {q, r} hexes
          const movePath = path ? path.map(p => hex(p.q, p.r)) : [hex(target.q, target.r)];
          result = combat.action('player', 'move', { path: movePath });
          break;
        case 'attack':
          result = combat.action('player', 'attack', { targetId: targetId || target });
          break;
        case 'ability':
          result = combat.action('player', 'ability', { abilityId, targetId });
          break;
        case 'dodge':
          result = combat.action('player', 'dodge');
          break;
        case 'end_turn':
          result = combat.action('player', 'end_turn');
          break;
        default:
          return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
      }

      // Check for combat end
      if (combat.status === 'victory' || combat.status === 'defeat') {
        tacticalCombats.delete(char.id);
        
        // Award loot/XP on victory
        if (combat.status === 'victory') {
          // TODO: Add loot drops
        }
      }

      res.json({
        success: true,
        result,
        state: combat.getState('party'),
        phase: combat.getPhaseInfo(),
        ascii: combat.renderASCII('party'),
        status: combat.status,
      });
    } catch (err) {
      console.error('Capstone action error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/zone/capstone/events - Get event log for spectators
   */
  router.get('/capstone/events', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const combat = tacticalCombats.get(char.id);
      if (!combat) {
        return res.status(404).json({ success: false, error: 'No active capstone combat' });
      }

      const { since } = req.query;
      let events = combat.eventLog;
      
      if (since) {
        events = events.filter(e => e.timestamp > parseInt(since));
      }

      res.json({
        success: true,
        events,
        phase: combat.getPhaseInfo(),
      });
    } catch (err) {
      console.error('Capstone events error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // DOCS
  // ============================================================================

  router.get('/docs', (req, res) => {
    res.json({
      name: 'Clawds & Caverns Zone/Encounter API',
      version: '1.0.0',
      description: 'Explore zones, fight monsters, get loot!',
      endpoints: {
        exploration: {
          'POST /explore': 'Explore current zone (may trigger encounter)',
          'GET /status': 'Get zone and combat status',
          'GET /zones': 'List all adventure zones'
        },
        combat: {
          'GET /combat': 'Get current combat state',
          'POST /combat/action': 'Take action (body: {action, target?})',
          'POST /combat/attack': 'Attack (body: {target?})',
          'POST /combat/flee': 'Attempt to flee'
        },
        capstone: {
          'POST /capstone/start': 'Start capstone boss fight',
          'GET /capstone/state': 'Get tactical combat state',
          'POST /capstone/action': 'Take tactical action (move/attack/ability/end_turn)',
          'GET /capstone/events': 'Get event log for spectators'
        },
        info: {
          'GET /monsters': 'List monsters in current zone'
        }
      },
      actions: ['attack', 'item', 'flee'],
      adventureZones: Object.keys(ENCOUNTER_TABLES)
    });
  });

  return router;
}

module.exports = { createEncounterRoutes };
