/**
 * Caverns & Clawds - Spell Narration
 * Descriptive narration for spell casting, effects, and magical combat
 */

const { formatDistanceFromBand, getEnvironmentalFlourish } = require('./environmental');
const { getEmotionalState } = require('./combat-narration');

// ============================================================================
// CASTING GESTURES & INCANTATIONS
// ============================================================================

const CASTING_GESTURES = {
  somatic: [
    'weaves intricate patterns with their claws',
    'traces arcane symbols in the water',
    'makes sharp, ritualistic gestures',
    'channels energy through sweeping motions',
    'forms complex hand signs',
    'draws power through practiced movements',
    'executes a precise casting stance'
  ],
  verbal: [
    'intones words of power',
    'chants an ancient incantation',
    'speaks syllables that ripple reality',
    'utters forbidden phrases',
    'recites arcane verses',
    'invokes primordial forces',
    'calls upon cosmic energies'
  ],
  material: [
    'crushes a component between their claws',
    'releases a glowing reagent into the water',
    'channels power through a focus crystal',
    'scatters enchanted dust that glimmers',
    'activates a runic talisman',
    'consumes a prepared alchemical mixture'
  ]
};

function getCastingGesture() {
  const types = ['somatic', 'verbal', 'material'];
  const type = types[Math.floor(Math.random() * types.length)];
  const gestures = CASTING_GESTURES[type];
  return gestures[Math.floor(Math.random() * gestures.length)];
}

// ============================================================================
// SPELL VISUAL EFFECTS BY DAMAGE TYPE
// ============================================================================

const SPELL_EFFECTS = {
  fire: {
    cast: [
      'flames erupt from their outstretched claw, boiling the surrounding water',
      'a sphere of superheated plasma materializes, steam billowing',
      'fire bursts forth impossibly, burning even underwater',
      'thermal vents of magical flame spiral outward',
      'white-hot energy coalesces into searing inferno'
    ],
    impact: [
      'the flames EXPLODE on contact, superheating water to steam',
      'fire washes over {target}, scales blackening and blistering',
      'the thermal blast SEARS {target}, cooking flesh instantly',
      'heat beyond nature INCINERATES {target}\'s {bodypart}',
      'magical flames ENGULF {target} in an underwater inferno'
    ],
    miss: [
      'the fire streaks past {target}, dissipating harmlessly',
      'steam and bubbles mark where the flames narrowly missed',
      'the spell detonates against rocks, missing {target} entirely',
      '{target} dives beneath the flames, which pass overhead harmlessly'
    ]
  },
  
  cold: {
    cast: [
      'frost crystallizes in the water around their claw',
      'absolute zero radiates outward in a visible wave',
      'ice forms from nothing, defying the laws of nature',
      'the water itself begins to freeze in spreading patterns',
      'rime and frost appear on every surface as warmth flees'
    ],
    impact: [
      'ice crystals form INSTANTLY on {target}, freezing them solid',
      'the cold SHATTERS {target}\'s {bodypart}, tissue crystallizing',
      'frost spreads across {target}\'s body in deadly patterns',
      'numbing cold PENETRATES to {target}\'s core, organs freezing',
      'the spell turns {target}\'s {bodypart} brittle with ice'
    ],
    miss: [
      'the freezing ray passes inches from {target}, who feels the chill',
      'ice forms on nearby rocks as the spell misses its mark',
      'the cold snap affects only water, leaving {target} unharmed',
      '{target} twists away from the killing frost just in time'
    ]
  },
  
  lightning: {
    cast: [
      'electricity arcs between their claws, crackling with power',
      'a sphere of pure lightning forms, humming with lethal voltage',
      'thunder rumbles as electrical energy builds to critical mass',
      'static discharge makes their shell glow with St. Elmo\'s fire',
      'the water conducts raw voltage, sparking and popping'
    ],
    impact: [
      'lightning BLASTS through {target}, muscles seizing violently',
      'electrical current COURSES through {target}\'s body, nerves frying',
      'the bolt STRIKES {target}\'s {bodypart} with thunderous force',
      'voltage SURGES through {target}, leaving smoking wounds',
      '{target} CONVULSES as electricity overloads their nervous system'
    ],
    miss: [
      'the lightning bolt forks around {target} harmlessly',
      'electrical discharge grounds itself in the seafloor, missing {target}',
      'the spell arcs to nearby metal, drawn away from {target}',
      '{target} insulates themselves just in time, the current passing by'
    ]
  },
  
  acid: {
    cast: [
      'caustic liquid materializes, bubbling and hissing',
      'corrosive droplets form, eating through anything they touch',
      'alchemical dissolution begins, reality breaking down',
      'vitriolic essence pools in their claws, glowing sickly green',
      'the water itself turns to acid in a localized sphere'
    ],
    impact: [
      'acid SPLASHES across {target}, eating through shell and flesh',
      'corrosive fluid DISSOLVES {target}\'s {bodypart} on contact',
      'the caustic substance BURNS through {target}\'s armor like paper',
      'acid EATS into {target}, leaving smoking, pitted wounds',
      '{target} SCREAMS as the caustic spell melts their {bodypart}'
    ],
    miss: [
      'acid sprays wide, dissolving sand and rock but missing {target}',
      'the caustic globule passes {target}, leaving a trail of dissolution',
      '{target} dodges the acid splash, which eats into the seafloor',
      'the corrosive spell dissipates before reaching {target}'
    ]
  },
  
  force: {
    cast: [
      'pure arcane force coalesces into visible distortions',
      'reality warps as raw magical energy takes shape',
      'concussive power builds, pressure waves radiating outward',
      'translucent force constructs appear, humming with potential',
      'kinetic energy manifests as shimmering projectiles'
    ],
    impact: [
      'force energy SLAMS into {target} like a physical blow',
      'the concussive blast CRUSHES {target}\'s {bodypart}',
      'arcane force HAMMERS {target}, driving them backward',
      'the spell IMPACTS with the force of a battering ram',
      'pure energy BATTERS {target}, bones breaking from the pressure'
    ],
    miss: [
      'the force bolt whizzes past {target}\'s head',
      'arcane projectiles streak by, missing {target} by inches',
      'the concussive wave dissipates before reaching {target}',
      '{target} sidesteps the force blast, which continues past harmlessly'
    ]
  },
  
  necrotic: {
    cast: [
      'shadows coalesce into tangible darkness',
      'life-draining energy pools in their grasp, cold and hungry',
      'the void itself seems to reach through them',
      'deathly essence manifests, smelling of graves and rot',
      'negative energy warps the water into oily blackness'
    ],
    impact: [
      'necrotic energy WITHERS {target}, vitality draining away',
      'the spell CORRUPTS {target}\'s {bodypart}, flesh turning gray',
      'death magic BLIGHTS {target}, aging them decades in seconds',
      'negative energy FLOODS {target}, life force ebbing',
      'the spell DRAINS {target}\'s {bodypart}, leaving it dessicated'
    ],
    miss: [
      'shadows reach for {target} but grasp only water',
      'the necrotic bolt passes by, leaving a trail of dead plankton',
      '{target} avoids the death magic, which dissipates harmlessly',
      'the draining energy misses, sucking life from nearby coral instead'
    ]
  },
  
  radiant: {
    cast: [
      'holy light blazes forth, banishing shadows',
      'divine radiance coalesces, too bright to look upon',
      'blessed energy manifests as golden luminescence',
      'celestial fire appears, warm and terrible',
      'sacred light builds to blinding intensity'
    ],
    impact: [
      'radiant energy BURNS {target}, pure light searing flesh',
      'holy fire PURGES {target}\'s {bodypart}, divine wrath made manifest',
      'the sacred blast SMITES {target}, light penetrating to the soul',
      'radiance OVERWHELMS {target}, burning away corruption and life alike',
      'divine energy SEARS {target}, leaving glowing burns'
    ],
    miss: [
      'the radiant beam passes overhead, illuminating the depths',
      'holy light misses {target}, who shields their eyes from the glare',
      'the sacred bolt strikes rock, leaving it glowing',
      '{target} evades the divine strike, which continues upward'
    ]
  },
  
  poison: {
    cast: [
      'toxic vapors bubble forth, virulent and deadly',
      'venomous essence pools, dripping with lethality',
      'plague magic manifests as sickly miasma',
      'poisonous clouds billow out, discoloring the water',
      'toxins coalesce into visible, oily corruption'
    ],
    impact: [
      'venom FLOODS {target}\'s system, organs shutting down',
      'the toxin RAVAGES {target}\'s {bodypart}, flesh turning purple',
      'poison COURSES through {target}, blood turning black',
      'the venomous spell CORRUPTS {target} from within',
      'deadly toxins INFILTRATE {target}\'s body, causing convulsions'
    ],
    miss: [
      'the poison cloud drifts past {target} harmlessly',
      'toxic vapor disperses before reaching {target}',
      '{target} holds their breath, avoiding the poisonous fumes',
      'the venom splash misses, killing only small fish nearby'
    ]
  },
  
  psychic: {
    cast: [
      'reality ripples as mental energy builds',
      'their eyes glow with psionic power',
      'telepathic assault forms, invisible but devastating',
      'psychic pressure builds, mind over matter',
      'consciousness itself becomes a weapon'
    ],
    impact: [
      'mental agony LANCES into {target}\'s mind, thoughts scattering',
      'psychic trauma SHATTERS {target}\'s concentration',
      'the psionic assault OVERWHELMS {target}\'s mental defenses',
      'telepathic pain FLOODS {target}\'s consciousness',
      'mind-fire BURNS through {target}\'s thoughts, leaving chaos'
    ],
    miss: [
      'the mental assault fails to connect with {target}\'s mind',
      '{target}\'s mental shields deflect the psychic attack',
      'the psionic bolt disperses before reaching {target}\'s consciousness',
      '{target} resists the telepathic intrusion, mind intact'
    ]
  },
  
  thunder: {
    cast: [
      'sonic force builds, pressure waves distorting water',
      'thunder rumbles deep and ominous, growing louder',
      'sound itself becomes weaponized, humming with power',
      'concussive energy manifests as visible shockwaves',
      'the roar of an underwater storm coalesces'
    ],
    impact: [
      'sonic BLAST hammers {target}, eardrums rupturing',
      'thunder DETONATES against {target}\'s {bodypart}, bones vibrating',
      'the shockwave SLAMS into {target} with devastating force',
      'concussive sound RATTLES {target}\'s entire body',
      'acoustic force PULVERIZES {target}\'s {bodypart}'
    ],
    miss: [
      'the sonic blast passes by, {target}\'s ears ringing but unharmed',
      'shockwaves ripple past {target} harmlessly',
      'the thunder misses, echoing away into the depths',
      '{target} covers their ears and avoids the worst of the sonic assault'
    ]
  }
};

// ============================================================================
// HEALING SPELL EFFECTS
// ============================================================================

const HEALING_EFFECTS = {
  cast: [
    'channels restorative magic, soft light glowing',
    'invokes healing energies, wounds beginning to close',
    'draws upon life force, vitality returning',
    'weaves regenerative magic into being',
    'calls upon divine blessing, sacred light manifesting'
  ],
  effect: [
    'wounds knit together, flesh regenerating',
    'broken bones realign and mend',
    'vitality floods back, strength returning',
    'pain fades as healing magic takes hold',
    'injuries seal themselves, leaving only scars'
  ]
};

// ============================================================================
// BUFF/DEBUFF SPELL EFFECTS
// ============================================================================

const BUFF_EFFECTS = {
  shield: {
    cast: 'conjures a shimmering barrier of force',
    effect: 'arcane shielding flares into existence, deflecting attacks'
  },
  haste: {
    cast: 'accelerates time around themselves',
    effect: 'moves with supernatural speed, a blur in the water'
  },
  bless: {
    cast: 'invokes divine favor',
    effect: 'holy light surrounds them, guiding their strikes'
  },
  barkskin: {
    cast: 'shell hardens with natural magic',
    effect: 'carapace becomes as tough as ancient oak'
  }
};

const DEBUFF_EFFECTS = {
  slow: {
    cast: 'gestures at {target}, time distorting',
    effect: '{target} moves as if through molasses, slowed'
  },
  hold_person: {
    cast: 'speaks a word of binding at {target}',
    effect: '{target} freezes in place, muscles locked'
  },
  blindness: {
    cast: 'points at {target}\'s eyes, dark magic flowing',
    effect: '{target}\'s vision goes dark, blinded'
  },
  curse: {
    cast: 'hexes {target} with vile magic',
    effect: 'misfortune clings to {target} like a shroud'
  }
};

// ============================================================================
// AREA OF EFFECT SPELL TEMPLATES
// ============================================================================

const AOE_SPELL_TEMPLATES = {
  fireball: {
    cast: '{caster} {gesture}, then hurls a bead of fire {distance}. It DETONATES in a massive explosion, flames consuming everything in a {radius}-foot sphere!',
    hit: 'The flames ENGULF multiple targets, superheated water creating a deadly pressure wave',
    miss: 'Several targets dive clear of the blast radius, taking reduced damage'
  },
  lightning_bolt: {
    cast: '{caster} {gesture}, then releases a devastating bolt of lightning {distance}. The electrical discharge CHAINS through the water in a {length}-foot line!',
    hit: 'Lightning TEARS through multiple targets, leaving smoking wounds',
    miss: 'Several targets manage to dodge aside as electricity grounds itself'
  },
  cone_of_cold: {
    cast: '{caster} {gesture} and exhales a {length}-foot cone of absolute zero. Ice crystals form instantly, freezing everything in the cone!',
    hit: 'Multiple targets are FROZEN by the killing cold, frost covering their bodies',
    miss: 'Several targets swim clear of the freezing cone\'s path'
  },
  shatter: {
    cast: '{caster} {gesture}, creating a painfully intense sonic vibration {distance}. The sound EXPLODES in a {radius}-foot burst, shattering everything!',
    hit: 'The sonic blast HAMMERS multiple targets, shells cracking from the force',
    miss: 'Several targets cover their ears and resist the worst of the sonic damage'
  }
};

// ============================================================================
// MAIN SPELL NARRATION GENERATOR
// ============================================================================

/**
 * Generate spell cast narration
 * @param {object} caster - The spell caster
 * @param {string} spellName - Name of the spell
 * @param {object} target - The spell target (if single-target)
 * @param {object} result - Spell resolution result
 * @param {number} distance - Distance to target in feet
 * @returns {string} - Complete narration
 */
function generateSpellNarration(caster, spellName, target, result, distance = null) {
  // Determine spell damage type
  const damageType = result.damageType || detectSpellType(spellName);
  
  // Get casting gesture
  const gesture = getCastingGesture();
  
  // Build narration
  let narration = `${caster.name} ${gesture}`;
  
  // Get spell effects for this damage type
  const spellEffects = SPELL_EFFECTS[damageType];
  
  if (spellEffects) {
    // Add casting visual
    const castVisual = spellEffects.cast[Math.floor(Math.random() * spellEffects.cast.length)];
    narration += ` — ${castVisual}`;
    
    // Add distance if provided
    if (distance) {
      narration += ` ${formatDistanceFromBand(result.rangeBand || 'near')}`;
    }
    
    narration += '. ';
    
    // Add impact/miss narration
    if (result.hits || result.damage > 0) {
      const impactTemplate = spellEffects.impact[Math.floor(Math.random() * spellEffects.impact.length)];
      const bodypart = target ? getBodyPart(target) : 'body';
      const impact = impactTemplate
        .replace('{target}', target?.name || 'the target')
        .replace('{bodypart}', bodypart);
      narration += impact;
      
      // Add save info if applicable
      if (result.save) {
        const saveResult = result.save.success ? 'partially resists' : 'fails to resist';
        narration += ` **(${result.save.ability} save: ${result.save.total} vs DC ${result.save.dc}, ${saveResult})**`;
      }
      
      // Add damage
      if (result.damage) {
        narration += ` **[${result.damage} ${damageType} damage]**`;
      }
    } else {
      const missTemplate = spellEffects.miss[Math.floor(Math.random() * spellEffects.miss.length)];
      const miss = missTemplate.replace('{target}', target?.name || 'the target');
      narration += miss + '.';
    }
  } else {
    // Generic spell narration for unknown types
    narration += ` and casts ${spellName.replace(/_/g, ' ')}!`;
    
    if (result.damage) {
      narration += ` **[${result.damage} damage]**`;
    }
  }
  
  // Add environmental flourish
  const environmental = getEnvironmentalFlourish();
  narration += ` ${environmental}.`;
  
  return narration;
}

/**
 * Generate healing spell narration
 * @param {object} caster - The spell caster
 * @param {string} spellName - Name of the spell
 * @param {object} target - The target being healed
 * @param {number} healingAmount - Amount of HP restored
 * @returns {string} - Complete narration
 */
function generateHealingNarration(caster, spellName, target, healingAmount) {
  const gesture = getCastingGesture();
  const castEffect = HEALING_EFFECTS.cast[Math.floor(Math.random() * HEALING_EFFECTS.cast.length)];
  const healEffect = HEALING_EFFECTS.effect[Math.floor(Math.random() * HEALING_EFFECTS.effect.length)];
  
  let narration = `${caster.name} ${gesture}, ${castEffect}. `;
  narration += `${target.name}'s ${healEffect}. `;
  narration += `**[Restored ${healingAmount} HP]**`;
  
  return narration;
}

/**
 * Generate AoE spell narration
 * @param {object} caster - The spell caster
 * @param {string} spellName - Name of the spell (fireball, lightning_bolt, etc.)
 * @param {array} targets - Array of targets hit
 * @param {object} result - Spell resolution result
 * @returns {string} - Complete narration
 */
function generateAoENarration(caster, spellName, targets, result) {
  const aoeTemplate = AOE_SPELL_TEMPLATES[spellName];
  
  if (!aoeTemplate) {
    return `${caster.name} casts ${spellName.replace(/_/g, ' ')}, hitting ${targets.length} targets!`;
  }
  
  const gesture = getCastingGesture();
  const distance = formatDistanceFromBand(result.rangeBand || 'near');
  
  let narration = aoeTemplate.cast
    .replace('{caster}', caster.name)
    .replace('{gesture}', gesture)
    .replace('{distance}', distance)
    .replace('{radius}', result.radius || 20)
    .replace('{length}', result.length || 60);
  
  narration += ' ';
  
  // Add hit/miss details
  const hitCount = targets.filter(t => t.hit).length;
  if (hitCount > 0) {
    narration += aoeTemplate.hit.replace('multiple', `${hitCount}`);
  }
  
  const missCount = targets.filter(t => !t.hit).length;
  if (missCount > 0) {
    narration += ' ' + aoeTemplate.miss.replace('Several', `${missCount}`);
  }
  
  return narration;
}

/**
 * Detect spell damage type from spell name
 * @param {string} spellName - Name of spell
 * @returns {string} - Damage type
 */
function detectSpellType(spellName) {
  const name = spellName.toLowerCase();
  
  if (name.includes('fire') || name.includes('flame')) return 'fire';
  if (name.includes('cold') || name.includes('ice') || name.includes('frost')) return 'cold';
  if (name.includes('lightning') || name.includes('thunder') || name.includes('shock')) return 'lightning';
  if (name.includes('acid')) return 'acid';
  if (name.includes('force') || name.includes('missile')) return 'force';
  if (name.includes('necrotic') || name.includes('wither') || name.includes('drain')) return 'necrotic';
  if (name.includes('radiant') || name.includes('holy') || name.includes('sacred')) return 'radiant';
  if (name.includes('poison') || name.includes('venom')) return 'poison';
  if (name.includes('psychic') || name.includes('mental')) return 'psychic';
  if (name.includes('sonic') || name.includes('thunder')) return 'thunder';
  
  return 'force'; // Default
}

/**
 * Get body part for spell targeting
 * @param {object} creature - The creature
 * @returns {string} - Body part name
 */
function getBodyPart(creature) {
  const parts = creature.isPlayer 
    ? ['carapace', 'claw', 'shell', 'tail']
    : ['body', 'torso', 'head', 'limb'];
  return parts[Math.floor(Math.random() * parts.length)];
}

module.exports = {
  generateSpellNarration,
  generateHealingNarration,
  generateAoENarration,
  SPELL_EFFECTS,
  HEALING_EFFECTS,
  BUFF_EFFECTS,
  DEBUFF_EFFECTS
};
