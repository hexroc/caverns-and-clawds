# Monster Abilities & Spells Implementation Plan

## Goal
Make monsters use their full stat sheets - spells, abilities, resistances, and tactical AI.

## Current State
- Monsters have full stat blocks defined (stats, attacks, spells, abilities)
- Combat AI only uses `attacks[0]` - ignores everything else
- No spell usage, no ability activation, resistances not applied

## Implementation Steps

### 1. Monster Attack Selection (encounters.js `_monsterAttack`)
**Current:** Always uses `attacks[0]`
**New:** Choose tactically based on:
- Range to target
- Spell slots available
- HP remaining (desperate measures)
- Monster AI type (aggressive/ranged/tactical)

**Logic:**
```javascript
// If spellcaster with slots, prefer spells at range
if (template.spellcaster && hasSpellSlots && range > 2) {
  useSpell();
}
// If ranged attacker, keep distance
else if (template.preferRanged && range >= template.preferredRange) {
  useRangedAttack();
}
// Otherwise melee
else {
  useMeleeAttack();
}
```

### 2. Spell Slot Tracking
**Add to encounter state:**
```javascript
monster.spellSlots = { 1: 2, 2: 1 }; // Track per monster instance
```

**Restore on long rest** (if monster flees/escapes)

### 3. Apply Resistances/Immunities
**When damage is dealt to monster:**
```javascript
if (template.resistances?.includes(damageType)) {
  damage = Math.floor(damage / 2);
}
if (template.immunities?.includes(damageType)) {
  damage = 0;
  message += " (IMMUNE!)";
}
```

### 4. Special Ability Triggers
**Ghost Captain - Horrifying Visage:**
- Trigger when HP < 50%
- WIS save DC 13 or frightened
- AOE 30ft (all party members)

**Swarm - Half Damage Below Half HP:**
- Automatic when swarm.hp < swarm.maxHp / 2

**Kelp Lurker - Grapple:**
- On Constrict hit, add grappled condition

### 5. Tactical Positioning
**Range band awareness:**
- Ranged monsters stay at `preferredRange`
- Move back if player closes distance
- Melee monsters close to range 1

## Files to Modify
1. `src/encounters.js` - `_monsterAttack()`, damage application
2. `src/monsters.js` - Verify all templates have proper data
3. `src/combat.js` - If resistances need global application

## Testing
- Fight Voltaic Eel → should use Lightning Bolt spell
- Fight Ghost Captain → should trigger Horrifying Visage
- Fight swarm at low HP → damage should halve
- Hit resistant monster → damage reduced

## Success Criteria
- [ ] Spellcaster monsters use spells
- [ ] Resistances/immunities work
- [ ] Special abilities trigger
- [ ] Ranged monsters use ranged attacks
- [ ] Multiple attacks get used intelligently
