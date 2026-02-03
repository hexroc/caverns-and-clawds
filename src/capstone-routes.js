/**
 * Caverns & Clawds - Capstone API Routes
 * 
 * API endpoints for the Dreadnought's Depths capstone dungeon.
 */

const express = require('express');
const { CapstoneManager, LEVEL_CAP, MAX_PARTY_SIZE, MAX_PARTY_DEATHS, DREADNOUGHT } = require('./capstone');

// Track demo capstones that should auto-play
const demoCapstones = new Map(); // capstoneId -> intervalId

/**
 * Auto-tick a demo capstone - AI takes actions automatically
 */
function autoTickDemo(capstoneManager, capstoneId) {
  try {
    // Get current room state
    const roomData = capstoneManager.getCurrentRoom(capstoneId);
    if (!roomData.success) {
      console.log(`[Demo ${capstoneId.slice(0,8)}] Stopping - room fetch failed`);
      clearDemoInterval(capstoneId);
      return;
    }

    // Check if completed or failed
    if (roomData.status === 'completed' || roomData.status === 'failed') {
      console.log(`[Demo ${capstoneId.slice(0,8)}] Finished: ${roomData.status}`);
      clearDemoInterval(capstoneId);
      return;
    }

    const room = roomData.roomInfo;
    const agentId = 'agent_faithful'; // Leader makes decisions

    // If in combat, let autoBattle handle it - don't interfere
    if (roomData.combat) {
      // AutoBattle runs AI turns automatically with delays
      // Just log we're in combat and wait
      console.log(`[Demo ${capstoneId.slice(0,8)}] In combat, round ${roomData.combat.round} - autoBattle running`);
      return;
    }

    // Room cleared? Move forward
    if (room.cleared) {
      const moveResult = capstoneManager.move(capstoneId, agentId, room.type === 'stairs' ? 'down' : 'forward');
      console.log(`[Demo ${capstoneId.slice(0,8)}] Moving: ${moveResult.message || moveResult.error}`);
      return;
    }

    // Handle room based on type
    let action = 'proceed';
    let params = {};
    switch (room.type) {
      case 'treasure':
      case 'trap':
        // Event rooms: auto-choose first available action
        if (!room.state?.characterActions?.[agentId]) {
          action = 'choose';
          const eventActions = room.state?.event?.actions || [];
          // Pick a reasonable action based on room type
          if (room.type === 'trap') {
            params.action = eventActions.find(a => a.id === 'study' || a.id === 'assess')?.id || eventActions[0]?.id;
          } else {
            params.action = eventActions.find(a => a.id === 'inspect' || a.id === 'loot')?.id || eventActions[0]?.id;
          }
        } else {
          action = 'resolve';
        }
        break;
      case 'npc':
        // NPC rooms: just proceed through for demo
        action = 'leave';
        break;
      case 'combat':
        action = 'attack'; // Starts combat
        break;
      case 'rest':
        action = 'rest';
        break;
      case 'boss':
        action = 'fight';
        break;
      case 'stairs':
        action = 'proceed';
        break;
    }

    const result = capstoneManager.interact(capstoneId, agentId, action, params);
    console.log(`[Demo ${capstoneId.slice(0,8)}] ${room.type}: ${action} -> ${result.message || result.error || 'ok'}`);
  } catch (err) {
    console.error(`[Demo ${capstoneId.slice(0,8)}] Error:`, err.message);
  }
}

function clearDemoInterval(capstoneId) {
  const intervalId = demoCapstones.get(capstoneId);
  if (intervalId) {
    clearInterval(intervalId);
    demoCapstones.delete(capstoneId);
  }
}

/**
 * Create capstone routes
 * @param {Object} db - Database instance
 * @param {Function} authenticateAgent - Auth middleware
 * @returns {Object} { router, capstoneManager }
 */
function createCapstoneRoutes(db, authenticateAgent) {
  const router = express.Router();
  const capstoneManager = new CapstoneManager(db);
  
  // ============================================================================
  // INFO ENDPOINTS
  // ============================================================================
  
  /**
   * GET /api/capstone/info
   * Get capstone dungeon information and requirements
   */
  router.get('/info', (req, res) => {
    res.json({
      success: true,
      capstone: {
        name: "The Dreadnought's Depths",
        description: "A sprawling dungeon capstone that unlocks after reaching level 5. Designed for cooperative play with multiple AI agents.",
        requirements: {
          levelMin: 5,
          levelMax: LEVEL_CAP,
          maxPartySize: MAX_PARTY_SIZE,
          maxDeaths: MAX_PARTY_DEATHS
        },
        structure: {
          floors: 3,
          roomsPerFloor: 5,
          bossFloor: 4,
          totalRooms: 16
        },
        roomTypes: ['combat', 'trap', 'rest', 'treasure', 'npc', 'stairs', 'boss'],
        boss: {
          name: DREADNOUGHT.name,
          baseHp: DREADNOUGHT.baseHp,
          ac: DREADNOUGHT.ac,
          phases: DREADNOUGHT.phases.map(p => ({ phase: p.phase, name: p.name })),
          legendaryActions: DREADNOUGHT.legendaryAbilities.map(a => ({ name: a.name, cost: a.cost }))
        },
        rewards: {
          xpPerCharacter: DREADNOUGHT.xpReward,
          pearlsPerCharacter: DREADNOUGHT.pearlReward,
          achievement: DREADNOUGHT.achievement.name,
          title: DREADNOUGHT.title,
          legendaryLootPool: DREADNOUGHT.legendaryLoot.map(l => l.name)
        },
        levelCap: {
          capLevel: LEVEL_CAP,
          note: "Characters are capped at level 6 until capstone is completed. XP is frozen.",
          unlockMethod: "Complete the capstone to unlock level cap and continue gaining XP."
        }
      }
    });
  });
  
  // ============================================================================
  // PUBLIC SPECTATOR ROUTES (no auth required)
  // ============================================================================
  
  /**
   * GET /api/capstone/spectate/:id/room
   * Public route for spectators to view room state
   */
  router.get('/spectate/:id/room', (req, res) => {
    try {
      const result = capstoneManager.getCurrentRoom(req.params.id);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/spectate/:id/combat
   * Public route for spectators to view combat state
   */
  router.get('/spectate/:id/combat', (req, res) => {
    try {
      const result = capstoneManager.getCombatState(req.params.id);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/demo
   * Start a demo combat for testing/spectating (no auth required)
   */
  router.post('/demo', async (req, res) => {
    try {
      const result = capstoneManager.startDemoCombat();
      if (result.success) {
        res.json({
          success: true,
          message: 'Demo combat started!',
          combatId: result.combatId,
          theaterUrl: `/theater.html?combat=${result.combatId}`
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/capstone/demo-run
   * Start a full demo capstone run with 3 test agents + henchmen (no auth required)
   */
  router.post('/demo-run', async (req, res) => {
    try {
      // Clean up any existing runs for test agents
      db.prepare(`
        DELETE FROM capstone_party WHERE agent_id IN ('agent_faithful', 'agent_coral', 'agent_shell')
      `).run();
      db.prepare(`
        DELETE FROM capstone_invites WHERE from_agent_id = 'agent_faithful' OR to_agent_id IN ('agent_coral', 'agent_shell')
      `).run();
      db.prepare(`
        DELETE FROM capstone_instances WHERE leader_id = 'agent_faithful' AND status IN ('forming', 'active')
      `).run();

      // Create capstone with Faithful as leader
      const createResult = capstoneManager.create('agent_faithful', 'char_faithful');
      if (!createResult.success) {
        return res.status(400).json(createResult);
      }
      const capstoneId = createResult.capstoneId;

      // Invite Coral and Shell
      capstoneManager.invite(capstoneId, 'agent_faithful', 'agent_coral', 'char_coral');
      capstoneManager.invite(capstoneId, 'agent_faithful', 'agent_shell', 'char_shell');

      // Have them join
      capstoneManager.join(capstoneId, 'agent_coral', 'char_coral');
      capstoneManager.join(capstoneId, 'agent_shell', 'char_shell');

      // Start the dungeon
      const startResult = capstoneManager.start(capstoneId, 'agent_faithful');
      if (!startResult.success) {
        return res.status(400).json(startResult);
      }

      // Start auto-play interval (tick every 3 seconds for smoother animations)
      clearDemoInterval(capstoneId); // Clear any existing
      const intervalId = setInterval(() => autoTickDemo(capstoneManager, capstoneId), 3000);
      demoCapstones.set(capstoneId, intervalId);
      console.log(`[Demo] Started auto-play for ${capstoneId}`);

      res.json({
        success: true,
        message: 'Demo capstone run started with 3 agents + 3 henchmen! Auto-playing...',
        capstoneId: capstoneId,
        spectateUrl: `/capstone?id=${capstoneId}`
      });
    } catch (error) {
      console.error('Demo run error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/active
   * List active capstone instances (for spectating)
   */
  router.get('/active', (req, res) => {
    try {
      const activeCapstones = capstoneManager.getActiveCapstones();
      res.json({
        success: true,
        capstones: activeCapstones.map(c => ({
          id: c.id,
          leader: c.leader_name,
          partySize: c.party_size,
          currentFloor: c.current_floor,
          currentRoom: c.current_room,
          deathCount: c.death_count,
          startedAt: c.started_at
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // INSTANCE MANAGEMENT
  // ============================================================================
  
  /**
   * POST /api/capstone/create
   * Create a new capstone instance
   * Body: { characterId }
   */
  router.post('/create', authenticateAgent, (req, res) => {
    try {
      const { characterId } = req.body;
      if (!characterId) {
        return res.status(400).json({ success: false, error: 'characterId required' });
      }
      
      const result = capstoneManager.create(req.user.id, characterId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/:id
   * Get capstone instance status
   */
  router.get('/:id', authenticateAgent, (req, res) => {
    try {
      const status = capstoneManager.getStatus(req.params.id);
      
      if (!status) {
        return res.status(404).json({ success: false, error: 'Capstone not found' });
      }
      
      // Check if user is in party
      const isInParty = status.party.some(p => p.agent_id === req.user.id);
      if (!isInParty) {
        // Return limited info for non-party members
        return res.json({
          success: true,
          id: status.id,
          status: status.status,
          partySize: status.party.length,
          currentFloor: status.current_floor,
          deathCount: status.death_count,
          spectatorView: true
        });
      }
      
      res.json({ success: true, ...status });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/:id/invite
   * Invite another agent to the party
   * Body: { agentId }
   */
  router.post('/:id/invite', authenticateAgent, (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) {
        return res.status(400).json({ success: false, error: 'agentId required' });
      }
      
      const result = capstoneManager.invite(req.params.id, req.user.id, agentId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/:id/join
   * Accept invite and join the party
   * Body: { characterId }
   */
  router.post('/:id/join', authenticateAgent, (req, res) => {
    try {
      const { characterId } = req.body;
      if (!characterId) {
        return res.status(400).json({ success: false, error: 'characterId required' });
      }
      
      const result = capstoneManager.join(req.params.id, req.user.id, characterId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/:id/leave
   * Leave the party
   */
  router.post('/:id/leave', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.leave(req.params.id, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/:id/start
   * Start the dungeon (leader only)
   */
  router.post('/:id/start', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.start(req.params.id, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // NAVIGATION
  // ============================================================================
  
  /**
   * GET /api/capstone/:id/room
   * Get current room state
   */
  router.get('/:id/room', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.getCurrentRoom(req.params.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/:id/map
   * Get explored dungeon map
   */
  router.get('/:id/map', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.getMap(req.params.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/:id/move
   * Move to adjacent room
   * Body: { direction: 'forward' | 'back' | 'down' }
   */
  router.post('/:id/move', authenticateAgent, (req, res) => {
    try {
      const { direction } = req.body;
      if (!direction) {
        return res.status(400).json({ 
          success: false, 
          error: 'direction required',
          validDirections: ['forward', 'back', 'down']
        });
      }
      
      const result = capstoneManager.move(req.params.id, req.user.id, direction);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // ROOM INTERACTIONS
  // ============================================================================
  
  /**
   * POST /api/capstone/:id/action
   * Take an action in the current room
   * Body: { action, ...params }
   * 
   * Actions by room type:
   * - combat: attack, move, dodge, ability, end_turn
   * - trap/treasure (event rooms): look, actions, choose action=<id>, speak text="...", resolve, proceed
   * - npc: look, buy, buy item=<id>, haggle, intimidate, persuade, speak text="...", leave
   * - rest: rest, proceed
   * - boss: (same as combat)
   * 
   * Event rooms (trap/treasure/npc) use Pillars of Eternity style:
   * - Each party member chooses an action independently
   * - Actions may require skill checks with DCs
   * - Results aggregate for final outcome
   * - Characters can speak in-character during events
   */
  router.post('/:id/action', authenticateAgent, (req, res) => {
    try {
      const { action, ...params } = req.body;
      if (!action) {
        return res.status(400).json({ 
          success: false, 
          error: 'action required',
          hint: 'Available actions depend on room type. GET /room first.'
        });
      }
      
      const result = capstoneManager.interact(req.params.id, req.user.id, action, params);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // AI PERSONALITY & ROLEPLAY
  // ============================================================================
  
  /**
   * GET /api/capstone/:id/suggest
   * Get AI-suggested action based on character personality
   * Returns recommended action and in-character reasoning
   */
  router.get('/:id/suggest', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.getAISuggestedAction(req.params.id, req.user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/:id/strategy
   * Get full party strategy discussion for current room
   * Shows each character's suggested action and in-character dialogue
   */
  router.get('/:id/strategy', authenticateAgent, (req, res) => {
    try {
      const result = capstoneManager.getPartyStrategy(req.params.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // COMBAT HELPERS
  // ============================================================================
  
  /**
   * GET /api/capstone/:id/combat
   * Get current combat state (if in combat)
   */
  router.get('/:id/combat', authenticateAgent, (req, res) => {
    try {
      const combat = capstoneManager.activeCombats.get(req.params.id);
      
      if (!combat) {
        return res.json({ 
          success: true, 
          inCombat: false,
          message: 'No active combat'
        });
      }
      
      res.json({
        success: true,
        inCombat: true,
        combat: combat.getState('party'),
        grid: combat.renderASCII('party')
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * GET /api/capstone/:id/combat/grid
   * Get ASCII grid render of current combat
   */
  router.get('/:id/combat/grid', authenticateAgent, (req, res) => {
    try {
      const combat = capstoneManager.activeCombats.get(req.params.id);
      
      if (!combat) {
        return res.status(400).json({ 
          success: false, 
          error: 'No active combat'
        });
      }
      
      res.json({
        success: true,
        grid: combat.renderASCII('party'),
        round: combat.round,
        currentTurn: combat.getCurrentCombatant()?.name
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // INVITES
  // ============================================================================
  
  /**
   * GET /api/capstone/invites
   * Get pending invites for current user
   */
  router.get('/invites', authenticateAgent, (req, res) => {
    try {
      const invites = db.prepare(`
        SELECT ci.*, u.name as from_name, cs.status as capstone_status
        FROM capstone_invites ci
        JOIN users u ON ci.from_agent_id = u.id
        JOIN capstone_instances cs ON ci.capstone_id = cs.id
        WHERE ci.to_agent_id = ? AND ci.status = 'pending'
        ORDER BY ci.created_at DESC
      `).all(req.user.id);
      
      res.json({ success: true, invites });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * POST /api/capstone/invites/:inviteId/decline
   * Decline an invite
   */
  router.post('/invites/:inviteId/decline', authenticateAgent, (req, res) => {
    try {
      const invite = db.prepare(`
        SELECT * FROM capstone_invites WHERE id = ? AND to_agent_id = ?
      `).get(req.params.inviteId, req.user.id);
      
      if (!invite) {
        return res.status(404).json({ success: false, error: 'Invite not found' });
      }
      
      db.prepare(`UPDATE capstone_invites SET status = 'declined' WHERE id = ?`)
        .run(req.params.inviteId);
      
      res.json({ success: true, message: 'Invite declined' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================================================
  // MY CAPSTONES
  // ============================================================================
  
  /**
   * GET /api/capstone/mine
   * Get current user's capstone instances
   */
  router.get('/mine', authenticateAgent, (req, res) => {
    try {
      const capstones = db.prepare(`
        SELECT ci.*, 
               (SELECT COUNT(*) FROM capstone_party WHERE capstone_id = ci.id) as party_size
        FROM capstone_instances ci
        JOIN capstone_party cp ON ci.id = cp.capstone_id
        WHERE cp.agent_id = ?
        ORDER BY ci.created_at DESC
        LIMIT 10
      `).all(req.user.id);
      
      res.json({ 
        success: true, 
        capstones: capstones.map(c => ({
          ...c,
          roomsCleared: JSON.parse(c.rooms_cleared || '[]').length
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return { router, capstoneManager };
}

module.exports = { createCapstoneRoutes };
