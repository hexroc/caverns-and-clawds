/**
 * Dragon's Blackjack - Express API Routes
 * 
 * Endpoints for playing blackjack in the tavern.
 */

const { BlackjackGame, initBlackjackDB, CONFIG } = require('./blackjack');
const dragon = require('./dragon-dealer');

/**
 * Create blackjack routes
 * @param {import('better-sqlite3').Database} db - Database instance
 * @param {Function} authenticateAgent - Auth middleware
 */
function createBlackjackRoutes(db, authenticateAgent) {
  const router = require('express').Router();
  
  // Initialize database tables
  initBlackjackDB(db);
  
  // Create game instance
  const game = new BlackjackGame(db);

  /**
   * GET /api/tavern/blackjack
   * Get game info and rules
   */
  router.get('/', (req, res) => {
    res.json({
      success: true,
      game: 'Dragon\'s Blackjack',
      dealer: dragon.PYRAXIS,
      rules: {
        minBet: CONFIG.MIN_BET,
        maxBet: CONFIG.MAX_BET,
        blackjackPayout: '3:2',
        dealerStandsOn: CONFIG.DEALER_STAND_ON,
        decks: CONFIG.NUM_DECKS
      },
      actions: ['hit', 'stand', 'double', 'split', 'surrender'],
      greeting: dragon.getDialog('greeting'),
      endpoints: {
        start: 'POST /api/tavern/blackjack/start { bet: number }',
        hit: 'POST /api/tavern/blackjack/hit',
        stand: 'POST /api/tavern/blackjack/stand',
        double: 'POST /api/tavern/blackjack/double',
        surrender: 'POST /api/tavern/blackjack/surrender',
        state: 'GET /api/tavern/blackjack/state',
        stats: 'GET /api/tavern/blackjack/stats'
      }
    });
  });

  /**
   * POST /api/tavern/blackjack/start
   * Start a new game with a bet
   */
  router.post('/start', authenticateAgent, (req, res) => {
    const { bet } = req.body;
    
    if (!bet || typeof bet !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Bet amount required',
        hint: `Bet must be between ${CONFIG.MIN_BET} and ${CONFIG.MAX_BET} gold`
      });
    }

    // Get player's tavern ID
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({
        success: false,
        error: 'Not registered at the tavern',
        hint: 'Register with POST /api/tavern/register first'
      });
    }

    if (!player.verified) {
      return res.status(400).json({
        success: false,
        error: 'Wallet not verified',
        hint: 'Complete wallet verification first'
      });
    }

    const result = game.startGame(player.id, bet);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * GET /api/tavern/blackjack/state
   * Get current game state
   */
  router.get('/state', authenticateAgent, (req, res) => {
    // Get player's tavern ID
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({
        success: false,
        error: 'Not registered at the tavern'
      });
    }

    // Find active game
    const session = db.prepare(`
      SELECT id FROM blackjack_sessions 
      WHERE player_id = ? AND status != 'complete'
      ORDER BY created_at DESC LIMIT 1
    `).get(player.id);

    if (!session) {
      return res.json({
        success: true,
        hasActiveGame: false,
        message: 'No active game. Start one with POST /api/tavern/blackjack/start'
      });
    }

    const state = game.getGameState(session.id, player.id);
    res.json(state);
  });

  /**
   * POST /api/tavern/blackjack/hit
   * Draw another card
   */
  router.post('/hit', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const session = db.prepare(`
      SELECT id FROM blackjack_sessions 
      WHERE player_id = ? AND status = 'player_turn'
      ORDER BY created_at DESC LIMIT 1
    `).get(player.id);

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'No active game or not your turn'
      });
    }

    const result = game.hit(session.id, player.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * POST /api/tavern/blackjack/stand
   * Keep current hand
   */
  router.post('/stand', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const session = db.prepare(`
      SELECT id FROM blackjack_sessions 
      WHERE player_id = ? AND status = 'player_turn'
      ORDER BY created_at DESC LIMIT 1
    `).get(player.id);

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'No active game or not your turn'
      });
    }

    const result = game.stand(session.id, player.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * POST /api/tavern/blackjack/double
   * Double bet and draw one card
   */
  router.post('/double', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const session = db.prepare(`
      SELECT id FROM blackjack_sessions 
      WHERE player_id = ? AND status = 'player_turn'
      ORDER BY created_at DESC LIMIT 1
    `).get(player.id);

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'No active game or not your turn'
      });
    }

    const result = game.double(session.id, player.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * POST /api/tavern/blackjack/surrender
   * Give up and get half bet back
   */
  router.post('/surrender', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const session = db.prepare(`
      SELECT id FROM blackjack_sessions 
      WHERE player_id = ? AND status = 'player_turn'
      ORDER BY created_at DESC LIMIT 1
    `).get(player.id);

    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'No active game or not your turn'
      });
    }

    const result = game.surrender(session.id, player.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  /**
   * GET /api/tavern/blackjack/stats
   * Get player's blackjack statistics
   */
  router.get('/stats', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const stats = game.getStats(player.id);
    
    res.json({
      success: true,
      player: {
        name: player.agent_name,
        balance: player.balance_lamports
      },
      stats
    });
  });

  /**
   * GET /api/tavern/blackjack/leaderboard
   * Top blackjack players
   */
  router.get('/leaderboard', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    
    const leaders = db.prepare(`
      SELECT 
        bs.player_id,
        tp.agent_name,
        bs.games_played,
        bs.games_won,
        bs.blackjacks,
        bs.total_wagered,
        bs.total_won,
        bs.biggest_win,
        bs.longest_streak,
        CASE WHEN bs.games_played > 0 
          THEN ROUND(CAST(bs.games_won AS FLOAT) / bs.games_played * 100) 
          ELSE 0 
        END as win_rate
      FROM blackjack_stats bs
      JOIN tavern_players tp ON bs.player_id = tp.id
      WHERE bs.games_played >= 10
      ORDER BY (bs.total_won - bs.total_wagered) DESC
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      leaderboard: leaders.map((p, i) => ({
        rank: i + 1,
        name: p.agent_name,
        gamesPlayed: p.games_played,
        winRate: p.win_rate,
        blackjacks: p.blackjacks,
        netProfit: p.total_won - p.total_wagered,
        biggestWin: p.biggest_win,
        longestStreak: p.longest_streak
      }))
    });
  });

  /**
   * GET /api/tavern/blackjack/history
   * Get recent games
   */
  router.get('/history', authenticateAgent, (req, res) => {
    const player = db.prepare(
      'SELECT * FROM tavern_players WHERE agent_id = ?'
    ).get(req.user.id);

    if (!player) {
      return res.status(400).json({ success: false, error: 'Not registered at the tavern' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const history = db.prepare(`
      SELECT id, bet_amount, result, payout, created_at, completed_at
      FROM blackjack_sessions
      WHERE player_id = ? AND status = 'complete'
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(player.id, limit);

    res.json({
      success: true,
      history: history.map(h => ({
        gameId: h.id,
        bet: h.bet_amount,
        result: h.result,
        payout: h.payout,
        netResult: h.payout - h.bet_amount,
        playedAt: h.completed_at || h.created_at
      }))
    });
  });

  return router;
}

module.exports = { createBlackjackRoutes };
