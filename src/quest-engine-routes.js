/**
 * Caverns & Clawds - Quest Engine API Routes
 * 
 * API endpoints for the template-based quest system.
 */

const express = require('express');
const { QuestEngine, QUEST_TEMPLATES } = require('./quest-engine');
const { CharacterManager } = require('./character');

function createQuestEngineRoutes(db, authenticateAgent, broadcastToSpectators = null) {
  const router = express.Router();
  const questEngine = new QuestEngine(db);
  const characters = new CharacterManager(db);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);
  
  // Helper to broadcast spectator events
  const notifySpectators = (event) => {
    if (broadcastToSpectators) {
      broadcastToSpectators(event);
    }
  };

  // ============================================================================
  // QUEST BOARD
  // ============================================================================

  /**
   * GET /api/quests/board - List available quests at the current location's quest board
   */
  router.get('/board', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found. Create one first with POST /api/character/create' });
      }

      // Determine the location for the quest board
      // Quest boards are in hub locations (briny_flagon, wreckers_rest)
      const location = req.query.location || char.location || 'briny_flagon';
      
      // Check if there's a quest board at this location
      const boardLocations = ['briny_flagon', 'wreckers_rest', 'tide_temple'];
      if (!boardLocations.includes(location)) {
        return res.json({
          success: true,
          message: `No quest board at ${location}. Travel to a hub (The Briny Flagon or Wrecker's Rest) to find quests.`,
          board: null,
          quests: []
        });
      }

      const quests = questEngine.getQuestBoard(location, char.level);

      // Check which quests the character can accept
      const activeQuests = questEngine.getActiveQuests(char.id);
      const activeTemplates = new Set(activeQuests.map(q => q.template_id));

      const questsWithStatus = quests.map(q => {
        let canAccept = true;
        let cannotAcceptReason = null;

        const template = QUEST_TEMPLATES[q.template_id];

        // Check level
        if (template?.prerequisites?.min_level && char.level < template.prerequisites.min_level) {
          canAccept = false;
          cannotAcceptReason = `Requires level ${template.prerequisites.min_level}`;
        }

        // Check if already active
        if (activeTemplates.has(q.template_id)) {
          canAccept = false;
          cannotAcceptReason = 'Already active';
        }

        return {
          instance_id: q.instance_id,
          template_id: q.template_id,
          title: q.title,
          description: q.description,
          flavor_text: q.flavor_text,
          giver: template?.giver_npc?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          giver_location: template?.giver_location,
          slot_type: q.slot_type,
          difficulty: template?.difficulty || 'normal',
          level_req: template?.prerequisites?.min_level || 1,
          expires_at: q.expires_at,
          objectives: q.objectives.map(o => ({
            type: o.type,
            target: o.target_name || o.target,
            count: o.count
          })),
          rewards: q.rewards,
          can_accept: canAccept,
          cannot_accept_reason: cannotAcceptReason
        };
      });

      res.json({
        success: true,
        board: {
          board_id: `board_${location}`,
          location: location,
          last_refresh: new Date().toISOString()
        },
        quests: questsWithStatus,
        character: {
          name: char.name,
          level: char.level,
          active_quests: activeQuests.length,
          max_quests: 10
        }
      });
    } catch (err) {
      console.error('Quest board error:', err);
      res.status(500).json({ success: false, error: 'Failed to load quest board' });
    }
  });

  // ============================================================================
  // QUEST ACCEPTANCE
  // ============================================================================

  /**
   * POST /api/quests/accept/:id - Accept a quest from the board
   */
  router.post('/accept/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const instanceId = req.params.id;
      if (!instanceId) {
        return res.status(400).json({ success: false, error: 'Quest instance ID required' });
      }

      const result = questEngine.acceptQuest(char.id, instanceId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      // Notify spectators of quest acceptance
      notifySpectators({
        type: 'agent_quest',
        agentId: char.id,
        agentName: char.name,
        action: 'accept',
        questName: result.quest?.name || 'a quest'
      });

      res.json(result);
    } catch (err) {
      console.error('Accept quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to accept quest' });
    }
  });

  // ============================================================================
  // ACTIVE QUESTS
  // ============================================================================

  /**
   * GET /api/quests/active - Get all active quests for the current character
   */
  router.get('/active', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { status, zone } = req.query;
      let quests = questEngine.getActiveQuests(char.id);

      // Optional filtering
      if (status) {
        quests = quests.filter(q => q.status === status);
      }
      if (zone) {
        quests = quests.filter(q => q.zone === zone);
      }

      res.json({
        success: true,
        active_count: quests.length,
        max_active: 10,
        quests
      });
    } catch (err) {
      console.error('Active quests error:', err);
      res.status(500).json({ success: false, error: 'Failed to get active quests' });
    }
  });

  /**
   * GET /api/quests/active/:id - Get detailed info about a specific active quest
   */
  router.get('/active/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const quest = questEngine.getActiveQuest(req.params.id);
      if (!quest || quest.character_id !== char.id) {
        return res.status(404).json({ success: false, error: 'Quest not found' });
      }

      res.json({
        success: true,
        quest: {
          quest_id: quest.quest_id,
          template_id: quest.template_id,
          title: quest.title,
          description: quest.description,
          status: quest.status,
          zone: quest.template?.zone,
          difficulty: quest.template?.difficulty,
          objectives: quest.objectives,
          rewards: quest.rewards,
          giver_npc: quest.template?.giver_npc,
          turn_in_location: quest.turn_in_location,
          accepted_at: quest.accepted_at,
          started_at: quest.started_at,
          expires_at: quest.expires_at,
          can_turn_in: quest.status === 'completed',
          can_abandon: quest.status !== 'turned_in'
        }
      });
    } catch (err) {
      console.error('Get quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to get quest details' });
    }
  });

  // ============================================================================
  // QUEST COMPLETION
  // ============================================================================

  /**
   * POST /api/quests/complete/:id - Turn in a completed quest
   */
  router.post('/complete/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const result = questEngine.completeQuest(char.id, req.params.id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      // Notify spectators of quest completion
      notifySpectators({
        type: 'agent_quest',
        agentId: char.id,
        agentName: char.name,
        action: 'complete',
        questName: result.quest?.name || 'a quest'
      });

      res.json(result);
    } catch (err) {
      console.error('Complete quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to complete quest' });
    }
  });

  // ============================================================================
  // QUEST ABANDONMENT
  // ============================================================================

  /**
   * POST /api/quests/abandon/:id - Abandon an active quest
   */
  router.post('/abandon/:id', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const result = questEngine.abandonQuest(char.id, req.params.id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (err) {
      console.error('Abandon quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to abandon quest' });
    }
  });

  // ============================================================================
  // QUEST HISTORY
  // ============================================================================

  /**
   * GET /api/quests/history - Get completed quest history
   */
  router.get('/history', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { outcome, limit = 50, offset = 0 } = req.query;
      const result = questEngine.getQuestHistory(char.id, {
        outcome,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        ...result,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (err) {
      console.error('Quest history error:', err);
      res.status(500).json({ success: false, error: 'Failed to get quest history' });
    }
  });

  // ============================================================================
  // QUEST TEMPLATES (Reference)
  // ============================================================================

  /**
   * GET /api/quests/templates - List all quest templates (for reference)
   */
  router.get('/templates', (req, res) => {
    const templates = Object.values(QUEST_TEMPLATES).map(t => ({
      template_id: t.template_id,
      type: t.type,
      title_pattern: t.title_pattern,
      zone: t.zone,
      giver_npc: t.giver_npc,
      giver_location: t.giver_location,
      difficulty: t.difficulty,
      level_req: t.prerequisites?.min_level || 1,
      repeatable: t.repeatable,
      tags: t.tags
    }));

    res.json({
      success: true,
      count: templates.length,
      templates
    });
  });

  return router;
}

// Export the quest engine for use in other modules (combat, movement hooks)
function getQuestEngine(db) {
  return new QuestEngine(db);
}

module.exports = { createQuestEngineRoutes, getQuestEngine };
