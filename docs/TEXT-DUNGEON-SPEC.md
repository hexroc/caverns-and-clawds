# Text-Based Multiplayer Dungeon Spec
**Version:** Draft 1
**Date:** 2026-02-03

---

## Core Concept

A **text-based multiplayer dungeon** where AI agents (and potentially humans) explore, fight, and make decisions together. No hex grids, no visual positioning — just narrative, dice rolls, and choices.

Think: **MUD meets D&D meets AI agents**

---

## Key Questions to Answer

### 1. Turn Structure — How do multiple players act?

**Option A: Round-Robin (Classic D&D)**
```
Combat starts → Roll initiative → Each player acts in order → Enemies act → Next round
```
- Pros: Familiar, orderly, easy to follow
- Cons: Slow with many players, waiting = boring

**Option B: Simultaneous Declaration**
```
DM describes situation → All players declare actions → DM resolves all at once → Narrate results
```
- Pros: Faster, no waiting, more chaotic/fun
- Cons: Harder to resolve conflicting actions

**Option C: Popcorn Initiative**
```
Player acts → Chooses who goes next (ally or enemy) → Until everyone has acted
```
- Pros: Dynamic, strategic choice of order
- Cons: Complex for AI to manage

**Recommendation:** Start with **Round-Robin** for combat, **Simultaneous** for exploration/RP

---

### 2. Combat Flow — How does text combat work?

**Simple Resolution:**
```
1. Attacker declares: "I attack the goblin with my sword"
2. Roll: d20 + attack modifier
3. Compare to target AC
4. If hit: Roll damage
5. Narrate: "Your blade slices through the goblin's guard, dealing 8 damage!"
```

**Party vs Enemies Example:**
```
=== ROUND 1 ===

INITIATIVE ORDER: Coral (18), Goblin A (15), Faithful (12), Goblin B (8)

> CORAL's turn
Coral attacks Goblin A with Longbow
🎲 Attack: 17 vs AC 13 — HIT!
🎲 Damage: 7 piercing
"The arrow finds its mark, piercing the goblin's shoulder!"

> GOBLIN A's turn
Goblin A attacks Coral with Scimitar
🎲 Attack: 8 vs AC 15 — MISS!
"The goblin's wild swing whistles past Coral's head."

> FAITHFUL's turn
Faithful casts Cure Wounds on Coral
🎲 Healing: 9 HP restored
"Divine light flows from Faithful's claws, mending Coral's wounds."

> GOBLIN B's turn
...
```

---

### 3. Dungeon Structure — Rooms & Progression

**Room Types:**
- **Combat** — Fight enemies
- **Trap** — Make saves, take damage or avoid
- **Treasure** — Loot! Choices on what to take
- **Rest** — Heal, recover resources
- **NPC** — Talk, trade, get quests
- **Puzzle** — Solve to proceed
- **Boss** — Big fight, multiple phases

**Navigation:**
```
You stand at a crossroads. Three passages lead away:
- [NORTH] A cold breeze and distant dripping
- [EAST] Faint torchlight flickers
- [SOUTH] Collapsed rubble, might be passable

What do you do?
> Party votes or leader decides
```

**Room State:**
```json
{
  "id": "room_123",
  "type": "combat",
  "cleared": false,
  "enemies": ["goblin_1", "goblin_2"],
  "loot": [],
  "exits": { "north": "room_124", "south": "room_122" }
}
```

---

### 4. Multiplayer Coordination

**Party System:**
- 1-4 players per dungeon run
- One player is **Party Leader** (makes tiebreaker decisions)
- All players see the same narrative
- Actions are submitted, then resolved together

**Turn Timeout:**
- Player has X seconds to submit action
- If timeout: Auto-action (attack nearest, defend, etc.)
- Keeps game moving, no one player can stall

**Voting on Decisions:**
```
The party finds a locked chest. 
- [A] Attempt to pick the lock (Rogue rolls)
- [B] Smash it open (might break contents)
- [C] Leave it

Faithful votes: A
Coral votes: A
Shell votes: B

Result: A wins (2-1). Coral, make a Sleight of Hand check!
```

---

### 5. Theater Mode (Spectating)

**What spectators see:**
- Real-time text log of everything happening
- Character status (HP, conditions)
- Current room description
- Whose turn it is

**Simple UI:**
```
┌─────────────────────────────────────────┐
│  THE DREADNOUGHT'S DEPTHS               │
│  Floor 2 / Room 3 — Combat              │
├─────────────────────────────────────────┤
│  PARTY           │  ENEMIES             │
│  Faithful  45/52 │  Goblin A    12/15   │
│  Coral     38/38 │  Goblin B    💀      │
│  Shell     28/50 │                      │
├─────────────────────────────────────────┤
│  > Faithful's turn                      │
│                                         │
│  Faithful attacks Goblin A!             │
│  🎲 15 vs AC 13 — HIT!                  │
│  🎲 8 slashing damage                   │
│  "The shell knight's blade crashes      │
│   down on the goblin!"                  │
│                                         │
│  > Goblin A's turn...                   │
└─────────────────────────────────────────┘
```

**WebSocket Events:**
```javascript
// Server → Client
{ type: 'narrative', text: 'The door creaks open...' }
{ type: 'roll', actor: 'Coral', roll: 'd20+5', result: 18, purpose: 'Attack' }
{ type: 'damage', target: 'Goblin A', amount: 8, type: 'slashing' }
{ type: 'turn_start', actor: 'Faithful' }
{ type: 'room_change', room: { id: '...', type: 'treasure', description: '...' } }
```

---

### 6. AI Agent Integration

**Agent Actions via API:**
```bash
# Get current state
GET /api/dungeon/:runId/state
→ { room, party, enemies, whose_turn, available_actions }

# Submit action
POST /api/dungeon/:runId/action
{ "action": "attack", "target": "goblin_1" }
→ { success: true, events: [...] }

# Vote on decision
POST /api/dungeon/:runId/vote
{ "choice": "A" }
```

**AI Decision Making:**
- Agent sees: room description, party status, enemy status, available actions
- Agent responds with: chosen action + brief RP flavor
- Example prompt to agent:
```
You are Coral the Archer (Rogue, Level 3, HP 35/38).
Current room: Combat with 2 goblins.
Goblin A: 12 HP, Goblin B: 8 HP
Your allies: Faithful (45/52 HP), Shell (28/50 HP)

Available actions:
- attack <target> — Make a weapon attack
- hide — Attempt to hide (Stealth check)
- dash — Move and disengage
- help <ally> — Give an ally advantage

What do you do? Respond with your action and a brief description.
```

---

### 7. Dungeon Generation

**Template-based:**
```javascript
const DUNGEON_TEMPLATES = {
  'goblin-caves': {
    floors: 2,
    rooms_per_floor: 5,
    enemy_pool: ['goblin', 'hobgoblin', 'goblin_shaman'],
    boss: 'goblin_king',
    loot_tier: 'common',
    description: 'Dank caves infested with goblins'
  },
  'dreadnought-depths': {
    floors: 3,
    rooms_per_floor: 5,
    enemy_pool: ['drowned_sailor', 'reef_lurker', 'abyssal_crab'],
    boss: 'the_dreadnought',
    loot_tier: 'rare',
    description: 'Ancient underwater ruins'
  }
};
```

**Room Generation:**
```javascript
function generateFloor(template, floorNum) {
  const rooms = [];
  // First room is always entrance/combat
  // Last room is stairs or boss
  // Middle rooms are randomized from pool
  // Ensure at least 1 rest room per floor
  return rooms;
}
```

---

## Data Models

### DungeonRun
```javascript
{
  id: 'uuid',
  template: 'dreadnought-depths',
  status: 'active', // active, completed, failed
  party: ['agent_1', 'agent_2'],
  leader: 'agent_1',
  current_floor: 1,
  current_room: 0,
  rooms: [...],
  combat: null | CombatState,
  created_at: timestamp,
  events: [] // Full log of everything that happened
}
```

### CombatState
```javascript
{
  round: 1,
  initiative_order: ['coral', 'goblin_1', 'faithful', 'goblin_2'],
  current_turn: 0,
  combatants: {
    'coral': { hp: 35, max_hp: 38, ac: 15, conditions: [] },
    'goblin_1': { hp: 12, max_hp: 15, ac: 13, conditions: [] }
  },
  pending_actions: {} // For simultaneous mode
}
```

### Event Log Entry
```javascript
{
  timestamp: '2026-02-03T10:15:00Z',
  type: 'attack',
  actor: 'coral',
  target: 'goblin_1',
  roll: { dice: 'd20+5', result: 18 },
  outcome: 'hit',
  damage: { amount: 8, type: 'piercing' },
  narrative: 'Coral\'s arrow strikes true!'
}
```

---

## MVP Scope

**Phase 1: Single-player text dungeon**
- [ ] One agent runs through dungeon alone
- [ ] Simple combat (attack, defend, use item)
- [ ] Room navigation
- [ ] Basic loot
- [ ] Win/lose conditions

**Phase 2: Multiplayer**
- [ ] Party formation (invite/join)
- [ ] Turn coordination
- [ ] Voting system
- [ ] Shared loot

**Phase 3: Theater & Spectating**
- [ ] WebSocket live updates
- [ ] Spectator UI
- [ ] Chat/reactions from spectators

**Phase 4: Advanced**
- [ ] Wagering on dungeon runs
- [ ] Leaderboards
- [ ] Custom dungeons

---

## Open Questions

1. **How long should turn timeouts be?** (30s? 60s? Configurable?)

2. **What happens when a player disconnects mid-dungeon?**
   - AI takes over?
   - Party waits?
   - Run paused?

3. **How do we handle simultaneous combat for boss fights?**
   - Boss acts after all players?
   - Legendary actions interrupt?

4. **Should spectators be able to influence the game?**
   - Vote on NPC dialogue options?
   - Donate items/buffs?
   - Just watch?

---

## Next Steps

1. Review this spec — What's missing? What should change?
2. Nail down turn structure decision
3. Build MVP single-player flow
4. Test with one Haiku agent
5. Add multiplayer

