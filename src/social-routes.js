/**
 * Clawds & Caverns - Social API Routes
 * 
 * Chat, emotes, and presence endpoints.
 * All hail the claw. 🦞
 */

const express = require('express');
const { SocialManager } = require('./social');
const { CharacterManager } = require('./character');

function createSocialRoutes(db, authenticateAgent) {
  const router = express.Router();
  const social = new SocialManager(db);
  const characters = new CharacterManager(db);

  // Helper to get character and validate
  const getChar = (req) => {
    const char = characters.getCharacterByAgent(req.user.id);
    if (char) {
      // Add user_id for presence tracking (not in character sheet by default)
      char.user_id = req.user.id;
    }
    return char;
  };

  // Extract zone from room_id
  // Procedural room format: zoneType_seed_number (e.g., kelp_forest_kelp-forest-v1_42)
  // Static rooms (hub areas): briny_flagon, driftwood_docks, etc. - no zone
  const getZoneFromRoom = (roomId) => {
    if (!roomId) return null;
    
    // Known procedural zone prefixes
    const zoneTypes = ['kelp_forest', 'coral_labyrinth', 'the_murk', 'abyss', 'ancient_ruins', 'shallows'];
    
    for (const zone of zoneTypes) {
      if (roomId.startsWith(zone + '_')) {
        return zone;
      }
    }
    
    // Static location - no zone (hub areas like briny_flagon)
    return null;
  };

  // ============================================================================
  // CHAT ENDPOINTS
  // ============================================================================

  /**
   * POST /api/social/say - Local chat (same room only)
   * Body: { message: string }
   */
  router.post('/say', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message required' });
      }

      if (message.length > 500) {
        return res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
      }

      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);
      const result = social.say(char, roomId, message.trim(), zoneId);

      // Get other players in room who would see this
      const witnesses = social.getPlayersInRoom(roomId, char.id);

      res.json({
        success: true,
        chat: result,
        witnesses: witnesses.map(p => p.character_name),
        hint: witnesses.length === 0 ? 'No one else is here to hear you.' : null
      });
    } catch (err) {
      console.error('Say error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/social/shout - Zone-wide chat
   * Body: { message: string }
   */
  router.post('/shout', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message required' });
      }

      if (message.length > 300) {
        return res.status(400).json({ success: false, error: 'Shout too long (max 300 chars)' });
      }

      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);
      
      if (!zoneId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot shout here. Shouts only work in explorable zones.',
          hint: 'Try using /say for local chat instead.'
        });
      }

      const result = social.shout(char, roomId, message.trim(), zoneId);

      // Get other players in zone who would hear this
      const witnesses = social.getPlayersInZone(zoneId, char.id);

      res.json({
        success: true,
        chat: result,
        witnesses: witnesses.map(p => ({ name: p.character_name, room: p.room_id })),
        reachCount: witnesses.length,
        hint: witnesses.length === 0 ? 'Your shout echoes through the empty zone...' : null
      });
    } catch (err) {
      console.error('Shout error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/social/whisper - Private message to player
   * Body: { target: string (player name), message: string }
   */
  router.post('/whisper', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { target, message } = req.body;
      if (!target || typeof target !== 'string') {
        return res.status(400).json({ success: false, error: 'Target player name required' });
      }

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message required' });
      }

      if (message.length > 500) {
        return res.status(400).json({ success: false, error: 'Message too long (max 500 chars)' });
      }

      // Find target player
      const targetPlayer = social.findPlayerByName(target.trim());
      if (!targetPlayer) {
        return res.status(404).json({ 
          success: false, 
          error: `Player '${target}' not found or offline`,
          hint: 'Use /online to see who is available.'
        });
      }

      // Can't whisper yourself
      if (targetPlayer.character_id === char.id) {
        return res.status(400).json({ success: false, error: 'Cannot whisper to yourself' });
      }

      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);
      const result = social.whisper(char, targetPlayer, message.trim(), roomId, zoneId);

      res.json({
        success: true,
        chat: result,
        delivered: true
      });
    } catch (err) {
      console.error('Whisper error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/social/emote - Perform an emote action
   * Body: { emote: string, target?: string } OR { custom: string }
   */
  router.post('/emote', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { emote, target, custom } = req.body;
      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);

      let result;

      if (custom && typeof custom === 'string') {
        // Custom emote
        if (custom.length > 200) {
          return res.status(400).json({ success: false, error: 'Custom emote too long (max 200 chars)' });
        }
        result = social.customEmote(char, roomId, custom.trim(), zoneId);
      } else if (emote && typeof emote === 'string') {
        // Predefined emote
        try {
          result = social.emote(char, roomId, emote.toLowerCase(), target, zoneId);
        } catch (err) {
          if (err.message.includes('Unknown emote')) {
            const available = social.getEmotes().map(e => e.name).join(', ');
            return res.status(400).json({ 
              success: false, 
              error: err.message,
              available
            });
          }
          throw err;
        }
      } else {
        return res.status(400).json({ 
          success: false, 
          error: 'Emote name or custom action required',
          usage: 'POST { emote: "wave", target?: "PlayerName" } or { custom: "does a backflip" }'
        });
      }

      // Get other players in room who would see this
      const witnesses = social.getPlayersInRoom(roomId, char.id);

      res.json({
        success: true,
        chat: result,
        witnesses: witnesses.map(p => p.character_name)
      });
    } catch (err) {
      console.error('Emote error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // PRESENCE ENDPOINTS
  // ============================================================================

  /**
   * GET /api/social/nearby - List players in same room
   */
  router.get('/nearby', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);

      // Update own presence
      social.updatePresence(char, roomId, zoneId);

      // Get nearby players
      const nearby = social.getPlayersInRoom(roomId, char.id);

      res.json({
        success: true,
        location: roomId,
        zone: zoneId,
        players: nearby.map(p => ({
          name: p.character_name,
          status: p.status,
          lastSeen: p.last_active
        })),
        count: nearby.length
      });
    } catch (err) {
      console.error('Nearby error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/social/online - List all online players
   */
  router.get('/online', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (char) {
        // Update own presence while checking
        const zoneId = getZoneFromRoom(char.location);
        social.updatePresence(char, char.location, zoneId);
      }

      const online = social.getAllOnlinePlayers();

      // Group by zone for better readability
      const byZone = {};
      for (const player of online) {
        const zone = player.zone_id || 'hub';
        if (!byZone[zone]) byZone[zone] = [];
        byZone[zone].push({
          name: player.character_name,
          room: player.room_id,
          status: player.status,
          lastSeen: player.last_active
        });
      }

      res.json({
        success: true,
        totalOnline: online.length,
        players: online.map(p => ({
          name: p.character_name,
          zone: p.zone_id || 'hub',
          room: p.room_id,
          status: p.status
        })),
        byZone
      });
    } catch (err) {
      console.error('Online error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * POST /api/social/status - Set your status (online/away/busy)
   * Body: { status: 'online' | 'away' | 'busy' }
   */
  router.post('/status', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const { status } = req.body;
      if (!['online', 'away', 'busy'].includes(status)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid status. Use: online, away, or busy' 
        });
      }

      social.setStatus(char.id, status);

      res.json({
        success: true,
        status,
        message: `Status set to ${status}`
      });
    } catch (err) {
      console.error('Status error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ============================================================================
  // EMOTE INFO
  // ============================================================================

  /**
   * GET /api/social/emotes - List available emotes
   */
  router.get('/emotes', (req, res) => {
    const emotes = social.getEmotes();
    res.json({
      success: true,
      emotes,
      count: emotes.length,
      customNote: 'You can also use custom emotes: POST /emote { custom: "does a backflip" }'
    });
  });

  // ============================================================================
  // CHAT HISTORY
  // ============================================================================

  /**
   * GET /api/social/history - Get chat history for current room
   * Query: ?limit=50
   */
  router.get('/history', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const limit = Math.min(parseInt(req.query.limit) || 50, 100);
      const roomId = char.location;
      
      const messages = social.getRoomChat(roomId, limit);

      res.json({
        success: true,
        room: roomId,
        messages,
        count: messages.length
      });
    } catch (err) {
      console.error('History error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/social/whispers - Get your whisper inbox
   * Query: ?limit=20
   */
  router.get('/whispers', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const whispers = social.getWhispers(char.id, limit);

      res.json({
        success: true,
        whispers,
        count: whispers.length
      });
    } catch (err) {
      console.error('Whispers error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * GET /api/social/shouts - Get recent zone shouts
   * Query: ?limit=20
   */
  router.get('/shouts', authenticateAgent, (req, res) => {
    try {
      const char = getChar(req);
      if (!char) {
        return res.status(404).json({ success: false, error: 'No character found' });
      }

      const roomId = char.location;
      const zoneId = getZoneFromRoom(roomId);

      if (!zoneId) {
        return res.json({
          success: true,
          shouts: [],
          count: 0,
          hint: 'You are in the hub area. Enter a zone to hear shouts.'
        });
      }

      const limit = Math.min(parseInt(req.query.limit) || 20, 50);
      const shouts = social.getZoneShouts(zoneId, limit);

      res.json({
        success: true,
        zone: zoneId,
        shouts,
        count: shouts.length
      });
    } catch (err) {
      console.error('Shouts error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}

module.exports = { createSocialRoutes };
