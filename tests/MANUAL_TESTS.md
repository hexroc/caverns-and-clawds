# Manual Test Scenarios - Combat System

These are step-by-step manual tests to verify all combat features work correctly.

## Prerequisites

1. Server running: `npm start`
2. Test character created (level 5 Rogue with henchman)
3. Access to all test zones

## Scenario 1: Basic Positioning & Movement

**Goal:** Verify range bands and movement work

1. Start combat in Kelp Forest
2. Observe initial positions (should show distance)
3. Use `move` action to change range band
4. Verify movement budget tracked (30ft base)
5. Use `dash` action
6. Verify movement doubles (60ft total)
7. Confirm position changes reflected in combat state

**Expected:**
- ✅ Positions displayed: "goblin (15 feet away)"
- ✅ Movement tracked: "25/30 feet used"
- ✅ Dash doubles movement to 60ft
- ✅ Can move before AND after action

## Scenario 2: Opportunity Attacks

**Goal:** Verify OA triggers when leaving melee

1. Start combat with enemy at melee range
2. Attempt to move away WITHOUT Disengage
3. **Expected:** Opportunity attack triggers
4. Take damage from OA
5. Next round, use Disengage action
6. Move away from melee
7. **Expected:** NO opportunity attack

**Expected:**
- ✅ OA triggers without Disengage
- ✅ OA is full attack roll vs AC
- ✅ Disengage prevents OA
- ✅ OA consumes enemy's reaction

## Scenario 3: Flanking

**Goal:** Verify flanking grants advantage

1. Start combat with henchman
2. Command henchman: "Flank that enemy"
3. Henchman positions opposite player
4. Attack the flanked enemy
5. **Expected:** Attack has advantage (roll 2d20, take higher)
6. Verify narration mentions flanking

**Expected:**
- ✅ Flanking detected when ally opposite
- ✅ Advantage granted to both player and henchman
- ✅ Narration shows advantage: "(rolled 15, 8 → 15)"

## Scenario 4: Cantrip Damage Scaling

**Goal:** Verify cantrips scale with level

**Test with level 1 character:**
1. Cast Fire Bolt
2. Damage should be 1d10

**Test with level 5 character:**
1. Cast Fire Bolt
2. Damage should be 2d10

**Test with level 11 character:**
1. Cast Fire Bolt
2. Damage should be 3d10

**Test with level 17 character:**
1. Cast Fire Bolt
2. Damage should be 4d10

**Expected:**
- ✅ Cantrips scale at 5th, 11th, 17th level
- ✅ No spell slot consumed (unlimited casts)

## Scenario 5: Spell Slots

**Goal:** Verify spell slots consumed and restored

1. Check character spell slots: `GET /api/character`
2. Level 3 Wizard should have: `{ 1: 4, 2: 2 }`
3. Cast Magic Missile (level 1)
4. Verify slots: `{ 1: 3, 2: 2 }`
5. Cast all level 1 slots (3 more casts)
6. Attempt to cast level 1 spell again
7. **Expected:** Error "No spell slots available"
8. Take long rest: `POST /api/character/rest`
9. Verify slots restored: `{ 1: 4, 2: 2 }`

**Expected:**
- ✅ Slots consumed on cast
- ✅ Can't cast with no slots
- ✅ Long rest restores all slots

## Scenario 6: Concentration

**Goal:** Verify concentration mechanics

1. Cast Bless (concentration, 1 minute)
2. Verify buff active: +1d4 to attacks/saves
3. Take 10 damage
4. CON save required: DC 10 (max of 10 or damage/2)
5. **If pass:** Bless continues
6. **If fail:** Bless ends immediately
7. Try to cast another concentration spell (Hex)
8. **Expected:** Bless ends when Hex cast

**Expected:**
- ✅ Concentration tracked
- ✅ CON save on damage
- ✅ Only 1 concentration spell active
- ✅ Casting new concentration spell ends old one

## Scenario 7: Death Saving Throws

**Goal:** Verify no instant death at 0 HP

1. Reduce character to 0 HP
2. **Expected:** Character falls unconscious, combat continues
3. Each turn, roll death save (d20)
4. 10+ = success, <10 = failure
5. Track successes/failures
6. **3 successes:** Character stabilized
7. **OR ally heals:** Character restored to consciousness
8. **OR 3 failures:** Character dies

**Test edge cases:**
- Nat 20 on death save → restore 1 HP
- Nat 1 on death save → 2 failures
- Damage at 0 HP → 1 failure
- Crit at 0 HP → 2 failures

**Expected:**
- ✅ No instant death
- ✅ Death saves tracked
- ✅ Stabilized at 3 successes
- ✅ Dead at 3 failures
- ✅ Healing restores consciousness

## Scenario 8: Sneak Attack

**Goal:** Verify Rogue Sneak Attack conditions

**Test 1: With Advantage**
1. Rogue uses Hide action, succeeds
2. Next attack has advantage
3. **Expected:** Sneak Attack damage added
4. Level 5 Rogue = +3d6 damage

**Test 2: With Ally Adjacent**
1. Henchman at melee with enemy
2. Rogue attacks same enemy
3. **Expected:** Sneak Attack damage added
4. No advantage required

**Test 3: With Disadvantage**
1. Rogue has disadvantage (poisoned)
2. Ally adjacent to enemy
3. **Expected:** NO Sneak Attack (disadvantage blocks it)

**Expected:**
- ✅ Sneak Attack with advantage
- ✅ Sneak Attack with ally adjacent
- ✅ NO Sneak Attack with disadvantage
- ✅ Damage scales with level (1d6 → 10d6)
- ✅ Only once per turn

## Scenario 9: Resistances/Immunities

**Goal:** Verify damage modifiers apply

**Test Resistance:**
1. Cast Fire Bolt (fire damage) at Fire-Resistant Enemy
2. Roll 10 fire damage
3. **Expected:** Enemy takes 5 damage (half)
4. Narration shows: "resists the flames, taking only 5 damage"

**Test Immunity:**
1. Cast Poison Spray at Undead (immune to poison)
2. **Expected:** Enemy takes 0 damage
3. Narration shows: "the poison has no effect on the undead creature"

**Test Vulnerability:**
1. Attack Skeleton (vulnerable to bludgeoning) with club
2. Roll 8 bludgeoning damage
3. **Expected:** Skeleton takes 16 damage (double)
4. Narration shows: "the bludgeoning force shatters bones, dealing 16 damage"

**Expected:**
- ✅ Resistance = half damage
- ✅ Immunity = zero damage
- ✅ Vulnerability = double damage
- ✅ Narration reflects damage modifiers

## Scenario 10: Reactions (Shield Spell)

**Goal:** Verify reaction system works

1. Enemy attacks Wizard
2. Attack roll: 16 vs AC 13 (would hit)
3. **Wizard has Shield prepared and slot available**
4. **Expected:** Option to cast Shield as reaction
5. Choose to cast Shield
6. AC becomes 18 (13 + 5)
7. Attack roll 16 vs AC 18 (now misses!)
8. **Expected:** Shield spell slot consumed
9. **Expected:** Reaction marked as used
10. Next attack this round: cannot use reaction

**Expected:**
- ✅ Reaction prompt when Shield could help
- ✅ AC increase applied immediately
- ✅ Can turn hit into miss
- ✅ Spell slot consumed
- ✅ Only 1 reaction per round

## Scenario 11: Henchman Commands

**Goal:** Verify command system

**Test Commands:**

1. **"Attack my target"**
   - Player targets goblin_1
   - Issue command
   - **Expected:** Henchman attacks goblin_1 (not goblin_2)

2. **"Defend me"**
   - Issue command
   - **Expected:** Henchman moves to melee with player
   - **Expected:** Henchman attacks threats to player

3. **"Flank"**
   - Player at melee with orc
   - Issue command
   - **Expected:** Henchman positions opposite player
   - **Expected:** Both get advantage

4. **"Hold position"**
   - Issue command
   - **Expected:** Henchman stays at current range band
   - **Expected:** Doesn't chase fleeing enemies

5. **"Stance: Aggressive"**
   - Issue command
   - **Expected:** Henchman prioritizes damage over defense
   - **Expected:** More attack actions, fewer Dodge actions

**Expected:**
- ✅ All commands execute correctly
- ✅ Henchman behavior changes based on command
- ✅ Commands persist until changed
- ✅ Smart positioning when commanded

## Scenario 12: Descriptive Narration

**Goal:** Verify narration quality

**Check for:**
1. **Distance annotations:** "(15 feet away)", "(melee range)", "(across the battlefield)"
2. **Attack roll display:** "(Attack: 12 vs AC 15)"
3. **Vivid descriptions:** Not "goblin attacks" but "the snarling goblin lunges forward with rusted scimitar..."
4. **Underwater atmosphere:** Kelp, currents, bubbles, bioluminescence mentioned
5. **Variety:** 10 attacks should have 10 different narrations
6. **Body parts:** Hits describe where (chest, shoulder, leg, etc.)
7. **Emotional state:** Enemies described as desperate, ferocious, confident, etc.

**Run 20 combat rounds, verify:**
- ✅ No repeated narration (or <10% repetition)
- ✅ Distances always shown
- ✅ Attack rolls always shown
- ✅ Environmental flavor present
- ✅ Reads like a D&D novel, not combat log

## Scenario 13: Full Boss Fight

**Goal:** Integration test of all systems

**Setup:**
- Level 5 Rogue + Level 4 Henchman (Fighter)
- vs Young Dragon (CR 10) in Shipwreck Graveyard

**Test Plan:**
1. Combat starts at far range (60 feet)
2. Player: Move to near range (30 feet)
3. Dragon: Breath weapon (DEX save)
4. Player: Fails save, takes damage, roll CON save for concentration (if active)
5. Henchman: Command "Attack my target", charges to melee
6. Player: Cast Scorching Ray (level 2), consume slot
7. Dragon: Attacks henchman at melee
8. Henchman: Reduced to 0 HP, makes death save
9. Player: Sneak Attack (advantage from hidden henchman position)
10. Continue until dragon dead or party wipes

**Verify throughout:**
- ✅ Positioning tracked correctly
- ✅ Movement rules enforced
- ✅ Spell slots consumed
- ✅ Concentration checks when damaged
- ✅ Death saves for henchman
- ✅ Sneak Attack applies correctly
- ✅ Dragon breath weapon works (save, damage, recharge)
- ✅ Reactions available and used
- ✅ Narration quality high
- ✅ Combat feels like D&D 5e

---

## Test Completion Checklist

After running all scenarios:

- [ ] Positioning system works
- [ ] Movement mechanics correct (30ft base, 60ft dashed)
- [ ] Opportunity attacks trigger correctly
- [ ] Flanking grants advantage
- [ ] All 20 cantrips work
- [ ] Cantrip scaling verified (5/11/17)
- [ ] 25+ level 1 spells work
- [ ] 20+ level 2 spells work
- [ ] Spell slots consume/restore
- [ ] Concentration maintains/breaks correctly
- [ ] Death saves replace instant death
- [ ] Sneak Attack conditions correct
- [ ] Resistances/immunities/vulnerabilities apply
- [ ] Reactions work (Shield, OA)
- [ ] Henchman commands execute
- [ ] Narration is descriptive and varied
- [ ] Full combat integration stable

**Sign-off:** _________________ Date: _________
