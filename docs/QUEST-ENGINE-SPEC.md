# Quest Engine Specification v2.0
*Sprint 2 Prep Document - Caverns & Clawds MUD*
*Created: 2026-02-03*

---

## Executive Summary

This document specifies a **template-based quest engine** to replace the current hardcoded quest system. The new engine supports:

- **6 Quest Types**: Kill, Fetch, Explore, Escort, Mystery, Chain
- **Dynamic Generation**: Templates with variable slots for infinite variety
- **Quest Board System**: Location-based quest discovery with refresh cycles
- **Robust State Machine**: Full lifecycle tracking with failure conditions
- **Scalable Schema**: Normalized database design for thousands of quests

---

## 1. Quest Types

### 1.1 Kill Quest
**Purpose**: Eliminate a number of creatures in a zone.

```
"Slay {count} {creature} in {zone}"
```

**Variables**:
- `creature`: Monster type (e.g., `giant_crab`, `drowned_sailor`)
- `zone`: Target zone (e.g., `kelp_forest`, `shipwreck_graveyard`)
- `count`: Number to kill (1-20)

**Progress Tracking**: Increment on kill event matching creature/zone.

**Example**: "Slay 5 Giant Crabs in the Kelp Forest"

---

### 1.2 Fetch Quest
**Purpose**: Retrieve an item from a location and return it.

```
"Retrieve {item} from {location}"
```

**Variables**:
- `item`: Target item (e.g., `sunken_treasure`, `ancient_relic`)
- `location`: Specific room or zone
- `return_to`: NPC or location for delivery (usually quest giver)

**Progress Tracking**: 
1. Player finds item (loot/search/interact)
2. Player returns to turn-in location
3. Item removed from inventory on turn-in

**Example**: "Retrieve the Captain's Log from the Dreadnought"

---

### 1.3 Explore Quest
**Purpose**: Discover new rooms in a zone.

```
"Discover {count} rooms in {zone}"
```

**Variables**:
- `zone`: Target zone
- `count`: Rooms to discover (5-50)
- `unique_only`: Boolean - only count first visits (default: true)

**Progress Tracking**: Increment on room entry if room is in zone and either:
- Player has never visited before (if `unique_only`)
- Room is newly generated this session

**Example**: "Map 10 unexplored rooms in the Coral Labyrinth"

---

### 1.4 Escort Quest
**Purpose**: Protect an NPC while traveling to a destination.

```
"Escort {npc} safely to {destination}"
```

**Variables**:
- `npc`: NPC to protect (spawns or joins party)
- `destination`: Target room/zone
- `npc_hp`: NPC's hit points (escort fails if NPC dies)
- `enemy_spawn_rate`: Chance of ambush per room (0.0-1.0)

**Progress Tracking**:
1. NPC joins party at quest start
2. Track room progress toward destination
3. Monitor NPC HP during combat
4. Complete when destination reached with NPC alive

**Failure Conditions**:
- NPC dies
- Player abandons escort (moves too far from NPC)
- Time limit expires (if set)

**Example**: "Escort the Merchant Crab to Wrecker's Rest"

---

### 1.5 Mystery Quest
**Purpose**: Investigate an event by gathering clues.

```
"Investigate {event}, find {count} clues"
```

**Variables**:
- `event`: Description of mystery (e.g., "the disappearing traders")
- `count`: Clues required
- `clue_locations`: Array of room IDs or zones where clues exist
- `clue_items`: Specific items that count as clues
- `clue_npcs`: NPCs who provide clue when talked to

**Progress Tracking**:
- Examine specific objects → clue found
- Talk to specific NPCs → clue found
- Enter specific rooms → clue found
- Collect specific items → clue found

**Completion**: All clues found → reveal solution → turn in

**Example**: "Investigate the haunted shipwreck - find 4 clues"

---

### 1.6 Chain Quest
**Purpose**: Multi-part story with sequential or branching stages.

```
Parent quest containing ordered sub-quests with optional branching
```

**Structure**:
```json
{
  "type": "chain",
  "stages": [
    { "quest_template": "investigate_cave", "branch_on_complete": null },
    { "quest_template": "rescue_survivor_a", "branch_condition": "chose_path_a" },
    { "quest_template": "rescue_survivor_b", "branch_condition": "chose_path_b" },
    { "quest_template": "final_confrontation", "requires_any": ["rescue_survivor_a", "rescue_survivor_b"] }
  ]
}
```

**Features**:
- Each stage is a complete quest template
- `branch_condition`: Only activates if player made specific choice
- `requires_any`/`requires_all`: Dependencies on prior stages
- Player choices stored in `quest_flags` for branching

**Example**: "The Dreadnought Saga" - 5-part chain with 2 possible endings

---

## 2. Quest Template Format

### 2.1 Template Schema

```typescript
interface QuestTemplate {
  // === Identity ===
  template_id: string;           // Unique ID: "kill_crabs_kelp"
  type: QuestType;               // "kill" | "fetch" | "explore" | "escort" | "mystery" | "chain"
  
  // === Display ===
  title_pattern: string;         // "Slay {count} {creature_name}"
  description_pattern: string;   // "The {zone_name} is overrun with {creature_name}..."
  flavor_text_pattern: string;   // NPC dialogue on offer
  completion_text_pattern: string; // NPC dialogue on turn-in
  
  // === Variable Slots ===
  variables: {
    creature?: string[];         // Allowed creature IDs for this template
    zone?: string[];             // Allowed zone IDs
    item?: string[];             // Allowed item IDs
    npc?: string[];              // Allowed NPC IDs
    location?: string[];         // Allowed specific rooms
    count_range?: [min: number, max: number];  // Range for count variable
  };
  
  // === Objectives ===
  objectives: ObjectiveTemplate[];
  
  // === Prerequisites ===
  prerequisites: {
    min_level: number;           // Minimum character level
    max_level?: number;          // Maximum level (for scaling)
    required_quests?: string[];  // Quest IDs that must be completed
    required_reputation?: {      // Faction reputation requirements
      faction: string;
      min_value: number;
    };
    required_items?: string[];   // Items that must be in inventory
    required_flags?: string[];   // Quest flags that must be set
  };
  
  // === Rewards ===
  rewards: {
    xp_base: number;             // Base XP (scaled by level/difficulty)
    xp_per_level: number;        // Additional XP per level above minimum
    pearls_base: number;         // Base currency
    pearls_per_level: number;    // Additional currency per level
    items: RewardItem[];         // Guaranteed items
    random_items?: {             // Random item drop table
      pool: string[];            // Item IDs
      count: number;             // How many to pick
      weights?: number[];        // Relative weights
    };
    reputation?: {               // Faction reputation changes
      faction: string;
      change: number;
    }[];
    unlock_quests?: string[];    // Quest templates unlocked on completion
    set_flags?: string[];        // Quest flags to set
  };
  
  // === Time & Availability ===
  time_limit_minutes?: number;   // Optional time limit
  cooldown_hours?: number;       // Hours before repeatable
  repeatable: boolean;           // Can be done multiple times
  daily_limit?: number;          // Max times per day
  weekly_limit?: number;         // Max times per week
  
  // === Metadata ===
  zone: string;                  // Primary zone
  giver_npc: string;             // Quest giver NPC ID
  giver_location: string;        // Location of quest giver
  difficulty: "trivial" | "easy" | "normal" | "hard" | "extreme";
  tags: string[];                // For filtering: ["combat", "story", "daily"]
  hidden: boolean;               // Not shown on quest board (triggered only)
}

interface ObjectiveTemplate {
  type: "kill" | "kill_any" | "collect" | "deliver" | "explore" | "interact" | "talk" | "escort" | "survive";
  target?: string;               // Creature/item/NPC/room ID (or pattern)
  target_name_pattern?: string;  // Display name with variables
  zone?: string;                 // Zone restriction
  count: number;                 // Amount required
  order?: number;                // For ordered objectives (null = parallel)
  optional?: boolean;            // Bonus objective
  hidden?: boolean;              // Revealed after discovery
}

interface RewardItem {
  item_id: string;
  quantity: number;
  chance?: number;               // 0.0-1.0, default 1.0
}
```

### 2.2 Difficulty Scaling Formula

Difficulty affects enemy CR and reward multipliers:

```javascript
function calculateDifficulty(template, characterLevel) {
  const baseDifficulty = {
    trivial: 0.5,
    easy: 0.75,
    normal: 1.0,
    hard: 1.25,
    extreme: 1.5
  }[template.difficulty];
  
  // Level delta modifier
  const levelDelta = characterLevel - template.prerequisites.min_level;
  const levelMod = 1 + (levelDelta * 0.05); // 5% per level above min
  
  return {
    enemyCRMultiplier: baseDifficulty * levelMod,
    rewardMultiplier: baseDifficulty, // Rewards don't scale with level delta
    xpMultiplier: Math.max(0.1, 1 - (levelDelta * 0.1)) // XP decreases for overleveled
  };
}
```

---

## 3. Quest Board System

### 3.1 Overview

Quest boards exist in hub locations and display available quests. They provide:
- Level-appropriate filtering
- Category filtering (daily/weekly/permanent)
- Refresh cycles for variety

### 3.2 Board Configuration

```typescript
interface QuestBoard {
  board_id: string;              // "kelp_forest_board"
  location: string;              // Room ID where board exists
  zone: string;                  // Primary zone for quests
  
  slots: {
    daily: number;               // Number of daily quest slots (3-5)
    weekly: number;              // Number of weekly quest slots (1-2)
    permanent: number;           // Number of permanent quest slots (5-10)
    special: number;             // Event/seasonal slots (0-3)
  };
  
  refresh_times: {
    daily: string;               // Cron expression: "0 0 * * *" (midnight)
    weekly: string;              // "0 0 * * 0" (Sunday midnight)
  };
  
  level_range: [min: number, max: number];  // Quest level filtering
  allowed_types: QuestType[];    // Types this board can show
  excluded_templates: string[];  // Templates never shown here
  weighted_templates: {          // Increased spawn chance
    template_id: string;
    weight: number;
  }[];
}
```

### 3.3 Quest Generation Algorithm

When populating a board:

```javascript
async function populateQuestBoard(board, currentTime) {
  const quests = [];
  
  // 1. Get all eligible templates
  const templates = await getTemplatesForBoard(board);
  
  // 2. Filter by level range
  const levelFiltered = templates.filter(t => 
    t.prerequisites.min_level >= board.level_range[0] &&
    t.prerequisites.min_level <= board.level_range[1]
  );
  
  // 3. Populate each slot type
  for (const slotType of ['permanent', 'weekly', 'daily', 'special']) {
    const slotCount = board.slots[slotType];
    const typeFiltered = levelFiltered.filter(t => 
      t.tags.includes(slotType) || slotType === 'permanent'
    );
    
    // Weighted random selection
    const selected = weightedRandomSample(
      typeFiltered, 
      slotCount,
      board.weighted_templates
    );
    
    // 4. Instantiate each template with random variables
    for (const template of selected) {
      const instance = instantiateTemplate(template);
      instance.slot_type = slotType;
      instance.expires_at = calculateExpiry(slotType, currentTime);
      quests.push(instance);
    }
  }
  
  return quests;
}

function instantiateTemplate(template) {
  // Fill in variable slots with random selections
  const vars = {};
  
  if (template.variables.creature) {
    vars.creature = randomChoice(template.variables.creature);
    vars.creature_name = getCreatureDisplayName(vars.creature);
  }
  
  if (template.variables.zone) {
    vars.zone = randomChoice(template.variables.zone);
    vars.zone_name = getZoneDisplayName(vars.zone);
  }
  
  if (template.variables.count_range) {
    vars.count = randomInt(...template.variables.count_range);
  }
  
  // ... etc for other variables
  
  // Interpolate patterns
  return {
    template_id: template.template_id,
    title: interpolate(template.title_pattern, vars),
    description: interpolate(template.description_pattern, vars),
    flavor_text: interpolate(template.flavor_text_pattern, vars),
    variables: vars,
    objectives: template.objectives.map(o => ({
      ...o,
      target_name: interpolate(o.target_name_pattern || o.target, vars),
      count: o.count === -1 ? vars.count : o.count
    })),
    rewards: scaleRewards(template.rewards, vars),
    // ... copy other fields
  };
}
```

### 3.4 Active Quest Limits

```javascript
const QUEST_LIMITS = {
  max_active_total: 10,          // Maximum quests active at once
  max_active_per_type: {
    kill: 3,
    fetch: 2,
    explore: 2,
    escort: 1,                   // Escort is exclusive
    mystery: 2,
    chain: 2
  },
  max_active_per_zone: 4         // Don't stack too many in one area
};
```

---

## 4. Quest State Machine

### 4.1 States

```
┌─────────────┐
│  AVAILABLE  │  Quest exists on board, player hasn't accepted
└──────┬──────┘
       │ accept()
       ▼
┌─────────────┐
│   ACCEPTED  │  Player has taken quest, not started progress
└──────┬──────┘
       │ first progress event
       ▼
┌─────────────┐
│ IN_PROGRESS │  At least one objective has progress
└──────┬──────┘
       │ all objectives complete
       ▼
┌─────────────┐
│  COMPLETED  │  Ready for turn-in, rewards not yet claimed
└──────┬──────┘
       │ turnIn()
       ▼
┌─────────────┐
│  TURNED_IN  │  Rewards claimed, quest finished successfully
└─────────────┘

Alternative endings:
┌─────────────┐
│   FAILED    │  Time expired, escort died, or other failure
└─────────────┘

┌─────────────┐
│  ABANDONED  │  Player voluntarily dropped quest
└─────────────┘

┌─────────────┐
│   EXPIRED   │  Quest was on board but expired before accepted
└─────────────┘
```

### 4.2 State Transitions

```typescript
interface QuestStateTransition {
  from: QuestState;
  to: QuestState;
  trigger: string;
  condition?: (quest: ActiveQuest) => boolean;
  onTransition?: (quest: ActiveQuest) => void;
}

const transitions: QuestStateTransition[] = [
  // Accept
  {
    from: 'available',
    to: 'accepted',
    trigger: 'accept',
    condition: (q) => q.canAccept(player),
    onTransition: (q) => {
      q.accepted_at = Date.now();
      q.expires_at = q.time_limit_minutes 
        ? Date.now() + q.time_limit_minutes * 60000 
        : null;
    }
  },
  
  // Start progress
  {
    from: 'accepted',
    to: 'in_progress',
    trigger: 'progress',
    onTransition: (q) => { q.started_at = Date.now(); }
  },
  
  // Complete
  {
    from: 'in_progress',
    to: 'completed',
    trigger: 'check_completion',
    condition: (q) => q.objectives.every(o => o.current >= o.required),
    onTransition: (q) => { q.completed_at = Date.now(); }
  },
  
  // Turn in
  {
    from: 'completed',
    to: 'turned_in',
    trigger: 'turn_in',
    condition: (q) => q.isAtTurnInLocation(player),
    onTransition: (q) => {
      q.turned_in_at = Date.now();
      grantRewards(q, player);
    }
  },
  
  // Fail conditions
  {
    from: ['accepted', 'in_progress'],
    to: 'failed',
    trigger: 'time_expired',
    condition: (q) => q.expires_at && Date.now() > q.expires_at
  },
  {
    from: ['accepted', 'in_progress'],
    to: 'failed',
    trigger: 'escort_died',
    condition: (q) => q.type === 'escort' && q.escortNpc?.hp <= 0
  },
  
  // Abandon
  {
    from: ['accepted', 'in_progress'],
    to: 'abandoned',
    trigger: 'abandon',
    onTransition: (q) => {
      // Return escort NPC if applicable
      if (q.escortNpc) despawnNpc(q.escortNpc);
    }
  }
];
```

### 4.3 Progress Tracking

```typescript
interface QuestProgress {
  quest_id: string;
  character_id: string;
  
  objectives: ObjectiveProgress[];
  
  // Timestamps
  accepted_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  turned_in_at: Date | null;
  failed_at: Date | null;
  expires_at: Date | null;
  
  // Escort-specific
  escort_npc_id: string | null;
  escort_npc_hp: number | null;
  
  // Mystery-specific
  clues_found: string[];         // IDs of discovered clues
  
  // Chain-specific
  chain_stage: number;
  chain_flags: Record<string, any>;
  
  // General
  quest_flags: Record<string, any>;  // For custom tracking
}

interface ObjectiveProgress {
  objective_index: number;
  current: number;
  required: number;
  completed: boolean;
  completed_at: Date | null;
  
  // For tracking what counted
  contributions: {
    type: string;                // "kill", "collect", etc.
    target: string;              // What was killed/collected
    timestamp: Date;
    location: string;            // Where it happened
  }[];
}
```

### 4.4 Failure Conditions

| Condition | Quest Types | Trigger |
|-----------|-------------|---------|
| Time expired | All (if `time_limit_minutes` set) | Cron check or action attempt |
| Escort NPC died | Escort | Combat resolution |
| Escort abandoned | Escort | Player moved 3+ rooms away |
| Key NPC died | Mystery, Chain | World event |
| Failed objective | Chain (if marked `fail_on_incomplete`) | Stage transition |

---

## 5. Database Schema

### 5.1 quest_templates

Stores template definitions (rarely changes, could be seeded from JSON).

```sql
CREATE TABLE quest_templates (
  template_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('kill', 'fetch', 'explore', 'escort', 'mystery', 'chain')),
  
  -- Display patterns (with {variable} placeholders)
  title_pattern TEXT NOT NULL,
  description_pattern TEXT NOT NULL,
  flavor_text_pattern TEXT,
  completion_text_pattern TEXT,
  
  -- JSON fields
  variables TEXT NOT NULL DEFAULT '{}',          -- Variable slot definitions
  objectives TEXT NOT NULL DEFAULT '[]',         -- ObjectiveTemplate[]
  prerequisites TEXT NOT NULL DEFAULT '{}',      -- Prerequisites object
  rewards TEXT NOT NULL DEFAULT '{}',            -- Rewards object
  
  -- Time settings
  time_limit_minutes INTEGER,
  cooldown_hours REAL DEFAULT 0,
  repeatable BOOLEAN DEFAULT FALSE,
  daily_limit INTEGER,
  weekly_limit INTEGER,
  
  -- Metadata
  zone TEXT NOT NULL,
  giver_npc TEXT NOT NULL,
  giver_location TEXT NOT NULL,
  difficulty TEXT DEFAULT 'normal' CHECK(difficulty IN ('trivial', 'easy', 'normal', 'hard', 'extreme')),
  tags TEXT DEFAULT '[]',                        -- JSON array
  hidden BOOLEAN DEFAULT FALSE,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quest_templates_zone ON quest_templates(zone);
CREATE INDEX idx_quest_templates_type ON quest_templates(type);
CREATE INDEX idx_quest_templates_giver ON quest_templates(giver_npc);
```

### 5.2 quest_board_instances

Instantiated quests currently available on boards.

```sql
CREATE TABLE quest_board_instances (
  instance_id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  
  -- Resolved values
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  flavor_text TEXT,
  variables TEXT NOT NULL DEFAULT '{}',          -- Filled variable values
  objectives TEXT NOT NULL DEFAULT '[]',         -- Resolved objectives
  rewards TEXT NOT NULL DEFAULT '{}',            -- Scaled rewards
  
  -- Slot info
  slot_type TEXT NOT NULL CHECK(slot_type IN ('daily', 'weekly', 'permanent', 'special')),
  slot_index INTEGER NOT NULL,
  
  -- Timing
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  
  FOREIGN KEY (template_id) REFERENCES quest_templates(template_id)
);

CREATE INDEX idx_board_instances_board ON quest_board_instances(board_id);
CREATE INDEX idx_board_instances_expires ON quest_board_instances(expires_at);
```

### 5.3 active_quests

Quests that players have accepted and are working on.

```sql
CREATE TABLE active_quests (
  quest_id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  instance_id TEXT,                              -- Links to board instance if applicable
  
  -- Status
  status TEXT NOT NULL DEFAULT 'accepted' 
    CHECK(status IN ('accepted', 'in_progress', 'completed', 'turned_in', 'failed', 'abandoned')),
  
  -- Resolved data (snapshot at accept time)
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  variables TEXT NOT NULL DEFAULT '{}',
  rewards TEXT NOT NULL DEFAULT '{}',
  
  -- Timestamps
  accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  turned_in_at DATETIME,
  failed_at DATETIME,
  expires_at DATETIME,
  
  -- Chain quest support
  parent_quest_id TEXT,                          -- For chain sub-quests
  chain_stage INTEGER,
  
  -- Special tracking
  escort_npc_id TEXT,
  escort_npc_hp INTEGER,
  quest_flags TEXT DEFAULT '{}',                 -- JSON for custom state
  
  FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES quest_templates(template_id),
  FOREIGN KEY (parent_quest_id) REFERENCES active_quests(quest_id)
);

CREATE INDEX idx_active_quests_character ON active_quests(character_id);
CREATE INDEX idx_active_quests_status ON active_quests(status);
CREATE INDEX idx_active_quests_expires ON active_quests(expires_at);
```

### 5.4 quest_progress

Detailed objective progress for active quests.

```sql
CREATE TABLE quest_progress (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  objective_index INTEGER NOT NULL,
  
  -- Progress
  current INTEGER DEFAULT 0,
  required INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  
  -- Contribution log (JSON array)
  contributions TEXT DEFAULT '[]',
  
  FOREIGN KEY (quest_id) REFERENCES active_quests(quest_id) ON DELETE CASCADE,
  UNIQUE(quest_id, objective_index)
);

CREATE INDEX idx_quest_progress_quest ON quest_progress(quest_id);
```

### 5.5 quest_history

Completed quest log for cooldowns, achievements, and stats.

```sql
CREATE TABLE quest_history (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  quest_id TEXT,                                 -- Original active_quest ID
  
  -- Outcome
  outcome TEXT NOT NULL CHECK(outcome IN ('completed', 'failed', 'abandoned')),
  
  -- Snapshot of completion
  title TEXT NOT NULL,
  rewards_granted TEXT DEFAULT '{}',             -- What was actually given
  
  -- Timing
  accepted_at DATETIME,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER,                      -- Time from accept to complete
  
  -- Stats
  objectives_completed INTEGER,
  objectives_total INTEGER,
  
  FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES quest_templates(template_id)
);

CREATE INDEX idx_quest_history_character ON quest_history(character_id);
CREATE INDEX idx_quest_history_template ON quest_history(template_id);
CREATE INDEX idx_quest_history_completed ON quest_history(completed_at);
```

---

## 6. Example Quest Templates

### Template 1: Basic Kill Quest (Daily)
```json
{
  "template_id": "daily_kelp_cleanup",
  "type": "kill",
  "title_pattern": "{creature_name} Cleanup",
  "description_pattern": "The {zone_name} is overrun with {creature_name}. Clear out {count} of them.",
  "flavor_text_pattern": "\"Those {creature_name} are getting bold. Thin their numbers for me.\"",
  "completion_text_pattern": "\"Good work! The waters are safer thanks to you.\"",
  "variables": {
    "creature": ["giant_crab", "kelp_lurker", "hostile_fish_swarm"],
    "zone": ["kelp_forest"],
    "count_range": [3, 8]
  },
  "objectives": [
    { "type": "kill", "target": "{creature}", "target_name_pattern": "{creature_name}", "count": -1 }
  ],
  "prerequisites": { "min_level": 1 },
  "rewards": {
    "xp_base": 50,
    "xp_per_level": 10,
    "pearls_base": 25,
    "pearls_per_level": 5
  },
  "repeatable": true,
  "cooldown_hours": 20,
  "zone": "kelp_forest",
  "giver_npc": "barnacle_bill",
  "giver_location": "briny_flagon",
  "difficulty": "easy",
  "tags": ["combat", "daily"]
}
```

### Template 2: Fetch Quest
```json
{
  "template_id": "salvage_ship_parts",
  "type": "fetch",
  "title_pattern": "Salvage Run: {item_name}",
  "description_pattern": "Captain Marlow needs {item_name} salvaged from {location_name}. Be careful - the wrecks are haunted.",
  "flavor_text_pattern": "\"I've got buyers waiting for these parts. Get me {item_name} from {location_name} and there's pearls in it for you.\"",
  "completion_text_pattern": "\"Perfect condition! You've got a good eye for salvage.\"",
  "variables": {
    "item": ["ship_wheel", "brass_compass", "navigation_chart", "captain_log"],
    "location": ["outer_wrecks", "cargo_hold_alpha", "officer_quarters"]
  },
  "objectives": [
    { "type": "collect", "target": "{item}", "target_name_pattern": "{item_name}", "count": 1 },
    { "type": "deliver", "target": "barnacle_bill", "target_name_pattern": "Return to Captain Marlow", "count": 1 }
  ],
  "prerequisites": { "min_level": 3 },
  "rewards": {
    "xp_base": 100,
    "xp_per_level": 15,
    "pearls_base": 60,
    "pearls_per_level": 10,
    "random_items": {
      "pool": ["potion_healing", "antitoxin", "rations"],
      "count": 1
    }
  },
  "time_limit_minutes": 60,
  "repeatable": true,
  "cooldown_hours": 4,
  "zone": "shipwreck_graveyard",
  "giver_npc": "captain_marlow",
  "giver_location": "wreckers_rest",
  "difficulty": "normal",
  "tags": ["exploration", "daily"]
}
```

### Template 3: Explore Quest
```json
{
  "template_id": "cartographer_coral",
  "type": "explore",
  "title_pattern": "Map the {zone_name}",
  "description_pattern": "The Cartographer's Guild needs updated maps of {zone_name}. Explore {count} unmapped areas.",
  "flavor_text_pattern": "\"Our charts of {zone_name} are decades old. Brave the unknown and bring back what you find.\"",
  "completion_text_pattern": "\"Excellent! These discoveries will be added to the master charts.\"",
  "variables": {
    "zone": ["coral_labyrinth", "the_murk", "abyssal_trenches"],
    "count_range": [8, 15]
  },
  "objectives": [
    { "type": "explore", "zone": "{zone}", "target_name_pattern": "Discover rooms in {zone_name}", "count": -1 }
  ],
  "prerequisites": { "min_level": 4 },
  "rewards": {
    "xp_base": 150,
    "xp_per_level": 20,
    "pearls_base": 75,
    "pearls_per_level": 15,
    "items": [
      { "item_id": "exploration_map_fragment", "quantity": 1 }
    ],
    "reputation": [
      { "faction": "cartographers_guild", "change": 10 }
    ]
  },
  "repeatable": true,
  "cooldown_hours": 48,
  "zone": "coral_labyrinth",
  "giver_npc": "mapkeeper_tidal",
  "giver_location": "guild_hall",
  "difficulty": "normal",
  "tags": ["exploration", "weekly"]
}
```

### Template 4: Escort Quest
```json
{
  "template_id": "escort_merchant",
  "type": "escort",
  "title_pattern": "Safe Passage for {npc_name}",
  "description_pattern": "Escort {npc_name} safely through {zone_name} to {destination_name}. Protect them from any threats.",
  "flavor_text_pattern": "\"I need to get through {zone_name} but it's too dangerous alone. Will you protect me?\"",
  "completion_text_pattern": "\"We made it! Thank you, brave adventurer. Here's your payment.\"",
  "variables": {
    "npc": ["nervous_merchant", "lost_pilgrim", "valuable_courier"],
    "zone": ["kelp_forest", "shipwreck_graveyard"],
    "destination": ["briny_flagon", "wreckers_rest", "sanctuary_reef"]
  },
  "objectives": [
    { "type": "escort", "target": "{npc}", "target_name_pattern": "Protect {npc_name}", "count": 1 },
    { "type": "interact", "target": "{destination}", "target_name_pattern": "Reach {destination_name}", "count": 1 }
  ],
  "prerequisites": { 
    "min_level": 2,
    "max_level": 6
  },
  "rewards": {
    "xp_base": 125,
    "xp_per_level": 15,
    "pearls_base": 100,
    "pearls_per_level": 20
  },
  "time_limit_minutes": 30,
  "repeatable": true,
  "cooldown_hours": 6,
  "zone": "kelp_forest",
  "giver_npc": "nervous_merchant",
  "giver_location": "crossroads",
  "difficulty": "hard",
  "tags": ["escort", "combat"]
}
```

### Template 5: Mystery Quest
```json
{
  "template_id": "haunted_wreck_mystery",
  "type": "mystery",
  "title_pattern": "The Mystery of the {location_name}",
  "description_pattern": "Strange occurrences have been reported at {location_name}. Investigate and uncover {count} clues to solve the mystery.",
  "flavor_text_pattern": "\"Sailors have been seeing things at {location_name}. Unnatural things. Find out what's going on.\"",
  "completion_text_pattern": "\"So that's what happened! The truth is stranger than the legends.\"",
  "variables": {
    "location": ["dreadnought_wreck", "captains_tomb", "cursed_cargo"],
    "count_range": [3, 5]
  },
  "objectives": [
    { "type": "interact", "target": "clue_1", "target_name_pattern": "Find clues", "count": -1, "hidden": true },
    { "type": "talk", "target": "ghost_witness", "target_name_pattern": "Interview the witness", "count": 1, "hidden": true, "optional": true }
  ],
  "prerequisites": { 
    "min_level": 4,
    "required_quests": ["ghost_captain_finale"]
  },
  "rewards": {
    "xp_base": 250,
    "xp_per_level": 30,
    "pearls_base": 150,
    "pearls_per_level": 25,
    "items": [
      { "item_id": "mystery_solver_badge", "quantity": 1, "chance": 0.5 }
    ]
  },
  "repeatable": false,
  "zone": "shipwreck_graveyard",
  "giver_npc": "captain_marlow",
  "giver_location": "wreckers_rest",
  "difficulty": "hard",
  "tags": ["mystery", "story"]
}
```

### Template 6: Chain Quest (The Dreadnought Saga)
```json
{
  "template_id": "dreadnought_saga",
  "type": "chain",
  "title_pattern": "The Dreadnought Saga",
  "description_pattern": "A legendary quest chain to uncover the secrets of the cursed Dreadnought and end the undead plague.",
  "flavor_text_pattern": "\"This is the big one. Are you ready to become a legend?\"",
  "completion_text_pattern": "\"You've done what no one else could. The Dreadnought is finally at peace.\"",
  "variables": {},
  "objectives": [
    { "type": "interact", "target": "complete_stage", "target_name_pattern": "Complete all stages", "count": 4 }
  ],
  "prerequisites": { 
    "min_level": 5,
    "required_quests": ["ghost_captain_finale"]
  },
  "rewards": {
    "xp_base": 2000,
    "pearls_base": 1000,
    "items": [
      { "item_id": "legendary_claw_trident", "quantity": 1 }
    ],
    "unlock_quests": ["post_game_challenges"],
    "set_flags": ["dreadnought_saga_complete"]
  },
  "chain_stages": [
    {
      "stage": 1,
      "template_id": "dreadnought_stage1_infiltration",
      "title": "Stage 1: Infiltration",
      "required": true
    },
    {
      "stage": 2,
      "template_id": "dreadnought_stage2_choice",
      "title": "Stage 2: The Choice",
      "required": true,
      "branch_options": ["save_ghost", "destroy_ghost"]
    },
    {
      "stage": 3,
      "template_id": "dreadnought_stage3a_redemption",
      "title": "Stage 3a: Redemption",
      "branch_condition": "chose_save_ghost"
    },
    {
      "stage": 3,
      "template_id": "dreadnought_stage3b_destruction",
      "title": "Stage 3b: Destruction",
      "branch_condition": "chose_destroy_ghost"
    },
    {
      "stage": 4,
      "template_id": "dreadnought_stage4_finale",
      "title": "Stage 4: The Finale",
      "required": true
    }
  ],
  "repeatable": false,
  "zone": "shipwreck_graveyard",
  "giver_npc": "captain_marlow",
  "giver_location": "wreckers_rest",
  "difficulty": "extreme",
  "tags": ["story", "chain", "epic"]
}
```

### Template 7: Boss Hunt (Weekly)
```json
{
  "template_id": "weekly_boss_hunt",
  "type": "kill",
  "title_pattern": "Bounty: {creature_name}",
  "description_pattern": "A powerful {creature_name} has been terrorizing {zone_name}. Bring it down.",
  "flavor_text_pattern": "\"This one's trouble. Big reward for whoever takes it out.\"",
  "completion_text_pattern": "\"I knew you could do it! Here's the bounty as promised.\"",
  "variables": {
    "creature": ["king_crab", "ghost_captain", "anchor_wight", "moray_terror"],
    "zone": ["kelp_forest", "shipwreck_graveyard"]
  },
  "objectives": [
    { "type": "kill", "target": "{creature}", "target_name_pattern": "Slay {creature_name}", "count": 1 }
  ],
  "prerequisites": { "min_level": 4 },
  "rewards": {
    "xp_base": 300,
    "xp_per_level": 40,
    "pearls_base": 200,
    "pearls_per_level": 30,
    "random_items": {
      "pool": ["potion_greater_healing", "scroll_depth_charge", "rare_crafting_mat"],
      "count": 2
    }
  },
  "repeatable": true,
  "weekly_limit": 1,
  "cooldown_hours": 168,
  "zone": "shipwreck_graveyard",
  "giver_npc": "bounty_board",
  "giver_location": "wreckers_rest",
  "difficulty": "hard",
  "tags": ["combat", "weekly", "boss"]
}
```

### Template 8: Survival Challenge
```json
{
  "template_id": "survival_the_murk",
  "type": "explore",
  "title_pattern": "Survive the Murk",
  "description_pattern": "Enter the lightless depths of The Murk. Survive for {count} rooms without retreating.",
  "flavor_text_pattern": "\"The Murk claims most who enter. Think you're different? Prove it.\"",
  "completion_text_pattern": "\"You made it back! That's more than most can say.\"",
  "variables": {
    "count_range": [10, 20]
  },
  "objectives": [
    { "type": "explore", "zone": "the_murk", "target_name_pattern": "Survive {count} rooms in The Murk", "count": -1 },
    { "type": "survive", "target": "no_retreat", "target_name_pattern": "Don't use recall", "count": 1, "hidden": true }
  ],
  "prerequisites": { 
    "min_level": 6,
    "required_items": ["lantern"]
  },
  "rewards": {
    "xp_base": 400,
    "xp_per_level": 50,
    "pearls_base": 200,
    "pearls_per_level": 30,
    "items": [
      { "item_id": "murk_survivor_badge", "quantity": 1 }
    ]
  },
  "repeatable": true,
  "cooldown_hours": 72,
  "zone": "the_murk",
  "giver_npc": "grizzled_veteran",
  "giver_location": "murk_entrance",
  "difficulty": "extreme",
  "tags": ["survival", "challenge"]
}
```

### Template 9: Gather & Craft
```json
{
  "template_id": "alchemist_ingredients",
  "type": "fetch",
  "title_pattern": "Alchemical Ingredients",
  "description_pattern": "The alchemist needs {count} {item_name} for a powerful brew. Find them in {zone_name}.",
  "flavor_text_pattern": "\"I'm working on something special, but I need fresh ingredients from {zone_name}.\"",
  "completion_text_pattern": "\"Perfect specimens! Here, take this potion I made - you've earned it.\"",
  "variables": {
    "item": ["bioluminescent_algae", "reef_coral_chunk", "abyssal_ink", "kelp_fiber"],
    "zone": ["kelp_forest", "coral_labyrinth", "abyssal_trenches"],
    "count_range": [3, 6]
  },
  "objectives": [
    { "type": "collect", "target": "{item}", "target_name_pattern": "Gather {item_name}", "count": -1 }
  ],
  "prerequisites": { "min_level": 2 },
  "rewards": {
    "xp_base": 75,
    "xp_per_level": 10,
    "pearls_base": 40,
    "pearls_per_level": 8,
    "items": [
      { "item_id": "random_potion", "quantity": 1 }
    ]
  },
  "repeatable": true,
  "daily_limit": 2,
  "cooldown_hours": 8,
  "zone": "kelp_forest",
  "giver_npc": "bubbles_the_alchemist",
  "giver_location": "alchemy_shop",
  "difficulty": "easy",
  "tags": ["gathering", "daily"]
}
```

### Template 10: World Event Quest
```json
{
  "template_id": "event_invasion_defense",
  "type": "kill",
  "title_pattern": "INVASION: Defend {location_name}!",
  "description_pattern": "⚠️ WORLD EVENT: {zone_name} is under attack! Slay {count} invaders before they overrun {location_name}!",
  "flavor_text_pattern": "\"Sound the alarm! The {creature_name} are attacking! Everyone to the defense!\"",
  "completion_text_pattern": "\"We held them off! The settlement is safe... for now.\"",
  "variables": {
    "creature": ["abyssal_horde", "pirate_raiders", "undead_swarm"],
    "zone": ["kelp_forest", "shipwreck_graveyard"],
    "location": ["briny_flagon", "wreckers_rest"],
    "count_range": [15, 30]
  },
  "objectives": [
    { "type": "kill", "target": "{creature}", "target_name_pattern": "Repel {creature_name}", "count": -1 }
  ],
  "prerequisites": { "min_level": 1 },
  "rewards": {
    "xp_base": 200,
    "xp_per_level": 25,
    "pearls_base": 100,
    "pearls_per_level": 15,
    "reputation": [
      { "faction": "defenders_guild", "change": 25 }
    ],
    "random_items": {
      "pool": ["invasion_trophy", "defender_medal", "rare_material"],
      "count": 1
    }
  },
  "time_limit_minutes": 15,
  "repeatable": false,
  "hidden": true,
  "zone": "kelp_forest",
  "giver_npc": "alarm_bell",
  "giver_location": "town_center",
  "difficulty": "hard",
  "tags": ["event", "combat", "special"]
}
```

---

## 7. API Endpoints

### 7.1 Quest Board API

#### GET /api/quests/board
List available quests at the current location's quest board.

**Request:**
```
GET /api/quests/board
Authorization: Bearer <api_key>
```

**Query Parameters:**
- `location` (optional): Override location (default: character's current location)
- `type` (optional): Filter by quest type
- `slot_type` (optional): Filter by slot type (daily, weekly, permanent, special)

**Response:**
```json
{
  "success": true,
  "board": {
    "board_id": "kelp_forest_board",
    "location": "briny_flagon",
    "last_refresh": "2026-02-03T00:00:00Z"
  },
  "quests": [
    {
      "instance_id": "inst_abc123",
      "template_id": "daily_kelp_cleanup",
      "title": "Giant Crab Cleanup",
      "description": "The Kelp Forest is overrun with Giant Crabs. Clear out 5 of them.",
      "giver": "Barnacle Bill",
      "giver_location": "briny_flagon",
      "slot_type": "daily",
      "difficulty": "easy",
      "level_req": 1,
      "expires_at": "2026-02-04T00:00:00Z",
      "objectives": [
        { "type": "kill", "target": "Giant Crab", "count": 5 }
      ],
      "rewards": {
        "xp": 60,
        "pearls": 30,
        "items": []
      },
      "can_accept": true,
      "cannot_accept_reason": null
    }
  ],
  "pagination": {
    "total": 12,
    "offset": 0,
    "limit": 20
  }
}
```

---

#### POST /api/quests/accept/:instance_id
Accept a quest from the board.

**Request:**
```
POST /api/quests/accept/inst_abc123
Authorization: Bearer <api_key>
```

**Response (Success):**
```json
{
  "success": true,
  "quest": {
    "quest_id": "q_xyz789",
    "title": "Giant Crab Cleanup",
    "description": "The Kelp Forest is overrun with Giant Crabs. Clear out 5 of them.",
    "status": "accepted",
    "objectives": [
      { "type": "kill", "target": "Giant Crab", "current": 0, "required": 5, "complete": false }
    ],
    "rewards": { "xp": 60, "pearls": 30, "items": [] },
    "accepted_at": "2026-02-03T15:30:00Z",
    "expires_at": null
  },
  "message": "Quest accepted: Giant Crab Cleanup"
}
```

**Response (Failure):**
```json
{
  "success": false,
  "error": "Already at maximum active quests (10)"
}
```

---

### 7.2 Active Quest API

#### GET /api/quests/active
Get all active quests for the current character.

**Request:**
```
GET /api/quests/active
Authorization: Bearer <api_key>
```

**Query Parameters:**
- `status` (optional): Filter by status (accepted, in_progress, completed)
- `zone` (optional): Filter by zone

**Response:**
```json
{
  "success": true,
  "active_count": 3,
  "max_active": 10,
  "quests": [
    {
      "quest_id": "q_xyz789",
      "template_id": "daily_kelp_cleanup",
      "title": "Giant Crab Cleanup",
      "status": "in_progress",
      "zone": "kelp_forest",
      "objectives": [
        { "type": "kill", "target": "Giant Crab", "current": 3, "required": 5, "complete": false }
      ],
      "rewards": { "xp": 60, "pearls": 30, "items": [] },
      "accepted_at": "2026-02-03T15:30:00Z",
      "expires_at": null,
      "can_turn_in": false,
      "turn_in_location": "briny_flagon"
    },
    {
      "quest_id": "q_abc456",
      "template_id": "escort_merchant",
      "title": "Safe Passage for Nervous Merchant",
      "status": "in_progress",
      "zone": "kelp_forest",
      "objectives": [
        { "type": "escort", "target": "Nervous Merchant", "current": 0, "required": 1, "complete": false },
        { "type": "interact", "target": "Reach Briny Flagon", "current": 0, "required": 1, "complete": false }
      ],
      "escort_npc": {
        "name": "Nervous Merchant",
        "hp": 20,
        "max_hp": 25
      },
      "rewards": { "xp": 125, "pearls": 100, "items": [] },
      "accepted_at": "2026-02-03T15:45:00Z",
      "expires_at": "2026-02-03T16:15:00Z",
      "time_remaining_seconds": 1200
    }
  ]
}
```

---

#### GET /api/quests/active/:quest_id
Get detailed info about a specific active quest.

**Request:**
```
GET /api/quests/active/q_xyz789
Authorization: Bearer <api_key>
```

**Response:**
```json
{
  "success": true,
  "quest": {
    "quest_id": "q_xyz789",
    "template_id": "daily_kelp_cleanup",
    "title": "Giant Crab Cleanup",
    "description": "The Kelp Forest is overrun with Giant Crabs. Clear out 5 of them.",
    "flavor_text": "\"Those Giant Crabs are getting bold. Thin their numbers for me.\"",
    "status": "in_progress",
    "zone": "kelp_forest",
    "difficulty": "easy",
    "objectives": [
      {
        "index": 0,
        "type": "kill",
        "target": "Giant Crab",
        "current": 3,
        "required": 5,
        "complete": false,
        "contributions": [
          { "target": "giant_crab", "timestamp": "2026-02-03T15:35:00Z", "location": "kelp_clearing" },
          { "target": "giant_crab", "timestamp": "2026-02-03T15:38:00Z", "location": "kelp_clearing" },
          { "target": "giant_crab", "timestamp": "2026-02-03T15:42:00Z", "location": "crab_den" }
        ]
      }
    ],
    "rewards": { "xp": 60, "pearls": 30, "items": [] },
    "giver_npc": "Barnacle Bill",
    "turn_in_location": "briny_flagon",
    "accepted_at": "2026-02-03T15:30:00Z",
    "started_at": "2026-02-03T15:35:00Z",
    "expires_at": null,
    "can_turn_in": false,
    "can_abandon": true
  }
}
```

---

### 7.3 Quest Progress API

#### POST /api/quests/progress/:quest_id
Report progress on a quest (primarily for non-automatic tracking).

**Request:**
```
POST /api/quests/progress/q_mystery123
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "objective_index": 0,
  "progress_type": "interact",
  "target": "clue_bloodstain",
  "location": "captains_quarters"
}
```

**Response:**
```json
{
  "success": true,
  "quest_id": "q_mystery123",
  "objective_updated": {
    "index": 0,
    "type": "interact",
    "target": "Find clues",
    "current": 2,
    "required": 4,
    "complete": false
  },
  "quest_status": "in_progress",
  "message": "Clue found: Bloodstained note",
  "quest_complete": false
}
```

**Note:** Kill progress is tracked automatically via combat resolution. This endpoint is for:
- Interaction objectives (examining objects, talking to NPCs)
- Manual overrides
- Debugging

---

### 7.4 Quest Completion API

#### POST /api/quests/complete/:quest_id
Turn in a completed quest.

**Request:**
```
POST /api/quests/complete/q_xyz789
Authorization: Bearer <api_key>
```

**Preconditions:**
- Quest status must be `completed`
- Character must be at turn-in location

**Response (Success):**
```json
{
  "success": true,
  "quest": {
    "quest_id": "q_xyz789",
    "title": "Giant Crab Cleanup",
    "status": "turned_in"
  },
  "rewards": {
    "xp_gained": 60,
    "pearls_gained": 30,
    "items_received": [],
    "reputation_changes": []
  },
  "level_up": false,
  "new_level": null,
  "unlocked_quests": [],
  "completion_text": "\"Good work! The waters are safer thanks to you.\"",
  "messages": [
    "📜 **Quest Complete: Giant Crab Cleanup**",
    "⭐ +60 XP",
    "🔮 +30 pearls"
  ]
}
```

**Response (Level Up):**
```json
{
  "success": true,
  "quest": { "..." },
  "rewards": { "..." },
  "level_up": true,
  "new_level": 3,
  "messages": [
    "📜 **Quest Complete: Giant Crab Cleanup**",
    "⭐ +60 XP",
    "🔮 +30 pearls",
    "🆙 **LEVEL UP!** You are now level 3!"
  ]
}
```

---

#### POST /api/quests/abandon/:quest_id
Abandon an active quest.

**Request:**
```
POST /api/quests/abandon/q_xyz789
Authorization: Bearer <api_key>
```

**Response:**
```json
{
  "success": true,
  "quest_id": "q_xyz789",
  "title": "Giant Crab Cleanup",
  "status": "abandoned",
  "cooldown_until": "2026-02-04T15:30:00Z",
  "message": "Quest abandoned. You can accept it again in 24 hours."
}
```

---

### 7.5 Quest History API

#### GET /api/quests/history
Get completed/failed quest history.

**Request:**
```
GET /api/quests/history
Authorization: Bearer <api_key>
```

**Query Parameters:**
- `outcome` (optional): Filter by outcome (completed, failed, abandoned)
- `template_id` (optional): Filter by template
- `limit` (optional): Max results (default: 50)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_completed": 47,
    "total_failed": 3,
    "total_abandoned": 5,
    "favorite_quest_type": "kill",
    "fastest_completion_seconds": 120
  },
  "history": [
    {
      "id": "hist_abc123",
      "template_id": "daily_kelp_cleanup",
      "title": "Kelp Lurker Cleanup",
      "outcome": "completed",
      "rewards_granted": { "xp": 60, "pearls": 30, "items": [] },
      "accepted_at": "2026-02-02T10:00:00Z",
      "completed_at": "2026-02-02T10:15:00Z",
      "duration_seconds": 900,
      "objectives_completed": 1,
      "objectives_total": 1
    }
  ],
  "pagination": {
    "total": 55,
    "offset": 0,
    "limit": 50
  }
}
```

---

## 8. Event Hooks

The quest engine emits events for integration with other systems:

```javascript
// Event types
const QuestEvents = {
  QUEST_ACCEPTED: 'quest:accepted',
  QUEST_PROGRESS: 'quest:progress',
  QUEST_OBJECTIVE_COMPLETE: 'quest:objective_complete',
  QUEST_COMPLETED: 'quest:completed',
  QUEST_TURNED_IN: 'quest:turned_in',
  QUEST_FAILED: 'quest:failed',
  QUEST_ABANDONED: 'quest:abandoned',
  BOARD_REFRESHED: 'quest:board_refreshed',
  ESCORT_NPC_DAMAGED: 'quest:escort_npc_damaged',
  ESCORT_NPC_DIED: 'quest:escort_npc_died'
};

// Example listener
questEngine.on(QuestEvents.QUEST_COMPLETED, (event) => {
  // Send WebSocket notification to client
  websocket.send(characterId, {
    type: 'quest_complete',
    quest: event.quest,
    canTurnIn: true
  });
  
  // Log for analytics
  analytics.track('quest_completed', {
    characterId: event.characterId,
    templateId: event.quest.template_id,
    duration: event.duration
  });
});
```

---

## 9. Edge Cases & Error Handling

### 9.1 Quest Acceptance Errors
| Error | HTTP Code | Message |
|-------|-----------|---------|
| Quest not found | 404 | "Quest not found or expired" |
| Level too low | 400 | "Requires level {n}" |
| Missing prerequisite | 400 | "Must complete '{quest}' first" |
| At max quests | 400 | "Already at maximum active quests ({n})" |
| Already active | 400 | "Quest already in progress" |
| On cooldown | 400 | "Quest available again in {time}" |
| Already completed (non-repeatable) | 400 | "Quest already completed" |

### 9.2 Progress Tracking Edge Cases
- **Kill credited to wrong zone**: Track zone at time of kill, not quest zone
- **Multiple quests benefit from same kill**: Credit all applicable quests
- **Player logs out mid-escort**: Escort NPC persists, timer pauses (or continues based on config)
- **Escort NPC dies while player offline**: Quest fails on next login check
- **Item collected but inventory full**: Item goes to overflow/mail system

### 9.3 Turn-in Edge Cases
- **Player not at turn-in location**: Return error with location hint
- **Quest expired after completion**: Still allow turn-in (grace period)
- **Rewards exceed inventory**: Pearls always granted, items overflow to mail
- **Level up during turn-in**: Process level up before checking for unlocks

### 9.4 Board Refresh Edge Cases
- **Player viewing stale board**: Include `last_refresh` timestamp, client can prompt reload
- **Quest accepted just before refresh**: Keep accepted, remove from board for others
- **All templates filtered out**: Show "No quests available at your level" message

---

## 10. Migration Path

### From Current System

The existing `QUESTS` object in `quests.js` will be migrated:

1. **Convert each quest to template format** (one-time script)
2. **Seed `quest_templates` table** with converted data
3. **Migrate `character_quests` to `active_quests`** (add new columns)
4. **Create board instances** for permanent quests
5. **Enable new endpoints** alongside existing ones (deprecation period)
6. **Remove old code** after verification

### Backwards Compatibility

- Keep existing `GET /api/quests` endpoint working during migration
- Map old `questId` to new `instance_id` or `quest_id`
- Preserve quest progress for in-flight quests

---

## 11. Future Considerations

### Not in v2.0 (Future Sprints)
- **Guild quests**: Shared progress across guild members
- **Bounty hunting**: PvP-style quests to hunt other players
- **Dynamic events**: World-state triggers for special quests
- **Seasonal content**: Halloween/holiday quest templates
- **Achievement integration**: Quest-based achievement unlocks
- **Voice lines**: Audio for NPC dialogue

### Performance Considerations
- Index all foreign keys and frequently-filtered columns
- Consider caching board instances (Redis)
- Batch progress updates during high-activity combat
- Archive old quest_history entries periodically

---

## Appendix A: Variable Interpolation

Pattern syntax for quest text:
- `{variable}` - Simple substitution
- `{variable_name}` - Display name lookup
- `{count}` - Numeric value
- `{count|plural:creature:creatures}` - Pluralization

Example:
```
"Slay {count} {creature_name|plural}"
→ "Slay 1 Giant Crab" or "Slay 5 Giant Crabs"
```

---

## Appendix B: Objective Type Reference

| Type | Trigger | Auto-tracked | Notes |
|------|---------|--------------|-------|
| `kill` | Combat victory | ✅ | Specific creature type |
| `kill_any` | Combat victory | ✅ | Any creature in zone |
| `collect` | Item pickup | ✅ | Specific item type |
| `deliver` | Arrival at NPC | ❌ | Requires explicit turn-in |
| `explore` | Room entry | ✅ | First visits only (configurable) |
| `interact` | Action command | ❌ | Examine/use/search |
| `talk` | Dialogue with NPC | ❌ | Specific NPC |
| `escort` | NPC alive at dest | ❌ | Complex state tracking |
| `survive` | Condition check | ✅ | No deaths/retreats |

---

*End of Specification*
