/**
 * Activity Timeout System
 * 
 * Track agent activity and filter out "ghost" inactive agents from spectator view.
 */

/**
 * Add last_activity column if it doesn't exist
 */
function initActivityTracking(db) {
  try {
    // Check if column exists
    const columns = db.prepare("PRAGMA table_info(users)").all();
    const hasLastActivity = columns.some(c => c.name === 'last_activity');
    
    if (!hasLastActivity) {
      console.log('🕐 Adding last_activity column to users table...');
      db.exec(`
        ALTER TABLE users ADD COLUMN last_activity TEXT DEFAULT CURRENT_TIMESTAMP;
      `);
      
      // Set all existing agents to now (they're currently "online")
      db.exec(`
        UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE type = 'agent';
      `);
      
      console.log('✅ Activity tracking initialized');
    }
  } catch (err) {
    // Column might already exist from previous run
    if (!err.message.includes('duplicate column')) {
      console.error('Activity tracking init error:', err);
    }
  }
}

/**
 * Update agent's last activity timestamp
 */
function updateActivity(db, userId) {
  try {
    db.prepare('UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  } catch (err) {
    console.error('Update activity error:', err);
  }
}

/**
 * Get agents active within the last N minutes
 */
function getActiveAgents(db, minutesAgo = 60) {
  try {
    const agents = db.prepare(`
      SELECT 
        u.id as user_id, u.name as user_name, u.last_activity,
        c.*
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent'
        AND datetime(u.last_activity) >= datetime('now', '-' || ? || ' minutes')
      ORDER BY c.level DESC, u.name ASC
    `).all(minutesAgo);
    
    // Handle both column naming conventions (local: hp_current/hp_max vs production: hp/max_hp)
    return agents.map(a => ({
      id: a.user_id,
      name: a.user_name,
      last_activity: a.last_activity,
      char_id: a.id,
      char_name: a.name,
      race: a.race,
      class: a.class,
      level: a.level,
      hp_current: a.hp_current ?? a.hp,
      hp_max: a.hp_max ?? a.max_hp,
      location: a.current_zone,
      last_action: a.last_activity
    }));
  } catch (err) {
    console.error('Get active agents error:', err);
    // Fallback: return all agents if last_activity column doesn't exist yet
    const fallback = db.prepare(`
      SELECT 
        u.id as user_id, u.name as user_name,
        c.*
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent'
      ORDER BY c.level DESC, u.name ASC
    `).all();
    
    return fallback.map(a => ({
      id: a.user_id,
      name: a.user_name,
      char_id: a.id,
      char_name: a.name,
      race: a.race,
      class: a.class,
      level: a.level,
      hp_current: a.hp_current ?? a.hp,
      hp_max: a.hp_max ?? a.max_hp,
      location: a.current_zone,
      last_action: null
    }));
  }
}

/**
 * Clean up old inactive sessions (optional - for maintenance)
 */
function cleanupInactiveSessions(db, daysAgo = 7) {
  try {
    const result = db.prepare(`
      UPDATE users 
      SET status = 'suspended'
      WHERE type = 'agent'
        AND status = 'active'
        AND last_activity < datetime('now', '-${daysAgo} days')
    `).run();
    
    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} inactive agent sessions`);
    }
    
    return result.changes;
  } catch (err) {
    console.error('Cleanup inactive sessions error:', err);
    return 0;
  }
}

module.exports = {
  initActivityTracking,
  updateActivity,
  getActiveAgents,
  cleanupInactiveSessions
};
