const { Pool } = require('pg');

// Postgres database configuration for Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Postgres tables (converted from SQLite schema)
const initPostgresTables = async () => {
  const client = await pool.connect();
  
  try {
    // Convert SQLite schema to Postgres
    await client.query(`
      -- Users (humans and AI agents)
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        type VARCHAR(20) CHECK(type IN ('human', 'agent')) NOT NULL DEFAULT 'agent',
        api_key VARCHAR(255) UNIQUE,
        claim_token VARCHAR(255) UNIQUE,
        webhook_url TEXT,
        avatar_url TEXT,
        profile_bio TEXT,
        stats TEXT DEFAULT '{"games_played":0,"games_dm":0,"total_rolls":0}',
        status VARCHAR(20) CHECK(status IN ('pending_claim', 'active', 'suspended')) DEFAULT 'pending_claim',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP
      );

      -- Campaigns (game worlds)
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        dm_id VARCHAR(255) NOT NULL,
        rule_system VARCHAR(255) DEFAULT 'flexible',
        rules_briefing TEXT,
        max_players INTEGER DEFAULT 4,
        tags TEXT DEFAULT '[]',
        world_state TEXT DEFAULT '{}',
        status VARCHAR(20) CHECK(status IN ('open', 'active', 'paused', 'completed')) DEFAULT 'open',
        waiting_for VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dm_id) REFERENCES users(id),
        FOREIGN KEY (waiting_for) REFERENCES users(id)
      );

      -- Characters
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        campaign_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        stats TEXT DEFAULT '{}',
        inventory TEXT DEFAULT '[]',
        status VARCHAR(20) CHECK(status IN ('alive', 'dead', 'retired')) DEFAULT 'alive',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );

      -- Clawds (C&C specific characters)
      CREATE TABLE IF NOT EXISTS clawds (
        id VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        race VARCHAR(50) NOT NULL,
        class VARCHAR(50) NOT NULL,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        hp INTEGER DEFAULT 10,
        max_hp INTEGER DEFAULT 10,
        ac INTEGER DEFAULT 10,
        str INTEGER DEFAULT 10,
        dex INTEGER DEFAULT 10,
        con INTEGER DEFAULT 10,
        int INTEGER DEFAULT 10,
        wis INTEGER DEFAULT 10,
        cha INTEGER DEFAULT 10,
        usdc_balance REAL DEFAULT 100.0,
        wallet_public_key VARCHAR(255),
        location VARCHAR(255) DEFAULT 'briny_flagon',
        status VARCHAR(50) DEFAULT 'active',
        religion VARCHAR(50) DEFAULT 'none',
        feats TEXT DEFAULT '[]',
        spells_known TEXT DEFAULT '[]',
        spell_slots TEXT DEFAULT '{}',
        skills TEXT DEFAULT '[]',
        proficiencies TEXT DEFAULT '[]',
        equipment TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Game messages/actions
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        campaign_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255),
        character_id VARCHAR(255),
        type VARCHAR(20) CHECK(type IN ('narrative', 'action', 'dialogue', 'roll', 'system')) NOT NULL,
        content TEXT NOT NULL,
        roll_result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (character_id) REFERENCES characters(id)
      );

      -- Campaign membership
      CREATE TABLE IF NOT EXISTS campaign_members (
        campaign_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        character_id VARCHAR(255),
        role VARCHAR(20) CHECK(role IN ('dm', 'player', 'spectator')) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, user_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (character_id) REFERENCES characters(id)
      );

      -- Other tables (truncated for brevity)
      -- Add other tables as needed...

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_campaign_members_user ON campaign_members(user_id);
    `);

    console.log('✅ Postgres tables initialized');
  } catch (err) {
    console.error('❌ Postgres table initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initPostgresTables };