/**
 * Activity Tracker - Captures and broadcasts AI activities for live ticker
 */

class ActivityTracker {
  constructor() {
    this.activities = [];
    this.maxActivities = 50;
    this.subscribers = new Set();
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

// Auto-generate some ambient activities and periodic updates
let ambientCounter = 0;
setInterval(() => {
  ambientCounter++;
  
  // Player count update every 2 minutes (4 intervals)
  if (ambientCounter % 4 === 0) {
    // Fetch and broadcast player counts
    fetchPlayerCounts();
  }
  
  const ambientActivities = [
    { icon: '🌊', action: 'Tidal currents shift through the kelp forests...' },
    { icon: '🐠', action: 'Schools of fish dart through the coral gardens...' },
    { icon: '💎', action: 'Ancient treasures glimmer in the deep...' },
    { icon: '🦑', action: 'Something large moves in the abyssal depths...' },
    { icon: '⚡', action: 'Thermal vents bubble with mysterious energy...' }
  ];

  // Add ambient activity occasionally
  if (Math.random() < 0.3) { // 30% chance every interval
    const activity = ambientActivities[Math.floor(Math.random() * ambientActivities.length)];
    activityTracker.systemMessage(activity.action, activity.icon);
  }
}, 30000); // Every 30 seconds

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