/**
 * Caverns & Clawds - Combat Narration
 * Book-style descriptive narration for attacks, hits, misses, and deaths
 */

const { formatDistanceFromBand, getEnvironmentalFlourish } = require('./environmental');

// ============================================================================
// CREATURE EMOTIONAL STATES
// ============================================================================

const CREATURE_EMOTIONS = {
  aggressive: [
    'snarling', 'ferocious', 'bloodthirsty', 'savage', 'vicious',
    'frothing with rage', 'wild-eyed', 'berserk', 'rabid'
  ],
  desperate: [
    'panicked', 'wild-eyed', 'frantic', 'terrified', 'desperate',
    'cornered', 'fighting for survival', 'fear-maddened'
  ],
  confident: [
    'confident', 'arrogant', 'calculating', 'methodical', 'precise',
    'smirking', 'assured', 'contemptuous', 'disdainful'
  ],
  wounded: [
    'bleeding', 'limping', 'weakened', 'staggering', 'gasping',
    'struggling', 'faltering', 'barely standing'
  ],
  cunning: [
    'cunning', 'wily', 'devious', 'crafty', 'sly',
    'calculating', 'scheming', 'opportunistic'
  ],
  mindless: [
    'mindless', 'relentless', 'mechanical', 'inexorable', 'unstoppable',
    'shambling', 'inevitable', 'unthinking'
  ]
};

/**
 * Select emotional state based on creature HP percentage
 */
function getEmotionalState(creature, hpPercent) {
  // Wounded state when low HP
  if (hpPercent < 0.25) {
    return CREATURE_EMOTIONS.wounded[Math.floor(Math.random() * CREATURE_EMOTIONS.wounded.length)];
  }
  
  // Check for mindless creatures
  const intelligence = creature.abilities?.INT || creature.stats?.intelligence || 10;
  if (intelligence <= 3) {
    return CREATURE_EMOTIONS.mindless[Math.floor(Math.random() * CREATURE_EMOTIONS.mindless.length)];
  }
  
  // High HP - confident
  if (hpPercent > 0.75) {
    return CREATURE_EMOTIONS.confident[Math.floor(Math.random() * CREATURE_EMOTIONS.confident.length)];
  }
  
  // Default to aggressive
  return CREATURE_EMOTIONS.aggressive[Math.floor(Math.random() * CREATURE_EMOTIONS.aggressive.length)];
}

// ============================================================================
// WEAPON DESCRIPTIONS
// ============================================================================

const WEAPON_DESCRIPTORS = {
  sword: ['gleaming blade', 'steel edge', 'sharp sword', 'curved scimitar', 'ancient blade'],
  axe: ['heavy axe', 'cruel battleaxe', 'double-bladed axe', 'jagged axe', 'massive greataxe'],
  club: ['crude club', 'heavy cudgel', 'gnarled branch', 'stone-headed club', 'tree-trunk club'],
  dagger: ['wickedly sharp dagger', 'curved knife', 'poisoned blade', 'serrated dagger', 'needle-thin blade'],
  spear: ['barbed spear', 'harpoon', 'trident', 'sharpened lance', 'coral-tipped spear'],
  bow: ['longbow', 'shortbow', 'composite bow', 'recurve bow'],
  claws: ['razor-sharp claws', 'hooked talons', 'serrated claws', 'bone claws', 'chitinous claws'],
  bite: ['slavering jaws', 'needle-sharp teeth', 'crushing bite', 'venomous fangs', 'powerful mandibles'],
  tentacles: ['writhing tentacles', 'suckered appendages', 'muscular tentacles', 'barbed tendrils']
};

function getWeaponDescription(damageType) {
  const typeMap = {
    slashing: 'sword',
    piercing: 'spear',
    bludgeoning: 'club'
  };
  
  const weaponType = typeMap[damageType] || 'sword';
  const descriptors = WEAPON_DESCRIPTORS[weaponType];
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

// ============================================================================
// MELEE ATTACK TEMPLATES
// ============================================================================

const MELEE_MISS_TEMPLATES = [
  '{emotion} {attacker} {distance} lunges forward with {weapon} raised high, but {defender} twists aside at the last moment, the blade singing harmlessly past their shoulder',
  'With a {emotion} roar, {attacker} {distance} swings their {weapon} in a wide arc, but {defender} ducks low, the strike cleaving only water',
  '{attacker} {distance} drives forward, {weapon} aimed at {defender}\'s midsection, but the strike goes wide as a sudden current throws off the angle',
  'The {emotion} {attacker} {distance} attacks with furious abandon, {weapon} whistling through the water, but {defender} parries the blow with practiced ease',
  '{attacker} {distance} finds an opening and strikes, {weapon} flashing, but {defender} rolls aside at the last instant, bubbles streaming in their wake',
  'Overextending with {emotion} aggression, {attacker} {distance} slashes with their {weapon}, missing {defender} by mere inches as they sidestep',
  '{attacker} {distance} circles and strikes, {weapon} seeking vulnerable flesh, but {defender} deflects the attack, sending the blade skittering off their shell',
  'The {emotion} {attacker} {distance} makes a calculated strike toward {defender}\'s exposed flank, but telegraphs the move—{defender} easily evades',
  'Lunging desperately, {attacker} {distance} attempts to impale {defender} with their {weapon}, but the thrust falls short, stabbing uselessly into sand',
  '{attacker} {distance} unleashes a {emotion} combination attack with their {weapon}, but {defender} weaves between the strikes like kelp in a current',
  'With {emotion} intent, {attacker} {distance} brings their {weapon} down in a crushing overhead blow—that strikes only seafloor, kicking up a cloud of silt',
  '{attacker} {distance} feints left and strikes right with their {weapon}, but {defender} reads the move perfectly, dodging with fluid grace'
];

const MELEE_HIT_TEMPLATES = [
  'The {emotion} {attacker} {distance} closes the gap and drives their {weapon} deep into {defender}\'s {bodypart}, ripping free in a spray of {blood}',
  '{attacker} {distance} strikes with {emotion} precision, {weapon} carving a brutal line across {defender}\'s {bodypart}—{blood} clouds the water',
  'With a surge of {emotion} fury, {attacker} {distance} slams their {weapon} into {defender}\'s {bodypart}, the impact reverberating through the water',
  '{attacker} {distance} finds an opening in {defender}\'s defense and buries their {weapon} into exposed {bodypart}, drawing a cry of pain',
  'The {emotion} {attacker} {distance} unleashes a devastating strike, {weapon} tearing through {defender}\'s {bodypart} with savage force',
  'Darting forward with {emotion} speed, {attacker} {distance} rakes their {weapon} across {defender}\'s {bodypart}, leaving deep gouges',
  '{attacker} {distance} capitalizes on a moment of weakness, driving their {weapon} into {defender}\'s {bodypart} with {emotion} determination',
  'The {emotion} {attacker} {distance} swings in a powerful arc, {weapon} connecting solidly with {defender}\'s {bodypart}, bone cracking audibly',
  '{attacker} {distance} moves with {emotion} fluidity, {weapon} slashing across {defender}\'s {bodypart} in a spray of {blood} and scales',
  'With {emotion} ruthlessness, {attacker} {distance} plunges their {weapon} between {defender}\'s armor plates, striking true at {bodypart}',
  '{attacker} {distance} executes a {emotion} strike, {weapon} catching {defender}\'s {bodypart} and opening a gushing wound',
  'The {emotion} {attacker} {distance} attacks with surgical precision, {weapon} finding {defender}\'s {bodypart} and cutting deep'
];

const MELEE_CRIT_TEMPLATES = [
  '**DEVASTATING BLOW!** The {emotion} {attacker} {distance} strikes with perfect precision, {weapon} finding a VITAL POINT in {defender}\'s {bodypart}—the water explodes with {blood}!',
  '**CRITICAL HIT!** {attacker} {distance} channels all their {emotion} fury into one PERFECT strike, {weapon} cleaving deep into {defender}\'s {bodypart}, nearly splitting them in half!',
  '**MASTERFUL STRIKE!** With {emotion} focus, {attacker} {distance} lands a BONE-SHATTERING blow to {defender}\'s {bodypart}, their {weapon} cutting through armor and flesh like tissue!',
  '**BRUTAL IMPACT!** The {emotion} {attacker} {distance} finds the perfect angle, {weapon} CRUSHING {defender}\'s {bodypart} with apocalyptic force—shell fragments scatter!',
  '**LETHAL PRECISION!** {attacker} {distance} strikes with {emotion} accuracy, {weapon} piercing STRAIGHT THROUGH {defender}\'s {bodypart}—blood erupts in a crimson bloom!'
];

const MELEE_CRIT_FAIL_TEMPLATES = [
  '**CATASTROPHIC FUMBLE!** The {emotion} {attacker} {distance} swings wildly, their {weapon} slipping from their grip and tumbling into the murky depths!',
  '**HUMILIATING MISS!** {attacker} {distance} attacks with {emotion} abandon, completely overextending—they stumble and faceplant into the sand!',
  '**DISASTROUS BLUNDER!** The {emotion} {attacker} {distance} telegraphs their strike so obviously that {defender} could have dodged in their sleep—the {weapon} finds only water!',
  '**CRITICAL FAILURE!** {attacker} {distance} strikes with {emotion} force but hits their own foot with the {weapon}, letting out a pained yelp!',
  '**CLUMSY DISASTER!** The {emotion} {attacker} {distance} swings their {weapon} with tremendous force... directly into a rock formation, the blade lodging firmly!'
];

// ============================================================================
// RANGED ATTACK TEMPLATES
// ============================================================================

const RANGED_MISS_TEMPLATES = [
  'From {distance}, the {emotion} {attacker} looses their projectile at {defender}, but the shot goes wide, disappearing into the kelp forest',
  '{attacker} {distance} takes careful aim and fires, but water resistance throws off the trajectory—the projectile harmlessly drifts past {defender}',
  'The {emotion} {attacker} {distance} releases their attack, but {defender} sees it coming and easily sidesteps the slow-moving projectile',
  '{attacker} {distance} strikes from afar, projectile streaking through the water, but currents pull it off-course, missing {defender} entirely',
  'With {emotion} intent, {attacker} {distance} launches their attack, but {defender} ducks behind cover just in time, the projectile thudding harmlessly into rock',
  'From {distance}, {attacker} fires with {emotion} precision, but the dim lighting throws off their aim—the shot sails high over {defender}\'s head',
  '{attacker} {distance} unleashes a ranged strike, but {defender} spots the incoming projectile and deflects it with their shell',
  'The {emotion} {attacker} {distance} takes the shot, but silt clouds obscure their vision—the projectile veers wildly off-target',
  '{attacker} {distance} fires with {emotion} confidence, but underestimates the water drag—the attack falls short, embedding in the seafloor',
  'From {distance}, {attacker} lets fly, but the {emotion} attack is ruined by a school of fish darting between them and {defender}'
];

const RANGED_HIT_TEMPLATES = [
  'The {emotion} {attacker} {distance} looses their projectile with deadly accuracy—it streaks through the water and buries itself in {defender}\'s {bodypart}!',
  'From {distance}, {attacker} fires with {emotion} precision, the projectile cutting through currents to strike {defender}\'s {bodypart}, {blood} trailing in the water',
  '{attacker} {distance} compensates perfectly for water resistance, their shot slamming into {defender}\'s {bodypart} with punishing force',
  'The {emotion} {attacker} {distance} finds their mark, projectile piercing through the murky water to impale {defender}\'s {bodypart}',
  '{attacker} {distance} releases their attack with {emotion} confidence—it flies true, striking {defender}\'s {bodypart} with a sickening crunch',
  'From {distance}, the {emotion} {attacker} demonstrates expert marksmanship, projectile threading between obstacles to hit {defender}\'s {bodypart}',
  '{attacker} {distance} waits for the perfect moment, then strikes—the projectile hammers into {defender}\'s {bodypart}, drawing a spray of {blood}',
  'With {emotion} focus, {attacker} {distance} accounts for every variable, their shot piercing {defender}\'s {bodypart} with surgical precision',
  'The {emotion} {attacker} {distance} fires on instinct, and the projectile finds its mark in {defender}\'s {bodypart}, penetrating deep',
  '{attacker} {distance} unleashes their attack, the projectile cutting through water like a missile to strike {defender}\'s exposed {bodypart}'
];

const RANGED_CRIT_TEMPLATES = [
  '**PERFECT SHOT!** From {distance}, the {emotion} {attacker} fires with IMPOSSIBLE precision—the projectile strikes a VITAL POINT in {defender}\'s {bodypart}!',
  '**CRITICAL HIT!** {attacker} {distance} releases with {emotion} focus, their shot PERFECTLY threading obstacles to DEVASTATE {defender}\'s {bodypart}!',
  '**LEGENDARY ACCURACY!** The {emotion} {attacker} {distance} demonstrates MASTERFUL skill, projectile PUNCHING THROUGH {defender}\'s {bodypart} in a spray of {blood}!',
  '**IMPOSSIBLE STRIKE!** From {distance}, {attacker} fires with {emotion} intent—the projectile curves impossibly around cover to SHATTER {defender}\'s {bodypart}!'
];

// ============================================================================
// BODY PARTS (for hit location)
// ============================================================================

const BODY_PARTS = {
  crustacean: ['carapace', 'claw', 'eyestalk', 'tail', 'antennae', 'leg joint', 'abdomen'],
  humanoid: ['chest', 'shoulder', 'leg', 'arm', 'torso', 'neck', 'side', 'back'],
  undead: ['rotting flesh', 'exposed ribs', 'skeletal arm', 'skull', 'spine', 'jaw'],
  beast: ['flank', 'haunch', 'neck', 'shoulder', 'back leg', 'throat', 'hide'],
  aberration: ['writhing mass', 'central eye', 'tentacle cluster', 'pulsating core', 'membrane']
};

function getBodyPart(creature) {
  // Determine creature type
  if (creature.isPlayer || creature.name?.toLowerCase().includes('lobster')) {
    return BODY_PARTS.crustacean[Math.floor(Math.random() * BODY_PARTS.crustacean.length)];
  }
  
  if (creature.special?.includes('undead') || creature.name?.toLowerCase().includes('skeleton') || 
      creature.name?.toLowerCase().includes('zombie') || creature.name?.toLowerCase().includes('ghoul')) {
    return BODY_PARTS.undead[Math.floor(Math.random() * BODY_PARTS.undead.length)];
  }
  
  if (creature.name?.toLowerCase().includes('beholder') || creature.name?.toLowerCase().includes('illithid')) {
    return BODY_PARTS.aberration[Math.floor(Math.random() * BODY_PARTS.aberration.length)];
  }
  
  // Beast by default for animals, humanoid for others
  const isBeast = creature.abilities?.INT <= 4;
  const parts = isBeast ? BODY_PARTS.beast : BODY_PARTS.humanoid;
  return parts[Math.floor(Math.random() * parts.length)];
}

// ============================================================================
// BLOOD/ICHOR DESCRIPTORS
// ============================================================================

const BLOOD_TYPES = {
  normal: ['blood', 'crimson blood', 'dark blood', 'life blood'],
  undead: ['black ichor', 'foul corruption', 'necrotic essence', 'putrid fluid'],
  construct: ['sparks', 'fragments', 'debris', 'shattered components'],
  aberration: ['alien ichor', 'viscous ooze', 'prismatic fluid', 'otherworldly essence']
};

function getBloodType(creature) {
  if (creature.special?.includes('undead')) {
    return BLOOD_TYPES.undead[Math.floor(Math.random() * BLOOD_TYPES.undead.length)];
  }
  
  if (creature.special?.includes('construct')) {
    return BLOOD_TYPES.construct[Math.floor(Math.random() * BLOOD_TYPES.construct.length)];
  }
  
  if (creature.name?.toLowerCase().includes('beholder')) {
    return BLOOD_TYPES.aberration[Math.floor(Math.random() * BLOOD_TYPES.aberration.length)];
  }
  
  return BLOOD_TYPES.normal[Math.floor(Math.random() * BLOOD_TYPES.normal.length)];
}

// ============================================================================
// DEATH NARRATION
// ============================================================================

const DEATH_TEMPLATES = [
  '{creature} collapses with a final shudder, {blood} streaming from mortal wounds as they sink lifeless to the seafloor',
  'With a gurgling cry, {creature} falls, their broken body drifting down into the darkness, trailing clouds of {blood}',
  '{creature} makes one last desperate attempt to fight, but their strength fails—they crumple, life fading from their eyes',
  'The light dies in {creature}\'s gaze as they succumb to their wounds, body going limp and tumbling into the sand',
  '{creature} gasps their final breath, convulses once, and goes still, {blood} forming an expanding halo around their corpse',
  'Mortally wounded, {creature} clutches at their fatal injury before sliding bonelessly to the ground, forever silent',
  '{creature}\'s eyes glaze over as death claims them, their form crashing heavily onto the rocky seafloor',
  'With a final rattling wheeze, {creature} expires, their lifeless shell settling amid swirling sediment',
  '{creature} fights to the very end, but their body betrays them—they collapse in a heap, another casualty of the depths',
  '{creature} lets out a haunting death cry that echoes through the water before they fall, never to rise again',
  'The killing blow lands true, and {creature} knows no more—they drift down through the water column like a discarded shell',
  '{creature}\'s struggles cease abruptly as death takes them, body going rigid before slumping into the murk'
];

const PLAYER_DEATH_TEMPLATE = 'Your vision darkens as overwhelming pain floods your senses. The last thing you see is the {emotion} {killer} looming above you as consciousness fades... **You have fallen.**';

// ============================================================================
// MOVEMENT NARRATION
// ============================================================================

const MOVEMENT_TEMPLATES = {
  advance: [
    '{character} surges forward through the water, closing the distance to {target}',
    'With powerful strokes, {character} propels themself toward {target}',
    '{character} dashes ahead, fins churning the water as they rush at {target}',
    'Swimming with urgent speed, {character} closes the gap to {target}'
  ],
  retreat: [
    '{character} kicks backward, putting distance between themself and {target}',
    'Retreating tactically, {character} swims away from {target}',
    '{character} backs off cautiously, maintaining defensive posture as they withdraw from {target}',
    'With hasty strokes, {character} creates space, moving away from {target}'
  ],
  circle: [
    '{character} circles laterally, seeking a better position against {target}',
    'Moving with tactical awareness, {character} repositions around {target}',
    '{character} shifts sideways through the water, looking for an opening against {target}',
    'Maneuvering carefully, {character} angles for advantage around {target}'
  ],
  dash: [
    '{character} takes the Dash action, swimming with desperate speed!',
    'Kicking frantically, {character} doubles their movement speed!',
    '{character} swims for all they\'re worth, fins churning water in a blur!',
    'Abandoning caution, {character} shoots through the water at maximum speed!'
  ]
};

// ============================================================================
// MAIN NARRATION GENERATOR
// ============================================================================

/**
 * Generate attack narration with full descriptive detail
 * @param {object} attacker - The attacking creature
 * @param {object} defender - The defending creature
 * @param {object} result - Attack resolution result
 * @param {number} distance - Distance in feet (optional)
 * @returns {string} - Complete narration
 */
function generateAttackNarration(attacker, defender, result, distance = null) {
  // Determine attacker's emotional state
  const attackerHpPercent = attacker.currentHp / (attacker.maxHp || attacker.hp || 100);
  const emotion = getEmotionalState(attacker, attackerHpPercent);
  
  // Determine attack type (melee vs ranged)
  const isRanged = distance && distance > 10;
  
  // Get appropriate templates
  let templates;
  if (result.isCrit) {
    templates = isRanged ? RANGED_CRIT_TEMPLATES : MELEE_CRIT_TEMPLATES;
  } else if (result.isCritFail) {
    templates = MELEE_CRIT_FAIL_TEMPLATES; // Critical fails are usually melee
  } else if (result.hits) {
    templates = isRanged ? RANGED_HIT_TEMPLATES : MELEE_HIT_TEMPLATES;
  } else {
    templates = isRanged ? RANGED_MISS_TEMPLATES : MELEE_MISS_TEMPLATES;
  }
  
  // Select random template
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  // Calculate distance display
  const distanceDisplay = distance 
    ? formatDistanceFromBand(result.rangeBand || 'near')
    : formatDistanceFromBand('melee');
  
  // Get weapon description
  const weapon = getWeaponDescription(result.damageType || 'slashing');
  
  // Get body part and blood type (if hit)
  const bodypart = result.hits ? getBodyPart(defender) : '';
  const blood = result.hits ? getBloodType(defender) : '';
  
  // Fill in template
  let narration = template
    .replace('{emotion}', emotion)
    .replace('{attacker}', attacker.name || 'The attacker')
    .replace('{defender}', defender.name || 'the defender')
    .replace('{distance}', distanceDisplay)
    .replace('{weapon}', weapon)
    .replace('{bodypart}', bodypart)
    .replace('{blood}', blood);
  
  // Add attack roll display
  if (result.totalAttack !== undefined && result.defenderAC !== undefined) {
    narration += ` **(Attack: ${result.totalAttack} vs AC ${result.defenderAC})**`;
  }
  
  // Add damage if hit
  if (result.hits && result.damage) {
    narration += ` **[${result.damage} ${result.damageType || 'damage'}]**`;
  }
  
  // Add class feature effects
  if (result.divineSmite && result.divineSmite.success) {
    const smite = result.divineSmite;
    const godlyPower = [
      'Divine radiance erupts from the wound',
      'Holy fire blazes through the strike',
      'Celestial energy surges through the blade',
      'Sacred power explodes on impact',
      'The gods\' wrath manifests in radiant fury'
    ];
    const flourish = godlyPower[Math.floor(Math.random() * godlyPower.length)];
    narration += ` ${flourish}, dealing an additional **${smite.damage} radiant damage**!`;
    
    if (smite.bonusVsEvil) {
      narration += ` *(The creature of darkness recoils from the holy might!)*`;
    }
  }
  
  // Add Sneak Attack if present
  if (result.sneakAttack && result.sneakAttack.success) {
    const sneak = result.sneakAttack;
    const backstabFlourish = [
      'Striking from the shadows',
      'Finding a gap in the defenses',
      'With surgical precision',
      'Exploiting a moment of distraction',
      'As quick as a mantis shrimp\'s strike'
    ];
    const flourish = backstabFlourish[Math.floor(Math.random() * backstabFlourish.length)];
    narration += ` ${flourish}, the attack deals **${sneak.damage} extra damage**!`;
  }
  
  // Add environmental flourish
  const environmental = getEnvironmentalFlourish();
  narration += ` ${environmental}.`;
  
  return narration;
}

/**
 * Generate death narration
 * @param {object} deceased - The creature that died
 * @param {object} killer - The creature that dealt the killing blow
 * @returns {string} - Death narration
 */
function generateDeathNarration(deceased, killer = null) {
  if (deceased.isPlayer) {
    const emotion = killer ? getEmotionalState(killer, 1.0) : 'victorious';
    return PLAYER_DEATH_TEMPLATE
      .replace('{emotion}', emotion)
      .replace('{killer}', killer?.name || 'your foe');
  }
  
  const template = DEATH_TEMPLATES[Math.floor(Math.random() * DEATH_TEMPLATES.length)];
  const blood = getBloodType(deceased);
  
  return '💀 ' + template
    .replace('{creature}', deceased.name)
    .replace('{blood}', blood);
}

/**
 * Generate movement narration
 * @param {object} character - The moving character
 * @param {string} fromBand - Starting range band
 * @param {string} toBand - Destination range band
 * @param {number} cost - Movement cost
 * @param {boolean} difficultTerrain - Whether terrain is difficult
 * @param {array} opportunityAttacks - Any OAs triggered
 * @returns {string} - Movement narration
 */
function generateMovementNarration(character, fromBand, toBand, cost, difficultTerrain, opportunityAttacks = []) {
  const fromDist = formatDistanceFromBand(fromBand);
  const toDist = formatDistanceFromBand(toBand);
  
  // Determine movement type
  let movementType = 'circle';
  if (toBand === 'melee' && fromBand !== 'melee') movementType = 'advance';
  if (fromBand === 'melee' && toBand !== 'melee') movementType = 'retreat';
  
  const templates = MOVEMENT_TEMPLATES[movementType];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  let narration = template
    .replace('{character}', character.name || 'The character')
    .replace('{target}', 'their enemy');
  
  narration += ` (${fromDist} → ${toDist}, ${cost} ft movement)`;
  
  if (difficultTerrain) {
    narration += ' The terrain slows their progress.';
  }
  
  // Add opportunity attacks
  if (opportunityAttacks && opportunityAttacks.length > 0) {
    opportunityAttacks.forEach(oa => {
      if (oa.hits) {
        narration += ` **[Opportunity Attack: ${oa.damage} damage!]**`;
      }
    });
  }
  
  const environmental = getEnvironmentalFlourish();
  narration += ` ${environmental}.`;
  
  return narration;
}

// ============================================================================
// CLASS FEATURE NARRATION
// ============================================================================

/**
 * Generate descriptive narration for class features used in combat
 */
function generateClassFeatureNarration(featureName, character, result) {
  const templates = {
    'Second Wind': [
      `${character.name} draws upon deep reserves of stamina, their wounds beginning to close with supernatural vigor`,
      `Breathing deeply, ${character.name} channels battle-hardened endurance, flesh knitting together before your eyes`,
      `With a warrior's resolve, ${character.name} pushes through the pain, finding strength in adversity`,
      `${character.name} grits their claws together, adrenaline surging as injuries begin to mend`
    ],
    'Action Surge': [
      `Time seems to slow as ${character.name} moves with blinding speed, muscles burning with exertion!`,
      `${character.name} pushes past mortal limits, their body moving faster than thought!`,
      `With a battle cry that shakes the depths, ${character.name} unleashes a furious barrage of attacks!`,
      `${character.name}'s training takes over, limbs moving in a deadly blur of motion!`
    ],
    'Bardic Inspiration': [
      `${character.name} weaves a melody of courage through the water, notes glittering like pearls`,
      `With a flourish of bioluminescent harmony, ${character.name} fills their ally with renewed confidence`,
      `${character.name}'s song rises and falls like the tide, inspiring heroic deeds`,
      `The bard's voice carries ancient power, resonating in the bones of all who hear`
    ],
    'Lay on Hands': [
      `${character.name} places their claws upon the wound, divine light flowing from their touch`,
      `Holy energy pulses through ${character.name}'s shell, channeling the gods' healing grace`,
      `With a whispered prayer, ${character.name} becomes a conduit for celestial restoration`,
      `${character.name}'s touch blazes with sacred fire, mending flesh and bone alike`
    ],
    'Divine Sense': [
      `${character.name} closes their eyes, divine awareness washing over them like a tide`,
      `The paladin's antenna glow faintly as they attune to otherworldly presences`,
      `${character.name} opens themselves to the divine, sensing ripples in the spiritual currents`,
      `Power thrums through ${character.name} as they pierce the veil between worlds`
    ],
    'Turn Undead': [
      `${character.name} raises their holy symbol high, channeling pure divine wrath!`,
      `"By the gods' light, BEGONE!" ${character.name}'s voice thunders through the water, repelling the undead`,
      `Sacred radiance explodes from ${character.name}, forcing abominations to flee in terror`,
      `The cleric's faith manifests as blazing light, burning away the unholy`
    ],
    'Uncanny Dodge': [
      `${character.name} twists impossibly fast, the attack grazing harmlessly past`,
      `With rogue's instinct, ${character.name} shifts at precisely the right moment`,
      `${character.name}'s training saves them — the blow that should have killed merely scratches`,
      `Like a ghost, ${character.name} seems to phase through the attack`
    ],
    'Arcane Recovery': [
      `${character.name} touches their forehead, arcane energy flooding back into their mind`,
      `The wizard's eyes glow briefly as they reclaim expended magical power`,
      `${character.name} meditates for a heartbeat, spell slots reforming in their consciousness`,
      `Raw mana coalesces around ${character.name}, replenishing their mystical reserves`
    ]
  };
  
  const featureTemplates = templates[featureName];
  if (!featureTemplates) {
    // Fallback to the feature's built-in narrative
    return result.narrative || `${character.name} uses ${featureName}!`;
  }
  
  const template = featureTemplates[Math.floor(Math.random() * featureTemplates.length)];
  
  // Add result-specific details
  let narration = template;
  
  if (result.healing) {
    narration += ` **[Healed ${result.healing} HP]**`;
  }
  
  if (result.damage) {
    narration += ` **[${result.damage} ${result.damageType || 'damage'}]**`;
  }
  
  if (result.usesRemaining !== undefined) {
    narration += ` *(${result.usesRemaining} uses remaining)*`;
  }
  
  return narration;
}

module.exports = {
  generateAttackNarration,
  generateDeathNarration,
  generateMovementNarration,
  generateClassFeatureNarration,
  CREATURE_EMOTIONS,
  getEmotionalState
};
