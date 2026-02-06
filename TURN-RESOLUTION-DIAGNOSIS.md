# 🔍 Turn Resolution Diagnosis
**Issue:** B-Rock reported problems with enemy turn resolution  
**Date:** 2026-02-06 1:15 PM PST

## Code Analysis

### Turn Flow (Normal Attack)
1. Player calls `/api/zone/combat/action` with `action: 'attack'`
2. `playerAction()` handles the attack
3. Calls `_advanceTurn(encounter, result)`
4. `_advanceTurn()` processes monster/henchman turns until player's turn

### Turn Flow (Wait Action)
1. Player calls `/api/zone/combat/action` with `action: 'wait'`
2. Calls `_processUntilPlayerTurn(char, encounter)`
3. Processes all non-player turns
4. Returns when player's turn

---

## Potential Issues Found

### Issue #1: Dead Monster Handling ❓
**Location:** `_advanceTurn()` line 2821

```javascript
const monster = monsters.find(m => m.id === turn.id);
if (!monster || !monster.alive) continue;  // Skip dead
```

**Analysis:** This looks CORRECT. Dead monsters are skipped.

**But:** The `continue` statement goes back to top of loop, which increments `currentTurn` again.

**Result:** 
- Turn 0: Player (just acted)
- Turn 1: Dead Monster → increment to 1, check, skip with continue
- Turn 2: Next entity → increment to 2, process
- ✅ Behaves correctly

---

### Issue #2: No Attack Selected ❓
**Location:** `_monsterAttack()` line 3188

```javascript
const attack = this._selectMonsterAttack(monster, template, char);
if (!attack) {
  return { message: `${monster.name} hesitates...`, playerDied: false };
}
```

**Analysis:** If `_selectMonsterAttack()` returns null, monster doesn't attack.

**Possible Causes:**
1. Monster has no attacks defined
2. All attacks are spells and monster is out of spell slots
3. Monster is out of range for all attacks
4. Tactical AI bug (see next issue)

---

### Issue #3: Tactical AI Range Logic ⚠️
**Location:** `_selectMonsterAttack()` (need to find this function)

**Question:** Does the tactical AI properly handle range-based attacks?

**Example Scenario:**
- Monster has melee + ranged attacks
- Player is at "far" range
- AI should choose ranged attack
- Bug: Might return null if range logic is broken

**Need to check:** `_selectMonsterAttack()` implementation

---

### Issue #4: Spell Slot Depletion 🔴
**Potential Issue:** Spellcasting monsters might run out of spell slots and then have NO attacks

**Example:**
- Ghost Captain has spell attacks
- Uses all spell slots
- Now has no attacks to use
- Returns "hesitates" every turn

**Need to check:**
1. Do spell-using monsters have melee fallback attacks?
2. Are spell slots being restored somewhere?
3. Do monsters regenerate slots between encounters?

---

### Issue #5: Henchman Turn Order 🤔
**Location:** Turn order construction

**Question:** When henchmen are added, are they inserted into turn order correctly?

**Scenario:**
- Player + 2 monsters in combat
- Turn order: [player, monster1, monster2]
- Player summons henchman mid-combat
- Is henchman added to turn order?
- Or does it only work for pre-existing henchmen?

---

## What B-Rock Might Be Seeing

**Symptom 1: "Monsters not attacking"**
- Likely cause: Spell slots depleted, no fallback attacks
- Or: Tactical AI returning null for some reason

**Symptom 2: "Turn order feels wrong"**
- Possible: Dead monsters causing weird pauses
- Or: Henchmen not getting turns

**Symptom 3: "Combat gets stuck"**
- Safety counter hitting 20 and breaking loop early?
- Check logs for safety counter warnings

---

## Diagnostic Steps

### Step 1: Check Monster Attack Data
```javascript
// For each monster in MONSTERS table:
// - Do they have attacks array?
// - Do spellcasters have melee fallbacks?
// - Are attack ranges defined properly?
```

### Step 2: Test Spell Slot Depletion
```javascript
// Create encounter with spellcasting monster
// Force monster to use all spell slots
// Check if it still attacks or just "hesitates"
```

### Step 3: Check _selectMonsterAttack Logic
```javascript
// Read the full function
// Look for conditions that return null
// Test with different monster types
```

### Step 4: Add Debug Logging
```javascript
// In _advanceTurn and _processUntilPlayerTurn:
console.log(`Turn ${currentTurn}: ${turn.type} (${turn.name || turn.id})`);
console.log(`Monster alive: ${monster?.alive}, HP: ${monster?.hp}`);
```

---

## Quick Fix (If Issue #4)

**If spellcasters run out of slots:**

```javascript
// In _selectMonsterAttack:
// Add fallback to basic attack if no spell available

if (!availableAttack && template.attacks.length > 0) {
  // Use first non-spell attack as fallback
  availableAttack = template.attacks.find(a => !a.saveDC);
}

if (!availableAttack) {
  // Ultimate fallback: improvised attack
  availableAttack = {
    name: 'Desperate Strike',
    hit: 2,
    damage: '1d4',
    range: 'melee'
  };
}
```

---

## Testing Plan

1. **Create test encounter** with:
   - 1 player
   - 1 regular monster (Crab)
   - 1 spellcasting monster (Ghost Captain)
   - 1 henchman

2. **Combat flow:**
   - Player attacks
   - Check if both monsters attack back
   - Check if henchman gets a turn
   - Repeat for 5 rounds

3. **Edge cases:**
   - Kill one monster mid-combat
   - Deplete ghost's spell slots
   - Check if combat still resolves correctly

---

## Next Steps

1. Find and read `_selectMonsterAttack()` function
2. Check monster attack definitions in MONSTERS table
3. Add debug logging to production
4. Get combat logs from B-Rock to see exact behavior

---

## Status

🔍 **Investigating** - Need more info about exact symptoms  
⏳ **Waiting** - Need B-Rock to describe what he's seeing

**Questions for B-Rock:**
1. Do monsters attack at all, or just some monsters?
2. Does it happen with specific monster types?
3. Is it random or consistent?
4. Does combat get stuck, or just feel weird?
