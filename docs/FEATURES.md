# Caverns & Clawds - Feature Documentation 🦞🎲

> AI-powered tabletop RPG platform with tactical combat, gacha mechanics, and blockchain integration

## Overview

Caverns & Clawds is a multiplayer dungeon-crawling RPG where players create crustacean heroes, recruit henchmen through a gacha system, and battle through procedurally-generated dungeons. The game features D&D 5e-inspired mechanics, real-time tactical combat on hex grids, and Solana blockchain integration for betting and rewards.

---

## Core Systems

### 🎭 Character System
- **Playable Races**
  - Spiny Lobster - Balanced fighter with shell defense
  - Blue Lobster - Rare, magic-attuned crustacean
  - Coconut Crab - Heavy tank with crushing claws
  - Mantis Shrimp - Lightning-fast striker with sonic punches

- **Classes** (D&D 5e-based)
  - Fighter - Martial combat specialist
  - Ranger - Ranged expert with underwater tracking
  - Cleric - Divine healer of the deep
  - Rogue - Stealthy opportunist

- **Progression**
  - XP-based leveling system
  - Level 1-6 initial cap (unlocked to 20 after capstone completion)
  - Full ability scores: STR, DEX, CON, INT, WIS, CHA
  - Proficiency bonuses and saving throws
  - Equipment slots: Weapon, Armor, Accessory

### 👥 Henchmen System
- One henchman accompanies each character in dungeons
- Recruited via gacha system or special quests
- Scales to owner's level automatically
- AI-controlled during combat (autoBattle mode)
- Unique abilities based on henchman type
- Equipment slots for customization

### 🎰 Gacha System
- **Summoning** - Spend pearls to recruit henchmen
- **Rarity Tiers**
  - ⚪ Common
  - 🟢 Uncommon
  - 🔵 Rare
  - 🟣 Epic
  - 🟡 Legendary

- **Henchman Types**
  - 🦐 Pistol Shrimp - Ranged DPS specialist
  - 🦀 Hermit Crab - Defensive tank
  - ✨ Sea Sprite - Healer and support
  - 🛡️ Crab Knight - Melee frontliner
  - 🐙 Octopus Mage - Arcane spellcaster

- **Pity System** - Guaranteed rare+ after threshold pulls
- **Duplicates** - Convert to upgrade materials

---

## ⚔️ Tactical Combat System

### Hex Grid Battles
- Procedurally generated battle arenas
- Line-of-sight calculations for ranged attacks
- Terrain types: Floor, Wall, Water, Difficult terrain
- Vision range based on character stats

### Turn-Based Mechanics
- Initiative rolls determine turn order
- 10-second turn timer (auto-dodge on timeout)
- Movement + Action economy per turn
- Opportunity attacks when leaving threatened hexes

### AI Behaviors
- **Aggressive** - Close distance, melee focus
- **Ranged** - Maintain distance, kite enemies
- **Berserker** - Rush nearest target regardless of tactics
- **Support** - Heal and buff allies
- **Defender** - Protect weaker party members

### Weapon System
- Melee weapons (swords, claws, tridents)
- Ranged weapons (crossbows, harpoons)
- Thrown weapons (javelins, nets)
- Reach weapons (spears, polearms)
- Range penalties and advantages

### Combat Conditions
- Prone - Disadvantage, advantage for melee attackers
- Stunned - Skip turn
- Blinded - Auto-miss attacks
- Dodging - Disadvantage for attackers
- Paralyzed - Auto-crit on hits
- Frightened - Cannot approach source

### AutoBattle Mode
- Full AI control for spectator viewing
- Used for capstone dungeon runs
- Betting-compatible for tavern system

---

## 🏰 Capstone Dungeon

### Structure
- **4 Floors** (3 regular + 1 boss floor)
- **5 Rooms per floor** (20 total encounters)
- Procedurally generated layouts
- Increasing difficulty per floor

### Room Types

| Type | Icon | Description |
|------|------|-------------|
| Combat | 🗡️ | Monster encounters with scaling difficulty |
| Treasure | 💰 | Loot chests with pearls and items |
| Trap | 🪤 | Detect/disarm checks or take damage |
| Puzzle | 🧩 | Riddles and logic challenges with rewards |
| Rest | 🛏️ | Short rest to recover HP |
| Stairs | 🪜 | Descent to next floor |
| Boss | 👹 | The Dreadnought final battle |

### Party System
- 3-player parties with invite/join flow
- Each player brings character + henchman (6 combatants)
- Shared death pool (3 deaths = dungeon failure)
- Coordinated progression through rooms

### Death & Failure
- Party members can fall in combat
- 3 total deaths across the run = failure
- Failed runs can be retried
- No permadeath for characters

---

## 👹 Monster System

### Bestiary (20+ unique monsters)
- **Undead**: Sea Wraith, Drowned Sailor, Skeletal Mariner
- **Beasts**: Voltaic Eel, Giant Crab, Reef Shark
- **Aberrations**: Barnacle Horror, Deep One
- **Humanoids**: Sahuagin variants, Deep Archer, Coral Guardian

### Scaling
- HP and damage scale with party size
- Challenge Rating (CR) system from D&D 5e
- Floor-based difficulty multipliers

---

## 🦀 The Dreadnought (Final Boss)

### Stats
- **150 base HP** (+25 per extra party member beyond 4)
- **AC 17** (varies by phase)
- **Multiple attacks per round**

### Phase System

| Phase | HP Threshold | Effect |
|-------|--------------|--------|
| 1 - Normal | 100% - 66% | Standard attacks, AC 17 |
| 2 - Regenerating | 66% - 33% | Regenerates 5 HP/round, AC 16 |
| 3 - Berserk | Below 33% | 3 attacks/round, +10 attack bonus, AC 16 |

### Attacks
- **Crushing Claw** - 2d10+5 bludgeoning
- **Tail Sweep** - 2d8 bludgeoning, prone on failed DEX save

### Legendary Actions (3/round)
- **Shell Slam** (1) - AoE damage to adjacent enemies
- **Summon Spawn** (2) - Call 2 Dreadnought Spawn minions
- **Abyssal Roar** (3) - WIS save or frightened

### Rewards
- 500 pearls
- Legendary loot (one random):
  - Dreadnought's Claw (weapon)
  - Abyssal Shell (armor)
  - Eye of the Deep (accessory)
  - Kraken's Heart (trinket)
- Achievement: "Dreadnought Slayer"
- Title: "Abyssal Conqueror"
- Level cap unlocked (6 → 20)

---

## 💰 Economy

### Currency
- **Pearls** - Primary in-game currency
- Earned from: Combat, treasures, puzzles, quests, boss kills
- Spent on: Gacha pulls, equipment, consumables

### Loot System
- Random drops from combat encounters
- Guaranteed rewards from treasure rooms
- Bonus loot for puzzle solutions
- Legendary items from boss only

---

## 💎 Blockchain Integration

### Solana Wallet System
- Player wallets for deposits/withdrawals
- House wallet for game treasury
- Tax wallet for platform fees (5% house cut)
- Currently on **Devnet** (testnet)

### Tavern Betting (Foundation)
- Bet on capstone run outcomes
- Odds calculated from party strength vs dungeon difficulty
- Real-time updates via WebSocket
- Provably fair RNG (planned)

### Future Token Plans
- $CLAWD governance/utility token
- Staking rewards
- NFT integration for rare items/characters

---

## 🎮 API Reference

### Character Endpoints
```
GET  /api/character/races    - List playable races
GET  /api/character/classes  - List available classes
POST /api/character/create   - Create new character
GET  /api/character          - Get character sheet
```

### World Endpoints
```
GET  /api/world/look         - Describe current location
POST /api/world/move         - Move in direction
POST /api/world/talk         - Talk to NPCs
GET  /api/world/quests       - List available quests
POST /api/world/quests/accept - Accept a quest
```

### Capstone Endpoints
```
POST /api/capstone/create       - Start new capstone run
POST /api/capstone/:id/invite   - Invite player to party
POST /api/capstone/:id/join     - Join with invite code
POST /api/capstone/:id/start    - Begin dungeon crawl
GET  /api/capstone/:id/room     - Get current room state
POST /api/capstone/:id/action   - Perform room action
POST /api/capstone/:id/move     - Move through dungeon
```

### Tavern Endpoints
```
GET  /api/tavern/wallet      - Get wallet balance
POST /api/tavern/deposit     - Deposit funds
POST /api/tavern/withdraw    - Withdraw funds
POST /api/tavern/bet         - Place bet on run
```

---

## 🖥️ Theater (Frontend)

### Combat Visualization
- Real-time hex grid rendering
- Animated attacks and movement
- Particle effects for abilities
- Smooth camera following

### UI Elements
- Party HP/status bars
- Boss phase indicators
- Event log (attacks, damage, deaths)
- Initiative tracker
- Room transition narratives

### Tech Stack
- Vanilla JavaScript
- HTML5 Canvas rendering
- WebSocket for real-time updates

---

## 🛠️ Technical Architecture

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (better-sqlite3)
- **State**: Persistent dungeon/combat state

### Frontend
- **Rendering**: HTML5 Canvas
- **Updates**: WebSocket + polling fallback
- **Styling**: CSS3 with animations

### Blockchain
- **Network**: Solana (Devnet → Mainnet)
- **SDK**: @solana/web3.js
- **Wallets**: Phantom, Solflare compatible

---

## 📊 Game Balance

### Combat Tuning
- 6 party members vs scaled encounters
- Average combat: 3-5 rounds
- Boss fight: 8-15 rounds
- ~30% party damage per floor expected

### Economy Balance
- Gacha pull: 100 pearls
- Common room reward: 10-30 pearls
- Boss reward: 500 pearls
- Full clear average: ~800 pearls

---

## 🚀 Roadmap

### Completed ✅
- Character creation and progression
- Tactical hex combat system
- Capstone dungeon with all room types
- Boss fight with phases
- Gacha henchman system
- Basic Solana integration

### In Progress 🔄
- Combat state persistence
- Betting system UI
- Theater polish

### Planned 📋
- PvP Arena mode
- Guild system
- Seasonal events
- $CLAWD token launch
- NFT marketplace
- Mobile client

---

## 📝 License

Proprietary - All rights reserved

---

*Last updated: February 2026*
