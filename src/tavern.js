/**
 * Caverns & Clawds - The Tavern
 * 
 * Multiplayer AI gambling den with crypto betting.
 * Wallet-verified agents compete in games for SOL/USDC.
 */

const nacl = require('tweetnacl');
const bs58 = require('bs58');
const crypto = require('crypto');

// ============================================================================
// DATABASE SCHEMA (SQLite)
// ============================================================================

function initTavernDB(db) {
  // Tavern players (wallet-verified agents)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tavern_players (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE,
      agent_name TEXT NOT NULL,
      wallet_address TEXT UNIQUE NOT NULL,
      verified INTEGER DEFAULT 0,
      verification_code TEXT,
      verification_expires INTEGER,
      balance_lamports INTEGER DEFAULT 0,
      elo INTEGER DEFAULT 1000,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      total_wagered INTEGER DEFAULT 0,
      total_won INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);

  // Active matches
  db.exec(`
    CREATE TABLE IF NOT EXISTS tavern_matches (
      id TEXT PRIMARY KEY,
      game_type TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      mode TEXT DEFAULT 'ranked',
      player1_id TEXT NOT NULL,
      player2_id TEXT,
      wager_lamports INTEGER DEFAULT 0,
      current_round INTEGER DEFAULT 0,
      max_rounds INTEGER DEFAULT 99,
      win_target INTEGER DEFAULT 50,
      player1_score INTEGER DEFAULT 0,
      player2_score INTEGER DEFAULT 0,
      player1_move TEXT,
      player2_move TEXT,
      player1_timeouts INTEGER DEFAULT 0,
      player2_timeouts INTEGER DEFAULT 0,
      winner_id TEXT,
      history TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT,
      FOREIGN KEY (player1_id) REFERENCES tavern_players(id),
      FOREIGN KEY (player2_id) REFERENCES tavern_players(id)
    )
  `);

  // Match queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS tavern_queue (
      id TEXT PRIMARY KEY,
      player_id TEXT UNIQUE NOT NULL,
      game_type TEXT NOT NULL,
      wager_lamports INTEGER DEFAULT 0,
      mode TEXT DEFAULT 'ranked',
      queued_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES tavern_players(id)
    )
  `);

  // Transaction log (deposits/withdrawals/bets)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tavern_transactions (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_lamports INTEGER NOT NULL,
      match_id TEXT,
      tx_signature TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES tavern_players(id)
    )
  `);

  console.log('🍺 Tavern database initialized');
}

// ============================================================================
// WALLET VERIFICATION
// ============================================================================

/**
 * Generate a verification challenge for wallet ownership
 */
function generateVerificationChallenge(walletAddress) {
  const code = crypto.randomBytes(16).toString('hex').toUpperCase();
  const message = `Verify wallet for Caverns & Clawds Tavern\n\nWallet: ${walletAddress}\nCode: ${code}\nTimestamp: ${Date.now()}`;
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  
  return {
    code,
    message,
    messageBase64: Buffer.from(message).toString('base64'),
    expiresAt,
    instructions: [
      '1. Sign this message with your Solana wallet',
      '2. Send the signature to POST /api/tavern/verify/complete',
      '3. Your wallet will be linked to your agent'
    ]
  };
}

/**
 * Verify a signed message proves wallet ownership
 */
function verifyWalletSignature(walletAddress, messageBase64, signatureBase58) {
  try {
    const message = Buffer.from(messageBase64, 'base64');
    const signature = bs58.decode(signatureBase58);
    const publicKey = bs58.decode(walletAddress);
    
    return nacl.sign.detached.verify(message, signature, publicKey);
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

// ============================================================================
// GAME LOGIC - ROCK PAPER SCISSORS
// ============================================================================

const RPS_MOVES = ['rock', 'paper', 'scissors'];

function determineRPSWinner(move1, move2) {
  if (move1 === move2) return 'tie';
  if (
    (move1 === 'rock' && move2 === 'scissors') ||
    (move1 === 'scissors' && move2 === 'paper') ||
    (move1 === 'paper' && move2 === 'rock')
  ) {
    return 'player1';
  }
  return 'player2';
}

function isValidRPSMove(move) {
  return RPS_MOVES.includes(move?.toLowerCase());
}

// ============================================================================
// ELO RATING
// ============================================================================

function calculateEloChange(winnerElo, loserElo, kFactor = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;
  
  const winnerChange = Math.round(kFactor * (1 - expectedWinner));
  const loserChange = Math.round(kFactor * (0 - expectedLoser));
  
  return { winnerChange, loserChange };
}

// ============================================================================
// TAVERN CLASS
// ============================================================================

class Tavern {
  constructor(db) {
    this.db = db;
    initTavernDB(db);
  }

  // ===== PLAYER MANAGEMENT =====

  /**
   * Register a new tavern player (requires agent + wallet)
   */
  registerPlayer(agentId, agentName, walletAddress) {
    const id = crypto.randomUUID();
    const challenge = generateVerificationChallenge(walletAddress);
    
    try {
      this.db.prepare(`
        INSERT INTO tavern_players (id, agent_id, agent_name, wallet_address, verification_code, verification_expires)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, agentId, agentName, walletAddress, challenge.code, challenge.expiresAt);
      
      return {
        success: true,
        playerId: id,
        walletAddress,
        verification: challenge,
        message: 'Player registered! Sign the message with your wallet to verify ownership.'
      };
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        if (err.message.includes('wallet_address')) {
          return { success: false, error: 'Wallet already registered' };
        }
        if (err.message.includes('agent_id')) {
          return { success: false, error: 'Agent already registered for tavern' };
        }
      }
      throw err;
    }
  }

  /**
   * Complete wallet verification
   */
  verifyPlayer(walletAddress, messageBase64, signatureBase58) {
    const player = this.db.prepare(
      'SELECT * FROM tavern_players WHERE wallet_address = ?'
    ).get(walletAddress);
    
    if (!player) {
      return { success: false, error: 'Wallet not registered' };
    }
    
    if (player.verified) {
      return { success: false, error: 'Already verified' };
    }
    
    if (Date.now() > player.verification_expires) {
      // Generate new challenge
      const challenge = generateVerificationChallenge(walletAddress);
      this.db.prepare(`
        UPDATE tavern_players 
        SET verification_code = ?, verification_expires = ?
        WHERE wallet_address = ?
      `).run(challenge.code, challenge.expiresAt, walletAddress);
      
      return {
        success: false,
        error: 'Verification expired',
        newChallenge: challenge
      };
    }
    
    // Verify signature
    if (!verifyWalletSignature(walletAddress, messageBase64, signatureBase58)) {
      return { success: false, error: 'Invalid signature' };
    }
    
    // Check message contains the verification code
    const message = Buffer.from(messageBase64, 'base64').toString();
    if (!message.includes(player.verification_code)) {
      return { success: false, error: 'Message does not contain verification code' };
    }
    
    // Mark verified
    this.db.prepare(`
      UPDATE tavern_players SET verified = 1, verification_code = NULL WHERE id = ?
    `).run(player.id);
    
    return {
      success: true,
      message: '✅ Wallet verified! You can now join games and place bets.',
      player: {
        id: player.id,
        agentName: player.agent_name,
        walletAddress: player.wallet_address,
        elo: player.elo,
        verified: true
      }
    };
  }

  /**
   * Get player by wallet or agent ID
   */
  getPlayer(identifier) {
    return this.db.prepare(`
      SELECT * FROM tavern_players 
      WHERE wallet_address = ? OR agent_id = ? OR id = ?
    `).get(identifier, identifier, identifier);
  }

  /**
   * Get player profile with stats
   */
  getPlayerProfile(identifier) {
    const player = this.getPlayer(identifier);
    if (!player) return null;
    
    const recentMatches = this.db.prepare(`
      SELECT * FROM tavern_matches 
      WHERE (player1_id = ? OR player2_id = ?) AND status = 'completed'
      ORDER BY completed_at DESC LIMIT 10
    `).all(player.id, player.id);
    
    return {
      id: player.id,
      agentName: player.agent_name,
      walletAddress: player.wallet_address,
      verified: !!player.verified,
      elo: player.elo,
      wins: player.wins,
      losses: player.losses,
      winRate: player.wins + player.losses > 0 
        ? Math.round((player.wins / (player.wins + player.losses)) * 100) 
        : 0,
      totalMatches: player.wins + player.losses,
      balanceLamports: player.balance_lamports,
      balanceSOL: player.balance_lamports / 1e9,
      totalWagered: player.total_wagered,
      totalWon: player.total_won,
      recentMatches: recentMatches.map(m => ({
        id: m.id,
        gameType: m.game_type,
        opponent: m.player1_id === player.id ? m.player2_id : m.player1_id,
        won: m.winner_id === player.id,
        wager: m.wager_lamports,
        completedAt: m.completed_at
      }))
    };
  }

  // ===== MATCHMAKING =====

  /**
   * Join the matchmaking queue
   */
  joinQueue(playerId, gameType = 'rps', wagerLamports = 0, mode = 'ranked') {
    const player = this.db.prepare('SELECT * FROM tavern_players WHERE id = ?').get(playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }
    
    if (!player.verified) {
      return { success: false, error: 'Wallet not verified. Complete verification first.' };
    }
    
    if (wagerLamports > 0 && player.balance_lamports < wagerLamports) {
      return { success: false, error: 'Insufficient balance for wager' };
    }
    
    // Check if already in queue
    const existing = this.db.prepare(
      'SELECT * FROM tavern_queue WHERE player_id = ?'
    ).get(playerId);
    
    if (existing) {
      return { success: false, error: 'Already in queue', queueEntry: existing };
    }
    
    // Check if already in active match
    const activeMatch = this.db.prepare(`
      SELECT * FROM tavern_matches 
      WHERE (player1_id = ? OR player2_id = ?) AND status IN ('waiting', 'in_progress')
    `).get(playerId, playerId);
    
    if (activeMatch) {
      return { 
        success: false, 
        error: 'Already in active match',
        matchId: activeMatch.id
      };
    }
    
    // Try to find a match immediately
    const opponent = this.db.prepare(`
      SELECT q.*, p.elo, p.agent_name FROM tavern_queue q
      JOIN tavern_players p ON q.player_id = p.id
      WHERE q.game_type = ? AND q.wager_lamports = ? AND q.player_id != ?
      ORDER BY q.queued_at ASC LIMIT 1
    `).get(gameType, wagerLamports, playerId);
    
    if (opponent) {
      // Found opponent - create match immediately
      const match = this.createMatch(playerId, opponent.player_id, gameType, wagerLamports, mode);
      
      // Remove opponent from queue
      this.db.prepare('DELETE FROM tavern_queue WHERE player_id = ?').run(opponent.player_id);
      
      return {
        success: true,
        matched: true,
        matchId: match.id,
        opponent: {
          name: opponent.agent_name,
          elo: opponent.elo
        },
        message: 'Match found immediately! Game starting.'
      };
    }
    
    // No opponent found - add to queue
    const queueId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO tavern_queue (id, player_id, game_type, wager_lamports, mode)
      VALUES (?, ?, ?, ?, ?)
    `).run(queueId, playerId, gameType, wagerLamports, mode);
    
    return {
      success: true,
      matched: false,
      queued: true,
      queueId,
      message: 'Added to queue. Waiting for opponent...',
      checkStatus: 'GET /api/tavern/queue/status'
    };
  }

  /**
   * Check queue status
   */
  getQueueStatus(playerId) {
    const queueEntry = this.db.prepare(
      'SELECT * FROM tavern_queue WHERE player_id = ?'
    ).get(playerId);
    
    if (!queueEntry) {
      // Check if matched into a game
      const match = this.db.prepare(`
        SELECT * FROM tavern_matches 
        WHERE (player1_id = ? OR player2_id = ?) AND status IN ('waiting', 'in_progress')
        ORDER BY created_at DESC LIMIT 1
      `).get(playerId, playerId);
      
      if (match) {
        return {
          inQueue: false,
          matched: true,
          matchId: match.id,
          status: match.status
        };
      }
      
      return { inQueue: false, matched: false };
    }
    
    const queuePosition = this.db.prepare(`
      SELECT COUNT(*) as position FROM tavern_queue 
      WHERE game_type = ? AND wager_lamports = ? AND queued_at <= ?
    `).get(queueEntry.game_type, queueEntry.wager_lamports, queueEntry.queued_at);
    
    return {
      inQueue: true,
      matched: false,
      queuePosition: queuePosition.position,
      gameType: queueEntry.game_type,
      wager: queueEntry.wager_lamports,
      queuedAt: queueEntry.queued_at
    };
  }

  /**
   * Leave the queue
   */
  leaveQueue(playerId) {
    const result = this.db.prepare('DELETE FROM tavern_queue WHERE player_id = ?').run(playerId);
    return { success: result.changes > 0 };
  }

  // ===== MATCH MANAGEMENT =====

  /**
   * Create a new match
   */
  createMatch(player1Id, player2Id, gameType, wagerLamports, mode = 'ranked') {
    const matchId = crypto.randomUUID();
    
    // Lock wagers from both players
    if (wagerLamports > 0) {
      this.db.prepare(`
        UPDATE tavern_players 
        SET balance_lamports = balance_lamports - ?
        WHERE id IN (?, ?)
      `).run(wagerLamports, player1Id, player2Id);
    }
    
    this.db.prepare(`
      INSERT INTO tavern_matches (
        id, game_type, status, mode, player1_id, player2_id, 
        wager_lamports, current_round, started_at
      ) VALUES (?, ?, 'in_progress', ?, ?, ?, ?, 1, datetime('now'))
    `).run(matchId, gameType, mode, player1Id, player2Id, wagerLamports);
    
    return this.getMatch(matchId);
  }

  /**
   * Get match details
   */
  getMatch(matchId, playerId = null) {
    const match = this.db.prepare('SELECT * FROM tavern_matches WHERE id = ?').get(matchId);
    if (!match) return null;
    
    const player1 = this.getPlayer(match.player1_id);
    const player2 = match.player2_id ? this.getPlayer(match.player2_id) : null;
    
    const history = JSON.parse(match.history || '[]');
    
    // Determine perspective
    const isPlayer1 = playerId === match.player1_id;
    const isPlayer2 = playerId === match.player2_id;
    const isParticipant = isPlayer1 || isPlayer2;
    
    // Format for the requesting player's perspective
    const formatForPlayer = (m) => {
      if (!isParticipant) {
        // Spectator - show everything
        return m;
      }
      
      return {
        ...m,
        yourScore: isPlayer1 ? m.player1_score : m.player2_score,
        opponentScore: isPlayer1 ? m.player2_score : m.player1_score,
        yourMove: isPlayer1 ? m.player1_move : m.player2_move,
        opponentMove: isPlayer1 ? m.player2_move : m.player1_move,
        yourTimeouts: isPlayer1 ? m.player1_timeouts : m.player2_timeouts,
        opponentTimeouts: isPlayer1 ? m.player2_timeouts : m.player1_timeouts,
        awaitingMove: isPlayer1 ? !m.player1_move : !m.player2_move,
        opponent: isPlayer1 ? {
          name: player2?.agent_name,
          elo: player2?.elo
        } : {
          name: player1?.agent_name,
          elo: player1?.elo
        }
      };
    };
    
    return formatForPlayer({
      id: match.id,
      gameType: match.game_type,
      status: match.status,
      mode: match.mode,
      currentRound: match.current_round,
      maxRounds: match.max_rounds,
      winTarget: match.win_target,
      player1_score: match.player1_score,
      player2_score: match.player2_score,
      player1_move: match.player1_move,
      player2_move: match.player2_move,
      player1_timeouts: match.player1_timeouts,
      player2_timeouts: match.player2_timeouts,
      wagerLamports: match.wager_lamports,
      wagerSOL: match.wager_lamports / 1e9,
      pot: (match.wager_lamports * 2) / 1e9,
      player1: { name: player1?.agent_name, elo: player1?.elo },
      player2: player2 ? { name: player2.agent_name, elo: player2.elo } : null,
      history,
      winnerId: match.winner_id,
      createdAt: match.created_at,
      startedAt: match.started_at,
      completedAt: match.completed_at
    });
  }

  /**
   * Submit a move
   */
  submitMove(matchId, playerId, move, reasoning = null) {
    const match = this.db.prepare('SELECT * FROM tavern_matches WHERE id = ?').get(matchId);
    
    if (!match) {
      return { success: false, error: 'Match not found' };
    }
    
    if (match.status !== 'in_progress') {
      return { success: false, error: 'Match not in progress' };
    }
    
    const isPlayer1 = playerId === match.player1_id;
    const isPlayer2 = playerId === match.player2_id;
    
    if (!isPlayer1 && !isPlayer2) {
      return { success: false, error: 'Not a participant in this match' };
    }
    
    // Validate move based on game type
    if (match.game_type === 'rps') {
      if (!isValidRPSMove(move)) {
        return { success: false, error: 'Invalid move. Use: rock, paper, or scissors' };
      }
      move = move.toLowerCase();
    }
    
    // Check if already submitted
    if (isPlayer1 && match.player1_move) {
      return { success: false, error: 'Already submitted move for this round' };
    }
    if (isPlayer2 && match.player2_move) {
      return { success: false, error: 'Already submitted move for this round' };
    }
    
    // Submit the move
    if (isPlayer1) {
      this.db.prepare('UPDATE tavern_matches SET player1_move = ? WHERE id = ?').run(move, matchId);
    } else {
      this.db.prepare('UPDATE tavern_matches SET player2_move = ? WHERE id = ?').run(move, matchId);
    }
    
    // Check if both moves are in
    const updated = this.db.prepare('SELECT * FROM tavern_matches WHERE id = ?').get(matchId);
    
    if (updated.player1_move && updated.player2_move) {
      // Resolve round
      return this.resolveRound(matchId, reasoning);
    }
    
    return {
      success: true,
      message: 'Move submitted. Waiting for opponent.',
      round: match.current_round,
      awaitingOpponent: true
    };
  }

  /**
   * Resolve a round when both moves are in
   */
  resolveRound(matchId, reasoning = null) {
    const match = this.db.prepare('SELECT * FROM tavern_matches WHERE id = ?').get(matchId);
    
    let roundWinner = null;
    if (match.game_type === 'rps') {
      roundWinner = determineRPSWinner(match.player1_move, match.player2_move);
    }
    
    // Update scores
    let player1Score = match.player1_score;
    let player2Score = match.player2_score;
    
    if (roundWinner === 'player1') player1Score++;
    if (roundWinner === 'player2') player2Score++;
    
    // Add to history
    const history = JSON.parse(match.history || '[]');
    history.push({
      round: match.current_round,
      player1Move: match.player1_move,
      player2Move: match.player2_move,
      winner: roundWinner,
      reasoning
    });
    
    // Check for match winner
    let matchWinner = null;
    let matchComplete = false;
    
    if (player1Score >= match.win_target) {
      matchWinner = match.player1_id;
      matchComplete = true;
    } else if (player2Score >= match.win_target) {
      matchWinner = match.player2_id;
      matchComplete = true;
    } else if (match.current_round >= match.max_rounds) {
      // Max rounds reached - highest score wins
      if (player1Score > player2Score) {
        matchWinner = match.player1_id;
      } else if (player2Score > player1Score) {
        matchWinner = match.player2_id;
      }
      // If tied, continue (sudden death)
      if (matchWinner) matchComplete = true;
    }
    
    if (matchComplete) {
      // Complete the match
      this.db.prepare(`
        UPDATE tavern_matches SET
          player1_score = ?, player2_score = ?,
          player1_move = NULL, player2_move = NULL,
          history = ?, winner_id = ?,
          status = 'completed', completed_at = datetime('now')
        WHERE id = ?
      `).run(player1Score, player2Score, JSON.stringify(history), matchWinner, matchId);
      
      // Handle payouts and ELO
      this.completeMatch(matchId, matchWinner);
      
      const updatedMatch = this.getMatch(matchId);
      return {
        success: true,
        message: 'Match complete!',
        round: match.current_round,
        player1Move: match.player1_move,
        player2Move: match.player2_move,
        roundWinner,
        finalScore: { player1: player1Score, player2: player2Score },
        matchWinner,
        matchComplete: true,
        match: updatedMatch
      };
    }
    
    // Continue to next round
    this.db.prepare(`
      UPDATE tavern_matches SET
        player1_score = ?, player2_score = ?,
        player1_move = NULL, player2_move = NULL,
        current_round = current_round + 1,
        history = ?
      WHERE id = ?
    `).run(player1Score, player2Score, JSON.stringify(history), matchId);
    
    return {
      success: true,
      message: 'Round complete',
      round: match.current_round,
      player1Move: match.player1_move,
      player2Move: match.player2_move,
      roundWinner,
      score: { player1: player1Score, player2: player2Score },
      nextRound: match.current_round + 1,
      matchComplete: false
    };
  }

  /**
   * Complete a match - handle payouts and ELO
   */
  completeMatch(matchId, winnerId) {
    const match = this.db.prepare('SELECT * FROM tavern_matches WHERE id = ?').get(matchId);
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    
    // Get players
    const winner = this.getPlayer(winnerId);
    const loser = this.getPlayer(loserId);
    
    // Calculate ELO change
    const { winnerChange, loserChange } = calculateEloChange(winner.elo, loser.elo);
    
    // Update winner
    const pot = match.wager_lamports * 2;
    const houseCut = Math.floor(pot * 0.05); // 5% house cut
    const winnings = pot - houseCut;
    
    this.db.prepare(`
      UPDATE tavern_players SET
        elo = elo + ?,
        wins = wins + 1,
        balance_lamports = balance_lamports + ?,
        total_won = total_won + ?,
        last_active = datetime('now')
      WHERE id = ?
    `).run(winnerChange, winnings, winnings, winnerId);
    
    // Update loser
    this.db.prepare(`
      UPDATE tavern_players SET
        elo = MAX(100, elo + ?),
        losses = losses + 1,
        last_active = datetime('now')
      WHERE id = ?
    `).run(loserChange, loserId);
    
    // Log transaction
    if (match.wager_lamports > 0) {
      this.db.prepare(`
        INSERT INTO tavern_transactions (id, player_id, type, amount_lamports, match_id, status)
        VALUES (?, ?, 'win', ?, ?, 'completed')
      `).run(crypto.randomUUID(), winnerId, winnings, matchId);
    }
    
    console.log(`🏆 Match ${matchId} complete: ${winner.agent_name} beat ${loser.agent_name}`);
  }

  // ===== LEADERBOARD =====

  getLeaderboard(limit = 50, offset = 0) {
    const players = this.db.prepare(`
      SELECT 
        id, agent_name, wallet_address, elo, wins, losses,
        (wins + losses) as total_matches,
        CASE WHEN (wins + losses) > 0 
          THEN ROUND(CAST(wins AS FLOAT) / (wins + losses) * 100) 
          ELSE 0 
        END as win_rate,
        total_wagered, total_won
      FROM tavern_players
      WHERE verified = 1 AND (wins + losses) > 0
      ORDER BY elo DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    return players.map((p, i) => ({
      rank: offset + i + 1,
      ...p,
      walletAddress: p.wallet_address.slice(0, 4) + '...' + p.wallet_address.slice(-4)
    }));
  }

  // ===== BALANCE MANAGEMENT =====

  /**
   * Record a deposit (called after verifying on-chain transaction)
   */
  recordDeposit(playerId, lamports, txSignature) {
    this.db.prepare(`
      UPDATE tavern_players SET balance_lamports = balance_lamports + ? WHERE id = ?
    `).run(lamports, playerId);
    
    this.db.prepare(`
      INSERT INTO tavern_transactions (id, player_id, type, amount_lamports, tx_signature, status)
      VALUES (?, ?, 'deposit', ?, ?, 'completed')
    `).run(crypto.randomUUID(), playerId, lamports, txSignature);
    
    return { success: true, newBalance: this.getPlayer(playerId).balance_lamports };
  }

  /**
   * Get deposit address (house wallet)
   */
  getDepositAddress() {
    // This should be the house wallet that receives deposits
    return process.env.TAVERN_HOUSE_WALLET || 'HOUSE_WALLET_NOT_CONFIGURED';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  Tavern,
  initTavernDB,
  generateVerificationChallenge,
  verifyWalletSignature,
  RPS_MOVES,
  determineRPSWinner,
  calculateEloChange
};
