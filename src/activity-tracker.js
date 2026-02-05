/**
 * Activity Tracker - Captures and broadcasts AI activities for live ticker
 */

class ActivityTracker {
  constructor() {
    this.activities = [];
    this.maxActivities = 50;
    this.subscribers = new Set();
    // Combat event log: Map<characterName, Array<combatEvent>>
    this.combatLogs = new Map();
    this.maxCombatEvents = 100;
    // Active combat state: Map<characterName, { inCombat, monsters, playerHp, playerMaxHp, round }>
    this.activeCombats = new Map();
  }

  // Add a new activity
  addActivity(activity) {
    const timestamp = Date.now();
    const activityWithTime = {
      id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      ...activity
    };

    // Add to beginning of array
    this.activities.unshift(activityWithTime);

    // Keep only recent activities
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    // Broadcast to subscribers
    this.broadcast(activityWithTime);

    console.log(`📡 Activity: ${activity.player || 'System'} - ${activity.action}`);
  }

  // Subscribe to activity updates (for WebSocket connections)
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Broadcast activity to all subscribers
  broadcast(activity) {
    this.subscribers.forEach(callback => {
      try {
        callback(activity);
      } catch (err) {
        console.error('Activity broadcast error:', err);
      }
    });
  }

  // Get recent activities
  getRecent(limit = 10) {
    return this.activities.slice(0, limit);
  }

  // Get activities for a specific player
  getActivitiesForPlayer(playerName, limit = 50) {
    return this.activities
      .filter(a => a.player === playerName)
      .slice(0, limit);
  }

  // ==========================================
  // COMBAT EVENT SYSTEM
  // ==========================================

  /**
   * Add a detailed combat event for spectator play-by-play
   * @param {string} characterName - The player character name
   * @param {Object} event - Combat event data
   */
  addCombatEvent(characterName, event) {
    if (!this.combatLogs.has(characterName)) {
      this.combatLogs.set(characterName, []);
    }

    const log = this.combatLogs.get(characterName);
    const eventWithTime = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...event
    };

    log.unshift(eventWithTime);

    // Trim to max
    if (log.length > this.maxCombatEvents) {
      log.length = this.maxCombatEvents;
    }

    // Broadcast combat event to subscribers
    this.broadcast({
      ...eventWithTime,
      _combatEvent: true,
      characterName
    });
  }

  /**
   * Get recent combat events for a character
   */
  getCombatLog(characterName, limit = 50) {
    const log = this.combatLogs.get(characterName) || [];
    return log.slice(0, limit);
  }

  /**
   * Set active combat state for a character
   */
  setCombatState(characterName, state) {
    if (state) {
      this.activeCombats.set(characterName, {
        ...state,
        updatedAt: Date.now()
      });
    } else {
      this.activeCombats.delete(characterName);
    }
  }

  /**
   * Get active combat state for a character
   */
  getCombatState(characterName) {
    return this.activeCombats.get(characterName) || null;
  }

  /**
   * Clear combat log for a character (on combat end)
   */
  clearCombatState(characterName) {
    this.activeCombats.delete(characterName);
  }

  // Helper methods for common activity types
  playerMove(player, fromLocation, toLocation) {
    this.addActivity({
      icon: '🚶',
      player,
      action: `moved to ${toLocation}`,
      location: toLocation,
      type: 'movement'
    });
  }

  playerSay(player, message, location) {
    this.addActivity({
      icon: '💬',
      player,
      action: `"${message.length > 50 ? message.substring(0, 50) + '...' : message}"`,
      location,
      type: 'chat'
    });
  }

  playerTrade(player, action, item, amount, location) {
    this.addActivity({
      icon: action === 'buy' ? '💰' : '🔄',
      player,
      action: `${action} ${item}${amount ? ` (${amount})` : ''}`,
      location,
      type: 'trade',
      usdc: amount ? `${amount} USDC` : null
    });
  }

  playerExplore(player, zone, result) {
    this.addActivity({
      icon: '🔍',
      player,
      action: `exploring ${zone}${result ? ` - ${result}` : ''}`,
      location: zone,
      type: 'exploration'
    });
  }

  playerCombat(player, enemy, result, location) {
    const icon = result === 'victory' ? '⚔️' : result === 'defeat' ? '💀' : '🛡️';
    this.addActivity({
      icon,
      player,
      action: `${result} against ${enemy}`,
      location,
      type: 'combat'
    });
  }

  systemMessage(message, icon = '✨') {
    this.addActivity({
      icon,
      action: message,
      type: 'system'
    });
  }

  // Player count update
  playerCountUpdate(counts) {
    this.addActivity({
      icon: '📊',
      action: `${counts.total} players online (${counts.humans} humans, ${counts.agents} agents)`,
      type: 'player_count',
      counts: counts
    });
  }

  // Economy activities
  economicActivity(type, details) {
    const icons = {
      deposit: '🏦',
      withdraw: '💳',
      loan: '📊',
      auction: '🔨',
      property: '🏠'
    };

    this.addActivity({
      icon: icons[type] || '💰',
      action: details.message,
      location: details.location,
      usdc: details.usdc,
      type: 'economy'
    });
  }
}

// Global instance
const activityTracker = new ActivityTracker();

// Player count updates only (no ambient spam)
setInterval(() => {
  // Fetch and broadcast player counts every 2 minutes
  fetchPlayerCounts();
}, 120000); // Every 2 minutes

// Remove ambient activities - ticker should only show real player actions

// Function to fetch and broadcast player counts
async function fetchPlayerCounts() {
  try {
    // Import db here to avoid circular dependency
    const db = require('./db');
    
    const humanCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('human').count;
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE type = ?').get('agent').count;
    const activeCharacters = db.prepare('SELECT COUNT(*) as count FROM clawds WHERE status = ?').get('active').count;
    
    const counts = {
      humans: humanCount,
      agents: agentCount, 
      total: humanCount + agentCount,
      activeCharacters: activeCharacters
    };
    
    activityTracker.playerCountUpdate(counts);
  } catch (err) {
    console.error('Failed to fetch player counts:', err);
  }
}

module.exports = { activityTracker };