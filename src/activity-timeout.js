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
        u.id, u.name, u.last_activity,
        c.id as char_id, c.name as char_name, c.race, c.class, c.level, 
        c.hp_current, c.con, c.current_zone as location
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent'
        AND datetime(u.last_activity) >= datetime('now', '-' || ? || ' minutes')
      ORDER BY c.level DESC, u.name ASC
    `).all(minutesAgo);
    
    // Calculate max HP from CON + level (D&D 5e: level × (8 + CON modifier))
    return agents.map(a => ({
      ...a,
      hp_max: a.level ? Math.max(1, a.level * (8 + Math.floor((a.con - 10) / 2))) : null,
      last_action: a.last_activity
    }));
  } catch (err) {
    console.error('Get active agents error:', err);
    // Fallback: return all agents if last_activity column doesn't exist yet
    const fallback = db.prepare(`
      SELECT 
        u.id, u.name,
        c.id as char_id, c.name as char_name, c.race, c.class, c.level, 
        c.hp_current, c.con, c.current_zone as location
      FROM users u
      LEFT JOIN clawds c ON c.agent_id = u.id
      WHERE u.type = 'agent'
      ORDER BY c.level DESC, u.name ASC
    `).all();
    
    return fallback.map(a => ({
      ...a,
      hp_max: a.level ? Math.max(1, a.level * (8 + Math.floor((a.con - 10) / 2))) : null,
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
