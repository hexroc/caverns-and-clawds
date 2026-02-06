# Combat System Test Suite

This directory contains comprehensive tests for the combat overhaul.

## Test Structure

```
tests/
├── combat/          # Core combat mechanics
├── spells/          # Spell system tests
├── mechanics/       # 5e mechanics (death saves, etc.)
├── henchmen/        # Henchman command system
└── integration/     # Full combat scenarios
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific category
npm test tests/combat/
npm test tests/spells/

# Run single test file
npm test tests/combat/test-positioning.js
```

## Test Categories

### Combat Tests
- `test-positioning.js` - Range band system
- `test-movement.js` - 5e movement mechanics
- `test-opportunity-attacks.js` - OA triggers
- `test-flanking.js` - Flanking advantage

### Spell Tests
- `test-cantrips.js` - All 20 cantrips
- `test-level1.js` - Level 1 spells
- `test-level2.js` - Level 2 spells
- `test-spell-slots.js` - Slot consumption/restoration
- `test-concentration.js` - Concentration mechanics

### Mechanics Tests
- `test-death-saves.js` - Death saving throws
- `test-sneak-attack.js` - Rogue Sneak Attack
- `test-resistances.js` - Damage resistances/immunities
- `test-reactions.js` - Reaction system

### Henchmen Tests
- `test-commands.js` - Command system
- `test-ai-behavior.js` - AI response to commands

### Integration Tests
- `test-full-combat.js` - Complete combat scenario
- `test-boss-fight.js` - Boss encounter
- `test-party-combat.js` - Player + henchman coordination

## Manual Testing Checklist

See `MANUAL_TESTS.md` for step-by-step manual test scenarios.

## Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: All major flows
- Manual tests: All user-facing features

## Test Data

Test fixtures and mock data in `fixtures/`:
- `characters.json` - Test characters (levels 1-20)
- `monsters.json` - Test monsters (all CRs)
- `spells.json` - Spell test cases
- `combat-scenarios.json` - Predefined encounters
