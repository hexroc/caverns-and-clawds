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
const { activityTracker } = require('./activity-tracker');
// (tactical-combat & hex-grid removed - capstone system deprecated)

function createEncounterRoutes(db, authenticateAgent, broadcastToSpectators = null) {
  const router = express.Router();
  const encounters = new EncounterManager(db);
  const characters = new CharacterManager(db);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);
  
  // Helper to broadcast spectator events
  const notifySpectators = (event) => {
    if (broadcastToSpectators) {
      broadcastToSpectators(event);
    }
  };

  // Helper to extract zone type from procedural room IDs
  function getZoneType(location) {
    if (!location) return location;
    if (location.startsWith('kelp_forest')) return 'kelp_forest';
    if (location.startsWith('shipwreck_graveyard')) return 'shipwreck_graveyard';
    if (location.startsWith('coral_labyrinth')) return 'coral_labyrinth';
    if (location.startsWith('thermal_vents')) return 'thermal_vents';
    if (location.startsWith('murk')) return 'murk';
    if (location.startsWith('abyss')) return 'abyss';
    return location;
  }

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
      
      // Check if in an adventure zone (extract zone type from procedural room IDs)
      const zone = getZoneType(char.location);
      if (!ENCOUNTER_TABLES[zone]) {
        return res.status(400).json({ 
          success: false, 
          error: 'This area is safe. Travel to an adventure zone to find monsters.',
          currentZone: char.location,
          zoneType: zone,
          adventureZones: Object.keys(ENCOUNTER_TABLES)
        });
      }
      
      const result = encounters.explore(char.id, zone);
      
      // Track activity for live ticker
      if (result.encounter) {
        activityTracker.playerCombat(char.name, result.monster?.name || 'monster', 'engaged', zone);
      } else if (result.discovery) {
        activityTracker.addActivity({
          icon: '🔍',
          player: char.name,
          action: `found ${result.reward?.material || 'something'}!`,
          location: zone,
          type: 'discovery'
        });
      } else {
        activityTracker.playerExplore(char.name, zone, 'searching...');
      }
      
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
      const fullLocation = char.location;
      const zone = getZoneType(fullLocation);
      const zoneInfo = ENCOUNTER_TABLES[zone] || LOCATIONS[fullLocation];
      
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
      
      // Notify spectators of combat events
      if (result.combatEnded && result.victory) {
        const enemy = result.encounter?.monsters?.[0]?.name || 'a monster';
        notifySpectators({
          type: 'agent_combat',
          agentId: char.id,
          agentName: char.name,
          victory: true,
          enemy,
          xpGained: result.xpGained || 0
        });
        // Track victory in activity ticker
        activityTracker.playerCombat(char.name, enemy, 'victory', char.location);
        if (result.drops?.materials?.length) {
          const loot = result.drops.materials.map(m => m.name).join(', ');
          activityTracker.addActivity({
            icon: '💎',
            player: char.name,
            action: `looted ${loot}`,
            location: char.location,
            type: 'loot'
          });
        }
      } else if (result.combatEnded && !result.victory) {
        notifySpectators({
          type: 'agent_death',
          agentId: char.id,
          agentName: char.name
        });
        // Track defeat
        activityTracker.playerCombat(char.name, 'monster', 'defeat', char.location);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Combat action error:', err);
      res.status(500).json({ success: false, error: 'Combat action failed', debug: err.message });
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
  // CLASS FEATURES
  // ============================================================================

  /**
   * POST /api/zone/combat/divine-smite - Use Divine Smite (Paladin)
   * Body: { targetId?: string, level?: number }
   */
  router.post('/combat/divine-smite', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      if (char.class !== 'Paladin') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Paladins can use Divine Smite' 
        });
      }

      const encounter = encounters.getActiveEncounter(char.id);
      if (!encounter) {
        return res.status(400).json({ 
          success: false, 
          error: 'Not in combat' 
        });
      }

      const { targetId, level } = req.body;
      const classFeatures = require('./class-features');
      
      const result = classFeatures.paladin.useDivineSmite(
        db,
        char.id,
        encounter,
        targetId || encounter.monsters[0]?.id,
        level
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Divine Smite error:', err);
      res.status(500).json({ success: false, error: 'Divine Smite failed', debug: err.message });
    }
  });

  /**
   * POST /api/zone/combat/action-surge - Use Action Surge (Fighter)
   */
  router.post('/combat/action-surge', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      if (char.class !== 'Fighter') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Fighters can use Action Surge' 
        });
      }

      const encounter = encounters.getActiveEncounter(char.id);
      if (!encounter) {
        return res.status(400).json({ 
          success: false, 
          error: 'Not in combat' 
        });
      }

      const classFeatures = require('./class-features');
      const result = classFeatures.fighter.useActionSurge(db, char.id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Action Surge error:', err);
      res.status(500).json({ success: false, error: 'Action Surge failed', debug: err.message });
    }
  });

  /**
   * POST /api/zone/combat/second-wind - Use Second Wind (Fighter)
   */
  router.post('/combat/second-wind', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      if (char.class !== 'Fighter') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Fighters can use Second Wind' 
        });
      }

      const encounter = encounters.getActiveEncounter(char.id);
      if (!encounter) {
        return res.status(400).json({ 
          success: false, 
          error: 'Not in combat' 
        });
      }

      const classFeatures = require('./class-features');
      const result = classFeatures.fighter.useSecondWind(db, char.id);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Update character HP in response
      const updatedChar = getChar(req);
      result.character = {
        name: updatedChar.name,
        hp: updatedChar.hp.current,
        maxHp: updatedChar.hp.max
      };

      res.json(result);
    } catch (err) {
      console.error('Second Wind error:', err);
      res.status(500).json({ success: false, error: 'Second Wind failed', debug: err.message });
    }
  });

  /**
   * POST /api/zone/combat/bardic-inspiration - Give Bardic Inspiration (Bard)
   * Body: { targetId: string }
   */
  router.post('/combat/bardic-inspiration', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      if (char.class !== 'Bard') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Bards can give Bardic Inspiration' 
        });
      }

      const { targetId } = req.body;
      if (!targetId) {
        return res.status(400).json({ 
          success: false, 
          error: 'targetId required (character or henchman id)' 
        });
      }

      const classFeatures = require('./class-features');
      const result = classFeatures.bard.giveBardicInspiration(db, char.id, targetId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Bardic Inspiration error:', err);
      res.status(500).json({ success: false, error: 'Bardic Inspiration failed', debug: err.message });
    }
  });

  /**
   * POST /api/zone/combat/lay-on-hands - Use Lay on Hands (Paladin)
   * Body: { targetId: string, hp: number }
   */
  router.post('/combat/lay-on-hands', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      if (char.class !== 'Paladin') {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Paladins can use Lay on Hands' 
        });
      }

      const { targetId, hp } = req.body;
      if (!targetId || !hp) {
        return res.status(400).json({ 
          success: false, 
          error: 'targetId and hp required' 
        });
      }

      const classFeatures = require('./class-features');
      const result = classFeatures.paladin.useLayOnHands(db, char.id, targetId, hp);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Lay on Hands error:', err);
      res.status(500).json({ success: false, error: 'Lay on Hands failed', debug: err.message });
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
      const rawChar = db.prepare('SELECT status, usdc_balance FROM clawds WHERE id = ?').get(char.id);
      
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
          error: 'method required: paid (0.025 USDC, 10% XP loss), free (35% XP loss), or voucher (no penalty)' 
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
        classFeatures: {
          'POST /combat/divine-smite': 'Use Divine Smite (Paladin, body: {targetId?, level?})',
          'POST /combat/action-surge': 'Use Action Surge (Fighter)',
          'POST /combat/second-wind': 'Use Second Wind (Fighter)',
          'POST /combat/bardic-inspiration': 'Give Bardic Inspiration (Bard, body: {targetId})',
          'POST /combat/lay-on-hands': 'Use Lay on Hands (Paladin, body: {targetId, hp})'
        },
        death: {
          'GET /death': 'Check death status and resurrection options',
          'POST /resurrect': 'Resurrect character (body: {method: "paid"|"free"|"voucher"})'
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
