# Text-Based Mechanics Spec
**How Spells, Abilities, Skills & Henchmen Work Without Visuals**

---

## Core Philosophy

In text-based play, everything resolves through:
1. **Dice rolls** — d20 + modifiers vs DC/AC
2. **Narrative descriptions** — What happens, told dramatically
3. **Status effects** — Tracked conditions that affect future rolls
4. **Resource management** — Spell slots, HP, abilities per rest

No positioning. No hex grids. No visual ranges. Just **choices → rolls → outcomes**.

---

## 1. SPELLS IN TEXT

### Spell Resolution Flow

```
1. DECLARE: "Coral casts Fireball at the goblin group"
2. RESOURCE: Check spell slot available → Deduct slot
3. TARGET: DM determines who's affected (based on narrative positioning)
4. ROLL: Targets make saving throws
5. DAMAGE: Roll damage, apply to each target
6. NARRATE: Describe the result dramatically
```

### Example: Fireball

**Visual System (old):**
- Select 20ft radius on hex grid
- Calculate which hexes are affected
- Each entity in area rolls save

**Text System (new):**
```
> Coral casts Fireball (3rd level) at the goblin cluster!

💭 THINKING: "Three goblins grouped together near the pillar. 
   Fireball's radius should catch all of them without hitting 
   my allies who are behind me."

🎯 TARGETS: Goblin A, Goblin B, Goblin Shaman
   (DM determines targets based on narrative positioning)

🎲 Goblin A DEX save: 8 vs DC 14 — FAIL
🎲 Goblin B DEX save: 16 vs DC 14 — SUCCESS  
🎲 Shaman DEX save: 11 vs DC 14 — FAIL

🔥 Damage: 8d6 = 28 fire damage

RESULTS:
• Goblin A takes 28 damage → 💀 DEAD
• Goblin B takes 14 damage (half) → 6 HP remaining
• Goblin Shaman takes 28 damage → 💀 DEAD

"A bead of fire streaks from Coral's claw and detonates in 
the center of the goblin formation. The explosion engulfs 
them in roaring flames—two are incinerated instantly, but 
one dives behind a pillar, emerging singed but alive."
```

### Spell Categories & Text Handling

| Spell Type | How It Works in Text |
|------------|---------------------|
| **Single Target Damage** | Roll attack or force save, apply damage |
| **AoE Damage** | DM determines targets in "blast zone", all roll saves |
| **Healing** | Roll healing dice, restore HP, narrate |
| **Buff** | Apply condition/bonus, track duration in rounds |
| **Debuff** | Target saves, apply condition on fail, track duration |
| **Control** | Target saves, describe restricted actions |
| **Utility** | Describe effect narratively (light, detect magic, etc.) |

### Range in Text

Instead of hex distances, use **narrative zones**:

| Zone | Description | Who's There |
|------|-------------|-------------|
| **Melee** | Within arm's reach | Adjacent enemies, grappled targets |
| **Close** | Same room area, ~30ft | Most combatants in a skirmish |
| **Far** | Across the room, ~60ft | Archers, backline casters |
| **Distant** | Different area, 100ft+ | Snipers, fleeing enemies |

**Spell range translation:**
- Touch/Self → Must be in Melee
- 30ft → Close range
- 60ft → Close or Far
- 120ft+ → Anywhere in combat

### Concentration

Tracked as a status. When concentrating:
- Noted in character status: `[CONCENTRATING: Hold Person]`
- Taking damage triggers CON save (DC 10 or half damage)
- Casting another concentration spell ends current one

```
> Coral takes 15 damage from the ogre's club!

🎲 Concentration save: DC 10 (or 7, half damage)
   Roll: 12 + 3 CON = 15 — SUCCESS

Coral maintains concentration on Hold Person despite the blow!
```

---

## 2. ABILITIES IN TEXT

### Class Features

**Fighting Style (Fighter/Paladin):**
```
Passive bonus applied automatically:
• Defense: +1 AC (already in AC calculation)
• Dueling: +2 damage when wielding one weapon (added to damage rolls)
• Great Weapon: Reroll 1s and 2s on damage (noted, player chooses)
```

**Sneak Attack (Rogue):**
```
> Coral attacks the distracted goblin!

Sneak Attack conditions:
✓ Advantage on attack (enemy distracted by ally)
✓ Using finesse weapon (rapier)

🎲 Attack: 18 + 7 = 25 vs AC 13 — HIT!
🎲 Damage: 1d8+4 = 8 piercing
🎲 Sneak Attack: 3d6 = 11 extra damage
Total: 19 damage!

"Coral's blade finds the gap between the goblin's ribs as 
it turns to face Shell—a fatal mistake."
```

**Divine Smite (Paladin):**
```
> Faithful hits the undead knight!

🎲 Attack: 19 + 6 = 25 vs AC 18 — HIT!
🎲 Damage: 1d8+4 = 9 slashing

💡 Use Divine Smite? (expend spell slot for extra radiant damage)
   [YES - 1st level: +2d8] [YES - 2nd level: +3d8] [NO]

> Faithful chooses 2nd level smite!

🎲 Smite Damage: 3d8 = 15 radiant (+1d8 vs undead = 4)
Total: 28 damage!

"Holy light blazes along Faithful's blade as it cleaves 
through the death knight's corrupted armor!"
```

**Bardic Inspiration (Bard):**
```
> Reef Chanter uses Bardic Inspiration on Shell!

🎵 Bardic Inspiration die: d8
   Shell can add d8 to one attack, save, or ability check
   in the next 10 minutes.

Shell's status: [INSPIRED d8]

---

Later...

> Shell attacks the troll!

🎲 Attack: 11 + 5 = 16 vs AC 15... barely hits!

Or use Bardic Inspiration? [YES] [NO]

> Shell uses inspiration!
🎲 Inspiration: +4
Final attack: 20 — solid hit!
```

**Eldritch Invocations (Warlock):**
```
Passive abilities from pact:

• Agonizing Blast: Add CHA to Eldritch Blast damage
• Devil's Sight: See in magical darkness
• Mask of Many Faces: Cast Disguise Self at will

Applied automatically when relevant:

> Abyssal Pact casts Eldritch Blast!
🎲 Attack: 17 + 5 = 22 — HIT!
🎲 Damage: 1d10+4 (Agonizing Blast) = 11 force
```

### Racial Features

**Relentless Endurance (Spiny Lobster/Half-Orc):**
```
> Shell drops to 0 HP!

🦞 RELENTLESS ENDURANCE activates!
   Once per long rest, drop to 1 HP instead of 0.

Shell: 0 HP → 1 HP
"Shell's spiny carapace absorbs what should have been a 
killing blow. Battered but defiant, they refuse to fall!"
```

**Lucky (Squat Lobster/Halfling):**
```
> Squat rolls a natural 1 on attack!

🍀 LUCKY: Reroll the d20? [YES] [NO]

> Yes!
🎲 Reroll: 14 + 5 = 19 — HIT!

"At the last moment, a fortuitous current shifts the blade 
into the enemy's guard!"
```

**Breath Weapon (Reef Lobster/Dragonborn):**
```
> Reef uses Boiling Breath!

🔥 15ft cone of superheated water
   Targets in melee range: Goblin A, Goblin B

🎲 Goblin A DEX save: 9 vs DC 13 — FAIL (2d6 = 8 fire)
🎲 Goblin B DEX save: 15 vs DC 13 — SUCCESS (4 fire)

"Steam erupts from Reef's mandibles, scalding everything 
in front of them!"
```

---

## 3. SKILLS IN TEXT

### Skill Check Flow

```
1. Player declares action requiring skill
2. DM sets DC based on difficulty
3. Roll d20 + skill modifier
4. Compare to DC
5. Narrate success or failure
```

### Difficulty Classes

| Difficulty | DC | Example |
|------------|-----|---------|
| Trivial | 5 | Climb a ladder |
| Easy | 10 | Track fresh footprints |
| Medium | 15 | Pick a standard lock |
| Hard | 20 | Persuade a hostile guard |
| Very Hard | 25 | Recall obscure lore |
| Nearly Impossible | 30 | Convince a dragon to spare you |

### Skill Categories

**Combat-Adjacent Skills:**
```
STEALTH — Hide, sneak, ambush setup
> Coral attempts to sneak past the sleeping ogre
🎲 Stealth: 18 + 7 = 25 vs Ogre's Passive Perception (9)
SUCCESS — Coral slips by undetected

ATHLETICS — Climb, swim, grapple, shove
> Shell tries to grapple the fleeing cultist
🎲 Athletics: 14 + 5 = 19 vs Cultist's 12
SUCCESS — Shell pins the cultist to the ground

ACROBATICS — Dodge, balance, tumble
> Coral tries to tumble past the guards without provoking
🎲 Acrobatics: 16 + 6 = 22 vs DC 15
SUCCESS — Coral rolls between their legs gracefully
```

**Exploration Skills:**
```
PERCEPTION — Notice hidden things, spot ambush
> Party enters the treasure room. Passive Perception check.
Coral (PP 15): Notices the pressure plate near the chest
Shell (PP 12): Doesn't notice anything unusual

INVESTIGATION — Search deliberately, find clues
> Coral investigates the desk for hidden compartments
🎲 Investigation: 12 + 3 = 15 vs DC 15
SUCCESS — Finds a false bottom with a journal inside

SURVIVAL — Track, forage, navigate
> Party needs to track the cultists through the reef
🎲 Survival: 17 + 2 = 19 vs DC 12
SUCCESS — "The broken coral here... they went north."
```

**Social Skills:**
```
PERSUASION — Convince, negotiate, charm
> Faithful tries to convince the merchant to lower prices
🎲 Persuasion: 15 + 4 = 19 vs DC 15
SUCCESS — "You make a fair point. 10% off, final offer."

DECEPTION — Lie, bluff, disguise intent
> Coral claims to be a health inspector
🎲 Deception: 11 + 5 = 16 vs Insight 14
SUCCESS — The guard steps aside nervously

INTIMIDATION — Threaten, coerce, frighten
> Shell looms over the captured spy
🎲 Intimidation: 18 + 3 = 21 vs DC 15
SUCCESS — "I'll talk! I'll talk! Just don't hurt me!"

INSIGHT — Detect lies, read motives
> Is the merchant hiding something?
🎲 Insight: 14 + 2 = 16 vs Deception 12
SUCCESS — "He's lying. Watch his left claw—it twitches."
```

**Knowledge Skills:**
```
ARCANA — Magic lore, identify spells
> What school of magic is this trap?
🎲 Arcana: 19 + 5 = 24 vs DC 15
SUCCESS — "Abjuration. Touch it and it explodes."

HISTORY — Past events, ancient civilizations
> Do we recognize these ruins?
🎲 History: 13 + 2 = 15 vs DC 15
SUCCESS — "The Drowned Empire. They worshipped something... dark."

RELIGION — Divine lore, identify undead
> What kind of undead is this?
🎲 Religion: 16 + 4 = 20 vs DC 12
SUCCESS — "A revenant. It won't stop until it kills its target."

NATURE — Beasts, plants, weather
> Is this mushroom safe to eat?
🎲 Nature: 8 + 1 = 9 vs DC 10
FAIL — "Looks fine to me." (It's not fine)
```

### Contested Checks

When two characters oppose each other:

```
> Coral tries to hide, Goblin Scout searches

🎲 Coral Stealth: 17 + 7 = 24
🎲 Goblin Perception: 12 + 3 = 15

Coral wins! Remains hidden.
```

### Group Checks

When the whole party attempts something:

```
> Party tries to sneak through the guard post

🎲 Coral Stealth: 22 — Success
🎲 Shell Stealth: 8 — Fail  
🎲 Faithful Stealth: 14 — Success
🎲 Reef Stealth: 16 — Success

3/4 succeed = GROUP SUCCESS (majority rules)

"Shell's armor clinks against a pillar, but Coral quickly 
creates a distraction, allowing everyone to slip past."
```

---

## 4. HENCHMEN IN TEXT

### What Are Henchmen?

Companion characters that fight alongside the party. Gacha-style recruitment with rarity tiers.

### Henchman Stats (Simplified)

```
┌────────────────────────────────────────┐
│  BARNABY THE BRAVE                     │
│  ★★★☆☆ Rare Henchman                   │
├────────────────────────────────────────┤
│  Type: Tank          Level: 4          │
│  HP: 38/38           AC: 16            │
│  Attack: +5          Damage: 1d8+3     │
├────────────────────────────────────────┤
│  ABILITY: Shield Wall                  │
│  Once per combat, grant +2 AC to all   │
│  adjacent allies for 1 round.          │
├────────────────────────────────────────┤
│  PERSONALITY: "For glory!"             │
│  Rushes into battle first.             │
│  Will protect fallen allies.           │
└────────────────────────────────────────┘
```

### Henchman Rarity Tiers

| Tier | Stars | Pull Rate | Power Level |
|------|-------|-----------|-------------|
| Common | ★☆☆☆☆ | 50% | Basic abilities |
| Uncommon | ★★☆☆☆ | 30% | One special ability |
| Rare | ★★★☆☆ | 15% | Strong ability + personality |
| Epic | ★★★★☆ | 4% | Multiple abilities, awakening potential |
| Legendary | ★★★★★ | 1% | Unique abilities, full backstory |

### Henchman Actions in Combat

Henchmen act on their own turn, controlled by AI with personality-driven decisions:

```
=== ROUND 2 ===

> BARNABY's turn (Tank Henchman)

💭 AI DECISION: "Coral is wounded and being targeted by 
   two goblins. Protect the damage dealer."

ACTION: Move to intercept, use Shield Wall!

🛡️ SHIELD WALL activated!
   Coral gains +2 AC until Barnaby's next turn.

"Barnaby steps in front of Coral, shell-shield raised. 
'Not today, you scum!'"
```

### Henchman Behavior Types

| Type | Combat Priority | Personality |
|------|----------------|-------------|
| **Tank** | Protect lowest HP ally, draw attacks | Brave, protective |
| **DPS** | Attack highest-threat enemy | Aggressive, bloodthirsty |
| **Support** | Heal/buff allies, debuff enemies | Cautious, caring |
| **Ranged** | Stay back, focus fire | Calculating, patient |
| **Wildcard** | Random/chaotic choices | Unpredictable, fun |

### Henchman Dialogue in Combat

Henchmen have personality and speak during battle:

```
BARNABY (Tank):
- On taking hit: "Is that all you've got?!"
- On ally hurt: "I'll avenge you!"
- On kill: "Another one bites the reef!"
- On low HP: "Just... a scratch..."

SALLY (Support):
- On healing: "Hold still, this will sting."
- On buff: "May the currents guide your claw."
- On ally down: "No! Stay with me!"
- On victory: "We did it... barely."
```

### Henchman Abilities

**Active Abilities** (Once per combat/rest):
```
SHIELD WALL (Tank)
"Grant +2 AC to all allies within melee range for 1 round."

SNEAK ATTACK (DPS)
"Deal +2d6 damage when attacking with advantage."

HEALING SURGE (Support)
"Heal one ally for 2d8+WIS HP as a bonus action."

PINNING SHOT (Ranged)
"Target must make STR save or speed becomes 0."
```

**Passive Abilities** (Always active):
```
BODYGUARD (Tank)
"When adjacent ally is attacked, can use reaction to 
become the target instead."

OPPORTUNIST (DPS)
"Deal +1d6 damage against enemies below half HP."

ENCOURAGING PRESENCE (Support)
"Allies within 30ft get +1 to saving throws."
```

### Awakening (Max Level Henchmen)

Epic/Legendary henchmen can "awaken" at max level:

```
🌟 BARNABY HAS AWAKENED! 🌟

NEW ABILITY UNLOCKED:
UNBREAKABLE
"Once per long rest, when reduced to 0 HP, 
immediately regain 50% HP and gain immunity 
to the next attack."

Barnaby's eyes glow with ancient power. His shell 
seems harder, his resolve unshakeable.
```

---

## 5. REST & RESOURCES

### Short Rest (1 hour)

```
> Party takes a short rest

RESOURCES RECOVERED:
• Hit Dice: Each character can spend Hit Dice to heal
• Warlock spell slots: Fully restored
• Short rest abilities: Recharged

Shell spends 2 Hit Dice:
🎲 2d10 + 4 (CON×2) = 16 HP recovered
Shell: 22 → 38 HP

Barnaby uses Second Wind: +1d10+4 = 11 HP
```

### Long Rest (8 hours)

```
> Party takes a long rest

RESOURCES RECOVERED:
• HP: Fully restored
• Spell slots: Fully restored
• Hit Dice: Regain half max (rounded down)
• Daily abilities: Recharged
• Conditions: Most end

All characters restored to full HP.
Spell slots replenished.
Faithful regains 1 Channel Divinity.
Coral regains Relentless Endurance.
```

---

## 6. CONDITIONS IN TEXT

Conditions are status effects tracked on characters:

| Condition | Effect | Removed By |
|-----------|--------|------------|
| **Poisoned** | Disadvantage on attacks and ability checks | Lesser Restoration, time |
| **Frightened** | Disadvantage on attacks/checks while source visible, can't approach | End of fear effect |
| **Charmed** | Can't attack charmer, charmer has advantage on social checks | Damage from charmer |
| **Paralyzed** | Can't move or act, auto-fail STR/DEX saves, attacks have advantage | Spell ends |
| **Stunned** | Can't move or act, auto-fail STR/DEX saves | End of round |
| **Blinded** | Can't see, auto-fail sight checks, attacks have disadvantage | Cure, spell ends |
| **Prone** | Disadvantage on attacks, melee attacks against have advantage | Stand up (half movement) |
| **Grappled** | Speed 0, can attempt escape | Escape action or grappler incapacitated |
| **Restrained** | Speed 0, disadvantage on attacks and DEX saves, attacks against have advantage | Escape or effect ends |
| **Unconscious** | Incapacitated, prone, auto-fail STR/DEX saves, attacks have advantage and auto-crit in melee | Healing, stabilization |

### Condition Display

```
PARTY STATUS:
• Coral — 28/38 HP [POISONED 🟢]
• Shell — 15/50 HP [FRIGHTENED 😱] [PRONE]
• Faithful — 45/52 HP
• Barnaby — 20/38 HP [GRAPPLED]
```

---

## Summary: Text Resolution Principles

1. **Everything is a roll** — d20 + modifier vs DC
2. **DM determines targets** — Based on narrative, not grid
3. **Status effects are tracked** — Conditions affect future rolls
4. **Resources are managed** — Spell slots, abilities, HP
5. **AI reasoning is shown** — Why characters/henchmen act
6. **Narration brings it alive** — Every outcome is described dramatically

No hex grids. No visual targeting. Just **story + dice + consequences**.
