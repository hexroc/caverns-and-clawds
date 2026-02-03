// Dungeon Draw - Main Game Logic
// Uno-style card game for Caverns & Clawds

class DungeonDraw {
  constructor(options = {}) {
    this.playerCount = options.playerCount || 2;
    this.aiDifficulty = options.aiDifficulty || 'medium';
    this.playerName = options.playerName || 'Adventurer';
    this.onStateChange = options.onStateChange || (() => {});
    this.onAnimation = options.onAnimation || (() => {});
    
    this.reset();
  }
  
  reset() {
    // Create and shuffle deck
    this.deck = shuffleDeck(createDeck());
    this.discard = [];
    this.direction = 1; // 1 = clockwise, -1 = counter-clockwise
    this.currentPlayer = 0;
    this.currentColor = null;
    this.pendingDraw = 0;
    this.status = 'playing';
    this.winner = null;
    this.lastAction = null;
    this.turnCount = 0;
    this.scores = {};
    
    // Create players
    this.players = [];
    
    // Human player first
    this.players.push({
      id: 'human',
      name: this.playerName,
      hand: [],
      isAI: false,
      avatar: '🧙'
    });
    
    // AI opponents
    const aiNames = ['Goblin Gambler', 'Lich Lord', 'Dragon Drake', 'Spectral Seer', 'Orc Oracle'];
    const aiAvatars = ['👺', '💀', '🐉', '👻', '🧟'];
    
    for (let i = 1; i < this.playerCount; i++) {
      this.players.push({
        id: `ai-${i}`,
        name: aiNames[(i - 1) % aiNames.length],
        hand: [],
        isAI: true,
        avatar: aiAvatars[(i - 1) % aiAvatars.length]
      });
    }
    
    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        player.hand.push(this.drawCard());
      }
    }
    
    // Flip first card to discard
    // Keep flipping if it's a wild card
    let startCard;
    do {
      startCard = this.drawCard();
      if (startCard.type === 'wild') {
        // Put wild back in deck and reshuffle
        this.deck.push(startCard);
        this.deck = shuffleDeck(this.deck);
      }
    } while (startCard.type === 'wild');
    
    this.discard.push(startCard);
    this.currentColor = startCard.element;
    
    // Handle if starting card is special
    if (startCard.type === 'special') {
      this.handleSpecialCard(startCard, true);
    }
    
    this.emitState();
  }
  
  drawCard() {
    if (this.deck.length === 0) {
      this.reshuffleDiscard();
    }
    return this.deck.pop();
  }
  
  reshuffleDiscard() {
    // Keep the top card
    const topCard = this.discard.pop();
    this.deck = shuffleDeck(this.discard);
    this.discard = [topCard];
  }
  
  getTopCard() {
    return this.discard[this.discard.length - 1];
  }
  
  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }
  
  getNextPlayer() {
    const nextIndex = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
    return this.players[nextIndex];
  }
  
  getPlayableCards(player) {
    return getPlayableCards(player.hand, this.getTopCard(), this.currentColor);
  }
  
  canPlay(player, card) {
    return canPlayCard(card, this.getTopCard(), this.currentColor);
  }
  
  playCard(player, card, chosenColor = null) {
    if (this.status !== 'playing' && this.status !== 'choosing_color') {
      return { success: false, error: 'Game is not active' };
    }
    
    if (player.id !== this.getCurrentPlayer().id) {
      return { success: false, error: 'Not your turn' };
    }
    
    if (!this.canPlay(player, card)) {
      return { success: false, error: 'Cannot play this card' };
    }
    
    // Remove card from hand
    const cardIndex = player.hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }
    player.hand.splice(cardIndex, 1);
    
    // Add to discard
    this.discard.push(card);
    
    // Handle wild cards
    if (card.type === 'wild') {
      if (!chosenColor) {
        this.status = 'choosing_color';
        this.pendingWildCard = card;
        this.emitState();
        return { success: true, needsColor: true };
      }
      this.currentColor = chosenColor;
      
      // Chaos Storm makes next player draw 4
      if (card.wildType === 'chaosStorm') {
        this.pendingDraw += 4;
      }
    } else {
      this.currentColor = card.element;
    }
    
    // Handle special cards
    if (card.type === 'special') {
      this.handleSpecialCard(card);
    }
    
    // Check for win
    if (player.hand.length === 0) {
      this.status = 'ended';
      this.winner = player;
      this.calculateScores();
      this.emitState();
      this.onAnimation('victory', { player });
      return { success: true, gameOver: true, winner: player };
    }
    
    // Trigger animation
    this.onAnimation('playCard', { player, card });
    
    // Next turn (unless special card already handled it)
    if (card.type !== 'special' || card.specialType === 'timeWarp') {
      this.nextTurn();
    }
    
    this.lastAction = { type: 'play', player, card };
    this.emitState();
    
    return { success: true };
  }
  
  chooseColor(color) {
    if (this.status !== 'choosing_color') {
      return { success: false, error: 'Not choosing color' };
    }
    
    this.currentColor = color;
    this.status = 'playing';
    
    // If it was a Chaos Storm, apply the draw penalty
    if (this.pendingWildCard?.wildType === 'chaosStorm') {
      this.pendingDraw += 4;
      this.onAnimation('chaosStorm', { targetPlayer: this.getNextPlayer() });
    } else {
      this.onAnimation('chaosOrb', { color });
    }
    
    this.pendingWildCard = null;
    this.nextTurn();
    this.emitState();
    
    return { success: true };
  }
  
  handleSpecialCard(card, isStartingCard = false) {
    switch (card.specialType) {
      case 'stun':
        // Skip next player
        this.onAnimation('stun', { targetPlayer: this.getNextPlayer() });
        if (!isStartingCard) {
          this.nextTurn(); // Skip to the player after next
        }
        this.nextTurn();
        break;
        
      case 'timeWarp':
        // Reverse direction
        this.direction *= -1;
        this.onAnimation('timeWarp', { direction: this.direction });
        // In 2-player, acts like skip
        if (this.players.length === 2 && !isStartingCard) {
          // Direction reversed, current player goes again
        }
        break;
        
      case 'curse':
        // Next player draws 2
        this.pendingDraw += 2;
        this.onAnimation('curse', { targetPlayer: this.getNextPlayer() });
        if (!isStartingCard) {
          this.nextTurn();
        }
        // The next player will have to deal with pendingDraw
        break;
    }
  }
  
  drawCards(player, count = 1) {
    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      player.hand.push(card);
      drawnCards.push(card);
    }
    this.onAnimation('drawCards', { player, cards: drawnCards });
    return drawnCards;
  }
  
  draw(player) {
    if (this.status !== 'playing') {
      return { success: false, error: 'Game is not active' };
    }
    
    if (player.id !== this.getCurrentPlayer().id) {
      return { success: false, error: 'Not your turn' };
    }
    
    // Handle pending draws from Curse/Chaos Storm
    if (this.pendingDraw > 0) {
      const drawn = this.drawCards(player, this.pendingDraw);
      this.pendingDraw = 0;
      this.lastAction = { type: 'forcedDraw', player, count: drawn.length };
      this.nextTurn();
      this.emitState();
      return { success: true, drawn, forced: true };
    }
    
    // Normal draw
    const drawn = this.drawCards(player, 1);
    this.lastAction = { type: 'draw', player, count: 1 };
    
    // Can play the drawn card immediately if valid
    const drawnCard = drawn[0];
    if (this.canPlay(player, drawnCard)) {
      // In this implementation, we auto-advance turn after draw
      // Player would need to play on next UI interaction
    }
    
    this.nextTurn();
    this.emitState();
    
    return { success: true, drawn };
  }
  
  nextTurn() {
    this.currentPlayer = (this.currentPlayer + this.direction + this.players.length) % this.players.length;
    this.turnCount++;
    
    // Check if current player must handle pending draw
    if (this.pendingDraw > 0) {
      // They can stack if they have a matching draw card, or must draw
      // For simplicity, we'll handle this in the AI/UI
    }
  }
  
  calculateScores() {
    for (const player of this.players) {
      this.scores[player.id] = calculateHandPoints(player.hand);
    }
    
    // Winner gets sum of all other players' points
    if (this.winner) {
      let winnerScore = 0;
      for (const player of this.players) {
        if (player.id !== this.winner.id) {
          winnerScore += this.scores[player.id];
        }
      }
      this.scores[this.winner.id] = winnerScore;
    }
  }
  
  emitState() {
    this.onStateChange(this.getState());
  }
  
  getState() {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        cardCount: p.hand.length,
        isAI: p.isAI,
        hand: p.isAI ? null : p.hand // Hide AI hands
      })),
      topCard: this.getTopCard(),
      currentColor: this.currentColor,
      currentPlayer: this.currentPlayer,
      direction: this.direction,
      pendingDraw: this.pendingDraw,
      status: this.status,
      winner: this.winner,
      scores: this.scores,
      deckCount: this.deck.length,
      turnCount: this.turnCount,
      lastAction: this.lastAction
    };
  }
  
  // ========== AI LOGIC ==========
  
  async playAITurn() {
    const player = this.getCurrentPlayer();
    if (!player.isAI || this.status !== 'playing') return;
    
    // Small delay for visual feedback
    await this.delay(800 + Math.random() * 400);
    
    // Check for pending draw
    if (this.pendingDraw > 0) {
      // AI could try to stack, but for now just draws
      this.draw(player);
      return;
    }
    
    // Get playable cards
    const playable = this.getPlayableCards(player);
    
    if (playable.length === 0) {
      // Must draw
      this.draw(player);
      return;
    }
    
    // Choose card based on difficulty
    const card = this.chooseAICard(player, playable);
    
    // Choose color if wild
    let chosenColor = null;
    if (card.type === 'wild') {
      chosenColor = this.chooseAIColor(player);
    }
    
    this.playCard(player, card, chosenColor);
    
    // If we need to choose color (shouldn't happen with above logic)
    if (this.status === 'choosing_color') {
      await this.delay(500);
      this.chooseColor(this.chooseAIColor(player));
    }
  }
  
  chooseAICard(player, playable) {
    if (this.aiDifficulty === 'easy') {
      // Random
      return playable[Math.floor(Math.random() * playable.length)];
    }
    
    if (this.aiDifficulty === 'medium') {
      // Prioritize: special cards > high numbers > wilds (save them)
      const specials = playable.filter(c => c.type === 'special');
      const numbers = playable.filter(c => c.type === 'number').sort((a, b) => b.value - a.value);
      const wilds = playable.filter(c => c.type === 'wild');
      
      if (specials.length > 0 && Math.random() > 0.3) {
        return specials[Math.floor(Math.random() * specials.length)];
      }
      if (numbers.length > 0) {
        return numbers[0]; // Highest number
      }
      if (wilds.length > 0) {
        return wilds[0];
      }
      return playable[0];
    }
    
    // Hard AI
    const hand = player.hand;
    const nextPlayer = this.getNextPlayer();
    const nextPlayerCards = nextPlayer.hand.length;
    
    // If next player is close to winning, play attack cards
    if (nextPlayerCards <= 2) {
      const attacks = playable.filter(c => 
        c.type === 'special' && (c.specialType === 'curse' || c.specialType === 'stun') ||
        c.type === 'wild' && c.wildType === 'chaosStorm'
      );
      if (attacks.length > 0) {
        return attacks[0];
      }
    }
    
    // Count colors in hand to pick dominant
    const colorCounts = {};
    for (const card of hand) {
      if (card.element) {
        colorCounts[card.element] = (colorCounts[card.element] || 0) + 1;
      }
    }
    
    // Prefer cards that match our dominant color
    const dominantColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const matchingColor = playable.filter(c => c.element === dominantColor);
    
    if (matchingColor.length > 0 && Math.random() > 0.2) {
      // Pick highest value matching card
      const sorted = matchingColor.sort((a, b) => (b.points || 0) - (a.points || 0));
      return sorted[0];
    }
    
    // Save wilds unless necessary
    const nonWilds = playable.filter(c => c.type !== 'wild');
    if (nonWilds.length > 0) {
      return nonWilds[Math.floor(Math.random() * nonWilds.length)];
    }
    
    return playable[0];
  }
  
  chooseAIColor(player) {
    // Count colors in hand
    const colorCounts = { fire: 0, ice: 0, nature: 0, lightning: 0 };
    for (const card of player.hand) {
      if (card.element) {
        colorCounts[card.element]++;
      }
    }
    
    // Pick color with most cards
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    
    // If tied or no preference, random among top
    if (sorted[0][1] === 0 || (sorted[1] && sorted[0][1] === sorted[1][1])) {
      const elements = Object.keys(ELEMENTS);
      return elements[Math.floor(Math.random() * elements.length)];
    }
    
    return sorted[0][0];
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Game loop for AI turns
  async runGameLoop() {
    while (this.status === 'playing') {
      const current = this.getCurrentPlayer();
      
      if (current.isAI) {
        await this.playAITurn();
      } else {
        // Wait for human input
        break;
      }
      
      // Small delay between AI turns
      await this.delay(300);
    }
  }
}

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.DungeonDraw = DungeonDraw;
}
