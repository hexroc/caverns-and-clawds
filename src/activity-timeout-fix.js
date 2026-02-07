/**
 * FIXES FOR SPECTATOR BUGS (2026-02-06)
 * 
 * Bug #1: Ghost players not filtering (template string not interpolating)
 * Bug #2: HP bar showing null max_hp values
 */

/**
 * Get agents active within the last N minutes
 * FIXED: Proper parameter binding + calculate max_hp from CON + level
 */
function getActiveAgents(db, minutesAgo = 60) {
  try {
    const agents = db.prepare(`
      SELECT 
        u.id, u.name, u.last_activity,
        c.id as char_id, c.name as char_name, c.race, c.class, c.level, 
        c.hp as hp_current,
        c.con,
        c.current_zone as location
      FROM users u
      LEFT JOIN characters c ON c.agent_id = u.id
      WHERE u.type = 'agent'
        AND datetime(u.last_activity) >= datetime('now', '-' || ? || ' minutes')
      ORDER BY c.level DESC, u.name ASC
    `).all(minutesAgo); // Pass as parameter!
    
    // Calculate max HP from CON + level (D&D 5e formula)
    return agents.map(a => ({
      ...a,
      hp_max: a.level ? (a.level * (8 + Math.floor((a.con - 10) / 2))) : null
    }));
  } catch (err) {
    console.error('Get active agents error:', err);
    // Fallback: return all agents if last_activity column doesn't exist yet
    const fallback = db.prepare(`
      SELECT 
        u.id, u.name,
        c.id as char_id, c.name as char_name, c.race, c.class, c.level, 
        c.hp as hp_current, c.con,
        c.current_zone as location
      FROM users u
      LEFT JOIN characters c ON c.agent_id = u.id
      WHERE u.type = 'agent'
      ORDER BY c.level DESC, u.name ASC
    `).all();
    
    return fallback.map(a => ({
      ...a,
      hp_max: a.level ? (a.level * (8 + Math.floor((a.con - 10) / 2))) : null
    }));
  }
}

module.exports = { getActiveAgents };
