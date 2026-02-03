/**
 * Clawds & Caverns - Quest API Routes
 */

const express = require('express');
const { QuestManager, QUESTS } = require('./quests');
const { CharacterManager } = require('./character');

function createQuestRoutes(db, authenticateAgent) {
  const router = express.Router();
  const quests = new QuestManager(db);
  const characters = new CharacterManager(db);

  // Helper to get character
  const getChar = (req) => characters.getCharacterByAgent(req.user.id);

  /**
   * GET /api/quests - List available quests at current location
   */
  router.get('/', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const location = char.location || char.zone;
      const available = quests.getAvailableQuests(char.id, location);
      
      res.json({
        success: true,
        location: location,
        quests: available
      });
    } catch (err) {
      console.error('List quests error:', err);
      res.status(500).json({ success: false, error: 'Failed to list quests' });
    }
  });

  /**
   * GET /api/quests/active - List character's active quests
   */
  router.get('/active', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const active = quests.getActiveQuests(char.id);
      
      res.json({
        success: true,
        quests: active
      });
    } catch (err) {
      console.error('Active quests error:', err);
      res.status(500).json({ success: false, error: 'Failed to get active quests' });
    }
  });

  /**
   * GET /api/quests/all - List all quest definitions (for reference)
   */
  router.get('/all', (req, res) => {
    const allQuests = Object.values(QUESTS).map(q => ({
      id: q.id,
      name: q.name,
      giver: q.giverName,
      location: q.location,
      zone: q.zone,
      levelReq: q.levelReq,
      objectives: q.objectives.map(o => ({
        type: o.type,
        target: o.targetName || o.target,
        count: o.count
      })),
      rewards: q.rewards,
      repeatable: q.repeatable || false
    }));
    
    res.json({ success: true, quests: allQuests });
  });

  /**
   * POST /api/quests/accept - Accept a quest
   */
  router.post('/accept', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { questId } = req.body;
      if (!questId) {
        return res.status(400).json({ success: false, error: 'questId required' });
      }
      
      const result = quests.acceptQuest(char.id, questId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Accept quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to accept quest' });
    }
  });

  /**
   * POST /api/quests/turnin - Turn in a completed quest
   */
  router.post('/turnin', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { questId } = req.body;
      if (!questId) {
        return res.status(400).json({ success: false, error: 'questId required' });
      }
      
      const result = quests.turnInQuest(char.id, questId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Turn in quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to turn in quest' });
    }
  });

  /**
   * POST /api/quests/abandon - Abandon an active quest
   */
  router.post('/abandon', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }
      
      const { questId } = req.body;
      if (!questId) {
        return res.status(400).json({ success: false, error: 'questId required' });
      }
      
      const result = quests.abandonQuest(char.id, questId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Abandon quest error:', err);
      res.status(500).json({ success: false, error: 'Failed to abandon quest' });
    }
  });

  return router;
}

module.exports = { createQuestRoutes };
