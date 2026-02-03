/**
 * Clawd Poker - API Routes
 * 
 * REST API endpoints for the poker mini-game.
 */

const express = require('express');
const { PokerGame, ACTIONS } = require('./poker-game');
const { PokerAI, AI_PERSONALITIES } = require('./poker-ai');

function createPokerRoutes(db, authenticateAgent) {
  const router = express.Router();
  const poker = new PokerGame(db);
  
  // Store active AI instances for delayed actions
  const aiPlayers = new Map();
  
  // ============================================================================
  // TABLE MANAGEMENT
  // ============================================================================
  
  /**
   * GET /api/poker/tables - List all tables
   */
  router.get('/tables', (req, res) => {
    try {
      const tables = poker.listTables();
      res.json({ success: true, tables });
    } catch (err) {
      console.error('List tables error:', err);
      res.status(500).json({ success: false, error: 'Failed to list tables' });
    }
  });
  
  /**
   * POST /api/poker/tables - Create a new table
   */
  router.post('/tables', (req, res) => {
    try {
      const { name, minBuyIn, maxBuyIn, smallBlind, bigBlind, maxPlayers } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Table name required' });
      }
      
      const table = poker.createTable(name, { minBuyIn, maxBuyIn, smallBlind, bigBlind, maxPlayers });
      res.json({ success: true, table });
    } catch (err) {
      console.error('Create table error:', err);
      res.status(500).json({ success: false, error: 'Failed to create table' });
    }
  });
  
  /**
   * GET /api/poker/tables/:id - Get table state
   */
  router.get('/tables/:id', (req, res) => {
    try {
      const table = poker.getTable(req.params.id);
      
      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }
      
      res.json({ success: true, table });
    } catch (err) {
      console.error('Get table error:', err);
      res.status(500).json({ success: false, error: 'Failed to get table' });
    }
  });
  
  // ============================================================================
  // SEAT MANAGEMENT
  // ============================================================================
  
  /**
   * POST /api/poker/tables/:id/join - Join a table
   */
  router.post('/tables/:id/join', (req, res) => {
    try {
      const { playerId, playerName, buyIn, seatNumber } = req.body;
      
      if (!playerId || !playerName) {
        return res.status(400).json({ success: false, error: 'Player ID and name required' });
      }
      
      if (!buyIn || buyIn <= 0) {
        return res.status(400).json({ success: false, error: 'Valid buy-in required' });
      }
      
      const result = poker.joinTable(req.params.id, playerId, playerName, buyIn, seatNumber);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Join table error:', err);
      res.status(500).json({ success: false, error: 'Failed to join table' });
    }
  });
  
  /**
   * POST /api/poker/tables/:id/leave - Leave a table
   */
  router.post('/tables/:id/leave', (req, res) => {
    try {
      const { playerId } = req.body;
      
      if (!playerId) {
        return res.status(400).json({ success: false, error: 'Player ID required' });
      }
      
      const result = poker.leaveTable(req.params.id, playerId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (err) {
      console.error('Leave table error:', err);
      res.status(500).json({ success: false, error: 'Failed to leave table' });
    }
  });
  
  /**
   * POST /api/poker/tables/:id/ai - Add AI opponent
   */
  router.post('/tables/:id/ai', (req, res) => {
    try {
      const { personality, buyIn, seatNumber } = req.body;
      
      const validPersonalities = Object.keys(AI_PERSONALITIES);
      if (personality && !validPersonalities.includes(personality)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid personality. Options: ${validPersonalities.join(', ')}` 
        });
      }
      
      const result = poker.addAI(req.params.id, personality || 'goblin', buyIn || 1000, seatNumber);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Create AI instance
      const aiKey = `${req.params.id}-${result.seatNumber}`;
      aiPlayers.set(aiKey, new PokerAI(result.personality));
      
      res.json(result);
    } catch (err) {
      console.error('Add AI error:', err);
      res.status(500).json({ success: false, error: 'Failed to add AI' });
    }
  });
  
  // ============================================================================
  // GAME FLOW
  // ============================================================================
  
  /**
   * POST /api/poker/tables/:id/start - Start a new hand
   */
  router.post('/tables/:id/start', async (req, res) => {
    try {
      const result = poker.startHand(req.params.id);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Check if AI needs to act first
      await processAIActions(req.params.id, result.handId);
      
      // Return fresh state
      const handState = poker.getHandState(result.handId, req.body.playerId);
      res.json({ success: true, ...result, hand: handState });
    } catch (err) {
      console.error('Start hand error:', err);
      res.status(500).json({ success: false, error: 'Failed to start hand' });
    }
  });
  
  /**
   * GET /api/poker/tables/:id/hand - Get current hand state
   */
  router.get('/tables/:id/hand', (req, res) => {
    try {
      const table = poker.getTable(req.params.id);
      
      if (!table) {
        return res.status(404).json({ success: false, error: 'Table not found' });
      }
      
      if (!table.currentHandId) {
        return res.json({ success: true, hand: null, message: 'No active hand' });
      }
      
      const playerId = req.query.playerId;
      const hand = poker.getHandState(table.currentHandId, playerId);
      
      res.json({ success: true, hand });
    } catch (err) {
      console.error('Get hand error:', err);
      res.status(500).json({ success: false, error: 'Failed to get hand' });
    }
  });
  
  /**
   * POST /api/poker/tables/:id/action - Submit a player action
   */
  router.post('/tables/:id/action', async (req, res) => {
    try {
      const { playerId, action, amount } = req.body;
      const tableId = req.params.id;
      
      if (!playerId || !action) {
        return res.status(400).json({ success: false, error: 'Player ID and action required' });
      }
      
      // Validate action
      const validActions = Object.values(ACTIONS);
      if (!validActions.includes(action)) {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid action. Options: ${validActions.join(', ')}` 
        });
      }
      
      const table = poker.getTable(tableId);
      if (!table || !table.currentHandId) {
        return res.status(400).json({ success: false, error: 'No active hand' });
      }
      
      // Find player's seat
      const seat = table.seats.find(s => s.playerId === playerId);
      if (!seat) {
        return res.status(400).json({ success: false, error: 'Not seated at this table' });
      }
      
      // Submit action
      const result = poker.submitAction(table.currentHandId, seat.seatNumber, action, amount);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Process AI actions if needed
      if (!result.handComplete) {
        await processAIActions(tableId, table.currentHandId);
      }
      
      // Return fresh state
      const handState = poker.getHandState(table.currentHandId, playerId);
      res.json({ success: true, ...result, hand: handState });
    } catch (err) {
      console.error('Action error:', err);
      res.status(500).json({ success: false, error: 'Failed to submit action' });
    }
  });
  
  // ============================================================================
  // AI ACTION PROCESSING
  // ============================================================================
  
  async function processAIActions(tableId, handId) {
    let iterations = 0;
    const maxIterations = 20; // Safety limit
    
    while (iterations < maxIterations) {
      iterations++;
      
      const table = poker.getTable(tableId);
      if (!table || !table.currentHandId) break;
      
      const hand = poker.getHandState(handId);
      if (!hand || hand.phase === 'complete' || hand.phase === 'showdown') break;
      
      // Check if current action is on AI
      const actionPlayer = hand.players.find(p => p.seatNumber === hand.actionSeat);
      if (!actionPlayer || !actionPlayer.isAI || actionPlayer.folded || actionPlayer.allIn) break;
      
      // Get AI instance
      const aiKey = `${tableId}-${actionPlayer.seatNumber}`;
      let ai = aiPlayers.get(aiKey);
      
      if (!ai) {
        // Create AI from seat personality
        const seat = table.seats.find(s => s.seatNumber === actionPlayer.seatNumber);
        ai = new PokerAI(seat?.aiPersonality || 'goblin');
        aiPlayers.set(aiKey, ai);
      }
      
      // Get AI's cards for decision making
      const playerHand = db.prepare(`
        SELECT hole_cards FROM poker_player_hands WHERE hand_id = ? AND seat_number = ?
      `).get(handId, actionPlayer.seatNumber);
      
      const holeCards = JSON.parse(playerHand?.hole_cards || '[]');
      
      // Build AI game state
      const aiGameState = {
        ...hand,
        players: hand.players.map(p => ({
          ...p,
          cards: p.seatNumber === actionPlayer.seatNumber ? holeCards : p.cards
        }))
      };
      
      // Get AI decision
      const decision = ai.getAction(aiGameState, actionPlayer.seatNumber);
      
      if (!decision) break;
      
      // Add slight delay for realism (only in async context)
      const thinkTime = ai.getThinkingTime();
      await new Promise(resolve => setTimeout(resolve, Math.min(thinkTime, 500)));
      
      // Submit AI action
      const result = poker.submitAction(handId, actionPlayer.seatNumber, decision.action, decision.amount);
      
      // Log AI action with flavor
      const flavor = ai.getFlavorText(decision.action);
      console.log(`🎰 ${actionPlayer.playerName}: ${flavor} (${decision.action}${decision.amount ? ` ${decision.amount}` : ''})`);
      
      if (result.handComplete) break;
    }
  }
  
  // ============================================================================
  // INFO ENDPOINTS
  // ============================================================================
  
  /**
   * GET /api/poker - Poker info
   */
  router.get('/', (req, res) => {
    res.json({
      success: true,
      name: 'Clawd Poker',
      description: 'Texas Hold\'em with fantasy theming',
      suits: ['swords', 'potions', 'gems', 'shields'],
      faceCards: {
        J: 'Squire',
        Q: 'Mage',
        K: 'Dragon Lord',
        A: 'Artifact'
      },
      aiPersonalities: Object.entries(AI_PERSONALITIES).map(([key, p]) => ({
        key,
        name: p.name,
        emoji: p.emoji,
        description: p.description
      })),
      endpoints: {
        listTables: 'GET /api/poker/tables',
        createTable: 'POST /api/poker/tables',
        getTable: 'GET /api/poker/tables/:id',
        joinTable: 'POST /api/poker/tables/:id/join',
        leaveTable: 'POST /api/poker/tables/:id/leave',
        addAI: 'POST /api/poker/tables/:id/ai',
        startHand: 'POST /api/poker/tables/:id/start',
        getHand: 'GET /api/poker/tables/:id/hand',
        submitAction: 'POST /api/poker/tables/:id/action'
      }
    });
  });
  
  /**
   * GET /api/poker/ai-personalities - List AI personalities
   */
  router.get('/ai-personalities', (req, res) => {
    res.json({
      success: true,
      personalities: Object.entries(AI_PERSONALITIES).map(([key, p]) => ({
        key,
        name: p.name,
        emoji: p.emoji,
        description: p.description,
        traits: {
          aggression: p.aggression,
          bluffFrequency: p.bluffFrequency,
          tightness: p.tightness
        }
      }))
    });
  });
  
  return router;
}

module.exports = { createPokerRoutes };
