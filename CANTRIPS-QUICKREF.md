# Cantrips Quick Reference

## Usage in Combat

```javascript
const action = {
  type: 'cast_spell',
  options: {
    spell: 'fire_bolt',      // cantrip ID
    targetIndex: 0           // enemy index
  }
};

const result = combat.resolveCombatRound(combatState, action);
```

## All Available Cantrips

### Attack Roll Cantrips
- `fire_bolt` - 1d10 fire, 120ft
- `eldritch_blast` - 1d10 force, 120ft, multiple beams
- `produce_flame` - 1d8 fire, 30ft
- `ray_of_frost` - 1d8 cold, 60ft, slows target
- `shocking_grasp` - 1d8 lightning, touch, prevents reactions
- `chill_touch` - 1d8 necrotic, 120ft, prevents healing

### Saving Throw Cantrips
- `sacred_flame` - 1d8 radiant, DEX save, 60ft, ignores cover
- `vicious_mockery` - 1d4 psychic, WIS save, 60ft, disadvantage
- `acid_splash` - 1d6 acid, DEX save, 60ft, 2 targets
- `poison_spray` - 1d12 poison, CON save, 10ft

### Utility Cantrips
- `mage_hand` - Manipulate objects
- `light` - Create light source
- `prestidigitation` - Minor effects
- `mending` - Repair objects
- `guidance` - +1d4 to ability check
- `resistance` - +1d4 to save
- `thaumaturgy` - Divine effects
- `druidcraft` - Nature effects
- `minor_illusion` - Create illusion
- `blade_ward` - Resistance to physical damage

## Damage Scaling

All damage cantrips scale automatically:
- **Level 1-4:** Base damage (1d10)
- **Level 5-10:** 2x dice (2d10)
- **Level 11-16:** 3x dice (3d10)
- **Level 17-20:** 4x dice (4d10)

**Exception:** Eldritch Blast fires multiple beams instead

## Testing

```bash
# Test all cantrips
node test-cantrips.js

# Test combat integration
node test-combat-integration.js
```

## Code Location

- `src/spells/spell-utils.js` - Shared utilities
- `src/spells/cantrips.js` - All 20 cantrips
- `src/combat.js` - Integration (cast_spell action)
