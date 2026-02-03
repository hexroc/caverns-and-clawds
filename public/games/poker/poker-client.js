/**
 * Clawd Poker - Client-Side Logic
 * 
 * Handles UI rendering and API communication for the poker game.
 */

// ============================================================================
// STATE
// ============================================================================

const state = {
  playerId: localStorage.getItem('poker_player_id') || generatePlayerId(),
  playerName: localStorage.getItem('poker_player_name') || '',
  tableId: null,
  hand: null,
  pollInterval: null,
  seatNumber: null
};

function generatePlayerId() {
  const id = 'player_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('poker_player_id', id);
  return id;
}

// ============================================================================
// API HELPERS
// ============================================================================

async function api(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`/api/poker${path}`, options);
  return response.json();
}

// ============================================================================
// SUIT/RANK HELPERS
// ============================================================================

const SUIT_SYMBOLS = {
  swords: '⚔️',
  potions: '🧪',
  gems: '💎',
  shields: '🛡️'
};

const FACE_EMOJIS = {
  'J': '🤴',
  'Q': '🧙',
  'K': '🐉',
  'A': '✨'
};

function createCardElement(card, mini = false) {
  const div = document.createElement('div');
  div.className = `card ${card.suit}${mini ? ' mini' : ''}${['J', 'Q', 'K', 'A'].includes(card.rank) ? ' face-card' : ''}`;
  
  const suitSymbol = SUIT_SYMBOLS[card.suit] || '?';
  const centerSymbol = FACE_EMOJIS[card.rank] || suitSymbol;
  
  div.innerHTML = `
    <div class="card-face">
      <div class="card-corner top-left">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${suitSymbol}</span>
      </div>
      <div class="card-center">${centerSymbol}</div>
      <div class="card-corner bottom-right">
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit-small">${suitSymbol}</span>
      </div>
    </div>
  `;
  
  return div;
}

function createCardBackElement(mini = false) {
  const div = document.createElement('div');
  div.className = `card${mini ? ' mini' : ''}`;
  div.innerHTML = '<div class="card-back"></div>';
  return div;
}

// ============================================================================
// UI UPDATES
// ============================================================================

async function loadTables() {
  const result = await api('GET', '/tables');
  const container = document.getElementById('tables-list');
  
  if (!result.success || result.tables.length === 0) {
    container.innerHTML = '<p style="color: #a09080; text-align: center;">No tables available. Create one!</p>';
    return;
  }
  
  container.innerHTML = result.tables.map(table => `
    <div style="background: rgba(0,0,0,0.4); border: 1px solid #8b4513; border-radius: 8px; padding: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: bold; color: #ffd700;">${table.name}</div>
        <div style="color: #a09080; font-size: 0.875rem;">
          ${table.smallBlind}/${table.bigBlind} blinds • ${table.playerCount}/${table.maxPlayers} players
        </div>
      </div>
      <button onclick="showJoinModal('${table.id}')" class="action-btn call" ${table.playerCount >= table.maxPlayers ? 'disabled' : ''}>
        ${table.playerCount >= table.maxPlayers ? 'Full' : 'Join'}
      </button>
    </div>
  `).join('');
}

function showJoinModal(tableId) {
  document.getElementById('join-table-id').value = tableId;
  document.getElementById('join-name').value = state.playerName;
  document.getElementById('join-modal').classList.remove('hidden');
}

function hideJoinModal() {
  document.getElementById('join-modal').classList.add('hidden');
}

function showAIModal() {
  document.getElementById('ai-modal').classList.remove('hidden');
}

function hideAIModal() {
  document.getElementById('ai-modal').classList.add('hidden');
}

function updateGameUI() {
  if (!state.hand) return;
  
  const hand = state.hand;
  
  // Update info panel
  document.getElementById('hand-number').textContent = hand.handNumber || '-';
  document.getElementById('phase').textContent = hand.phase?.toUpperCase() || '-';
  document.getElementById('to-call').textContent = hand.callAmount || '0';
  
  // Update pot
  document.getElementById('pot-amount').textContent = hand.pot || 0;
  
  // Update community cards
  const communityContainer = document.getElementById('community-cards');
  communityContainer.innerHTML = '';
  if (hand.communityCards) {
    hand.communityCards.forEach(card => {
      communityContainer.appendChild(createCardElement(card));
    });
  }
  
  // Update player seats
  updateSeats(hand);
  
  // Update your hand
  const yourHand = document.getElementById('your-hand');
  if (hand.yourCards && hand.yourCards.length > 0) {
    yourHand.classList.remove('hidden');
    yourHand.innerHTML = '';
    hand.yourCards.forEach(card => {
      yourHand.appendChild(createCardElement(card));
    });
  } else {
    yourHand.classList.add('hidden');
  }
  
  // Update stack
  const myPlayer = hand.players?.find(p => p.seatNumber === state.seatNumber);
  if (myPlayer) {
    document.getElementById('your-stack').textContent = myPlayer.stack;
  }
  
  // Update actions
  updateActions(hand);
  
  // Check for showdown
  if (hand.phase === 'showdown' || hand.phase === 'complete') {
    if (hand.evaluations) {
      showShowdown(hand);
    }
  }
}

function updateSeats(hand) {
  const container = document.getElementById('seats-container');
  container.innerHTML = '';
  
  if (!hand.players) return;
  
  hand.players.forEach(player => {
    const seatDiv = document.createElement('div');
    seatDiv.className = `poker-seat${player.seatNumber === hand.actionSeat ? ' active' : ''}${player.folded ? ' folded' : ''}`;
    seatDiv.dataset.seat = player.seatNumber;
    
    const isYou = player.seatNumber === state.seatNumber;
    
    seatDiv.innerHTML = `
      <div class="seat-info">
        <div class="seat-name">${isYou ? '⭐ ' : ''}${player.playerName || 'Empty'}${player.isAI ? ' 🤖' : ''}</div>
        <div class="seat-stack">💰 ${player.stack}</div>
        ${player.currentBet > 0 ? `<div class="seat-bet">Bet: ${player.currentBet}</div>` : ''}
        ${player.folded ? '<div style="color: #666;">FOLDED</div>' : ''}
        ${player.allIn ? '<div style="color: #dc143c;">ALL IN</div>' : ''}
      </div>
      <div class="seat-cards">
        ${player.cards ? player.cards.map(c => createCardElement(c, true).outerHTML).join('') : 
          !player.folded && hand.phase !== 'waiting' ? (createCardBackElement(true).outerHTML + createCardBackElement(true).outerHTML) : ''}
      </div>
    `;
    
    // Position indicators
    if (player.isDealer) {
      const dealerBtn = document.createElement('div');
      dealerBtn.className = 'dealer-button';
      dealerBtn.textContent = 'D';
      dealerBtn.style.cssText = 'position: absolute; top: -15px; right: -15px;';
      seatDiv.appendChild(dealerBtn);
    }
    
    container.appendChild(seatDiv);
  });
}

function updateActions(hand) {
  const isYourTurn = hand.isYourTurn && hand.phase !== 'showdown' && hand.phase !== 'complete';
  const actions = hand.possibleActions || [];
  
  document.getElementById('btn-fold').disabled = !isYourTurn || !actions.includes('fold');
  document.getElementById('btn-check').disabled = !isYourTurn || !actions.includes('check');
  document.getElementById('btn-call').disabled = !isYourTurn || !actions.includes('call');
  document.getElementById('btn-raise').disabled = !isYourTurn || !actions.includes('raise');
  document.getElementById('btn-allin').disabled = !isYourTurn || !actions.includes('all_in');
  
  // Update call amount
  document.getElementById('call-amount').textContent = hand.callAmount > 0 ? hand.callAmount : '';
  
  // Update raise slider
  const slider = document.getElementById('raise-slider');
  const myPlayer = hand.players?.find(p => p.seatNumber === state.seatNumber);
  if (myPlayer && hand.minRaise) {
    slider.min = hand.minRaise;
    slider.max = myPlayer.stack;
    slider.value = hand.minRaise;
    document.getElementById('raise-display').textContent = hand.minRaise;
  }
  
  // Enable start hand button if waiting
  const canStart = hand.phase === 'waiting' || !hand.handNumber;
  document.getElementById('btn-start-hand').disabled = !canStart;
}

function showShowdown(hand) {
  const modal = document.getElementById('showdown-modal');
  const handsDiv = document.getElementById('showdown-hands');
  
  if (!hand.evaluations) return;
  
  // Find winner names
  const winners = hand.winners || [];
  const winnerNames = winners.map(w => {
    const player = hand.players.find(p => p.seatNumber === w.seatNumber);
    return player?.playerName || 'Unknown';
  });
  
  document.getElementById('showdown-title').textContent = `🏆 ${winnerNames.join(' & ')} Wins!`;
  document.getElementById('showdown-pot').textContent = `Pot: ${hand.pot}`;
  
  handsDiv.innerHTML = hand.evaluations.map(e => {
    const player = hand.players.find(p => p.seatNumber === e.seatNumber);
    const isWinner = winners.some(w => w.seatNumber === e.seatNumber);
    
    return `
      <div style="background: ${isWinner ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.3)'}; border: 2px solid ${isWinner ? '#ffd700' : '#666'}; border-radius: 8px; padding: 1rem; min-width: 150px;">
        <div style="font-weight: bold; color: ${isWinner ? '#ffd700' : '#f0e6d2'};">${player?.playerName || 'Unknown'}</div>
        <div style="color: #a09080; font-size: 0.875rem; margin: 0.5rem 0;">${e.hand}</div>
        <div style="display: flex; gap: 4px; justify-content: center;">
          ${e.cards.map(c => createCardElement(c, true).outerHTML).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  modal.classList.remove('hidden');
}

function hideShowdown() {
  document.getElementById('showdown-modal').classList.add('hidden');
}

// ============================================================================
// ACTIONS
// ============================================================================

async function createTable(e) {
  e.preventDefault();
  
  const name = document.getElementById('table-name').value;
  const smallBlind = parseInt(document.getElementById('small-blind').value);
  const bigBlind = parseInt(document.getElementById('big-blind').value);
  
  const result = await api('POST', '/tables', { name, smallBlind, bigBlind });
  
  if (result.success) {
    showJoinModal(result.table.id);
  } else {
    alert(result.error || 'Failed to create table');
  }
}

async function joinTable(e) {
  e.preventDefault();
  
  const tableId = document.getElementById('join-table-id').value;
  const playerName = document.getElementById('join-name').value;
  const buyIn = parseInt(document.getElementById('join-buyin').value);
  
  // Save name
  state.playerName = playerName;
  localStorage.setItem('poker_player_name', playerName);
  
  const result = await api('POST', `/tables/${tableId}/join`, {
    playerId: state.playerId,
    playerName,
    buyIn
  });
  
  if (result.success) {
    state.tableId = tableId;
    state.seatNumber = result.seatNumber;
    hideJoinModal();
    enterTable();
  } else {
    alert(result.error || 'Failed to join table');
  }
}

async function leaveTable() {
  if (!state.tableId) return;
  
  await api('POST', `/tables/${state.tableId}/leave`, { playerId: state.playerId });
  
  state.tableId = null;
  state.seatNumber = null;
  state.hand = null;
  
  if (state.pollInterval) {
    clearInterval(state.pollInterval);
    state.pollInterval = null;
  }
  
  document.getElementById('lobby-view').classList.remove('hidden');
  document.getElementById('game-view').classList.add('hidden');
  loadTables();
}

async function addAI(personality) {
  if (!state.tableId) return;
  
  const result = await api('POST', `/tables/${state.tableId}/ai`, { personality, buyIn: 1000 });
  
  if (result.success) {
    hideAIModal();
    pollGameState();
  } else {
    alert(result.error || 'Failed to add AI');
  }
}

async function startHand() {
  if (!state.tableId) return;
  
  const result = await api('POST', `/tables/${state.tableId}/start`, { playerId: state.playerId });
  
  if (result.success) {
    state.hand = result.hand;
    updateGameUI();
  } else {
    alert(result.error || 'Failed to start hand');
  }
}

async function submitAction(action, amount = 0) {
  if (!state.tableId) return;
  
  const result = await api('POST', `/tables/${state.tableId}/action`, {
    playerId: state.playerId,
    action,
    amount
  });
  
  if (result.success) {
    state.hand = result.hand;
    
    // Check if hand completed with showdown
    if (result.handComplete && result.evaluations) {
      state.hand.evaluations = result.evaluations;
      state.hand.winners = result.winners;
    }
    
    updateGameUI();
  } else {
    alert(result.error || 'Action failed');
  }
}

// ============================================================================
// POLLING
// ============================================================================

async function pollGameState() {
  if (!state.tableId) return;
  
  const result = await api('GET', `/tables/${state.tableId}/hand?playerId=${state.playerId}`);
  
  if (result.success && result.hand) {
    state.hand = result.hand;
    updateGameUI();
  } else if (result.success && !result.hand) {
    // No active hand - show waiting state
    state.hand = { phase: 'waiting', players: [], pot: 0 };
    updateGameUI();
    
    // Refresh table info
    const tableResult = await api('GET', `/tables/${state.tableId}`);
    if (tableResult.success) {
      state.hand.players = tableResult.table.seats.map(s => ({
        seatNumber: s.seatNumber,
        playerName: s.playerName,
        stack: s.stack,
        isAI: s.isAI
      }));
      updateGameUI();
    }
  }
}

function enterTable() {
  document.getElementById('lobby-view').classList.add('hidden');
  document.getElementById('game-view').classList.remove('hidden');
  
  // Start polling
  pollGameState();
  state.pollInterval = setInterval(pollGameState, 2000);
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadTables();
  
  // Form handlers
  document.getElementById('create-table-form').addEventListener('submit', createTable);
  document.getElementById('join-form').addEventListener('submit', joinTable);
  document.getElementById('join-cancel').addEventListener('click', hideJoinModal);
  document.getElementById('ai-cancel').addEventListener('click', hideAIModal);
  
  // Game actions
  document.getElementById('btn-start-hand').addEventListener('click', startHand);
  document.getElementById('btn-add-ai').addEventListener('click', showAIModal);
  document.getElementById('btn-leave').addEventListener('click', leaveTable);
  
  document.getElementById('btn-fold').addEventListener('click', () => submitAction('fold'));
  document.getElementById('btn-check').addEventListener('click', () => submitAction('check'));
  document.getElementById('btn-call').addEventListener('click', () => submitAction('call'));
  document.getElementById('btn-raise').addEventListener('click', () => {
    const amount = parseInt(document.getElementById('raise-slider').value);
    submitAction('raise', amount);
  });
  document.getElementById('btn-allin').addEventListener('click', () => submitAction('all_in'));
  
  // Raise slider
  document.getElementById('raise-slider').addEventListener('input', (e) => {
    document.getElementById('raise-display').textContent = e.target.value;
  });
  
  // AI selection
  document.querySelectorAll('.ai-option').forEach(btn => {
    btn.addEventListener('click', () => {
      addAI(btn.dataset.personality);
    });
  });
  
  // Showdown close
  document.getElementById('showdown-close').addEventListener('click', hideShowdown);
});
