/**
 * Dragon's Blackjack - Frontend UI
 * 
 * Handles game state, API communication, and card rendering.
 */

class BlackjackUI {
  constructor() {
    this.apiKey = localStorage.getItem('cnc_api_key');
    this.gameState = null;
    this.animating = false;
    
    // DOM elements
    this.elements = {
      dealerHand: document.getElementById('dealer-hand'),
      playerHand: document.getElementById('player-hand'),
      dealerValue: document.getElementById('dealer-value'),
      playerValue: document.getElementById('player-value'),
      dialogBox: document.getElementById('dialog-box'),
      dialogText: document.getElementById('dialog-text'),
      balance: document.getElementById('balance'),
      currentBet: document.getElementById('current-bet'),
      betDisplay: document.getElementById('bet-display'),
      betAmount: document.getElementById('bet-amount'),
      
      // Controls
      bettingControls: document.getElementById('betting-controls'),
      actionControls: document.getElementById('action-controls'),
      resultControls: document.getElementById('result-controls'),
      
      // Buttons
      dealBtn: document.getElementById('deal-btn'),
      hitBtn: document.getElementById('hit-btn'),
      standBtn: document.getElementById('stand-btn'),
      doubleBtn: document.getElementById('double-btn'),
      surrenderBtn: document.getElementById('surrender-btn'),
      newGameBtn: document.getElementById('new-game-btn'),
      
      // Result
      resultMessage: document.getElementById('result-message'),
      resultOverlay: document.getElementById('result-overlay'),
      resultIcon: document.getElementById('result-icon'),
      resultTitle: document.getElementById('result-title'),
      resultPayout: document.getElementById('result-payout'),
      
      // Stats
      statGames: document.getElementById('stat-games'),
      statWinrate: document.getElementById('stat-winrate'),
      statBlackjacks: document.getElementById('stat-blackjacks'),
      statStreak: document.getElementById('stat-streak'),
      statProfit: document.getElementById('stat-profit'),
      
      // Not registered
      notRegistered: document.getElementById('not-registered'),
      blackjackGame: document.querySelector('.blackjack-game')
    };
    
    this.init();
  }
  
  async init() {
    // Check if registered
    if (!this.apiKey) {
      this.showNotRegistered();
      return;
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial state
    await this.loadGameState();
    await this.loadStats();
  }
  
  setupEventListeners() {
    // Bet buttons
    document.querySelectorAll('.bet-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.betAmount.value = btn.dataset.bet;
      });
    });
    
    // Deal button
    this.elements.dealBtn.addEventListener('click', () => this.startGame());
    
    // Action buttons
    this.elements.hitBtn.addEventListener('click', () => this.action('hit'));
    this.elements.standBtn.addEventListener('click', () => this.action('stand'));
    this.elements.doubleBtn.addEventListener('click', () => this.action('double'));
    this.elements.surrenderBtn.addEventListener('click', () => this.action('surrender'));
    
    // New game button
    this.elements.newGameBtn.addEventListener('click', () => this.resetForNewGame());
    
    // Enter key for bet
    this.elements.betAmount.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startGame();
    });
    
    // Click result overlay to dismiss
    this.elements.resultOverlay.addEventListener('click', () => {
      this.elements.resultOverlay.classList.add('hidden');
    });
  }
  
  showNotRegistered() {
    this.elements.blackjackGame.classList.add('hidden');
    this.elements.notRegistered.classList.remove('hidden');
  }
  
  // ===== API CALLS =====
  
  async apiCall(endpoint, method = 'GET', body = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`/api/tavern/blackjack${endpoint}`, options);
    return response.json();
  }
  
  async loadGameState() {
    const result = await this.apiCall('/state');
    
    if (result.success) {
      if (result.hasActiveGame === false) {
        // No active game, show betting
        this.showBettingControls();
        this.updateDialog("Step up to the table, adventurer...");
      } else {
        // Active game exists
        this.gameState = result;
        this.renderGame();
      }
    } else {
      console.error('Failed to load game state:', result.error);
    }
  }
  
  async loadStats() {
    const result = await this.apiCall('/stats');
    
    if (result.success) {
      this.elements.balance.textContent = result.player.balance.toLocaleString();
      this.elements.statGames.textContent = result.stats.gamesPlayed;
      this.elements.statWinrate.textContent = result.stats.winRate + '%';
      this.elements.statBlackjacks.textContent = result.stats.blackjacks;
      this.elements.statStreak.textContent = result.stats.longestStreak;
      
      const profitEl = document.getElementById('stat-profit');
      const profit = result.stats.netProfit;
      profitEl.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString();
      profitEl.parentElement.classList.toggle('negative', profit < 0);
    }
  }
  
  async startGame() {
    const bet = parseInt(this.elements.betAmount.value);
    
    if (isNaN(bet) || bet < 10 || bet > 10000) {
      this.updateDialog("*snorts* That's not a valid bet. Try between 10 and 10,000 gold.");
      return;
    }
    
    const result = await this.apiCall('/start', 'POST', { bet });
    
    if (result.success) {
      this.gameState = result;
      this.renderGame();
      await this.loadStats(); // Update balance
    } else {
      this.updateDialog(`*growls* ${result.error}`);
    }
  }
  
  async action(type) {
    if (this.animating) return;
    
    const result = await this.apiCall(`/${type}`, 'POST');
    
    if (result.success) {
      this.gameState = result;
      this.renderGame();
      await this.loadStats();
    } else {
      this.updateDialog(`*hisses* ${result.error}`);
    }
  }
  
  // ===== RENDERING =====
  
  renderGame() {
    if (!this.gameState) return;
    
    const state = this.gameState;
    
    // Update hands
    this.renderHand(state.dealerHand.cards, this.elements.dealerHand, 'dealer');
    
    const currentHand = state.playerHands[state.currentHandIndex];
    this.renderHand(currentHand.cards, this.elements.playerHand, 'player');
    
    // Update values
    this.elements.dealerValue.textContent = this.formatHandValue(state.dealerHand);
    this.elements.playerValue.textContent = this.formatHandValue(currentHand);
    
    // Update bet display
    this.elements.currentBet.textContent = currentHand.bet;
    
    // Update dialog
    if (state.dealerDialog) {
      this.updateDialog(state.dealerDialog);
    }
    
    // Update controls based on state
    if (state.status === 'player_turn') {
      this.showActionControls(state.actions);
    } else if (state.status === 'complete') {
      this.showResult(state);
    } else {
      // Dealer turn - hide controls
      this.elements.actionControls.classList.add('hidden');
    }
  }
  
  renderHand(cards, container, type) {
    container.innerHTML = '';
    
    cards.forEach((card, index) => {
      const cardEl = this.createCardElement(card);
      cardEl.style.animationDelay = `${index * 0.1}s`;
      cardEl.classList.add('dealing');
      container.appendChild(cardEl);
    });
  }
  
  createCardElement(card) {
    const cardEl = document.createElement('div');
    cardEl.className = `card suit-${card.suit} rank-${card.rank}`;
    
    if (card.faceDown) {
      cardEl.classList.add('face-down');
    }
    
    // Card face
    const face = document.createElement('div');
    face.className = 'card-face';
    
    // Top-left corner
    const topLeft = document.createElement('div');
    topLeft.className = 'card-corner top-left';
    topLeft.innerHTML = `
      <span class="card-rank">${card.display}</span>
      <span class="card-suit-small">${card.suitSymbol}</span>
    `;
    face.appendChild(topLeft);
    
    // Center
    const center = document.createElement('div');
    center.className = 'card-center';
    if (['J', 'Q', 'K'].includes(card.rank)) {
      center.classList.add('face-card');
    }
    center.textContent = card.suitSymbol;
    face.appendChild(center);
    
    // Bottom-right corner
    const bottomRight = document.createElement('div');
    bottomRight.className = 'card-corner bottom-right';
    bottomRight.innerHTML = `
      <span class="card-rank">${card.display}</span>
      <span class="card-suit-small">${card.suitSymbol}</span>
    `;
    face.appendChild(bottomRight);
    
    // Card back
    const back = document.createElement('div');
    back.className = 'card-back';
    
    cardEl.appendChild(face);
    cardEl.appendChild(back);
    
    return cardEl;
  }
  
  formatHandValue(hand) {
    if (!hand || !hand.value) return '?';
    
    const value = hand.value.value !== undefined ? hand.value.value : hand.value;
    const soft = hand.value.soft;
    
    if (hand.cards && hand.cards.some(c => c.faceDown)) {
      // Has hidden card
      const visibleValue = hand.cards
        .filter(c => !c.faceDown)
        .reduce((sum, c) => sum + (c.isAce ? 11 : c.value), 0);
      return visibleValue + '+?';
    }
    
    return soft ? `${value} (soft)` : value;
  }
  
  updateDialog(text) {
    this.elements.dialogText.textContent = text;
    this.elements.dialogBox.classList.remove('hidden');
  }
  
  // ===== CONTROLS =====
  
  showBettingControls() {
    this.elements.bettingControls.classList.remove('hidden');
    this.elements.actionControls.classList.add('hidden');
    this.elements.resultControls.classList.add('hidden');
  }
  
  showActionControls(availableActions) {
    this.elements.bettingControls.classList.add('hidden');
    this.elements.actionControls.classList.remove('hidden');
    this.elements.resultControls.classList.add('hidden');
    
    // Enable/disable buttons based on available actions
    this.elements.hitBtn.disabled = !availableActions.includes('hit');
    this.elements.standBtn.disabled = !availableActions.includes('stand');
    this.elements.doubleBtn.disabled = !availableActions.includes('double');
    this.elements.surrenderBtn.disabled = !availableActions.includes('surrender');
  }
  
  showResult(state) {
    this.elements.bettingControls.classList.add('hidden');
    this.elements.actionControls.classList.add('hidden');
    this.elements.resultControls.classList.remove('hidden');
    
    // Determine result type
    const result = state.result;
    const payout = state.payout;
    const bet = state.bet;
    const net = payout - bet;
    
    let resultClass = 'lose';
    let icon = '💀';
    let title = 'YOU LOSE';
    let payoutText = `-${bet} gold`;
    
    if (result === 'player_blackjack') {
      resultClass = 'blackjack';
      icon = '🎰';
      title = 'BLACKJACK!';
      payoutText = `+${net} gold`;
    } else if (result === 'player_win' || result === 'dealer_bust') {
      resultClass = 'win';
      icon = '🏆';
      title = 'YOU WIN!';
      payoutText = `+${net} gold`;
    } else if (result === 'push') {
      resultClass = 'push';
      icon = '🤝';
      title = 'PUSH';
      payoutText = 'Bet returned';
    } else if (result === 'surrender') {
      resultClass = 'lose';
      icon = '🏳️';
      title = 'SURRENDER';
      payoutText = `-${Math.floor(bet / 2)} gold`;
    }
    
    // Update result message
    this.elements.resultMessage.className = `result-message ${resultClass}`;
    this.elements.resultMessage.textContent = title;
    
    // Show overlay with animation
    this.elements.resultIcon.textContent = icon;
    this.elements.resultTitle.className = `result-title ${resultClass}`;
    this.elements.resultTitle.textContent = title;
    this.elements.resultPayout.textContent = payoutText;
    this.elements.resultPayout.classList.toggle('negative', net < 0);
    this.elements.resultOverlay.classList.remove('hidden');
    
    // Spawn effects
    if (result === 'player_blackjack' || result === 'player_win' || result === 'dealer_bust') {
      this.spawnGoldCoins();
    } else if (result === 'player_bust') {
      this.spawnFireParticles();
    }
    
    // Auto-hide overlay after 2 seconds
    setTimeout(() => {
      this.elements.resultOverlay.classList.add('hidden');
    }, 2500);
  }
  
  resetForNewGame() {
    this.elements.resultOverlay.classList.add('hidden');
    this.elements.dealerHand.innerHTML = '';
    this.elements.playerHand.innerHTML = '';
    this.elements.dealerValue.textContent = '?';
    this.elements.playerValue.textContent = '0';
    this.gameState = null;
    
    this.showBettingControls();
    this.loadStats();
    
    // Greeting for new game
    const greetings = [
      "Back for more? Your gold missed me.",
      "Ready to test your luck again?",
      "The cards await your challenge...",
      "*shuffles deck* Let's play."
    ];
    this.updateDialog(greetings[Math.floor(Math.random() * greetings.length)]);
  }
  
  // ===== EFFECTS =====
  
  spawnGoldCoins() {
    const container = document.querySelector('.game-area');
    for (let i = 0; i < 20; i++) {
      const coin = document.createElement('div');
      coin.className = 'gold-coin';
      coin.textContent = '💰';
      coin.style.left = Math.random() * 100 + '%';
      coin.style.animationDelay = Math.random() * 0.5 + 's';
      container.appendChild(coin);
      
      setTimeout(() => coin.remove(), 1500);
    }
  }
  
  spawnFireParticles() {
    const container = document.querySelector('.player-hand');
    const flames = ['🔥', '💥', '✨'];
    
    for (let i = 0; i < 15; i++) {
      const fire = document.createElement('div');
      fire.className = 'fire-particle';
      fire.textContent = flames[Math.floor(Math.random() * flames.length)];
      fire.style.left = (20 + Math.random() * 60) + '%';
      fire.style.bottom = '0';
      fire.style.animationDelay = Math.random() * 0.3 + 's';
      container.appendChild(fire);
      
      setTimeout(() => fire.remove(), 1000);
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.blackjackUI = new BlackjackUI();
});
