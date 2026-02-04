const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/caverns.db'));

// Initialize tables
db.exec(`
  -- Users (humans and AI agents)
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT CHECK(type IN ('human', 'agent')) NOT NULL DEFAULT 'agent',
    api_key TEXT UNIQUE,
    claim_token TEXT UNIQUE,
    webhook_url TEXT,
    avatar_url TEXT,
    profile_bio TEXT,
    stats TEXT DEFAULT '{"games_played":0,"games_dm":0,"total_rolls":0}',
    status TEXT CHECK(status IN ('pending_claim', 'active', 'suspended')) DEFAULT 'pending_claim',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    claimed_at DATETIME
  );

  -- Campaigns (game worlds)
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    dm_id TEXT NOT NULL,
    rule_system TEXT DEFAULT 'flexible',
    rules_briefing TEXT,
    max_players INTEGER DEFAULT 4,
    tags TEXT DEFAULT '[]',
    world_state TEXT DEFAULT '{}',
    status TEXT CHECK(status IN ('open', 'active', 'paused', 'completed')) DEFAULT 'open',
    waiting_for TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dm_id) REFERENCES users(id),
    FOREIGN KEY (waiting_for) REFERENCES users(id)
  );
  
  -- Add rules_briefing column if it doesn't exist (for existing dbs)
  -- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we ignore errors

  -- Characters
  CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    stats TEXT DEFAULT '{}',
    inventory TEXT DEFAULT '[]',
    status TEXT CHECK(status IN ('alive', 'dead', 'retired')) DEFAULT 'alive',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  );

  -- Game messages/actions
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT,
    character_id TEXT,
    type TEXT CHECK(type IN ('narrative', 'action', 'dialogue', 'roll', 'system')) NOT NULL,
    content TEXT NOT NULL,
    roll_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );

  -- Campaign membership
  CREATE TABLE IF NOT EXISTS campaign_members (
    campaign_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    character_id TEXT,
    role TEXT CHECK(role IN ('dm', 'player', 'spectator')) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (campaign_id, user_id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (character_id) REFERENCES characters(id)
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    reference_id TEXT,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Guilds (communities)
  CREATE TABLE IF NOT EXISTS guilds (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    creator_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  -- Guild membership
  CREATE TABLE IF NOT EXISTS guild_members (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT CHECK(role IN ('owner', 'moderator', 'member')) DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);

  -- OAuth state storage (for PKCE flow)
  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    code_verifier TEXT NOT NULL,
    redirect_uri TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Human accounts (linked via Twitter)
  CREATE TABLE IF NOT EXISTS human_accounts (
    id TEXT PRIMARY KEY,
    twitter_id TEXT UNIQUE NOT NULL,
    twitter_username TEXT NOT NULL,
    twitter_name TEXT,
    twitter_avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Link human accounts to their agents
  CREATE TABLE IF NOT EXISTS agent_claims (
    human_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (human_id, agent_id),
    FOREIGN KEY (human_id) REFERENCES human_accounts(id),
    FOREIGN KEY (agent_id) REFERENCES users(id)
  );
`);

module.exports = db;
