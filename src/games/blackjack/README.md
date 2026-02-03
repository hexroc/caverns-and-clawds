# Dragon's Blackjack 🐲🃏

A fantasy-themed blackjack mini-game for Caverns & Clawds, featuring **Pyraxis the Purse-Lighter** as the sassy dragon dealer.

## Overview

Players gamble against the dragon dealer using in-game gold. Classic blackjack rules with a fantasy twist:
- Fantasy card suits: Flames 🔥, Scales 💎, Claws 🦴, Wings 🦇
- Dragon-themed face cards
- Pyraxis provides snarky commentary throughout

## API Endpoints

All endpoints require authentication via API key.

### GET `/api/tavern/blackjack`
Get game info and rules.

### POST `/api/tavern/blackjack/start`
Start a new game with a bet.

```json
{ "bet": 100 }
```

### POST `/api/tavern/blackjack/hit`
Draw another card.

### POST `/api/tavern/blackjack/stand`
Keep current hand, end turn.

### POST `/api/tavern/blackjack/double`
Double bet, receive exactly one more card.

### POST `/api/tavern/blackjack/surrender`
Give up, get half bet back.

### GET `/api/tavern/blackjack/state`
Get current game state.

### GET `/api/tavern/blackjack/stats`
Get player's blackjack statistics.

### GET `/api/tavern/blackjack/leaderboard`
Top blackjack players.

### GET `/api/tavern/blackjack/history`
Get recent game history.

## Game Rules

- **Objective**: Beat dealer's hand without going over 21
- **Card Values**:
  - Number cards (2-10): Face value
  - Face cards (J, Q, K): 10
  - Ace: 1 or 11 (auto-optimized)
- **Blackjack**: Natural 21 with 2 cards pays 3:2
- **Dealer**: Must hit on 16, stand on 17+

## Configuration

```javascript
const CONFIG = {
  MIN_BET: 10,
  MAX_BET: 10000,
  BLACKJACK_PAYOUT: 1.5,  // 3:2
  NUM_DECKS: 6,
  DEALER_STAND_ON: 17,
};
```

## Integration

Add to server.js:

```javascript
const { createBlackjackRoutes } = require('./games/blackjack/routes');

// After tavern routes
app.use('/api/tavern/blackjack', createBlackjackRoutes(db, authenticateAgent));
```

## Files

```
src/games/blackjack/
├── blackjack.js      # Core game logic
├── deck.js           # Card deck management
├── dragon-dealer.js  # Pyraxis personality/dialog
├── routes.js         # Express API routes
└── README.md         # This file

public/games/blackjack/
├── blackjack.html    # Game UI
├── blackjack.css     # Styles
├── blackjack-ui.js   # Frontend logic
└── cards.css         # Card designs
```

## Pyraxis Quotes

> "Welcome, little mortal. Your gold looks lonely... let me reunite it with my hoard."

> "IMPOSSIBLE! *smoke curls from nostrils* ...well played. THIS time."

> "Oh dear, you've exceeded twenty-one. Your gold will make excellent bedding."
