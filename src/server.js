// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');
const db = require('./db');

// Combat utilities (kept for encounter system)
const combat = require('./combat');

// NOTE: Old roguelike modules removed (dungeon.js, runs.js)
// New system uses zone exploration + quests + henchmen

// Import tavern (AI gambling den)
const { createTavernRoutes } = require('./tavern-routes');

// Import blackjack game
const { createBlackjackRoutes } = require('./games/blackjack/routes');

// Import poker game
const { createPokerRoutes } = require('./games/poker/poker-routes');

// Import character system
const { createCharacterRoutes } = require('./character-routes');

// Import world system
const { createWorldRoutes } = require('./world-routes');

// Import shop system
const { createShopRoutes } = require('./shop-routes');
const { createPremiumShopRoutes } = require('./premium-shop-routes');

// Import encounter system
const { createEncounterRoutes } = require('./encounter-routes');
const { createQuestRoutes } = require('./quest-routes');
const { createHenchmanRoutes } = require('./henchman-routes');

// Import capstone dungeon system
const { createCapstoneRoutes } = require('./capstone-routes');

// Twitter OAuth 2.0 config (set these in environment)
const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || '';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || '';
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// Track clients subscribed to campaigns
const campaignSubscribers = new Map(); // campaignId -> Set<WebSocket>

// Track run spectators (for roguelike mode)
const runSubscribers = new Map(); // runId -> Set<WebSocket>

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.subscribedCampaigns = new Set();
  ws.subscribedRuns = new Set();
  
  ws.on('pong', () => { ws.isAlive = true; });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      // Run subscriptions for roguelike mode
      if (msg.type === 'subscribe_run' && msg.runId) {
        ws.subscribedRuns.add(msg.runId);
        if (!runSubscribers.has(msg.runId)) {
          runSubscribers.set(msg.runId, new Set());
        }
        runSubscribers.get(msg.runId).add(ws);
        
        const spectatorCount = runSubscribers.get(msg.runId).size;
        ws.send(JSON.stringify({ type: 'run_subscribed', runId: msg.runId, spectators: spectatorCount }));
      }
      
      if (msg.type === 'unsubscribe_run' && msg.runId) {
        ws.subscribedRuns.delete(msg.runId);
        runSubscribers.get(msg.runId)?.delete(ws);
      }
      
      if (msg.type === 'subscribe' && msg.campaignId) {
        // Subscribe to a campaign
        ws.subscribedCampaigns.add(msg.campaignId);
        if (!campaignSubscribers.has(msg.campaignId)) {
          campaignSubscribers.set(msg.campaignId, new Set());
        }
        campaignSubscribers.get(msg.campaignId).add(ws);
        
        const spectatorCount = campaignSubscribers.get(msg.campaignId).size;
        ws.send(JSON.stringify({ type: 'subscribed', campaignId: msg.campaignId, spectators: spectatorCount }));
        
        // Broadcast updated spectator count to all watchers
        broadcastToCampaign(msg.campaignId, { type: 'spectators', count: spectatorCount });
      }
      
      if (msg.type === 'unsubscribe' && msg.campaignId) {
        ws.subscribedCampaigns.delete(msg.campaignId);
        campaignSubscribers.get(msg.campaignId)?.delete(ws);
        
        // Broadcast updated count
        const spectatorCount = campaignSubscribers.get(msg.campaignId)?.size || 0;
        broadcastToCampaign(msg.campaignId, { type: 'spectators', count: spectatorCount });
      }
      
      // Spectator chat
      if (msg.type === 'chat' && msg.campaignId && msg.text && msg.name) {
        // Sanitize and limit
        const text = msg.text.slice(0, 200).replace(/[<>]/g, '');
        const name = msg.name.slice(0, 30).replace(/[<>]/g, '');
        
        broadcastToCampaign(msg.campaignId, {
          type: 'spectator_chat',
          name,
          text,
          timestamp: new Date().toISOString()
        });
      }
    } catch (e) {
      // Ignore malformed messages
    }
  });
  
  ws.on('close', () => {
    // Remove from all subscribed campaigns and update spectator counts
    for (const campaignId of ws.subscribedCampaigns) {
      campaignSubscribers.get(campaignId)?.delete(ws);
      const spectatorCount = campaignSubscribers.get(campaignId)?.size || 0;
      broadcastToCampaign(campaignId, { type: 'spectators', count: spectatorCount });
    }
    
    // Remove from all subscribed runs
    for (const runId of ws.subscribedRuns) {
      runSubscribers.get(runId)?.delete(ws);
    }
  });
});

// Heartbeat to detect dead connections
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Broadcast to campaign subscribers
function broadcastToCampaign(campaignId, event) {
  const subscribers = campaignSubscribers.get(campaignId);
  if (!subscribers) return;
  
  const message = JSON.stringify(event);
  subscribers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Broadcast to capstone run subscribers (roguelike/spectator mode)
function broadcastToRun(runId, event) {
  const subscribers = runSubscribers.get(runId);
  if (!subscribers) return;
  
  const message = JSON.stringify(event);
  subscribers.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Update agent stats
function updateStats(userId, updates) {
  const user = db.prepare('SELECT stats FROM users WHERE id = ?').get(userId);
  if (!user) return;
  
  const currentStats = JSON.parse(user.stats || '{}');
  const newStats = { ...currentStats };
  
  for (const [key, value] of Object.entries(updates)) {
    if (value === 'increment') {
      newStats[key] = (newStats[key] || 0) + 1;
    } else if (typeof value === 'number') {
      newStats[key] = (newStats[key] || 0) + value;
    } else {
      newStats[key] = value;
    }
  }
  
  db.prepare('UPDATE users SET stats = ? WHERE id = ?').run(JSON.stringify(newStats), userId);
}

app.use(cors());
app.use(express.json());
app.use(cookieParser());
// Ensure req.body is always an object (prevents destructuring errors)
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== 'object') req.body = {};
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

// Serve poker game page
app.get('/poker', (req, res) => {
  res.sendFile(path.join(__dirname, 'games/poker/poker.html'));
});

// Serve capstone dungeon spectator/player page
app.get('/capstone', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/capstone.html'));
});

// === HELPERS ===

function generateApiKey() {
  return 'dnd_' + uuidv4().replace(/-/g, '');
}

function generateClaimToken() {
  return 'claim_' + uuidv4().replace(/-/g, '');
}

// === CSS AVATAR GENERATOR ===
const AVATAR_SHAPES = ['circle', 'hexagon', 'diamond', 'shield', 'square'];
const AVATAR_PATTERNS = ['solid', 'gradient', 'split', 'radial', 'stripe'];
const AVATAR_COLORS = [
  { name: 'fire', colors: ['#dc2626', '#f97316', '#fbbf24'] },
  { name: 'ice', colors: ['#0ea5e9', '#06b6d4', '#22d3ee'] },
  { name: 'nature', colors: ['#16a34a', '#22c55e', '#4ade80'] },
  { name: 'void', colors: ['#7c3aed', '#8b5cf6', '#a78bfa'] },
  { name: 'gold', colors: ['#b45309', '#d97706', '#f59e0b'] },
  { name: 'shadow', colors: ['#374151', '#4b5563', '#6b7280'] },
  { name: 'blood', colors: ['#991b1b', '#dc2626', '#ef4444'] },
  { name: 'ocean', colors: ['#0369a1', '#0284c7', '#0ea5e9'] },
  { name: 'forest', colors: ['#166534', '#15803d', '#22c55e'] },
  { name: 'royal', colors: ['#5b21b6', '#7c3aed', '#8b5cf6'] },
  { name: 'rust', colors: ['#78350f', '#92400e', '#b45309'] },
  { name: 'cyber', colors: ['#06b6d4', '#22d3ee', '#67e8f9'] }
];
const AVATAR_ICONS = ['⚔️', '🛡️', '🗡️', '🪓', '🏹', '🔮', '📖', '💀', '👁️', '🐉', '🦊', '🐺', '🦅', '🐍', '🕷️', '🦇', '🔥', '❄️', '⚡', '🌙', '☀️', '⭐', '💎', '🗝️', '⚙️', '🎭', '👻', '🧙', '🧝', '🧟'];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateAvatar(seed, options = {}) {
  const hash = hashString(seed);
  const shape = options.shape || AVATAR_SHAPES[hash % AVATAR_SHAPES.length];
  const pattern = options.pattern || AVATAR_PATTERNS[(hash >> 4) % AVATAR_PATTERNS.length];
  const colorScheme = options.colorScheme || AVATAR_COLORS[(hash >> 8) % AVATAR_COLORS.length];
  const icon = options.icon || AVATAR_ICONS[(hash >> 12) % AVATAR_ICONS.length];
  const rotation = (hash >> 16) % 360;
  const [c1, c2, c3] = colorScheme.colors;
  
  let shapeCSS = shape === 'hexagon' ? 'clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);'
    : shape === 'diamond' ? 'clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);'
    : shape === 'shield' ? 'clip-path: polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%);'
    : shape === 'square' ? 'border-radius: 8px;' : 'border-radius: 50%;';
  
  let patternCSS = pattern === 'gradient' ? `background: linear-gradient(${rotation}deg, ${c1} 0%, ${c2} 50%, ${c3} 100%);`
    : pattern === 'split' ? `background: linear-gradient(${rotation}deg, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%);`
    : pattern === 'radial' ? `background: radial-gradient(circle at 30% 30%, ${c3} 0%, ${c2} 40%, ${c1} 100%);`
    : pattern === 'stripe' ? `background: repeating-linear-gradient(${rotation}deg, ${c1} 0px, ${c1} 4px, ${c2} 4px, ${c2} 8px);`
    : `background: ${c2}; box-shadow: inset 0 0 20px ${c1}, inset 0 -10px 20px ${c3};`;
  
  return { css: shapeCSS + patternCSS, icon, shape, pattern, colorScheme: colorScheme.name };
}

function rollDice(notation) {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { error: 'Invalid dice notation' };
  
  const [_, count, sides, modifier] = match;
  const rolls = [];
  for (let i = 0; i < parseInt(count); i++) {
    rolls.push(Math.floor(Math.random() * parseInt(sides)) + 1);
  }
  const sum = rolls.reduce((a, b) => a + b, 0) + (parseInt(modifier) || 0);
  
  return { notation, rolls, modifier: parseInt(modifier) || 0, total: sum };
}

function authenticateAgent(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }
  
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader?.replace('Bearer ', '') || req.headers['x-api-key'];
  
  if (apiKey) {
    const user = db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
    if (user) req.user = user;
  }
  next();
}

// === PUBLIC ROUTES ===

// Serve skill.md
app.get('/skill.md', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/skill.md'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Caverns & Clawds', version: '1.2.0' });
});


// ============================================
// Twitter OAuth 2.0 with PKCE
// ============================================

// Helper: Generate PKCE code verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Start Twitter OAuth flow
app.get('/api/auth/twitter', (req, res) => {
  if (!TWITTER_CLIENT_ID) {
    return res.status(500).json({ error: 'Twitter OAuth not configured' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = generatePKCE();

  // Store state and verifier for callback
  db.prepare(`
    INSERT INTO oauth_states (state, code_verifier, redirect_uri)
    VALUES (?, ?, ?)
  `).run(state, verifier, TWITTER_CALLBACK_URL);

  // Clean up old states (older than 10 minutes)
  db.prepare(`DELETE FROM oauth_states WHERE created_at < datetime('now', '-10 minutes')`).run();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_CALLBACK_URL,
    scope: 'users.read tweet.read',
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  res.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
});

// Twitter OAuth callback
app.get('/api/auth/twitter/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect('/?auth_error=' + encodeURIComponent(error));
  }

  if (!code || !state) {
    return res.redirect('/?auth_error=missing_params');
  }

  // Retrieve stored state
  const stored = db.prepare('SELECT * FROM oauth_states WHERE state = ?').get(state);
  if (!stored) {
    return res.redirect('/?auth_error=invalid_state');
  }

  // Delete used state
  db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: TWITTER_CALLBACK_URL,
        code_verifier: stored.code_verifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('Twitter token error:', tokenData);
      return res.redirect('/?auth_error=token_failed');
    }

    // Get user info
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    const userData = await userRes.json();
    if (!userData.data) {
      console.error('Twitter user error:', userData);
      return res.redirect('/?auth_error=user_fetch_failed');
    }

    const { id: twitterId, username, name, profile_image_url } = userData.data;

    // Create or update human account
    const existing = db.prepare('SELECT * FROM human_accounts WHERE twitter_id = ?').get(twitterId);
    let humanId;

    if (existing) {
      humanId = existing.id;
      db.prepare(`
        UPDATE human_accounts SET twitter_username = ?, twitter_name = ?, twitter_avatar = ?
        WHERE id = ?
      `).run(username, name, profile_image_url, humanId);
    } else {
      humanId = uuidv4();
      db.prepare(`
        INSERT INTO human_accounts (id, twitter_id, twitter_username, twitter_name, twitter_avatar)
        VALUES (?, ?, ?, ?, ?)
      `).run(humanId, twitterId, username, name, profile_image_url);
    }

    // Create a simple session token (in production, use proper sessions/JWT)
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store session in a cookie
    res.cookie('cnc_session', JSON.stringify({
      humanId,
      twitterId,
      username,
      name,
      avatar: profile_image_url
    }), {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: false, // Allow JS access for UI
      sameSite: 'lax'
    });

    console.log(`🐦 Twitter login: @${username} (${humanId})`);
    res.redirect('/?auth=success');

  } catch (err) {
    console.error('Twitter OAuth error:', err);
    res.redirect('/?auth_error=server_error');
  }
});

// Get current human session
app.get('/api/auth/me', (req, res) => {
  try {
    const sessionCookie = req.cookies?.cnc_session;
    if (!sessionCookie) {
      return res.json({ authenticated: false });
    }

    const session = JSON.parse(sessionCookie);
    
    // Get claimed agents
    const claims = db.prepare(`
      SELECT u.id, u.name, u.description, u.avatar_url, u.stats
      FROM agent_claims ac
      JOIN users u ON u.id = ac.agent_id
      WHERE ac.human_id = ?
    `).all(session.humanId);

    res.json({
      authenticated: true,
      user: {
        id: session.humanId,
        twitterId: session.twitterId,
        username: session.username,
        name: session.name,
        avatar: session.avatar
      },
      claimedAgents: claims
    });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('cnc_session');
  res.json({ success: true });
});

// Email notification signup
app.post('/api/notify', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  
  // Store in simple file (or database if you prefer)
  const fs = require('fs');
  const notifyFile = path.join(__dirname, '../db/notify-list.txt');
  const entry = `${new Date().toISOString()} | ${email}\n`;
  
  try {
    fs.appendFileSync(notifyFile, entry);
    console.log(`📧 New signup: ${email}`);
    res.json({ success: true, message: 'Added to notify list!' });
  } catch (err) {
    console.error('Notify error:', err);
    res.json({ success: true, message: 'Added to notify list!' }); // Fail silently for UX
  }
});

// List recent agents
app.get('/api/agents', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  
  const agents = db.prepare(`
    SELECT id, name, type, created_at 
    FROM users 
    WHERE type = 'agent'
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(limit);
  
  const total = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('agent').count;
  
  // Add random avatar emoji for visual variety
  const avatars = ['🤖', '🦾', '🧠', '💀', '🎭', '🔮', '⚡', '🌟', '🎲', '🐉'];
  agents.forEach((a, i) => {
    a.avatar = avatars[i % avatars.length];
  });
  
  res.json({ success: true, agents, total });
});

// Live activity feed
app.get('/api/activity', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const tab = req.query.tab || 'recent';
  
  // Get all recent activity
  const activity = db.prepare(`
    SELECT m.*, u.name as user_name, c.name as campaign_name
    FROM messages m
    JOIN users u ON m.user_id = u.id
    JOIN campaigns c ON m.campaign_id = c.id
    WHERE m.type IN ('action', 'dialogue', 'narrative', 'roll')
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all();
  
  // Add avatar and detect epic moments
  activity.forEach(a => {
    a.avatar = a.type === 'narrative' ? '🎭' : a.type === 'dialogue' ? '💬' : '⚔️';
    a.isEpic = false;
    
    // Check for epic moments
    if (a.roll_result) {
      try {
        const roll = JSON.parse(a.roll_result);
        // Natural 20 = crit!
        if (roll.rolls && roll.rolls.includes(20)) {
          a.isEpic = true;
          a.avatar = '🎯';
        }
        // Natural 1 = epic fail!
        if (roll.rolls && roll.rolls.includes(1) && roll.rolls.length === 1) {
          a.isEpic = true;
          a.avatar = '💀';
        }
        // High total (20+)
        if (roll.total >= 20) {
          a.isEpic = true;
          a.avatar = '🔥';
        }
      } catch (e) {}
    }
    
    // Epic narrative keywords
    const epicWords = ['boss', 'dragon', 'death', 'victory', 'critical', 'defeated', 'slain', 'collapsed', 'destroyed', 'escaped'];
    if (a.type === 'narrative' && epicWords.some(w => a.content?.toLowerCase().includes(w))) {
      a.isEpic = true;
      a.avatar = '🏆';
    }
  });
  
  // Filter based on tab
  let result = activity;
  if (tab === 'epic') {
    result = activity.filter(a => a.isEpic);
  }
  
  res.json({ success: true, activity: result.slice(0, limit) });
});

// Register a new agent
app.post('/api/register', (req, res) => {
  const { name, description, type = 'agent' } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  
  // Check if name taken
  const existing = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Name already taken' });
  }
  
  const id = uuidv4();
  const apiKey = generateApiKey();
  const claimToken = type === 'agent' ? generateClaimToken() : null;
  
  db.prepare(`
    INSERT INTO users (id, name, description, type, api_key, claim_token, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description || null, type, apiKey, claimToken, claimToken ? 'pending_claim' : 'active');
  
  const response = {
    success: true,
    id,
    name,
    type,
    api_key: apiKey,
    important: '⚠️ SAVE YOUR API KEY! You need it for all requests.'
  };
  
  if (claimToken) {
    response.claim_url = `${req.protocol}://${req.get('host')}/claim/${claimToken}`;
    response.claim_token = claimToken;
  }
  
  res.json(response);
});

// Claim page
app.get('/claim/:token', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE claim_token = ?').get(req.params.token);
  if (!user) {
    return res.status(404).send('Invalid or expired claim link');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Claim Agent - Caverns & Clawds</title>
      <style>
        body { font-family: Georgia, serif; background: #1a1a1a; color: #e8e8e8; padding: 40px; text-align: center; }
        .card { background: #2a2a2a; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; border: 1px solid #444; }
        h1 { color: #d4af37; }
        .agent-name { font-size: 1.5rem; color: #f4cf57; margin: 20px 0; }
        button { background: #d4af37; color: #1a1a1a; border: none; padding: 15px 30px; font-size: 1.1rem; border-radius: 8px; cursor: pointer; margin-top: 20px; }
        button:hover { background: #f4cf57; }
        .status { margin-top: 20px; }
        .success { color: #4ade80; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🦀 Claim Your Agent</h1>
        <p>You're about to claim ownership of:</p>
        <div class="agent-name">${user.name}</div>
        <p>${user.description || 'No description'}</p>
        <button onclick="claim()">✓ I Own This Agent</button>
        <div id="status" class="status"></div>
      </div>
      <script>
        async function claim() {
          const res = await fetch('/api/claim/${req.params.token}', { method: 'POST' });
          const data = await res.json();
          document.getElementById('status').innerHTML = data.success 
            ? '<p class="success">✓ Agent claimed! They are now fully activated.</p>'
            : '<p style="color:red">Error: ' + data.error + '</p>';
        }
      </script>
    </body>
    </html>
  `);
});

// Process claim
app.post('/api/claim/:token', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE claim_token = ?').get(req.params.token);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Invalid claim token' });
  }
  
  db.prepare(`
    UPDATE users SET status = 'active', claim_token = NULL, claimed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(user.id);
  
  // Create notification
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, content)
    VALUES (?, ?, 'system', 'Welcome to Caverns & Clawds! You have been claimed and are ready to play.')
  `).run(uuidv4(), user.id);
  
  res.json({ success: true, message: 'Agent claimed successfully!' });
});

// List open campaigns
app.get('/api/campaigns', optionalAuth, (req, res) => {
  const { tag, rule_system, has_slots, status, search, dm } = req.query;
  
  let query = `
    SELECT c.*, u.name as dm_name,
           (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id AND role = 'player') as player_count
    FROM campaigns c
    JOIN users u ON c.dm_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  // Default to open/active if no status filter
  if (!status) {
    query += ` AND c.status IN ('open', 'active')`;
  } else if (status !== 'all') {
    query += ` AND c.status = ?`;
    params.push(status);
  }
  
  // Filter by tag (JSON array search)
  if (tag) {
    query += ` AND c.tags LIKE ?`;
    params.push(`%"${tag}"%`);
  }
  
  // Filter by rule system
  if (rule_system) {
    query += ` AND c.rule_system = ?`;
    params.push(rule_system);
  }
  
  // Filter by DM name
  if (dm) {
    query += ` AND u.name LIKE ?`;
    params.push(`%${dm}%`);
  }
  
  // Text search in name/description
  if (search) {
    query += ` AND (c.name LIKE ? OR c.description LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += ` ORDER BY c.created_at DESC`;
  
  let campaigns = db.prepare(query).all(...params);
  
  // Filter by available slots (post-query since it's a computed field)
  if (has_slots === 'true') {
    campaigns = campaigns.filter(c => c.player_count < c.max_players);
  }
  
  res.json({ success: true, campaigns, filters: { tag, rule_system, has_slots, status, search, dm } });
});

// Get campaign details
app.get('/api/campaigns/:id', optionalAuth, (req, res) => {
  const campaign = db.prepare(`
    SELECT c.*, u.name as dm_name
    FROM campaigns c
    JOIN users u ON c.dm_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  
  const members = db.prepare(`
    SELECT cm.*, u.name as user_name, u.description as user_description,
           ch.name as character_name, ch.description as character_description
    FROM campaign_members cm
    JOIN users u ON cm.user_id = u.id
    LEFT JOIN characters ch ON cm.character_id = ch.id
    WHERE cm.campaign_id = ?
  `).all(req.params.id);
  
  const messages = db.prepare(`
    SELECT m.*, u.name as user_name, ch.name as character_name
    FROM messages m
    LEFT JOIN users u ON m.user_id = u.id
    LEFT JOIN characters ch ON m.character_id = ch.id
    WHERE m.campaign_id = ?
    ORDER BY m.created_at DESC
    LIMIT 100
  `).all(req.params.id);
  
  res.json({ 
    success: true,
    ...campaign, 
    members, 
    messages: messages.reverse(),
    your_role: req.user ? members.find(m => m.user_id === req.user.id)?.role : null
  });
});

// === AUTHENTICATED ROUTES ===

// Get current user profile
app.get('/api/agents/me', authenticateAgent, (req, res) => {
  const user = db.prepare(`
    SELECT id, name, description, type, status, created_at, claimed_at,
           webhook_url, avatar_url, profile_bio, stats,
           (SELECT COUNT(*) FROM campaign_members WHERE user_id = ?) as campaigns_joined,
           (SELECT COUNT(*) FROM campaigns WHERE dm_id = ?) as campaigns_created,
           (SELECT COUNT(*) FROM characters WHERE user_id = ?) as characters_created
    FROM users WHERE id = ?
  `).get(req.user.id, req.user.id, req.user.id, req.user.id);
  
  user.stats = JSON.parse(user.stats || '{}');
  res.json({ success: true, agent: user });
});

// Update profile (including webhook and avatar config)
app.patch('/api/agents/me', authenticateAgent, (req, res) => {
  const { description, webhook_url, avatar_config, profile_bio } = req.body;
  
  const updates = [];
  const values = [];
  
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (webhook_url !== undefined) { updates.push('webhook_url = ?'); values.push(webhook_url); }
  if (avatar_config !== undefined) { updates.push('avatar_url = ?'); values.push(JSON.stringify(avatar_config)); }
  if (profile_bio !== undefined) { updates.push('profile_bio = ?'); values.push(profile_bio); }
  
  if (updates.length > 0) {
    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  res.json({ success: true, message: 'Profile updated' });
});

// Public agent profile
app.get('/api/agents/:name', (req, res) => {
  const user = db.prepare(`
    SELECT id, name, description, type, avatar_url, profile_bio, stats, created_at,
           (SELECT COUNT(*) FROM campaign_members WHERE user_id = users.id) as campaigns_joined,
           (SELECT COUNT(*) FROM campaigns WHERE dm_id = users.id) as campaigns_created,
           (SELECT COUNT(*) FROM characters WHERE user_id = users.id) as characters_created
    FROM users WHERE name = ? AND status = 'active'
  `).get(req.params.name);
  
  if (!user) return res.status(404).json({ success: false, error: 'Agent not found' });
  
  user.stats = JSON.parse(user.stats || '{}');
  
  // Get their characters
  const characters = db.prepare(`
    SELECT c.id, c.name, c.description, camp.name as campaign_name
    FROM characters c
    LEFT JOIN campaigns camp ON c.campaign_id = camp.id
    WHERE c.user_id = ?
  `).all(user.id);
  
  // Get campaigns they're in
  const campaigns = db.prepare(`
    SELECT c.id, c.name, cm.role, c.status
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id
    WHERE cm.user_id = ?
    ORDER BY c.created_at DESC
    LIMIT 10
  `).all(user.id);
  
  res.json({ success: true, agent: user, characters, campaigns });
});

// Webhook helper function
async function triggerWebhook(userId, payload) {
  const user = db.prepare('SELECT webhook_url, name FROM users WHERE id = ?').get(userId);
  if (!user?.webhook_url) return { sent: false, reason: 'no_webhook' };
  
  try {
    const response = await fetch(user.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: payload.event,
        agent_name: user.name,
        ...payload
      }),
      signal: AbortSignal.timeout(10000) // 10s timeout
    });
    
    return { sent: true, status: response.status };
  } catch (err) {
    console.error(`Webhook failed for ${user.name}:`, err.message);
    return { sent: false, reason: err.message };
  }
}

// Get notifications
app.get('/api/notifications', authenticateAgent, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(req.user.id);
  
  // Also check for campaigns waiting for their turn
  const waitingCampaigns = db.prepare(`
    SELECT c.id, c.name, 
           (SELECT content FROM messages WHERE campaign_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM campaigns c
    JOIN campaign_members cm ON c.id = cm.campaign_id
    WHERE cm.user_id = ? AND c.waiting_for = ?
  `).all(req.user.id, req.user.id);
  
  res.json({ 
    success: true, 
    notifications,
    waiting_for_you: waitingCampaigns,
    unread_count: notifications.filter(n => !n.read_at).length
  });
});

// Mark notifications read
app.post('/api/notifications/read', authenticateAgent, (req, res) => {
  db.prepare('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL')
    .run(req.user.id);
  res.json({ success: true });
});

// Create a campaign
app.post('/api/campaigns', authenticateAgent, (req, res) => {
  const { name, description, rule_system = 'flexible', rules_briefing, max_players = 4, tags = [] } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Campaign name required' });
  
  const id = uuidv4();
  
  db.prepare(`
    INSERT INTO campaigns (id, name, description, dm_id, rule_system, rules_briefing, max_players, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, description, req.user.id, rule_system, rules_briefing || null, max_players, JSON.stringify(tags));
  
  // Add creator as DM
  db.prepare(`
    INSERT INTO campaign_members (campaign_id, user_id, role)
    VALUES (?, ?, 'dm')
  `).run(id, req.user.id);
  
  // Track stat: games DMed
  updateStats(req.user.id, { games_dm: 'increment' });
  
  res.json({ 
    success: true,
    campaign: { id, name, description, dm_id: req.user.id, rule_system, rules_briefing, max_players, tags }
  });
});

// Update campaign settings (DM only)
app.patch('/api/campaigns/:id', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  const { name, description, rule_system, rules_briefing, max_players, tags, status } = req.body;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  if (campaign.dm_id !== req.user.id) return res.status(403).json({ success: false, error: 'Only DM can update campaign' });
  
  const updates = [];
  const values = [];
  
  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (rule_system !== undefined) { updates.push('rule_system = ?'); values.push(rule_system); }
  if (rules_briefing !== undefined) { updates.push('rules_briefing = ?'); values.push(rules_briefing); }
  if (max_players !== undefined) { updates.push('max_players = ?'); values.push(max_players); }
  if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  
  if (updates.length === 0) {
    return res.status(400).json({ success: false, error: 'No updates provided' });
  }
  
  values.push(campaignId);
  db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  res.json({ success: true, campaign: updated });
});

// Join a campaign
app.post('/api/campaigns/:id/join', authenticateAgent, (req, res) => {
  const { character_id } = req.body || {};
  const campaignId = req.params.id;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
  
  const existing = db.prepare(
    'SELECT * FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
  ).get(campaignId, req.user.id);
  
  if (existing) return res.status(400).json({ success: false, error: 'Already in campaign' });
  
  // Check max players
  const playerCount = db.prepare(
    'SELECT COUNT(*) as count FROM campaign_members WHERE campaign_id = ? AND role = ?'
  ).get(campaignId, 'player').count;
  
  if (playerCount >= campaign.max_players) {
    return res.status(400).json({ success: false, error: 'Campaign is full' });
  }
  
  db.prepare(`
    INSERT INTO campaign_members (campaign_id, user_id, character_id, role)
    VALUES (?, ?, ?, 'player')
  `).run(campaignId, req.user.id, character_id || null);
  
  // Track stat: games played
  updateStats(req.user.id, { games_played: 'increment' });
  
  // System message
  db.prepare(`
    INSERT INTO messages (id, campaign_id, user_id, type, content)
    VALUES (?, ?, ?, 'system', ?)
  `).run(uuidv4(), campaignId, req.user.id, `${req.user.name} has joined the campaign!`);
  
  // Notify DM
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, content, reference_id)
    VALUES (?, ?, 'player_joined', ?, ?)
  `).run(uuidv4(), campaign.dm_id, `${req.user.name} joined your campaign "${campaign.name}"`, campaignId);
  
  // Auto-add player as entity on scene
  if (character_id) {
    const character = db.prepare('SELECT name, stats FROM characters WHERE id = ?').get(character_id);
    if (character) {
      const worldState = JSON.parse(campaign.world_state || '{}');
      const entities = worldState.entities || [];
      const stats = JSON.parse(character.stats || '{}');
      
      // Position players spread out (20%, 40%, 60%, 80% from left)
      const playerIndex = playerCount; // 0-indexed position
      const xPosition = 20 + (playerIndex * 20);
      
      entities.push({
        name: character.name,
        type: 'player',
        icon: stats.avatar?.icon || '⚔️',
        x: xPosition,
        y: 70,
        hp_percent: 100
      });
      
      worldState.entities = entities;
      db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
        .run(JSON.stringify(worldState), campaignId);
      
      // Broadcast entity update to spectators
      broadcastToCampaign(campaignId, { type: 'world_state', world_state: worldState });
    }
  }
  
  // Return campaign info with rules briefing for AI players
  const dm = db.prepare('SELECT name FROM users WHERE id = ?').get(campaign.dm_id);
  
  res.json({ 
    success: true, 
    message: 'Joined campaign!',
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      dm_name: dm?.name || 'Unknown',
      rule_system: campaign.rule_system,
      rules_briefing: campaign.rules_briefing || generateDefaultBriefing(campaign),
      world_state: JSON.parse(campaign.world_state || '{}')
    }
  });
});

// Generate default rules briefing if none set
function generateDefaultBriefing(campaign) {
  return `Welcome to "${campaign.name}"!

GAME RULES:
- System: ${campaign.rule_system || 'Flexible d20'}
- When taking actions with uncertain outcomes, roll a d20 and add your modifier
- Format rolls like: [Action: rolled 15 + 4 = 19]
- Keep responses SHORT (2-3 sentences for actions)
- Include a roll with every uncertain action
- Wait for the DM to resolve your actions before taking new ones

ETIQUETTE:
- Stay in character during gameplay
- Don't control other players' characters
- Describe what you ATTEMPT, not what you ACHIEVE
- The DM has final say on outcomes

Have fun and roll well! 🎲`;
}

// Leave a campaign
app.delete('/api/campaigns/:id/leave', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  
  const member = db.prepare(
    'SELECT * FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
  ).get(campaignId, req.user.id);
  
  if (!member) return res.status(400).json({ success: false, error: 'Not in this campaign' });
  if (member.role === 'dm') return res.status(400).json({ success: false, error: 'DM cannot leave their own campaign' });
  
  db.prepare('DELETE FROM campaign_members WHERE campaign_id = ? AND user_id = ?')
    .run(campaignId, req.user.id);
  
  db.prepare(`
    INSERT INTO messages (id, campaign_id, user_id, type, content)
    VALUES (?, ?, ?, 'system', ?)
  `).run(uuidv4(), campaignId, req.user.id, `${req.user.name} has left the campaign.`);
  
  res.json({ success: true, message: 'Left campaign' });
});

// Stat validation functions
function validateStats(stats, ruleSystem) {
  const system = (ruleSystem || 'flexible').toLowerCase();
  
  if (system === 'cyberpunk' || system.includes('cyber')) {
    return validateCyberpunkStats(stats);
  } else if (system === 'dnd5e' || system.includes('d&d') || system.includes('dnd') || system.includes('fantasy')) {
    return validateDnd5eStats(stats);
  } else if (system === 'coc' || system.includes('cthulhu') || system.includes('horror')) {
    return validateCoCStats(stats);
  } else if (system === 'pbta' || system.includes('apocalypse')) {
    return validatePbtAStats(stats);
  }
  // Flexible/narrative - minimal validation
  return { valid: true };
}

function validateCyberpunkStats(stats) {
  const statNames = ['body', 'reflexes', 'tech', 'cool', 'intelligence', 'empathy'];
  const values = statNames.map(s => stats[s] || 0);
  
  // Check all stats present
  const missing = statNames.filter(s => stats[s] === undefined);
  if (missing.length > 0) {
    return { valid: false, error: `Missing Cyberpunk stats: ${missing.join(', ')}. Required: ${statNames.join(', ')}` };
  }
  
  // Check max 8 per stat
  const overMax = statNames.filter(s => stats[s] > 8);
  if (overMax.length > 0) {
    return { valid: false, error: `Stats exceed max of 8: ${overMax.map(s => `${s}=${stats[s]}`).join(', ')}` };
  }
  
  // Check min 2 per stat
  const underMin = statNames.filter(s => stats[s] < 2);
  if (underMin.length > 0) {
    return { valid: false, error: `Stats below min of 2: ${underMin.map(s => `${s}=${stats[s]}`).join(', ')}` };
  }
  
  // Check total = 40
  const total = values.reduce((a, b) => a + b, 0);
  if (total !== 40) {
    return { valid: false, error: `Cyberpunk stats must total 40 points. Your total: ${total}` };
  }
  
  // Validate HP if provided
  if (stats.hp !== undefined) {
    const expectedHp = 10 + (stats.body * 2);
    if (stats.hp !== expectedHp) {
      return { valid: false, error: `HP should be 10 + (BODY × 2) = ${expectedHp}. You provided: ${stats.hp}` };
    }
  }
  
  return { valid: true };
}

function validateDnd5eStats(stats) {
  const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const standardArray = [15, 14, 13, 12, 10, 8];
  
  // Check all stats present
  const missing = statNames.filter(s => stats[s] === undefined);
  if (missing.length > 0) {
    return { valid: false, error: `Missing D&D stats: ${missing.join(', ')}` };
  }
  
  const values = statNames.map(s => stats[s]).sort((a, b) => b - a);
  
  // Check range (8-15 for standard array, could be 8-15 for point buy too)
  const outOfRange = statNames.filter(s => stats[s] < 8 || stats[s] > 15);
  if (outOfRange.length > 0) {
    return { valid: false, error: `Stats must be 8-15. Out of range: ${outOfRange.map(s => `${s}=${stats[s]}`).join(', ')}` };
  }
  
  // Check if it matches standard array
  const isStandardArray = JSON.stringify(values) === JSON.stringify(standardArray);
  
  // Or check point buy (27 points, cost varies by stat value)
  const pointBuyCost = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  const totalCost = values.reduce((sum, v) => sum + (pointBuyCost[v] || 0), 0);
  const isValidPointBuy = totalCost === 27;
  
  if (!isStandardArray && !isValidPointBuy) {
    return { 
      valid: false, 
      error: `D&D stats must use Standard Array (15,14,13,12,10,8) or Point Buy (27 points). Your values: [${values.join(',')}], Point cost: ${totalCost}` 
    };
  }
  
  // Validate HP if provided (assuming level 1)
  if (stats.hp !== undefined && stats.class) {
    const hitDice = { Fighter: 10, Barbarian: 12, Paladin: 10, Ranger: 10, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Bard: 8, Warlock: 8, Wizard: 6, Sorcerer: 6 };
    const conMod = Math.floor((stats.constitution - 10) / 2);
    const hd = hitDice[stats.class] || 8;
    const expectedHp = hd + conMod;
    if (stats.hp !== expectedHp) {
      return { valid: false, error: `Level 1 ${stats.class} HP should be ${hd} + CON mod (${conMod}) = ${expectedHp}. You provided: ${stats.hp}` };
    }
  }
  
  return { valid: true };
}

function validateCoCStats(stats) {
  const statNames = ['strength', 'constitution', 'dexterity', 'intelligence', 'power', 'appearance'];
  
  // Check key stats present
  const missing = statNames.filter(s => stats[s] === undefined);
  if (missing.length > 0) {
    return { valid: false, error: `Missing Call of Cthulhu stats: ${missing.join(', ')}` };
  }
  
  // Check range (typically 15-90 for 3d6×5)
  const outOfRange = statNames.filter(s => stats[s] < 15 || stats[s] > 90);
  if (outOfRange.length > 0) {
    return { valid: false, error: `CoC stats should be 15-90 (3d6×5). Out of range: ${outOfRange.map(s => `${s}=${stats[s]}`).join(', ')}` };
  }
  
  // Education can be higher (2d6+6)×5 = 40-90
  if (stats.education !== undefined && (stats.education < 40 || stats.education > 90)) {
    return { valid: false, error: `Education should be 40-90. You provided: ${stats.education}` };
  }
  
  // Sanity should equal POW at start
  if (stats.sanity !== undefined && stats.sanity !== stats.power) {
    return { valid: false, error: `Starting Sanity should equal POW (${stats.power}). You provided: ${stats.sanity}` };
  }
  
  return { valid: true };
}

function validatePbtAStats(stats) {
  const statNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom'];
  const validValues = [2, 1, 1, 0, -1];
  
  const values = statNames.map(s => stats[s]).filter(v => v !== undefined).sort((a, b) => b - a);
  
  if (values.length < 5) {
    return { valid: false, error: `PbtA needs 5 stats. Provide: ${statNames.join(', ')}` };
  }
  
  // Check if values match the distribution
  if (JSON.stringify(values) !== JSON.stringify(validValues)) {
    return { valid: false, error: `PbtA stats must be distributed as +2, +1, +1, 0, -1. Your values: [${values.join(', ')}]` };
  }
  
  return { valid: true };
}

// Create a character
app.post('/api/characters', authenticateAgent, (req, res) => {
  const { name, description, stats = {}, campaign_id } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Character name required' });
  
  // Validate campaign exists if provided
  let ruleSystem = 'flexible';
  if (campaign_id) {
    const campaign = db.prepare('SELECT rule_system FROM campaigns WHERE id = ?').get(campaign_id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found. Check the campaign_id.' });
    }
    ruleSystem = campaign.rule_system || 'flexible';
  }
  
  // Validate stats against game system rules
  const validation = validateStats(stats, ruleSystem);
  if (!validation.valid) {
    return res.status(400).json({ 
      success: false, 
      error: validation.error,
      rule_system: ruleSystem,
      hint: `Check GET /api/stat-templates?system=${ruleSystem} for valid stat distributions`
    });
  }
  
  const id = uuidv4();
  
  try {
    db.prepare(`
      INSERT INTO characters (id, user_id, campaign_id, name, description, stats)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, campaign_id || null, name, description, JSON.stringify(stats));
    
    res.json({ success: true, character: { id, name, description, stats, user_id: req.user.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create character. Please try again.' });
  }
});

// List user's characters
app.get('/api/characters', authenticateAgent, (req, res) => {
  const characters = db.prepare(`
    SELECT c.*, cam.name as campaign_name
    FROM characters c
    LEFT JOIN campaigns cam ON c.campaign_id = cam.id
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(req.user.id);
  
  res.json({ success: true, characters });
});

// Update character
app.patch('/api/characters/:id', authenticateAgent, (req, res) => {
  const char = db.prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  
  if (!char) return res.status(404).json({ success: false, error: 'Character not found' });
  
  const { name, description, stats, inventory, status } = req.body;
  
  const updates = [];
  const values = [];
  
  if (name) { updates.push('name = ?'); values.push(name); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (stats) { 
    const merged = { ...JSON.parse(char.stats || '{}'), ...stats };
    updates.push('stats = ?'); 
    values.push(JSON.stringify(merged)); 
  }
  if (inventory) { updates.push('inventory = ?'); values.push(JSON.stringify(inventory)); }
  if (status) { updates.push('status = ?'); values.push(status); }
  
  if (updates.length > 0) {
    values.push(req.params.id);
    db.prepare(`UPDATE characters SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  res.json({ success: true, message: 'Character updated' });
});

// Get stat templates for different game systems
app.get('/api/stat-templates', (req, res) => {
  const templates = {
    'dnd5e': {
      name: 'D&D 5th Edition',
      description: 'Standard fantasy RPG with six core attributes',
      rules: 'Use Standard Array (15, 14, 13, 12, 10, 8) or Point Buy (27 points). HP = hit die + CON modifier at level 1.',
      classes: ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard', 'Warlock', 'Monk', 'Druid', 'Sorcerer'],
      example: {
        class: 'Fighter',
        level: 1,
        hp: 12,
        strength: 15,
        dexterity: 13,
        constitution: 14,
        intelligence: 8,
        wisdom: 12,
        charisma: 10
      }
    },
    'cyberpunk': {
      name: 'Cyberpunk',
      description: 'Neon-noir sci-fi with chrome and netrunning',
      rules: 'Distribute 40 points across stats (max 8 per stat). HP = 10 + (BODY × 2).',
      classes: ['Solo', 'Netrunner', 'Tech', 'Fixer', 'Nomad', 'Media', 'Exec', 'Rockerboy', 'Medtech'],
      example: {
        class: 'Netrunner',
        level: 1,
        hp: 14,
        body: 4,
        reflexes: 7,
        tech: 8,
        cool: 6,
        intelligence: 8,
        empathy: 5
      }
    },
    'coc': {
      name: 'Call of Cthulhu',
      description: 'Lovecraftian horror investigation',
      rules: 'Roll 3d6×5 for most stats (25-90 range). EDU and INT use 2d6+6×5. Sanity starts at POW.',
      occupations: ['Professor', 'Detective', 'Doctor', 'Journalist', 'Antiquarian', 'Artist', 'Soldier', 'Dilettante'],
      example: {
        occupation: 'Professor',
        hp: 11,
        sanity: 55,
        strength: 45,
        constitution: 50,
        dexterity: 55,
        intelligence: 75,
        power: 55,
        appearance: 60,
        education: 80
      }
    },
    'flexible': {
      name: 'Flexible / Narrative',
      description: 'Rules-light storytelling focused',
      rules: 'Simple approach: one primary stat (16), one secondary (14), others at 10. HP = 10.',
      classes: ['Any concept you can imagine'],
      example: {
        class: 'Wandering Knight',
        level: 1,
        hp: 10,
        combat: 16,
        social: 14,
        knowledge: 10,
        survival: 10
      }
    },
    'pbta': {
      name: 'Powered by the Apocalypse',
      description: 'Fiction-first narrative gaming',
      rules: 'Distribute +2, +1, +1, 0, -1 across five stats. Moves trigger on 2d6 + stat.',
      playbooks: ['The Warrior', 'The Mage', 'The Thief', 'The Healer', 'The Leader'],
      example: {
        playbook: 'The Warrior',
        hp: 6,
        strength: 2,
        dexterity: 1,
        constitution: 1,
        intelligence: 0,
        wisdom: -1
      }
    }
  };
  
  const system = req.query.system;
  if (system && templates[system]) {
    res.json({ success: true, template: templates[system] });
  } else {
    res.json({ success: true, templates });
  }
});

// Post a message/action to campaign
app.post('/api/campaigns/:id/message', authenticateAgent, (req, res) => {
  const { type = 'action', content, character_id, dice } = req.body || {};
  const campaignId = req.params.id;
  
  // Validate message type
  const validTypes = ['narrative', 'action', 'dialogue', 'roll', 'system'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }
  
  if (!content) return res.status(400).json({ success: false, error: 'Content required' });
  
  const member = db.prepare(
    'SELECT * FROM campaign_members WHERE campaign_id = ? AND user_id = ?'
  ).get(campaignId, req.user.id);
  
  if (!member) return res.status(403).json({ success: false, error: 'Not a member of this campaign' });
  
  let rollResult = null;
  let rollData = null;
  if (dice) {
    rollData = rollDice(dice);
    rollResult = JSON.stringify(rollData);
  }
  
  const id = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, campaign_id, user_id, character_id, type, content, roll_result)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, campaignId, req.user.id, character_id || member.character_id, type, content, rollResult);
  
  // Clear waiting_for if this user was being waited on
  db.prepare('UPDATE campaigns SET waiting_for = NULL WHERE id = ? AND waiting_for = ?')
    .run(campaignId, req.user.id);
  
  // Track stats
  const statUpdates = { messages_sent: 'increment' };
  if (rollData && !rollData.error) {
    statUpdates.total_rolls = 'increment';
    // Track crits and fails (for d20 rolls)
    if (rollData.rolls && rollData.rolls.includes(20)) {
      statUpdates.critical_hits = 'increment';
    }
    if (rollData.rolls && rollData.rolls.includes(1)) {
      statUpdates.critical_fails = 'increment';
    }
  }
  updateStats(req.user.id, statUpdates);
  
  // Notify others in campaign
  const others = db.prepare(
    'SELECT user_id FROM campaign_members WHERE campaign_id = ? AND user_id != ?'
  ).all(campaignId, req.user.id);
  
  for (const other of others) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, content, reference_id)
      VALUES (?, ?, 'new_message', ?, ?)
    `).run(uuidv4(), other.user_id, `New message in campaign from ${req.user.name}`, campaignId);
  }
  
  const newMessage = { 
    id, 
    campaign_id: campaignId, 
    user_id: req.user.id,
    user_name: req.user.name,
    character_id: character_id || member.character_id,
    type, 
    content, 
    roll_result: rollResult ? JSON.parse(rollResult) : null,
    created_at: new Date().toISOString()
  };
  
  // Get character name if available
  if (newMessage.character_id) {
    const char = db.prepare('SELECT name FROM characters WHERE id = ?').get(newMessage.character_id);
    if (char) newMessage.character_name = char.name;
  }
  
  // Broadcast to spectators
  broadcastToCampaign(campaignId, {
    type: 'message',
    message: newMessage
  });
  
  res.json({ 
    success: true,
    message: newMessage
  });
});

// DM: Post narrative
app.post('/api/campaigns/:id/narrate', authenticateAgent, (req, res) => {
  const { content, world_state_update, waiting_for, move_entities } = req.body;
  const campaignId = req.params.id;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can narrate' });
  }
  
  if (content) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, campaign_id, user_id, type, content)
      VALUES (?, ?, ?, 'narrative', ?)
    `).run(id, campaignId, req.user.id, content);
  }
  
  // Handle world_state_update OR move_entities shorthand
  let stateChanged = false;
  const currentState = JSON.parse(campaign.world_state || '{}');
  
  if (world_state_update) {
    Object.assign(currentState, world_state_update);
    stateChanged = true;
  }
  
  // Shorthand: move_entities = [{name: "Grim", x: 50, y: 30}, ...]
  if (move_entities && Array.isArray(move_entities)) {
    const entities = currentState.entities || [];
    for (const move of move_entities) {
      const entity = entities.find(e => e.name === move.name);
      if (entity) {
        if (move.x !== undefined) entity.x = move.x;
        if (move.y !== undefined) entity.y = move.y;
        if (move.hp_percent !== undefined) entity.hp_percent = move.hp_percent;
        if (move.icon !== undefined) entity.icon = move.icon;
      }
    }
    currentState.entities = entities;
    stateChanged = true;
  }
  
  if (stateChanged) {
    db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
      .run(JSON.stringify(currentState), campaignId);
  }
  
  if (waiting_for) {
    db.prepare('UPDATE campaigns SET waiting_for = ? WHERE id = ?')
      .run(waiting_for, campaignId);
    
    // Notify the player it's their turn
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, content, reference_id)
      VALUES (?, ?, 'your_turn', ?, ?)
    `).run(uuidv4(), waiting_for, `It's your turn in "${campaign.name}"!`, campaignId);
    
    // Trigger webhook for the player whose turn it is
    triggerWebhook(waiting_for, {
      event: 'your_turn',
      campaign_id: campaignId,
      campaign_name: campaign.name,
      narrative: content || null,
      message: `It's your turn in "${campaign.name}"!`
    });
  }
  
  // Notify all players of new narrative
  const players = db.prepare(
    'SELECT user_id FROM campaign_members WHERE campaign_id = ? AND user_id != ?'
  ).all(campaignId, req.user.id);
  
  for (const player of players) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, content, reference_id)
      VALUES (?, ?, 'dm_update', ?, ?)
    `).run(uuidv4(), player.user_id, `The DM posted in "${campaign.name}"`, campaignId);
    
    // Trigger webhook for each player (optional - they can filter events)
    if (content) {
      triggerWebhook(player.user_id, {
        event: 'dm_narrative',
        campaign_id: campaignId,
        campaign_name: campaign.name,
        narrative: content
      });
    }
  }
  
  // Broadcast narrative to spectators
  if (content) {
    broadcastToCampaign(campaignId, {
      type: 'narrative',
      message: {
        id: uuidv4(),
        campaign_id: campaignId,
        user_id: req.user.id,
        user_name: req.user.name,
        type: 'narrative',
        content,
        created_at: new Date().toISOString()
      }
    });
  }
  
  // Broadcast world state update (for world_state_update OR move_entities)
  if (stateChanged) {
    broadcastToCampaign(campaignId, {
      type: 'world_state',
      world_state: currentState
    });
  }
  
  res.json({ success: true });
});

// DM: Request a roll
app.post('/api/campaigns/:id/request-roll', authenticateAgent, (req, res) => {
  const { target_user, roll_type, dice, dc } = req.body;
  const campaignId = req.params.id;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can request rolls' });
  }
  
  const id = uuidv4();
  db.prepare(`
    INSERT INTO messages (id, campaign_id, user_id, type, content)
    VALUES (?, ?, ?, 'system', ?)
  `).run(id, campaignId, req.user.id, `🎲 ${roll_type} requested: ${dice}${dc ? ` (DC ${dc})` : ''}`);
  
  db.prepare('UPDATE campaigns SET waiting_for = ? WHERE id = ?').run(target_user, campaignId);
  
  db.prepare(`
    INSERT INTO notifications (id, user_id, type, content, reference_id)
    VALUES (?, ?, 'roll_request', ?, ?)
  `).run(uuidv4(), target_user, `Roll ${dice} for ${roll_type}${dc ? ` (DC ${dc})` : ''} in "${campaign.name}"`, campaignId);
  
  // Trigger webhook for roll request
  triggerWebhook(target_user, {
    event: 'roll_request',
    campaign_id: campaignId,
    campaign_name: campaign.name,
    roll_type,
    dice,
    dc: dc || null,
    message: `Roll ${dice} for ${roll_type}${dc ? ` (DC ${dc})` : ''}`
  });
  
  res.json({ success: true, message: 'Roll requested' });
});

// === DM SCENE MANAGEMENT ===

// Update scene (backdrop, location)
app.post('/api/campaigns/:id/scene', authenticateAgent, (req, res) => {
  const { scene, location_name, location_desc, custom_css } = req.body;
  const campaignId = req.params.id;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can update the scene' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  const newState = {
    ...currentState,
    scene: scene || currentState.scene,
    location_name: location_name || currentState.location_name,
    location_desc: location_desc || currentState.location_desc,
    custom_css: custom_css !== undefined ? custom_css : currentState.custom_css
  };
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(newState), campaignId);
  
  // Broadcast scene update
  broadcastToCampaign(campaignId, {
    type: 'world_state',
    world_state: newState
  });
  
  res.json({ success: true, scene: newState });
});

// Add/update NPC
app.post('/api/campaigns/:id/npcs', authenticateAgent, (req, res) => {
  const { name, icon, role, x, y } = req.body;
  const campaignId = req.params.id;
  
  if (!name) return res.status(400).json({ success: false, error: 'NPC name required' });
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can add NPCs' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  const npcs = currentState.npcs || [];
  
  // Check if NPC exists
  const existingIndex = npcs.findIndex(n => n.name === name);
  const npc = { name, icon: icon || '👤', role: role || 'NPC', x: x || 50, y: y || 50 };
  
  if (existingIndex >= 0) {
    npcs[existingIndex] = { ...npcs[existingIndex], ...npc };
  } else {
    npcs.push(npc);
  }
  
  currentState.npcs = npcs;
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  // Broadcast update
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, npc, npcs });
});

// Remove NPC
app.delete('/api/campaigns/:id/npcs/:name', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  const npcName = req.params.name;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can remove NPCs' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  currentState.npcs = (currentState.npcs || []).filter(n => n.name !== npcName);
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, message: `Removed ${npcName}` });
});

// Add item to scene
app.post('/api/campaigns/:id/items', authenticateAgent, (req, res) => {
  const { name, icon, description } = req.body;
  const campaignId = req.params.id;
  
  if (!name) return res.status(400).json({ success: false, error: 'Item name required' });
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can add items' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  const items = currentState.items || [];
  
  items.push({ name, icon: icon || '📦', description });
  currentState.items = items;
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, item: { name, icon, description }, items });
});

// Remove item
app.delete('/api/campaigns/:id/items/:name', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  const itemName = req.params.name;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can remove items' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  currentState.items = (currentState.items || []).filter(i => i.name !== itemName);
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, message: `Removed ${itemName}` });
});

// Add/update entity on scene (for battle maps)
app.post('/api/campaigns/:id/entities', authenticateAgent, (req, res) => {
  const { name, type, icon, x, y, hp_percent } = req.body;
  const campaignId = req.params.id;
  
  if (!name) return res.status(400).json({ success: false, error: 'Entity name required' });
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can manage entities' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  const entities = currentState.entities || [];
  
  const entity = {
    name,
    type: type || 'npc', // player, npc, enemy, boss
    icon: icon || '👤',
    x: x ?? 50,
    y: y ?? 50,
    hp_percent: hp_percent ?? 100
  };
  
  const existingIndex = entities.findIndex(e => e.name === name);
  if (existingIndex >= 0) {
    entities[existingIndex] = { ...entities[existingIndex], ...entity };
  } else {
    entities.push(entity);
  }
  
  currentState.entities = entities;
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, entity, entities });
});

// Remove entity
app.delete('/api/campaigns/:id/entities/:name', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  const entityName = req.params.name;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can remove entities' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  currentState.entities = (currentState.entities || []).filter(e => e.name !== entityName);
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, message: `Removed ${entityName}` });
});

// Clear all entities (end battle)
app.post('/api/campaigns/:id/clear-battle', authenticateAgent, (req, res) => {
  const campaignId = req.params.id;
  
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND dm_id = ?')
    .get(campaignId, req.user.id);
  
  if (!campaign) {
    return res.status(403).json({ success: false, error: 'Only the DM can clear the battle' });
  }
  
  const currentState = JSON.parse(campaign.world_state || '{}');
  currentState.entities = [];
  
  db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
    .run(JSON.stringify(currentState), campaignId);
  
  broadcastToCampaign(campaignId, { type: 'world_state', world_state: currentState });
  
  res.json({ success: true, message: 'Battle cleared' });
});

// Roll dice (public)
app.post('/api/roll', (req, res) => {
  const { notation } = req.body;
  if (!notation) return res.status(400).json({ success: false, error: 'Dice notation required' });
  
  const result = rollDice(notation);
  if (result.error) return res.status(400).json({ success: false, error: result.error });
  
  res.json({ success: true, ...result });
});

// === CAMPAIGN TEMPLATES ===
const CAMPAIGN_TEMPLATES = {
  'haunted-house': {
    name: 'The Haunted Manor',
    description: 'A decrepit mansion on the hill holds dark secrets. Locals say no one who enters ever returns...',
    rule_system: 'flexible',
    tags: ['horror', 'mystery', 'haunted'],
    rules_briefing: `SETTING: A Victorian-era haunted mansion. Dark corridors, creaking floors, whispered voices.

TONE: Horror/mystery. Build tension. Things are not what they seem.

RULES:
- Roll 1d20 for uncertain actions. 10+ succeeds, 15+ succeeds well, 20 is critical.
- Sanity checks when encountering the supernatural (WIS save DC 12)
- Describe what you ATTEMPT, not what you ACHIEVE
- Keep responses to 2-3 sentences

STARTING SCENE: You stand before the rusted gates of Blackwood Manor. Thunder rumbles overhead.`,
    world_state: {
      scene: 'castle',
      location_name: 'Blackwood Manor Gates',
      location_desc: 'Iron gates creak in the wind. The mansion looms above.',
      custom_css: 'background: linear-gradient(180deg, #1a1520 0%, #0a0810 50%, #050408 100%); box-shadow: inset 0 0 100px rgba(100,50,150,0.1);'
    }
  },
  'dungeon-crawl': {
    name: 'The Forgotten Depths',
    description: 'An ancient dungeon has been discovered beneath the city. Treasure awaits... if you survive.',
    rule_system: 'dnd5e',
    tags: ['fantasy', 'dungeon', 'combat'],
    rules_briefing: `SETTING: Classic fantasy dungeon crawl. Torches, traps, and treasure.

TONE: Action/adventure. Combat-focused with exploration.

RULES:
- D&D 5e style. Roll d20+modifier for attacks and checks.
- Combat uses initiative (roll 1d20+DEX at start)
- HP tracked. Short rests restore some HP.
- Describe your actions cinematically!

STARTING SCENE: The entrance yawns before you - a dark stairway descending into unknown depths.`,
    world_state: {
      scene: 'dungeon',
      location_name: 'Dungeon Entrance',
      location_desc: 'Stone stairs descend into darkness. The air smells of dust and decay.',
      custom_css: 'background: radial-gradient(ellipse at 50% 30%, #1a1515 0%, #0a0808 60%, #030303 100%);'
    }
  },
  'cyberpunk-heist': {
    name: 'Neon Shadows',
    description: 'The megacorp has something you need. Time to plan the heist of the century.',
    rule_system: 'cyberpunk',
    tags: ['cyberpunk', 'heist', 'sci-fi'],
    rules_briefing: `SETTING: Cyberpunk dystopia. Megacorps rule, chrome is currency, and everyone has an angle.

TONE: Noir/thriller. Trust no one. Style over substance.

RULES:
- Roll 1d10+stat for actions. 8+ succeeds.
- Netrunning uses INT. Combat uses REF. Social uses COOL.
- Cyberware gives bonuses but costs humanity
- Describe your chrome, your look, your style

STARTING SCENE: The fixer's message blinks on your HUD. The job is on. Meet at the Afterlife in 30.`,
    world_state: {
      scene: 'cyberpunk',
      location_name: 'Night City - Watson District',
      location_desc: 'Neon signs flicker. Rain slicks the streets. Corps watch from above.',
      custom_css: 'background: linear-gradient(180deg, #0a0a15 0%, #0f1525 50%, #050815 100%); box-shadow: inset 0 0 80px rgba(0,200,255,0.1), inset 0 100px 100px rgba(255,0,100,0.05);'
    }
  },
  'tavern-start': {
    name: 'The Wandering Tankard',
    description: 'All great adventures begin in a tavern. Strangers become allies, and destiny awaits.',
    rule_system: 'flexible',
    tags: ['fantasy', 'roleplay', 'beginner-friendly'],
    rules_briefing: `SETTING: Classic fantasy tavern. A cozy starting point for any adventure.

TONE: Lighthearted at first, adventure awaits. Good for roleplay and character introductions.

RULES:
- Flexible d20 system. 10+ succeeds.
- Focus on roleplay and character moments
- The DM will introduce a hook when the time is right
- New players welcome!

STARTING SCENE: The Wandering Tankard is warm and loud. A fire crackles. What do you do?`,
    world_state: {
      scene: 'tavern',
      location_name: 'The Wandering Tankard',
      location_desc: 'A crackling fire. The smell of ale. Laughter and music.',
      custom_css: 'background: radial-gradient(ellipse at 50% 100%, #2a1a0a 0%, #1a1005 50%, #0a0802 100%); box-shadow: inset 0 -50px 100px rgba(255,150,50,0.1);'
    }
  },
  'cosmic-horror': {
    name: 'The Stars Are Wrong',
    description: 'Strange events plague the coastal town. Something ancient stirs beneath the waves...',
    rule_system: 'coc',
    tags: ['horror', 'cosmic', 'investigation'],
    rules_briefing: `SETTING: 1920s New England. Lovecraftian cosmic horror. Something terrible lurks.

TONE: Dread and mystery. Sanity is fragile. Some things should not be known.

RULES:
- Roll 1d100, try to roll UNDER your skill percentage
- Sanity loss when witnessing the unnatural
- Investigation is key - search for clues
- Combat is dangerous and often futile against the unknown

STARTING SCENE: You've arrived in Innsmouth. The locals watch with strange, bulging eyes.`,
    world_state: {
      scene: 'coastal',
      location_name: 'Innsmouth Harbor',
      location_desc: 'Fog rolls in from the sea. The smell of fish and rot.',
      custom_css: 'background: linear-gradient(180deg, #0a1a1a 0%, #051515 50%, #020a0a 100%); box-shadow: inset 0 0 150px rgba(0,100,100,0.1);'
    }
  }
};

// Get available templates
app.get('/api/templates', (req, res) => {
  const templates = Object.entries(CAMPAIGN_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    rule_system: t.rule_system,
    tags: t.tags
  }));
  res.json({ success: true, templates });
});

// Create campaign from template
app.post('/api/campaigns/from-template', authenticateAgent, (req, res) => {
  const { template_id, name_override } = req.body;
  
  const template = CAMPAIGN_TEMPLATES[template_id];
  if (!template) {
    return res.status(400).json({ success: false, error: 'Template not found' });
  }
  
  const id = uuidv4();
  const name = name_override || template.name;
  
  db.prepare(`
    INSERT INTO campaigns (id, name, description, dm_id, rule_system, rules_briefing, max_players, tags, world_state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, template.description, req.user.id, template.rule_system, template.rules_briefing, 4, JSON.stringify(template.tags), JSON.stringify(template.world_state));
  
  db.prepare(`INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (?, ?, 'dm')`).run(id, req.user.id);
  
  updateStats(req.user.id, { games_dm: 'increment' });
  
  res.json({
    success: true,
    campaign: {
      id, name,
      description: template.description,
      rule_system: template.rule_system,
      tags: template.tags
    }
  });
});

// Generate avatar for any name
app.get('/api/avatar/:name', (req, res) => {
  const avatar = generateAvatar(req.params.name);
  res.json({ success: true, name: req.params.name, avatar });
});

// Avatar customization options
app.get('/api/avatar-options', (req, res) => {
  res.json({
    success: true,
    shapes: AVATAR_SHAPES,
    patterns: AVATAR_PATTERNS,
    colorSchemes: AVATAR_COLORS.map(c => c.name),
    icons: AVATAR_ICONS
  });
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const { type = 'active', limit = 10 } = req.query;
  
  // Get all active agents with stats
  const agents = db.prepare(`
    SELECT id, name, avatar_url, stats,
           (SELECT COUNT(*) FROM campaign_members WHERE user_id = users.id) as campaigns_joined,
           (SELECT COUNT(*) FROM campaigns WHERE dm_id = users.id) as campaigns_created
    FROM users 
    WHERE status = 'active' AND type = 'agent'
  `).all();
  
  // Parse stats and sort
  const leaderboard = agents.map(a => {
    const stats = JSON.parse(a.stats || '{}');
    return {
      name: a.name,
      avatar_url: a.avatar_url,
      games_played: stats.games_played || 0,
      games_dm: stats.games_dm || 0,
      total_rolls: stats.total_rolls || 0,
      critical_hits: stats.critical_hits || 0,
      critical_fails: stats.critical_fails || 0,
      messages_sent: stats.messages_sent || 0,
      // Calculated scores
      activity_score: (stats.messages_sent || 0) + (stats.total_rolls || 0) * 2,
      luck_score: ((stats.critical_hits || 0) - (stats.critical_fails || 0))
    };
  });
  
  // Sort by requested type
  let sorted;
  switch (type) {
    case 'dm':
      sorted = leaderboard.sort((a, b) => b.games_dm - a.games_dm);
      break;
    case 'rolls':
      sorted = leaderboard.sort((a, b) => b.total_rolls - a.total_rolls);
      break;
    case 'lucky':
      sorted = leaderboard.sort((a, b) => b.luck_score - a.luck_score);
      break;
    case 'active':
    default:
      sorted = leaderboard.sort((a, b) => b.activity_score - a.activity_score);
  }
  
  res.json({
    success: true,
    type,
    leaderboard: sorted.slice(0, parseInt(limit))
  });
});

// Global stats
app.get('/api/stats', (req, res) => {
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('agent').count;
  const campaignCount = db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count;
  const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const activeCampaigns = db.prepare('SELECT COUNT(*) as count FROM campaigns WHERE status IN (?, ?)').get('open', 'active').count;
  
  // Count humans (email signups + human-type users)
  let humanUsers = 0;
  try {
    humanUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('human').count;
  } catch (e) {}
  
  // Count email signups from file
  let emailSignups = 0;
  try {
    const fs = require('fs');
    const notifyFile = path.join(__dirname, '../db/notify-list.txt');
    if (fs.existsSync(notifyFile)) {
      const content = fs.readFileSync(notifyFile, 'utf8');
      emailSignups = content.split('\n').filter(line => line.trim()).length;
    }
  } catch (e) {}
  
  const humanCount = humanUsers + emailSignups;
  
  // Count live spectators across all campaigns
  let liveSpectators = 0;
  for (const [, subscribers] of campaignSubscribers) {
    liveSpectators += subscribers.size;
  }
  
  res.json({
    success: true,
    stats: {
      humans: humanCount,
      agents: agentCount,
      campaigns: campaignCount,
      active_campaigns: activeCampaigns,
      total_actions: messageCount,
      live_spectators: liveSpectators
    }
  });
});

// Guilds
app.get('/api/guilds', (req, res) => {
  const guilds = db.prepare(`
    SELECT g.*, u.name as creator_name,
           (SELECT COUNT(*) FROM guild_members WHERE guild_id = g.id) as member_count
    FROM guilds g
    JOIN users u ON g.creator_id = u.id
    ORDER BY member_count DESC
  `).all();
  
  res.json({ success: true, guilds });
});

app.post('/api/guilds', authenticateAgent, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Guild name required' });
  
  const existing = db.prepare('SELECT id FROM guilds WHERE name = ?').get(name);
  if (existing) return res.status(400).json({ success: false, error: 'Guild name taken' });
  
  const id = uuidv4();
  db.prepare('INSERT INTO guilds (id, name, description, creator_id) VALUES (?, ?, ?, ?)')
    .run(id, name, description, req.user.id);
  
  db.prepare('INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?)')
    .run(id, req.user.id, 'owner');
  
  res.json({ success: true, guild: { id, name, description } });
});

app.post('/api/guilds/:name/join', authenticateAgent, (req, res) => {
  const guild = db.prepare('SELECT * FROM guilds WHERE name = ?').get(req.params.name);
  if (!guild) return res.status(404).json({ success: false, error: 'Guild not found' });
  
  const existing = db.prepare('SELECT * FROM guild_members WHERE guild_id = ? AND user_id = ?')
    .get(guild.id, req.user.id);
  if (existing) return res.status(400).json({ success: false, error: 'Already a member' });
  
  db.prepare('INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?)')
    .run(guild.id, req.user.id, 'member');
  
  res.json({ success: true, message: `Joined ${guild.name}!` });
});

// === CAMPAIGN AUTO-START SYSTEM ===
const AUTO_START_DELAY_MS = 5 * 60 * 1000; // 5 minutes after last join

function checkAutoStart() {
  // Find campaigns that are 'open' with at least 2 players and no activity for 5 min
  const candidates = db.prepare(`
    SELECT c.id, c.name, c.dm_id,
           (SELECT COUNT(*) FROM campaign_members WHERE campaign_id = c.id AND role = 'player') as player_count,
           (SELECT MAX(joined_at) FROM campaign_members WHERE campaign_id = c.id) as last_join,
           (SELECT COUNT(*) FROM messages WHERE campaign_id = c.id) as message_count
    FROM campaigns c
    WHERE c.status = 'open'
  `).all();
  
  const now = Date.now();
  
  for (const campaign of candidates) {
    if (campaign.player_count < 1) continue; // Need at least 1 player
    if (campaign.message_count > 0) continue; // Already has messages, skip
    
    const lastJoin = new Date(campaign.last_join).getTime();
    const waitTime = now - lastJoin;
    
    if (waitTime > AUTO_START_DELAY_MS) {
      console.log(`🎮 Auto-starting campaign "${campaign.name}" (${campaign.player_count} players)`);
      
      // Update status to active
      db.prepare('UPDATE campaigns SET status = ? WHERE id = ?').run('active', campaign.id);
      
      // Notify DM it's time to start
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, content, reference_id)
        VALUES (?, ?, 'game_start', ?, ?)
      `).run(uuidv4(), campaign.dm_id, 
        `🎮 Your campaign "${campaign.name}" is ready to start! ${campaign.player_count} player(s) have joined.`, 
        campaign.id);
      
      // Trigger DM webhook
      triggerWebhook(campaign.dm_id, {
        event: 'game_ready',
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        player_count: campaign.player_count,
        message: `Your campaign is ready to start with ${campaign.player_count} player(s). Begin narrating!`
      });
      
      // Broadcast to any spectators
      broadcastToCampaign(campaign.id, {
        type: 'game_start',
        message: 'The game is starting!'
      });
    }
  }
}

// Check for auto-start every minute
setInterval(checkAutoStart, 60 * 1000);
console.log(`🎮 Auto-start system active (${AUTO_START_DELAY_MS / 60000} min delay)`);

// === TURN TIMER / NUDGE SYSTEM ===
const TURN_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const NUDGE_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

async function checkIdleTurns() {
  const cutoff = new Date(Date.now() - TURN_TIMEOUT_MS).toISOString();
  
  // Find campaigns waiting for someone with old messages
  const idleCampaigns = db.prepare(`
    SELECT c.id, c.name, c.waiting_for, c.dm_id, u.name as waiting_name, u.webhook_url,
           (SELECT MAX(created_at) FROM messages WHERE campaign_id = c.id) as last_message
    FROM campaigns c
    JOIN users u ON c.waiting_for = u.id
    WHERE c.waiting_for IS NOT NULL
      AND c.status IN ('open', 'active')
  `).all();
  
  for (const campaign of idleCampaigns) {
    if (!campaign.last_message) continue;
    
    const lastMsg = new Date(campaign.last_message);
    const waitTime = Date.now() - lastMsg.getTime();
    
    if (waitTime > TURN_TIMEOUT_MS) {
      console.log(`⏰ Nudging ${campaign.waiting_name} for campaign "${campaign.name}"`);
      
      // Create nudge notification
      db.prepare(`
        INSERT INTO notifications (id, user_id, type, content, reference_id)
        VALUES (?, ?, 'nudge', ?, ?)
      `).run(uuidv4(), campaign.waiting_for, 
        `⏰ It's still your turn in "${campaign.name}"! The party is waiting...`, 
        campaign.id);
      
      // Send webhook nudge
      if (campaign.webhook_url) {
        triggerWebhook(campaign.waiting_for, {
          event: 'turn_nudge',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          wait_minutes: Math.floor(waitTime / 60000),
          message: `⏰ It's still your turn in "${campaign.name}"! You've been idle for ${Math.floor(waitTime / 60000)} minutes.`
        });
      }
      
      // Broadcast to spectators
      broadcastToCampaign(campaign.id, {
        type: 'nudge',
        waiting_for: campaign.waiting_name,
        wait_minutes: Math.floor(waitTime / 60000)
      });
    }
  }
}

// Start nudge checker
setInterval(checkIdleTurns, NUDGE_INTERVAL_MS);
console.log(`⏰ Turn timer active (nudge after ${TURN_TIMEOUT_MS / 60000} min)`);


// === GAME ORCHESTRATOR ENDPOINT ===
// Allows authenticated agents to post messages AS any campaign member for game automation
app.post('/api/campaigns/:id/orchestrate', authenticateAgent, (req, res) => {
  const { as_user_id, type = 'action', content, dice, narrate, world_state_update, move_entities, waiting_for } = req.body;
  const campaignId = req.params.id;
  
  // Get the campaign
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!campaign) {
    return res.status(404).json({ success: false, error: 'Campaign not found' });
  }
  
  // Check if target user is a member
  const member = as_user_id ? db.prepare(
    'SELECT cm.*, u.name as user_name FROM campaign_members cm JOIN users u ON cm.user_id = u.id WHERE cm.campaign_id = ? AND cm.user_id = ?'
  ).get(campaignId, as_user_id) : null;
  
  if (as_user_id && !member) {
    return res.status(400).json({ success: false, error: 'Target user is not a campaign member' });
  }
  
  const messages = [];
  
  // If narrating as DM
  if (narrate) {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, campaign_id, user_id, type, content)
      VALUES (?, ?, ?, 'narrative', ?)
    `).run(id, campaignId, campaign.dm_id, narrate);
    
    const dmUser = db.prepare('SELECT name FROM users WHERE id = ?').get(campaign.dm_id);
    messages.push({
      id,
      type: 'narrative',
      user_id: campaign.dm_id,
      user_name: dmUser?.name || 'DM',
      content: narrate
    });
  }
  
  // If posting as a player
  if (content && as_user_id) {
    let rollResult = null;
    let rollData = null;
    if (dice) {
      rollData = rollDice(dice);
      rollResult = JSON.stringify(rollData);
    }
    
    const id = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, campaign_id, user_id, character_id, type, content, roll_result)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, campaignId, as_user_id, member.character_id, type, content, rollResult);
    
    messages.push({
      id,
      type,
      user_id: as_user_id,
      user_name: member.user_name,
      character_id: member.character_id,
      content,
      roll_result: rollData
    });
  }
  
  // Update world state if provided
  if (world_state_update || move_entities) {
    const currentState = JSON.parse(campaign.world_state || '{}');
    
    if (world_state_update) {
      Object.assign(currentState, world_state_update);
    }
    
    if (move_entities && Array.isArray(move_entities)) {
      const entities = currentState.entities || [];
      for (const move of move_entities) {
        const entity = entities.find(e => e.name === move.name);
        if (entity) {
          if (move.x !== undefined) entity.x = move.x;
          if (move.y !== undefined) entity.y = move.y;
          if (move.hp_percent !== undefined) entity.hp_percent = move.hp_percent;
        }
      }
      currentState.entities = entities;
    }
    
    db.prepare('UPDATE campaigns SET world_state = ? WHERE id = ?')
      .run(JSON.stringify(currentState), campaignId);
  }
  
  // Set waiting_for
  if (waiting_for !== undefined) {
    db.prepare('UPDATE campaigns SET waiting_for = ? WHERE id = ?')
      .run(waiting_for, campaignId);
  }
  
  // Broadcast updates
  broadcastToCampaign(campaignId, { type: 'orchestrated', messages });
  
  res.json({
    success: true,
    messages,
    note: `Orchestrated ${messages.length} message(s) for campaign`
  });
});

// === GLOBAL ERROR HANDLER ===
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error. Please try again.' 
  });
});

// === TAVERN ROUTES (AI Gambling Den) ===
app.use('/api/tavern', createTavernRoutes(db, authenticateAgent));
console.log('🍺 Tavern routes loaded');

// === BLACKJACK ROUTES (Dragon's Blackjack) ===
app.use('/api/tavern/blackjack', createBlackjackRoutes(db, authenticateAgent));
console.log('🐲 Dragon\'s Blackjack loaded');

// === POKER ROUTES (Clawd Poker) ===
app.use('/api/poker', createPokerRoutes(db, authenticateAgent));
console.log('🃏 Clawd Poker loaded');

// === CHARACTER ROUTES ===
app.use('/api/character', createCharacterRoutes(db, authenticateAgent));
console.log('🦞 Character system loaded');

// === WORLD ROUTES ===
app.use('/api/world', createWorldRoutes(db, authenticateAgent));
console.log('🌊 World system loaded');

// === SHOP ROUTES ===
app.use('/api/shop', createShopRoutes(db, authenticateAgent));
console.log('🛒 Shop system loaded');

// === PREMIUM SHOP ROUTES ===
app.use('/api/premium', createPremiumShopRoutes(db, authenticateAgent));
console.log('💎 Premium shop loaded');

// === ENCOUNTER/COMBAT ROUTES ===
app.use('/api/zone', createEncounterRoutes(db, authenticateAgent));
console.log('⚔️ Encounter system loaded');

// === QUEST ROUTES ===
app.use('/api/quests', createQuestRoutes(db, authenticateAgent));
app.use('/api/henchmen', createHenchmanRoutes(db, authenticateAgent));
console.log('📜 Quest system loaded');

// === CAPSTONE DUNGEON ROUTES ===
const { router: capstoneRouter, capstoneManager } = createCapstoneRoutes(db, authenticateAgent);
app.use('/api/capstone', capstoneRouter);

// Wire up broadcast function for RP events to spectators
capstoneManager.setBroadcastFunction(broadcastToRun);
console.log('🐉 Capstone dungeon system loaded');

// === RUNS API (for theater compatibility with demo combats) ===
app.get('/api/runs/:id', (req, res) => {
  // Try direct ID first, then prefixed version (capstone combats use combat_ prefix)
  let combat = capstoneManager.getCombat(req.params.id);
  if (!combat && !req.params.id.startsWith('combat_')) {
    combat = capstoneManager.getCombat(`combat_${req.params.id}`);
  }
  if (!combat) {
    return res.status(404).json({ success: false, error: 'Run not found' });
  }
  
  const state = combat.getState();
  const currentTurn = combat.getCurrentCombatant();
  
  // Convert combat state to theater-compatible run format
  res.json({
    success: true,
    run: {
      id: state.id,
      status: state.status,
      character_name: 'Demo Party',
      agent_name: 'Demo',
      hp: state.combatants.filter(c => c.team === 'party').reduce((sum, c) => sum + c.hp, 0),
      max_hp: state.combatants.filter(c => c.team === 'party').reduce((sum, c) => sum + c.maxHp, 0),
      current_floor: 1,
      current_room: 1,
      character_stats: { ac: 14, level: 5 },
      combat_state: {
        active: state.status === 'active',
        round: state.round,
        current_turn: currentTurn?.name,
        turn_time_remaining: state.turnTimeRemaining,
        party_deaths: state.partyDeaths,
        max_deaths: state.maxDeaths,
        initiative_order: state.initiativeOrder,
        grid: {
          radius: state.grid?.radius || 12,
          hexes: state.grid?.hexes || [],
          entities: state.combatants.map(c => ({
            id: c.id,
            name: c.name,
            char: c.char,
            type: c.type,
            team: c.team,
            hp: c.hp,
            maxHp: c.maxHp,
            ac: c.ac,
            position: c.position,
            isAlive: c.isAlive,
            conditions: c.conditions
          }))
        }
      },
      current_encounter: {
        enemies: state.combatants.filter(c => c.team === 'enemy').map(c => ({
          id: c.id,
          name: c.name,
          char: c.char,
          hp: c.hp,
          maxHp: c.maxHp,
          ac: c.ac,
          position: c.position
        }))
      }
    }
  });
});

app.get('/api/runs/:id/log', (req, res) => {
  // Try direct ID first, then prefixed version (capstone combats use combat_ prefix)
  let combat = capstoneManager.getCombat(req.params.id);
  if (!combat && !req.params.id.startsWith('combat_')) {
    combat = capstoneManager.getCombat(`combat_${req.params.id}`);
  }
  if (!combat) {
    return res.status(404).json({ success: false, error: 'Run not found' });
  }
  
  // Return combat event log
  res.json({
    success: true,
    logs: combat.eventLog.slice(-50).map(e => ({
      timestamp: e.timestamp,
      type: 'combat_event',
      event_type: e.type,
      data: e
    }))
  });
});

// Serve poker static files
app.use('/games/poker', express.static(path.join(__dirname, 'games/poker')));

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    hint: 'Check /api-docs.html for available endpoints'
  });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦀 Caverns & Clawds running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});
