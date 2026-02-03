# Tactical Combat System Overhaul

**Completed: 2025-01-26**

## Summary

This document describes the comprehensive overhaul of the Caverns & Clawds tactical hex-grid combat system to support D&D 5e accurate weapon and spell ranges, improved visual feedback for spectators, and smarter AI behavior.

---

## 1. Weapon System (`src/weapons.js`)

### Features
- **41 weapons** with accurate D&D 5e ranges
- Full weapon property system: finesse, heavy, light, thrown, two-handed, versatile, reach
- Range categories:
  - **Melee** (1 hex = 5ft) - swords, axes, maces
  - **Reach** (2 hexes = 10ft) - spears, pikes, glaives, halberds, whips
  - **Ranged** (variable) - bows, crossbows with normal/long range

### Range Checking
```javascript
const { checkWeaponRange, getWeapon } = require('./weapons');

const longbow = getWeapon('longbow');
checkWeaponRange(longbow, 10);  // { inRange: true, disadvantage: false, rangeType: 'ranged' }
checkWeaponRange(longbow, 50);  // { inRange: true, disadvantage: true, rangeType: 'ranged-long' }
checkWeaponRange(longbow, 150); // { inRange: false, ... }
```

### Weapon Properties
- **finesse** - Can use DEX instead of STR
- **heavy** - Small creatures have disadvantage
- **light** - Two-weapon fighting
- **reach** - +5ft (1 hex) to melee range
- **thrown** - Can be thrown as ranged attack
- **versatile** - One or two-handed with different damage

---

## 2. Spell System (`src/spells.js`)

### Features
- **22 spells** from cantrips to 5th level
- Range constants: Touch (1), Self (0), 30ft (6 hexes), 60ft (12), etc.
- Area effect shapes: SINGLE, CONE, SPHERE, CUBE, LINE, CYLINDER, SELF_RADIUS

### Sample Spells
| Spell | Level | Range | Area | Damage |
|-------|-------|-------|------|--------|
| Fire Bolt | 0 | 120ft (24) | Single | 1d10 fire |
| Burning Hands | 1 | Self | 15ft cone | 3d6 fire |
| Fireball | 3 | 150ft (30) | 20ft sphere | 8d6 fire |
| Lightning Bolt | 3 | Self | 100ft line | 8d6 lightning |
| Cone of Cold | 5 | Self | 60ft cone | 8d8 cold |

### Spell Casting in Combat
```javascript
// Cast a spell
combat.action(casterId, 'cast', {
  spellId: 'fireball',
  targetHex: { q: 5, r: 3 },
  slotLevel: 3
});
```

---

## 3. AI Behavior System

### Behavior Types
- **AGGRESSIVE** - Close distance, attack in melee
- **RANGED** - Maintain distance, kite melee enemies
- **SUPPORT** - Heal/buff allies, stay back
- **AMBUSHER** - Hide, attack with advantage
- **DEFENDER** - Protect allies, control area
- **BERSERKER** - Rush nearest enemy, ignore tactics

### Smart Target Selection
The AI now scores targets based on:
- HP percentage (prefer finishing low HP targets)
- Distance (prefer closer targets)
- Spellcaster status (prioritize high-threat casters)
- Range penalties (avoid disadvantage from long range)

### Ranged AI Kiting
Ranged units now:
1. Check if melee enemies are within 2 hexes
2. Move away before attacking if threatened
3. Maintain ideal range (60% of max range)
4. Use thrown weapons when appropriate

---

## 4. Visual Feedback (theater.js)

### Attack Animations
- **Melee** - Orange streak with impact flash
- **Ranged** - Blue projectile trail with arrow
- **Thrown** - Gray dashed trail with dagger

### Spell Effects
- **Fire** - Orange/yellow gradient with rising particles
- **Ice** - Blue crystals with frost burst
- **Lightning** - Jagged bolts with flash
- **Healing** - Green sparkles rising
- **Necrotic** - Purple tendrils with dark core
- **Magic Missile** - Purple seeking projectiles

### Damage Numbers
Color-coded by damage type:
- Physical (slashing/piercing/bludgeoning): Red
- Fire: Orange
- Cold: Blue  
- Lightning: Yellow
- Thunder: Purple
- Acid: Green
- Poison: Lime
- Force: Pink
- Necrotic: Dark purple
- Radiant: Gold
- Psychic: Violet

### Range Indicators
When targeting:
- Green circle: Normal range (no disadvantage)
- Yellow circle: Long range (disadvantage)

---

## 5. New Monsters

### Sahuagin Crossbowman (CR 1/2)
- Ranged attacker with light crossbow (80/320 ft)
- Kiting AI behavior
- Falls back to claws in melee

### Deep Archer (CR 2)
- Spectral longbow (150/600 ft necrotic damage)
- Incorporeal movement
- Extreme range kiting

### Voltaic Eel (CR 2)
- Spellcaster with lightning bolt
- Can bite in melee or zap from range
- AI prefers staying at range

---

## 6. Testing

### Unit Test Results
```
✅ All modules loaded successfully
AI Behaviors: AGGRESSIVE, RANGED, SUPPORT, AMBUSHER, DEFENDER, BERSERKER
Weapons count: 41
Spells count: 22
Monsters count: 19

Longbow range test:
  - At 10 hexes: inRange=true, disadvantage=false
  - At 50 hexes: inRange=true, disadvantage=true
  - At 150 hexes: inRange=false
```

### Mixed Encounter Testing
Added mixed composition encounters to capstone.js:
- Floor 1: Sahuagin crossbowman + Giant crabs
- Floor 2: Deep archer + Sahuagin + Drowned sailor
- Floor 3: Spellcasting eel + Deep archer

---

## API Changes

### Combatant Data (addCombatant)
New fields:
```javascript
{
  weapon: 'longsword',        // Weapon ID from weapons.js
  weaponData: {...},          // Auto-populated weapon data
  preferRanged: false,        // AI preference
  aiBehavior: 'aggressive',   // AI behavior type
  preferredRange: null,       // Ideal distance for AI
  spellcaster: false,         // Has spells?
  spells: [],                 // Spell IDs known
  spellSlots: {},             // { 1: 4, 2: 3, ... }
  spellcastingMod: 0,         // Spell attack modifier
  cantrips: []                // Cantrips known
}
```

### Attack Action
```javascript
combat.action(id, 'attack', {
  targetId: 'enemy1',
  useThrown: false,      // Force thrown attack
  preferRanged: false    // Prefer ranged over melee
});
```

### Cast Action
```javascript
combat.action(id, 'cast', {
  spellId: 'fireball',
  targetHex: { q: 5, r: 3 },
  targetId: 'enemy1',    // Alternative to targetHex
  slotLevel: 3           // For upcasting
});
```

---

## Files Modified

1. `src/weapons.js` - NEW - Weapon database
2. `src/spells.js` - NEW - Spell database
3. `src/tactical-combat.js` - AI overhaul, weapon/spell integration
4. `src/hex-grid.js` - Added getHexesInRange
5. `src/monsters.js` - New ranged monsters, AI behavior data
6. `src/capstone.js` - Mixed encounter compositions
7. `public/theater.js` - Visual effects overhaul

---

## Future Enhancements

1. **Cover system** - Half/full cover AC bonuses
2. **Flanking** - Advantage when attacking from opposite sides
3. **Opportunity attacks** - Improved with reach weapon support
4. **Spell concentration** - Track concentration spells
5. **Multiattack** - Support for multiple attacks per turn
6. **Legendary actions** - Boss legendary action system
