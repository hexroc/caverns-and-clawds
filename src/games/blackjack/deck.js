/**
 * Dragon's Blackjack - Deck Management
 * 
 * Fantasy-themed playing cards for the dragon's casino.
 * Uses traditional 52-card deck with fantasy suit names.
 */

// Fantasy suits (visual names, standard values)
const SUITS = [
  { id: 'flames', symbol: '🔥', name: 'Flames', color: 'red' },      // Hearts
  { id: 'scales', symbol: '💎', name: 'Scales', color: 'blue' },     // Diamonds  
  { id: 'claws', symbol: '🦴', name: 'Claws', color: 'dark' },       // Clubs
  { id: 'wings', symbol: '🦇', name: 'Wings', color: 'purple' }      // Spades
];

// Card ranks with fantasy face card names
const RANKS = [
  { value: 2, name: '2', display: '2' },
  { value: 3, name: '3', display: '3' },
  { value: 4, name: '4', display: '4' },
  { value: 5, name: '5', display: '5' },
  { value: 6, name: '6', display: '6' },
  { value: 7, name: '7', display: '7' },
  { value: 8, name: '8', display: '8' },
  { value: 9, name: '9', display: '9' },
  { value: 10, name: '10', display: '10' },
  { value: 10, name: 'J', display: 'J', title: 'Wyrmling' },        // Jack
  { value: 10, name: 'Q', display: 'Q', title: 'Drake Queen' },     // Queen
  { value: 10, name: 'K', display: 'K', title: 'Dragon King' },     // King
  { value: 11, name: 'A', display: 'A', title: 'Ancient One', isAce: true }  // Ace (1 or 11)
];

/**
 * Create a single card object
 */
function createCard(suit, rank) {
  return {
    id: `${rank.name}_${suit.id}`,
    suit: suit.id,
    suitSymbol: suit.symbol,
    suitName: suit.name,
    suitColor: suit.color,
    rank: rank.name,
    display: rank.display,
    title: rank.title || null,
    value: rank.value,
    isAce: rank.isAce || false,
    faceDown: false
  };
}

/**
 * Create a fresh 52-card deck
 */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(suit, rank));
    }
  }
  return deck;
}

/**
 * Create multiple decks (casino standard is 6-8 decks)
 */
function createShoe(numDecks = 6) {
  const shoe = [];
  for (let i = 0; i < numDecks; i++) {
    shoe.push(...createDeck());
  }
  return shoe;
}

/**
 * Fisher-Yates shuffle
 */
function shuffle(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw a card from the deck
 * Returns { card, deck } where deck is the remaining cards
 */
function drawCard(deck, faceDown = false) {
  if (deck.length === 0) {
    throw new Error('Deck is empty - need to reshuffle');
  }
  const card = { ...deck[0], faceDown };
  return {
    card,
    deck: deck.slice(1)
  };
}

/**
 * Calculate hand value with optimal ace handling
 * Returns { value, soft } where soft indicates if an ace is counted as 11
 */
function calculateHandValue(cards) {
  let value = 0;
  let aces = 0;
  
  for (const card of cards) {
    if (card.faceDown) continue; // Don't count face-down cards
    
    if (card.isAce) {
      aces++;
      value += 11;
    } else {
      value += card.value;
    }
  }
  
  // Convert aces from 11 to 1 as needed to avoid bust
  let soft = aces > 0 && value <= 21;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
    soft = aces > 0 && value <= 21;
  }
  
  return { value, soft };
}

/**
 * Check if hand is a natural blackjack (21 with 2 cards)
 */
function isBlackjack(cards) {
  if (cards.length !== 2) return false;
  const { value } = calculateHandValue(cards);
  return value === 21;
}

/**
 * Check if hand is busted (over 21)
 */
function isBusted(cards) {
  const { value } = calculateHandValue(cards);
  return value > 21;
}

/**
 * Check if hand can be split (two cards of same rank)
 */
function canSplit(cards) {
  if (cards.length !== 2) return false;
  return cards[0].rank === cards[1].rank;
}

/**
 * Get card display string (e.g., "K🔥" or "A💎")
 */
function cardToString(card) {
  if (card.faceDown) return '🂠';
  return `${card.display}${card.suitSymbol}`;
}

/**
 * Get hand display string (e.g., "K🔥 A💎 = 21")
 */
function handToString(cards) {
  const cardStrs = cards.map(cardToString);
  const { value, soft } = calculateHandValue(cards);
  const softStr = soft ? ' (soft)' : '';
  return `${cardStrs.join(' ')} = ${value}${softStr}`;
}

module.exports = {
  SUITS,
  RANKS,
  createCard,
  createDeck,
  createShoe,
  shuffle,
  drawCard,
  calculateHandValue,
  isBlackjack,
  isBusted,
  canSplit,
  cardToString,
  handToString
};
