/**
 * Clawds & Caverns - Social System
 * 
 * Chat, emotes, presence tracking for the MUD.
 * All hail the claw. 🦞
 */

const { v4: uuidv4 } = require('uuid');

// Available emotes with descriptions
const EMOTES = {
  wave: { action: 'waves', description: 'A friendly greeting' },
  bow: { action: 'bows gracefully', description: 'A respectful bow' },
  laugh: { action: 'laughs heartily', description: 'Express amusement' },
  cheer: { action: 'cheers enthusiastically', description: 'Celebrate victory' },
  shrug: { action: 'shrugs indifferently', description: 'Express uncertainty' },
  dance: { action: 'dances a little jig', description: 'Show off your moves' },
  salute: { action: 'salutes crisply', description: 'Military respect' },
  nod: { action: 'nods knowingly', description: 'Silent agreement' },
  facepalm: { action: 'facepalms dramatically', description: 'Express frustration' },
  flex: { action: 'flexes their muscles', description: 'Show off strength' },
  yawn: { action: 'yawns tiredly', description: 'Express boredom or fatigue' },
  clap: { action: 'claps slowly', description: 'Sarcastic or sincere applause' },
  ponder: { action: 'strokes their chin thoughtfully', description: 'Deep in thought' },
  wink: { action: 'winks slyly', description: 'Playful acknowledgment' },
  cry: { action: 'weeps openly', description: 'Express sadness' }
};

class SocialManager {
  constructor(db) {
    this.db = db;
    this.initTables();
  }

  initTables() {
    // Chat messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        type TEXT CHECK(type IN ('say', 'shout', 'whisper', 'emote')) NOT NULL,
        message TEXT NOT NULL,
        target_id TEXT,
        target_name TEXT,
        zone_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_room ON chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sender ON chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_chat_zone ON chat_messages(zone_id);
      CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);
    `);

    // Player presence table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS player_presence (
        character_id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        character_name TEXT NOT NULL,
        room_id TEXT NOT NULL,
        zone_id TEXT,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('online', 'away', 'busy')) DEFAULT 'online'
      );
      CREATE INDEX IF NOT EXISTS idx_presence_room ON player_presence(room_id);
      CREATE INDEX IF NOT EXISTS idx_presence_zone ON player_presence(zone_id);
      CREATE INDEX IF NOT EXISTS idx_presence_active ON player_presence(last_active);
    `);

    // Clean up old presence records (>1 hour old)
    this.cleanupStalePresence();
  }

  cleanupStalePresence() {
    try {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      this.db.prepare('DELETE FROM player_presence WHERE last_active < ?').run(cutoff);
    } catch (err) {
      console.error('Failed to cleanup stale presence:', err);
    }
  }

  // ============================================================================
  // PRESENCE TRACKING
  // ============================================================================

  updatePresence(character, roomId, zoneId = null) {
    const stmt = this.db.prepare(`
      INSERT INTO player_presence (character_id, agent_id, character_name, room_id, zone_id, last_active, status)
      VALUES (?, ?, ?, ?, ?, datetime('now'), 'online')
      ON CONFLICT(character_id) DO UPDATE SET
        room_id = excluded.room_id,
        zone_id = excluded.zone_id,
        last_active = datetime('now'),
        status = 'online'
    `);
    stmt.run(character.id, character.user_id, character.name, roomId, zoneId);
  }

  getPresence(characterId) {
    return this.db.prepare('SELECT * FROM player_presence WHERE character_id = ?').get(characterId);
  }

  setStatus(characterId, status) {
    this.db.prepare('UPDATE player_presence SET status = ?, last_active = datetime(\'now\') WHERE character_id = ?')
      .run(status, characterId);
  }

  removePresence(characterId) {
    this.db.prepare('DELETE FROM player_presence WHERE character_id = ?').run(characterId);
  }

  // Helper: Get SQLite-compatible datetime string
  _cutoffTime(minutes = 5) {
    const d = new Date(Date.now() - minutes * 60 * 1000);
    // SQLite datetime format: YYYY-MM-DD HH:MM:SS
    return d.toISOString().replace('T', ' ').split('.')[0];
  }

  // Get players in the same room
  getPlayersInRoom(roomId, excludeId = null) {
    const cutoff = this._cutoffTime(5); // 5 min timeout
    let query = `
      SELECT character_id, character_name, status, last_active 
      FROM player_presence 
      WHERE room_id = ? AND last_active > ?
    `;
    const params = [roomId, cutoff];
    
    if (excludeId) {
      query += ' AND character_id != ?';
      params.push(excludeId);
    }
    
    return this.db.prepare(query).all(...params);
  }

  // Get players in the same zone
  getPlayersInZone(zoneId, excludeId = null) {
    const cutoff = this._cutoffTime(5);
    let query = `
      SELECT character_id, character_name, room_id, status, last_active 
      FROM player_presence 
      WHERE zone_id = ? AND last_active > ?
    `;
    const params = [zoneId, cutoff];
    
    if (excludeId) {
      query += ' AND character_id != ?';
      params.push(excludeId);
    }
    
    return this.db.prepare(query).all(...params);
  }

  // Get all online players
  getAllOnlinePlayers() {
    const cutoff = this._cutoffTime(5);
    return this.db.prepare(`
      SELECT character_id, character_name, room_id, zone_id, status, last_active 
      FROM player_presence 
      WHERE last_active > ?
      ORDER BY last_active DESC
    `).all(cutoff);
  }

  // Find player by name (for whisper targeting)
  findPlayerByName(name) {
    const cutoff = this._cutoffTime(5);
    return this.db.prepare(`
      SELECT character_id, character_name, agent_id, room_id, zone_id
      FROM player_presence 
      WHERE LOWER(character_name) = LOWER(?) AND last_active > ?
    `).get(name, cutoff);
  }

  // ============================================================================
  // CHAT MESSAGES
  // ============================================================================

  // Say something (local chat - same room only)
  say(character, roomId, message, zoneId = null) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, sender_id, sender_name, type, message, zone_id)
      VALUES (?, ?, ?, ?, 'say', ?, ?)
    `).run(id, roomId, character.id, character.name, message, zoneId);

    // Update presence
    this.updatePresence(character, roomId, zoneId);

    return {
      id,
      type: 'say',
      sender: character.name,
      message,
      roomId,
      timestamp: new Date().toISOString()
    };
  }

  // Shout something (zone-wide chat)
  shout(character, roomId, message, zoneId) {
    if (!zoneId) {
      throw new Error('Shout requires a zone context');
    }

    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, sender_id, sender_name, type, message, zone_id)
      VALUES (?, ?, ?, ?, 'shout', ?, ?)
    `).run(id, roomId, character.id, character.name, message, zoneId);

    this.updatePresence(character, roomId, zoneId);

    return {
      id,
      type: 'shout',
      sender: character.name,
      message,
      zoneId,
      timestamp: new Date().toISOString()
    };
  }

  // Whisper to a specific player
  whisper(character, targetPlayer, message, roomId, zoneId = null) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, sender_id, sender_name, type, message, target_id, target_name, zone_id)
      VALUES (?, ?, ?, ?, 'whisper', ?, ?, ?, ?)
    `).run(id, roomId, character.id, character.name, message, targetPlayer.character_id, targetPlayer.character_name, zoneId);

    this.updatePresence(character, roomId, zoneId);

    return {
      id,
      type: 'whisper',
      sender: character.name,
      target: targetPlayer.character_name,
      message,
      timestamp: new Date().toISOString()
    };
  }

  // Perform an emote
  emote(character, roomId, emoteName, targetName = null, zoneId = null) {
    const emoteData = EMOTES[emoteName.toLowerCase()];
    if (!emoteData) {
      throw new Error(`Unknown emote: ${emoteName}`);
    }

    let message;
    if (targetName) {
      message = `${character.name} ${emoteData.action} at ${targetName}.`;
    } else {
      message = `${character.name} ${emoteData.action}.`;
    }

    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, sender_id, sender_name, type, message, target_name, zone_id)
      VALUES (?, ?, ?, ?, 'emote', ?, ?, ?)
    `).run(id, roomId, character.id, character.name, message, targetName, zoneId);

    this.updatePresence(character, roomId, zoneId);

    return {
      id,
      type: 'emote',
      sender: character.name,
      emote: emoteName,
      action: emoteData.action,
      target: targetName,
      message,
      timestamp: new Date().toISOString()
    };
  }

  // Custom emote (free-form action)
  customEmote(character, roomId, action, zoneId = null) {
    const message = `${character.name} ${action}`;

    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO chat_messages (id, room_id, sender_id, sender_name, type, message, zone_id)
      VALUES (?, ?, ?, ?, 'emote', ?, ?)
    `).run(id, roomId, character.id, character.name, message, zoneId);

    this.updatePresence(character, roomId, zoneId);

    return {
      id,
      type: 'emote',
      sender: character.name,
      custom: true,
      message,
      timestamp: new Date().toISOString()
    };
  }

  // Get recent chat messages for a room
  getRoomChat(roomId, limit = 50) {
    return this.db.prepare(`
      SELECT id, sender_name as sender, type, message, target_name as target, created_at as timestamp
      FROM chat_messages 
      WHERE room_id = ? AND type IN ('say', 'emote')
      ORDER BY created_at DESC
      LIMIT ?
    `).all(roomId, limit).reverse();
  }

  // Get recent shouts for a zone
  getZoneShouts(zoneId, limit = 20) {
    return this.db.prepare(`
      SELECT id, sender_name as sender, type, message, created_at as timestamp
      FROM chat_messages 
      WHERE zone_id = ? AND type = 'shout'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(zoneId, limit).reverse();
  }

  // Get whispers for a character
  getWhispers(characterId, limit = 20) {
    return this.db.prepare(`
      SELECT id, sender_name as sender, message, created_at as timestamp
      FROM chat_messages 
      WHERE target_id = ? AND type = 'whisper'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(characterId, limit).reverse();
  }

  // Get emotes list
  getEmotes() {
    return Object.entries(EMOTES).map(([name, data]) => ({
      name,
      action: data.action,
      description: data.description,
      usage: `/emote ${name} [target]`
    }));
  }
}

module.exports = { SocialManager, EMOTES };
