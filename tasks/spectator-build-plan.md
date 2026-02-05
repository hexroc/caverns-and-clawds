# Spectator Mode Build Plan 🎭

## Feature 1: Race-Specific Paperdoll Art (CSS/SVG)
**Goal:** Each of the 10 lobster races gets unique visual art in the character sheet panel.

### Races & Visual Identity:
| Race | Colors | Visual Traits |
|------|--------|---------------|
| American | Red-brown, classic | Big symmetrical claws, thick shell |
| European | Blue, elegant | Sleek body, blue-purple tones, magical shimmer |
| Slipper | Sandy/tan, flat | Wide flat body, no visible claws, plate-like shell |
| Squat | Orange/yellow, small | Compact body, big eyes, curled tail |
| Spiny | Orange-red, spiky | Long antennae, spines along body, no big claws |
| Reef | Rainbow/tropical | Vibrant multi-color, coral patterns, small |
| Pistol | Green/brown, asymmetric | One HUGE claw, one tiny, compact body |
| Calico | Mottled orange/black/white | Patchwork pattern, elegant posture |
| Ghost | White/translucent | See-through shell, faint blue glow, ethereal |
| Split | Two-toned (half red/half blue) | Chimeric split down middle, mismatched claws |

### Implementation:
- Pure CSS art (no external images needed)
- Each race is a `.lobster-{race}` CSS class
- Base lobster body shape shared, colors/features vary
- Equipment overlays (weapon glow, armor outline) as future enhancement
- Size: ~120x120px in the character panel

---

## Feature 2: Combat Play-by-Play 🗡️
**Goal:** When watching an agent in combat, show immersive blow-by-blow narration.

### What to capture (server-side):
- Attack rolls: "Crusher swings their greataxe — rolls 17 vs AC 13... HIT!"
- Damage: "8 slashing damage! The Giant Crab staggers!"
- Misses: "The crab snaps at Bubbles — rolls 7 vs AC 16... MISS!"
- Spells: "Coral channels divine energy — Cure Wounds! Heals 6 HP!"
- Deaths: "The Sea Urchin crumbles, its spines falling limp."
- Player death: "Crusher falls... the ocean claims another soul."
- Critical hits: "⚡ CRITICAL HIT! Double damage!"
- Status effects: "Poisoned! -2 to attacks for 3 rounds."

### Implementation:
1. **Server: Enhanced combat logging** — Modify `src/combat.js` to emit detailed combat events to activity tracker
2. **API: Combat log endpoint** — `/api/spectate/combat/:characterId` returns recent combat events
3. **Frontend: Combat feed** — When selected agent is in combat, switch activity panel to combat mode with dramatic narration, colored by event type

### Narration Style:
- Dramatic, D&D-flavored prose
- Color-coded: green=heal, red=damage taken, orange=damage dealt, yellow=crit, gray=miss
- Typewriter effect for new events

---

## Feature 3: Agent World Map 🗺️
**Goal:** Visual map showing all zones and where each agent currently is.

### World Layout:
```
                    [Tide Temple]
                         |
[Kelp Forest] — [Briny Flagon] — [Pearl Market]
                    |         \
              [Colosseum]    [Driftwood Docks]
                                    |
                            [Wrecker's Rest]
                                    |
                          [Shipwreck Graveyard]
```

### Implementation:
- CSS/canvas rendered map with zone nodes and connections
- Each zone is a clickable node showing zone name
- Agent avatars (tiny lobster dots with race colors) shown at their current location
- Hover shows agent name + stats
- Click zone to filter activity feed to that location
- Animated agent movement (dot slides from zone to zone)
- Zone danger level indicated by border color (safe=green, dangerous=red)

### API:
- `/api/spectate/map` — Returns all zones with connections + all agent positions

---

## Task Assignment

### Sub-Agent 1: Paperdoll CSS Art
- Create all 10 race lobster CSS art pieces
- Integrate into spectate.html character panel
- Test all races render correctly

### Sub-Agent 2: Combat Play-by-Play
- Modify combat.js for detailed event logging
- Create combat log API endpoint
- Build combat narration frontend with color coding

### Sub-Agent 3: World Map
- Create map data endpoint
- Build interactive CSS/canvas map
- Add agent position dots with live updates

---

## Constraints
- **Local only** — no production deploys
- **No external dependencies** — pure CSS/JS, no libraries
- **Polling-based** — no WebSockets (keep it stable)
- **Server: localhost:3000**
