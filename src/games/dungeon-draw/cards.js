// Dungeon Draw - Card Definitions
// Uno-style card game with elemental theming

const ELEMENTS = {
  fire: { name: 'Fire', symbol: '🔥', color: '#dc2626', gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 50%, #fbbf24 100%)' },
  ice: { name: 'Ice', symbol: '❄️', color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #22d3ee 100%)' },
  nature: { name: 'Nature', symbol: '🌿', color: '#16a34a', gradient: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)' },
  lightning: { name: 'Lightning', symbol: '⚡', color: '#eab308', gradient: 'linear-gradient(135deg, #ca8a04 0%, #eab308 50%, #facc15 100%)' }
};

const SPECIAL_CARDS = {
  stun: { name: 'Stun', symbol: '💫', description: 'Next player loses their turn', points: 20 },
  timeWarp: { name: 'Time Warp', symbol: '🌀', description: 'Reverses play direction', points: 20 },
  curse: { name: 'Curse', symbol: '💀', description: 'Next player draws 2 cards', points: 20 }
};

const WILD_CARDS = {
  chaosOrb: { name: 'Chaos Orb', symbol: '🔮', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)', description: 'Play on anything, choose next color', points: 50 },
  chaosStorm: { name: 'Chaos Storm', symbol: '🌪️', color: '#1e1b4b', gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', description: 'Choose color + next player draws 4', points: 100 }
};

/**
 * Create a single card object
 */
function createCard(type, element = null, value = null) {
  const id = `${type}-${element || 'wild'}-${value || type}-${Math.random().toString(36).substr(2, 9)}`;
  
  if (type === 'number') {
    const elem = ELEMENTS[element];
    return {
      id,
      type: 'number',
      element,
      value,
      name: `${elem.name} ${value}`,
      symbol: elem.symbol,
      color: elem.color,
      gradient: elem.gradient,
      points: value
    };
  }
  
  if (type === 'special') {
    const elem = ELEMENTS[element];
    const special = SPECIAL_CARDS[value];
    return {
      id,
      type: 'special',
      specialType: value,
      element,
      name: `${elem.name} ${special.name}`,
      symbol: special.symbol,
      color: elem.color,
      gradient: elem.gradient,
      description: special.description,
      points: special.points
    };
  }
  
  if (type === 'wild') {
    const wild = WILD_CARDS[value];
    return {
      id,
      type: 'wild',
      wildType: value,
      element: null,
      name: wild.name,
      symbol: wild.symbol,
      color: wild.color,
      gradient: wild.gradient,
      description: wild.description,
      points: wild.points
    };
  }
  
  throw new Error(`Unknown card type: ${type}`);
}

/**
 * Create a full 108-card deck
 */
function createDeck() {
  const deck = [];
  const elements = Object.keys(ELEMENTS);
  
  // Number cards (76 total)
  // One 0 per color, two of each 1-9 per color
  for (const element of elements) {
    // One 0
    deck.push(createCard('number', element, 0));
    // Two of each 1-9
    for (let num = 1; num <= 9; num++) {
      deck.push(createCard('number', element, num));
      deck.push(createCard('number', element, num));
    }
  }
  
  // Special cards (24 total - 2 of each type per color)
  const specials = Object.keys(SPECIAL_CARDS);
  for (const element of elements) {
    for (const special of specials) {
      deck.push(createCard('special', element, special));
      deck.push(createCard('special', element, special));
    }
  }
  
  // Wild cards (8 total - 4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push(createCard('wild', null, 'chaosOrb'));
    deck.push(createCard('wild', null, 'chaosStorm'));
  }
  
  return deck;
}

/**
 * Fisher-Yates shuffle
 */
function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if a card can be played on the discard pile
 */
function canPlayCard(card, topCard, currentColor) {
  // Wild cards can always be played
  if (card.type === 'wild') return true;
  
  // If top card is wild, match the chosen color
  if (topCard.type === 'wild') {
    return card.element === currentColor;
  }
  
  // Match element (color)
  if (card.element === topCard.element) return true;
  
  // Match value/type for number cards
  if (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) return true;
  
  // Match special type
  if (card.type === 'special' && topCard.type === 'special' && card.specialType === topCard.specialType) return true;
  
  return false;
}

/**
 * Get playable cards from a hand
 */
function getPlayableCards(hand, topCard, currentColor) {
  return hand.filter(card => canPlayCard(card, topCard, currentColor));
}

/**
 * Calculate points in a hand (for scoring)
 */
function calculateHandPoints(hand) {
  return hand.reduce((sum, card) => sum + card.points, 0);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ELEMENTS, SPECIAL_CARDS, WILD_CARDS, createCard, createDeck, shuffleDeck, canPlayCard, getPlayableCards, calculateHandPoints };
}
