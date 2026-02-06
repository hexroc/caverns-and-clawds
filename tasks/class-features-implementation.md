# Class Features Implementation Plan
**Date:** 2026-02-05 22:30 PST  
**Goal:** Implement all mechanical class features for 7 classes (Fighter, Rogue, Cleric, Wizard, Warlock, Paladin, Bard)

## ✅ Already Implemented
- **Rogue:** Cunning Action, Sneak Attack (all damage tiers)
- **All:** Spellcasting system (cantrips, level 1-2 spells, slots, concentration)
- **All:** ASI (ability score increases)
- **Fighter/Paladin:** Extra Attack

## 🔨 To Implement

### Fighter (6 features)
1. **Fighting Style** (Level 1) - Choose combat style
   - Defense (+1 AC with armor)
   - Dueling (+2 damage with one-handed weapon)
   - Great Weapon Fighting (reroll 1s/2s on damage)
   - Archery (+2 to ranged attacks)
   - Two-Weapon Fighting (add ability mod to off-hand)

2. **Second Wind** (Level 1) - Bonus action, heal 1d10 + fighter level, 1/short rest

3. **Action Surge** (Level 2) - Take extra action, 1/short rest

4. **Martial Archetype** (Level 3) - Subclass placeholder

### Rogue (4 features)
1. **Expertise** (Level 1) - Double proficiency on 2 skills

2. **Thieves' Cant** (Level 1) - Flavor only (no mechanical implementation needed)

3. **Uncanny Dodge** (Level 5) - Reaction to halve damage when hit

4. **Roguish Archetype** (Level 3) - Subclass placeholder

### Cleric (3 features)
1. **Divine Domain** (Level 1) - Subclass placeholder + domain spells

2. **Channel Divinity: Turn Undead** (Level 2) - WIS save or flee for 1 minute

3. **Destroy Undead** (Level 5) - Auto-destroy undead CR 1/2 or lower

### Wizard (2 features)
1. **Arcane Recovery** (Level 1) - Short rest, recover spell slots = INT mod

2. **Arcane Tradition** (Level 2) - Subclass placeholder

### Warlock (3 features)
1. **Eldritch Invocations** (Level 2) - Choose 2 invocations
   - Agonizing Blast (add CHA to Eldritch Blast damage)
   - Armor of Shadows (mage armor at will)
   - Devil's Sight (see in magical darkness 120ft)
   - Eldritch Sight (detect magic at will)

2. **Pact Boon** (Level 3) - Choose pact type
   - Pact of the Blade (summon weapon)
   - Pact of the Chain (improved familiar)
   - Pact of the Tome (extra cantrips)

3. **Eldritch Patron** (Level 1) - Subclass placeholder

### Paladin (5 features)
1. **Divine Sense** (Level 1) - Detect celestial/fiend/undead within 60ft, CHA mod uses/long rest

2. **Lay on Hands** (Level 1) - Heal pool = paladin level × 5, can cure disease

3. **Fighting Style** (Level 2) - Same as Fighter

4. **Divine Smite** (Level 2) - Spend spell slot for extra radiant damage on hit
   - Level 1 slot: 2d8 radiant
   - Level 2 slot: 3d8 radiant
   - +1d8 vs undead/fiend

5. **Sacred Oath** (Level 3) - Subclass placeholder

### Bard (5 features)
1. **Bardic Inspiration** (Level 1) - Give ally d6 (d8 at 5), CHA mod uses/long rest

2. **Jack of All Trades** (Level 2) - Add half proficiency to non-proficient ability checks

3. **Song of Rest** (Level 2) - During short rest, allies heal extra d6 (d8 at 9)

4. **Font of Inspiration** (Level 5) - Regain Bardic Inspiration on short rest

5. **Bard College** (Level 3) - Subclass placeholder

## 📁 File Structure

### New Files to Create:
```
src/class-features/
  fighter.js          - Fighting styles, Second Wind, Action Surge
  rogue.js            - Expertise, Uncanny Dodge
  cleric.js           - Turn Undead, Destroy Undead, domain spells
  wizard.js           - Arcane Recovery
  warlock.js          - Invocations, Pact Boons
  paladin.js          - Divine Sense, Lay on Hands, Divine Smite
  bard.js             - Bardic Inspiration, Jack of All Trades, Song of Rest
  index.js            - Unified exports
```

### Files to Modify:
- `src/combat.js` - Integrate class features into combat resolver
- `src/character.js` - Add feature application on level-up
- `src/encounters.js` - Apply features in combat flow

## 🎯 Implementation Order

### Phase 1: Combat-Critical Features (HIGH IMPACT)
1. **Divine Smite** (Paladin) - Extra burst damage
2. **Action Surge** (Fighter) - Extra action
3. **Bardic Inspiration** (Bard) - Ally buff
4. **Fighting Styles** (Fighter/Paladin) - Passive combat bonuses
5. **Uncanny Dodge** (Rogue) - Damage reduction

### Phase 2: Resource Management
6. **Lay on Hands** (Paladin) - Healing pool
7. **Second Wind** (Fighter) - Self-heal
8. **Arcane Recovery** (Wizard) - Spell slot recovery
9. **Divine Sense** (Paladin) - Detection ability

### Phase 3: Passive Bonuses
10. **Expertise** (Rogue) - Skill bonus
11. **Jack of All Trades** (Bard) - Skill bonus
12. **Song of Rest** (Bard) - Short rest bonus

### Phase 4: Advanced Features
13. **Turn Undead** (Cleric) - Control undead
14. **Destroy Undead** (Cleric) - Auto-kill low CR
15. **Eldritch Invocations** (Warlock) - Customization
16. **Pact Boons** (Warlock) - Pact choice

### Phase 5: Subclass Placeholders
17. Implement placeholder subclass system

## 🧪 Testing Strategy

For each feature, create test in `tests/class-features/`:
- Unit test (feature works in isolation)
- Integration test (feature works in combat)
- Edge case test (restrictions, once-per-rest, etc.)

## ⏱️ Time Estimate

- **Phase 1:** 2-3 hours (high-impact combat features)
- **Phase 2:** 1-2 hours (resource management)
- **Phase 3:** 1 hour (passive bonuses)
- **Phase 4:** 2-3 hours (complex features)
- **Phase 5:** 1 hour (subclass system)

**Total:** ~8-10 hours of focused work

## 🚀 Success Criteria

- ✅ All 31 features mechanically functional
- ✅ Combat resolver uses class features appropriately
- ✅ Character sheet displays active features + uses remaining
- ✅ Short/long rest properly restores limited-use features
- ✅ Test suite passes for all classes
- ✅ No breaking changes to existing systems

---

**Starting Phase 1 now...**
