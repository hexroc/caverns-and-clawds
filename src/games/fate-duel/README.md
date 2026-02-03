# Fate Duel ⚔️

A rock-paper-scissors minigame for Caverns & Clawds, themed as a fantasy combat duel.

## The Game

**Sword** ⚔️ beats **Scroll** 📜 (cuts through magic)
**Scroll** 📜 beats **Shield** 🛡️ (arcane penetration)  
**Shield** 🛡️ beats **Sword** ⚔️ (deflects blade)

## Quick Start

### Browser Usage

```html
<!-- Include the CSS -->
<link rel="stylesheet" href="/src/games/fate-duel/fate-duel.css">

<!-- Include the scripts -->
<script src="/src/games/fate-duel/game-logic.js"></script>
<script src="/src/games/fate-duel/ai-opponent.js"></script>
<script src="/src/games/fate-duel/animations.js"></script>
<script src="/src/games/fate-duel/power-ups.js"></script>
<script src="/src/games/fate-duel/sounds.js"></script>
<script src="/src/games/fate-duel/index.js"></script>

<!-- Create game -->
<script>
const duel = new FateDuel.Game({
  container: document.getElementById('game-area'),
  format: 'quick', // 'trial', 'quick', or 'grand'
  playerName: 'Hero',
  opponent: 'shrine_keeper', // AI opponent ID
  onComplete: (result) => {
    console.log('Duel complete!', result);
    if (result.isVictory) {
      // Player won!
    }
  }
});

duel.start();
</script>
```

### Node.js Usage (Logic Only)

```javascript
const { FateDuelMatch, FateDuelAI, resolveRound } = require('./src/games/fate-duel');

// Single round resolution
const result = resolveRound('sword', 'scroll');
console.log(result); // { winner: 1, result: 'win', ... }

// Full match
const match = new FateDuelMatch({
  format: 'quick',
  players: [
    { id: 'player', name: 'Hero' },
    { id: 'ai', name: 'Shrine Keeper' }
  ],
  onMatchComplete: (result) => {
    console.log('Match over!', result);
  }
});

const ai = new FateDuelAI({ difficulty: 'normal' });

match.startRound();
match.submitChoice(0, 'sword'); // Player
match.submitChoice(1, await ai.decide(match.getStatus())); // AI
```

## Match Formats

| Format | Win Target | Max Rounds |
|--------|------------|------------|
| `trial` | 1 | 1 (sudden death) |
| `quick` | 2 | 3 (best of 3) |
| `grand` | 3 | 5 (best of 5) |

## AI Opponents

| ID | Name | Difficulty | Personality |
|----|------|------------|-------------|
| `shrine_keeper` | Keeper of the Shrine | Normal | Wise |
| `goblin_gambler` | Grix the Gambler | Easy | Mischievous |
| `knight_champion` | Sir Valoris | Hard | Honorable |
| `fate_weaver` | The Fate Weaver | Boss | Mysterious |
| `tavern_drunk` | Old Barley | Easy | Jovial |
| `merchant_sharp` | Silvas the Sharp | Normal | Cunning |

## AI Difficulty Levels

- **Easy**: Random choices, slow reactions
- **Normal**: Adapts to player patterns (30% counter rate)
- **Hard**: Predicts moves based on history (50% predict rate)
- **Boss**: Nearly instant, occasionally "reads" player input (25%)

## Power-Ups

Power-ups can be earned through dungeon runs and used during duels:

### Passive (Auto-Trigger)
- 🔮 **Foresight Crystal** - See opponent's choice early
- 🍀 **Lucky Charm** - Win ties instead of drawing
- 🪞 **Mirror Shield** - Turn a loss into a tie

### Active (Player Chooses)
- ⏳ **Time Warp** - Get extra 3 seconds
- 👻 **Fake Out** - Show false choice during reveal
- 🎰 **Double or Nothing** - Win = 2 points, lose = -1

### Legendary
- ⚜️ **Fate's Favor** - First loss becomes a win
- 🪙 **Chaos Coin** - Randomize both players' choices

## Campaign Integration

### Dungeon Room Event

```javascript
// In dungeon.js, when generating a fate shrine room:
const fateDuelEvent = {
  type: 'fate_duel',
  opponent: 'shrine_keeper',
  stakes: {
    win: { gold: 100, item: 'lucky_charm' },
    lose: { damage: 20, gold: -50 }
  },
  format: 'quick'
};

// When player enters the room, trigger duel:
const duel = new FateDuel.Game({
  container: duelContainer,
  format: fateDuelEvent.format,
  opponent: fateDuelEvent.opponent,
  stakes: fateDuelEvent.stakes,
  playerName: character.name,
  onComplete: (result) => {
    if (result.isVictory) {
      character.gold += fateDuelEvent.stakes.win.gold;
      // Grant item, etc.
    } else {
      character.hp -= fateDuelEvent.stakes.lose.damage;
      character.gold += fateDuelEvent.stakes.lose.gold;
    }
  }
});
```

### Tavern PvP

```javascript
// Challenge another player
const pvpDuel = new FateDuel.Game({
  container: tavernDuelArea,
  format: 'grand',
  playerName: challenger.name,
  // For PvP, use type: 'human' instead of AI
  onComplete: (result) => {
    // Handle wagers, leaderboard updates, etc.
  }
});
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| `1` or `S` | Select Sword |
| `2` or `D` | Select Shield |
| `3` or `F` | Select Scroll |

## Files

```
fate-duel/
├── index.js         # Main game class & exports
├── game-logic.js    # Core RPS mechanics
├── ai-opponent.js   # AI behavior & named opponents
├── animations.js    # Clash animations & effects
├── power-ups.js     # Power-up system
├── sounds.js        # Web Audio sound effects
├── fate-duel.css    # All styles
└── README.md        # This file
```

## Events

The game emits events you can listen to:

```javascript
const match = new FateDuelMatch({
  onStateChange: (event) => {
    // event.type: 'round_start', 'choice_locked', 'clash'
  },
  onRoundComplete: (roundData) => {
    // roundData: { round, choices, result, scores }
  },
  onMatchComplete: (result) => {
    // result: { winner, winnerIndex, finalScores, rounds }
  }
});
```

## Accessibility

- Full keyboard support
- High contrast colors
- Screen reader friendly result announcements
- Reduced motion support (via `prefers-reduced-motion`)

## Credits

Designed for **Caverns & Clawds** by Hex 🦞

---

*May fate be ever in your favor!* ⚔️
