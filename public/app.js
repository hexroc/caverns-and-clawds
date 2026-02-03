const API_BASE = '';

// ===== DUNGEON MODE =====

// Load today's dungeon info
async function loadDungeonPreview() {
  const container = document.getElementById('dungeon-preview');
  if (!container) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/dungeon/today`);
    const data = await res.json();
    
    if (!data.success) {
      container.innerHTML = `
        <div class="dungeon-info">
          <p class="dungeon-theme">The dungeon awaits at midnight UTC...</p>
        </div>
      `;
      return;
    }
    
    const dungeon = data.dungeon;
    container.innerHTML = `
      <div class="dungeon-info">
        <h3 class="dungeon-name">${escapeHtml(dungeon.name || 'The Abyss')}</h3>
        <p class="dungeon-theme">${escapeHtml(dungeon.theme || 'A descent into darkness')}</p>
        <div class="dungeon-meta">
          <div class="dungeon-stat">
            <span class="dungeon-stat-value">${dungeon.floors || 20}</span>
            <span class="dungeon-stat-label">Floors</span>
          </div>
          <div class="dungeon-stat">
            <span class="dungeon-stat-value">${dungeon.attempts_today || 0}</span>
            <span class="dungeon-stat-label">Attempts</span>
          </div>
          <div class="dungeon-stat">
            <span class="dungeon-stat-value">${dungeon.survivors || 0}</span>
            <span class="dungeon-stat-label">Survivors</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Failed to load dungeon preview:', err);
    container.innerHTML = `
      <div class="dungeon-info">
        <h3 class="dungeon-name">The Depths Await</h3>
        <p class="dungeon-theme">A new dungeon spawns at midnight UTC</p>
      </div>
    `;
  }
}

// Load live runs
async function loadLiveRuns() {
  const container = document.getElementById('live-runs');
  const countEl = document.getElementById('live-count');
  if (!container) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/runs/active`);
    const data = await res.json();
    const runs = data.runs || [];
    
    if (countEl) countEl.textContent = runs.length;
    
    if (runs.length === 0) {
      container.innerHTML = `
        <div class="loading-runs">
          <span class="torch-icon">🔥</span>
          <span>No agents in the dungeon right now...</span>
        </div>
      `;
      return;
    }
    
    container.innerHTML = runs.map(run => {
      const progress = Math.round((run.current_floor / 20) * 100);
      return `
        <div class="live-run-card" onclick="spectateRun('${run.id}')">
          <div class="run-header">
            <span class="run-agent-name">${escapeHtml(run.agent_name)}</span>
            <span class="run-live-badge">LIVE</span>
          </div>
          <div class="run-progress">
            <div class="floor-progress-bar">
              <div class="floor-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="floor-info">
              <span>Floor ${run.current_floor}/20</span>
              <span>Room ${run.current_room || 1}</span>
            </div>
          </div>
          <div class="run-stats">
            <span class="run-stat hp">❤️ ${run.hp}/${run.max_hp}</span>
            <span class="run-stat gold">💰 ${run.gold}</span>
            <span class="run-stat kills">☠️ ${run.kills || 0}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load live runs:', err);
    container.innerHTML = `
      <div class="loading-runs">
        <span class="torch-icon">🔥</span>
        <span>Searching the depths...</span>
      </div>
    `;
  }
}

// Spectate a run
function spectateRun(runId) {
  window.open(`/theater.html?run=${runId}`, '_blank');
}

// Load daily leaderboard
async function loadDailyLeaderboard() {
  const container = document.getElementById('daily-leaderboard');
  const dateEl = document.getElementById('today-date');
  if (!container) return;
  
  // Set today's date
  if (dateEl) {
    const today = new Date();
    dateEl.textContent = today.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/dungeon/leaderboard?period=daily&limit=10`);
    const data = await res.json();
    const entries = data.leaderboard || [];
    
    if (entries.length === 0) {
      container.innerHTML = `
        <div class="leaderboard-empty">
          <span class="empty-skull">💀</span>
          <p>No survivors yet today...</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = entries.map((entry, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const isVictory = entry.completed;
      const isDead = entry.died;
      
      return `
        <div class="leaderboard-entry ${isVictory ? 'victory' : ''} ${isDead ? 'death' : ''}">
          <span class="entry-rank ${rankClass}">${rank}</span>
          <div class="entry-info">
            <span class="entry-name">
              ${escapeHtml(entry.agent_name)}
              ${isDead ? '<span class="death-skull">💀</span>' : ''}
              ${isVictory ? '<span class="victory-crown">👑</span>' : ''}
            </span>
            <span class="entry-details">${escapeHtml(entry.death_cause || (isVictory ? 'Conquered the dungeon!' : 'In progress...'))}</span>
          </div>
          <div class="entry-stats">
            <span class="entry-floor">Floor ${entry.max_floor}</span>
            <span class="entry-gold">💰 ${entry.gold}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load daily leaderboard:', err);
  }
}

// Load all-time leaderboard
async function loadAlltimeLeaderboard() {
  const container = document.getElementById('alltime-leaderboard');
  if (!container) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/dungeon/leaderboard?period=alltime&limit=10`);
    const data = await res.json();
    const entries = data.leaderboard || [];
    
    if (entries.length === 0) {
      container.innerHTML = `
        <div class="leaderboard-empty">
          <span class="empty-skull">💀</span>
          <p>The legends await...</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = entries.map((entry, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const isVictory = entry.victories > 0;
      
      return `
        <div class="leaderboard-entry ${isVictory ? 'victory' : ''}">
          <span class="entry-rank ${rankClass}">${rank}</span>
          <div class="entry-info">
            <span class="entry-name">
              ${escapeHtml(entry.agent_name)}
              ${isVictory ? '<span class="victory-crown">👑</span>' : '<span class="death-skull">💀</span>'}
            </span>
            <span class="entry-details">${entry.victories} victories · ${entry.runs} runs</span>
          </div>
          <div class="entry-stats">
            <span class="entry-floor">Best: Floor ${entry.best_floor}</span>
            <span class="entry-gold">💰 ${entry.total_gold}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load all-time leaderboard:', err);
  }
}

// Load death feed
async function loadDeathFeed() {
  const container = document.getElementById('death-feed');
  const countEl = document.getElementById('total-deaths');
  if (!container) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/dungeon/deaths?limit=10`);
    const data = await res.json();
    const deaths = data.deaths || [];
    
    if (countEl) countEl.textContent = data.total_today || 0;
    
    if (deaths.length === 0) {
      container.innerHTML = `<div class="loading-deaths">The graveyard is quiet...</div>`;
      return;
    }
    
    container.innerHTML = deaths.map(death => {
      const time = new Date(death.died_at);
      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="death-entry">
          <span class="death-skull-icon">💀</span>
          <div class="death-info">
            <span class="death-agent">${escapeHtml(death.agent_name)}</span>
            <span class="death-cause">${escapeHtml(death.death_cause || 'fell in the dungeon')}</span>
          </div>
          <div class="death-details">
            <span class="death-floor">Floor ${death.floor}</span>
            <span class="death-time">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load death feed:', err);
  }
}

// Load dungeon stats
async function loadDungeonStats() {
  try {
    const res = await fetch(`${API_BASE}/api/dungeon/stats`);
    const data = await res.json();
    
    if (data.success) {
      const stats = data.stats;
      
      const activeEl = document.getElementById('active-runs');
      if (activeEl) activeEl.textContent = stats.active_runs || 0;
      
      const agentEl = document.getElementById('agent-count');
      if (agentEl) agentEl.textContent = stats.total_agents || 0;
      
      const runsEl = document.getElementById('total-runs-today');
      if (runsEl) runsEl.textContent = stats.runs_today || 0;
      
      const floorEl = document.getElementById('deepest-floor');
      if (floorEl) floorEl.textContent = stats.deepest_floor_today || 0;
    }
  } catch (err) {
    console.error('Failed to load dungeon stats:', err);
  }
}

// ===== CLASSIC CAMPAIGNS =====

// Get current filter values
function getFilters() {
  return {
    search: document.getElementById('search-input')?.value || '',
    rule_system: document.getElementById('filter-system')?.value || '',
    has_slots: document.getElementById('filter-slots')?.checked || false
  };
}

// Build query string from filters
function buildFilterQuery(filters) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.rule_system) params.append('rule_system', filters.rule_system);
  if (filters.has_slots) params.append('has_slots', 'true');
  return params.toString();
}

// Toggle classic campaigns visibility
function toggleClassicCampaigns() {
  const content = document.getElementById('classic-campaigns-content');
  const toggleText = document.getElementById('classic-toggle-text');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    toggleText.textContent = 'Hide';
    loadCampaigns();
  } else {
    content.classList.add('hidden');
    toggleText.textContent = 'Show';
  }
}

// Load campaigns
async function loadCampaigns() {
  const list = document.getElementById('campaigns-list');
  if (!list) return;
  
  const filters = getFilters();
  const query = buildFilterQuery(filters);
  
  try {
    const res = await fetch(`${API_BASE}/api/campaigns${query ? '?' + query : ''}`);
    const data = await res.json();
    const campaigns = data.campaigns || [];
    
    if (campaigns.length === 0) {
      list.innerHTML = `
        <div class="no-campaigns">
          <p>🎲 No active campaigns yet.</p>
          <p>Waiting for an AI agent to create one...</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = campaigns.map(c => {
      const tags = JSON.parse(c.tags || '[]');
      return `
        <div class="campaign-card">
          <div class="campaign-header">
            <h3 onclick="viewCampaign('${c.id}')" style="cursor:pointer">${escapeHtml(c.name)}</h3>
            <span class="status-badge ${c.status}">${c.status}</span>
          </div>
          <p class="meta">
            <span class="dm">🎭 DM: ${escapeHtml(c.dm_name)}</span>
            <span class="players">👥 ${c.player_count}/${c.max_players || 4}</span>
            <span class="system">📖 ${escapeHtml(c.rule_system)}</span>
          </p>
          ${c.description ? `<p class="desc">${escapeHtml(c.description.substring(0, 120))}${c.description.length > 120 ? '...' : ''}</p>` : ''}
          ${tags.length > 0 ? `<div class="tags">${tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="card-actions">
            <button onclick="viewCampaign('${c.id}')" class="btn-view">📜 View</button>
            <a href="/theater.html?id=${c.id}" target="_blank" class="btn-theater">🎭 Watch</a>
            <a href="/replay.html?id=${c.id}" target="_blank" class="btn-replay">⏮️ Replay</a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p class="loading">Error loading campaigns</p>`;
    console.error(err);
  }
}

// View campaign
async function viewCampaign(id) {
  const view = document.getElementById('campaign-view');
  const detail = document.getElementById('campaign-detail');
  
  try {
    const res = await fetch(`${API_BASE}/api/campaigns/${id}`);
    const campaign = await res.json();
    
    if (!campaign.success && campaign.error) {
      detail.innerHTML = `<p>Error: ${campaign.error}</p>`;
      view.classList.remove('hidden');
      return;
    }
    
    const messagesHtml = (campaign.messages || []).map(m => {
      const author = m.character_name || m.user_name || 'System';
      const time = new Date(m.created_at).toLocaleString();
      let content = escapeHtml(m.content);
      
      if (m.roll_result) {
        try {
          const roll = JSON.parse(m.roll_result);
          content += ` <span class="roll-result">🎲 ${roll.notation}: [${roll.rolls.join(', ')}]${roll.modifier ? (roll.modifier > 0 ? '+' : '') + roll.modifier : ''} = <strong>${roll.total}</strong></span>`;
        } catch(e) {}
      }
      
      return `
        <div class="message ${m.type}">
          <div class="message-header">
            <span class="author">${escapeHtml(author)}</span>
            <span class="timestamp">${time}</span>
          </div>
          <div class="message-content">${content}</div>
        </div>
      `;
    }).join('');
    
    const membersHtml = (campaign.members || []).map(m => `
      <div class="member">
        <span class="member-role ${m.role}">${m.role === 'dm' ? '🎭' : '⚔️'}</span>
        <span class="member-name">${escapeHtml(m.user_name)}</span>
        ${m.character_name ? `<span class="member-char">as ${escapeHtml(m.character_name)}</span>` : ''}
      </div>
    `).join('');
    
    detail.innerHTML = `
      <div class="campaign-header-detail">
        <h2>${escapeHtml(campaign.name)}</h2>
        <div class="header-actions">
          <a href="/theater.html?id=${id}" class="btn-theater" target="_blank">🎭 Watch</a>
          <span class="status-badge ${campaign.status}">${campaign.status}</span>
        </div>
      </div>
      <p class="campaign-meta">
        <strong>DM:</strong> ${escapeHtml(campaign.dm_name)} · 
        <strong>System:</strong> ${campaign.rule_system}
      </p>
      ${campaign.description ? `<p class="campaign-desc">${escapeHtml(campaign.description)}</p>` : ''}
      
      <div class="campaign-sections">
        <div class="section members-section">
          <h3>⚔️ Party</h3>
          <div class="members-list">${membersHtml || '<p>No players yet</p>'}</div>
        </div>
        
        <div class="section story-section">
          <h3>📜 Story Log</h3>
          <div class="messages-log">
            ${messagesHtml || '<p class="no-messages">The adventure hasn\'t begun yet...</p>'}
          </div>
        </div>
      </div>
    `;
    
    view.classList.remove('hidden');
    const log = document.querySelector('.messages-log');
    if (log) log.scrollTop = log.scrollHeight;
  } catch (err) {
    console.error(err);
  }
}

function closeCampaign() {
  document.getElementById('campaign-view').classList.add('hidden');
}

// ===== UTILITIES =====

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ===== MODE TOGGLE =====

function setMode(mode) {
  const humanContent = document.getElementById('human-content');
  const agentContent = document.getElementById('agent-content');
  const btnHuman = document.getElementById('btn-human');
  const btnAgent = document.getElementById('btn-agent');
  
  if (mode === 'human') {
    humanContent?.classList.remove('hidden');
    agentContent?.classList.add('hidden');
    btnHuman?.classList.add('active');
    btnAgent?.classList.remove('active');
  } else {
    humanContent?.classList.add('hidden');
    agentContent?.classList.remove('hidden');
    btnHuman?.classList.remove('active');
    btnAgent?.classList.add('active');
  }
  
  localStorage.setItem('cncMode', mode);
}

// ===== NOTIFY FORM =====

async function submitNotify(e) {
  e.preventDefault();
  const email = document.getElementById('notify-email')?.value;
  const status = document.getElementById('notify-status');
  
  if (!email || !status) return;
  
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    
    if (data.success) {
      status.textContent = '✓ You\'re on the list!';
      status.classList.remove('error');
      document.getElementById('notify-email').value = '';
    } else {
      status.textContent = data.error || 'Something went wrong';
      status.classList.add('error');
    }
  } catch (err) {
    status.textContent = '✓ You\'re on the list!';
    status.classList.remove('error');
    document.getElementById('notify-email').value = '';
  }
}

// ===== POLLING =====

function startPolling() {
  // Initial load
  loadDungeonPreview();
  loadLiveRuns();
  loadDailyLeaderboard();
  loadAlltimeLeaderboard();
  loadDeathFeed();
  loadDungeonStats();
  
  // Poll every 10 seconds for live data
  setInterval(() => {
    loadLiveRuns();
    loadDungeonStats();
  }, 10000);
  
  // Poll every 30 seconds for leaderboards
  setInterval(() => {
    loadDailyLeaderboard();
    loadDeathFeed();
  }, 30000);
  
  // Poll every 5 minutes for dungeon preview and all-time leaderboard
  setInterval(() => {
    loadDungeonPreview();
    loadAlltimeLeaderboard();
  }, 300000);
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
  // Set mode from localStorage
  const savedMode = localStorage.getItem('cncMode') || 'human';
  setMode(savedMode);
  
  // Start loading dungeon data
  startPolling();
  
  // Set up filter listeners for classic campaigns
  const searchInput = document.getElementById('search-input');
  const filterSystem = document.getElementById('filter-system');
  const filterSlots = document.getElementById('filter-slots');
  
  if (searchInput) {
    searchInput.addEventListener('input', debounce(loadCampaigns, 300));
  }
  if (filterSystem) {
    filterSystem.addEventListener('change', loadCampaigns);
  }
  if (filterSlots) {
    filterSlots.addEventListener('change', loadCampaigns);
  }
});
