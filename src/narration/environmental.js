/**
 * Caverns & Clawds - Environmental Narration
 * Underwater atmosphere and setting details
 */

/**
 * Underwater environmental details that add flavor to combat narration
 * Each category rotates randomly to avoid repetition
 */
const ENVIRONMENTAL_DETAILS = {
  // Lighting and visibility
  lighting: [
    'bioluminescent plankton drifting through the water',
    'murky darkness closing in around you',
    'shafts of filtered sunlight piercing the depths',
    'eerie phosphorescent glow illuminating the scene',
    'dancing shadows cast by swaying kelp',
    'brilliant bioluminescence from disturbed microorganisms',
    'dim twilight of the deep ocean floor',
    'ghostly pale light from luminous fungi on nearby rocks',
    'strobing flashes from startled jellyfish',
    'the darkness absolute save for bio-lights',
    'prismatic rays refracting through the water',
    'sickly green glow from decay and algae'
  ],
  
  // Water movement and currents
  currents: [
    'kelp fronds sway in the disturbed current',
    'a powerful undertow pulls at your fins',
    'gentle currents carry you sideways',
    'turbulent eddies swirl around the combatants',
    'the water churns with violent movement',
    'a thermal vent sends warm water rushing upward',
    'cold deep currents flow past',
    'the tide shifts, changing the flow',
    'whirlpools form from the frantic motion',
    'still water suddenly erupts into chaos',
    'pressure waves ripple through the depths',
    'a surge pushes you back momentarily'
  ],
  
  // Particles and debris
  particles: [
    'sand clouds billow from the seafloor',
    'scales drift lazily downward',
    'blood blooms in the water like crimson ink',
    'shell fragments scatter in all directions',
    'sediment rises in murky plumes',
    'bubbles stream toward the surface',
    'broken coral pieces tumble past',
    'disturbed sand creates a hazy veil',
    'plankton swirls in glittering spirals',
    'chunks of kelp float through the battlefield',
    'silt rises like a brown fog',
    'tiny fish dart away from the violence'
  ],
  
  // Marine life reactions
  wildlife: [
    'schools of fish scatter in panic',
    'a curious octopus observes from a crevice',
    'crabs scuttle for cover beneath rocks',
    'eels slither away into the darkness',
    'jellyfish pulse past, indifferent to the carnage',
    'sea anemones retract their tentacles',
    'a ray glides overhead, disturbed by the commotion',
    'hermit crabs flee with shells rattling',
    'sea urchins cluster defensively',
    'barnacles click shut on nearby surfaces',
    'a moray eel watches hungrily from its den',
    'bioluminescent squid flash warning colors'
  ],
  
  // Sounds (underwater acoustics)
  sounds: [
    'the metallic clash echoes strangely underwater',
    'muffled impacts reverberate through the water',
    'clicks and pops emanate from disturbed crustaceans',
    'your own heartbeat pounds in your ears',
    'the eerie silence of the deep surrounds you',
    'distant whale song carries through the depths',
    'scraping sounds echo off rocky formations',
    'bubbles hiss and pop all around',
    'pressure changes ring in your ears',
    'creaking of stressed shells and bones',
    'the whoosh of water displacement',
    'distant rumbling from underwater volcanic vents'
  ],
  
  // Terrain features
  terrain: [
    'razor-sharp coral threatens unwary swimmers',
    'the sandy bottom shifts beneath your claws',
    'towering kelp forests limit visibility',
    'a rocky outcropping provides momentary cover',
    'volcanic vents superheat the surrounding water',
    'ancient ruins loom in the murk',
    'a drop-off plunges into darker depths',
    'boulder fields create a maze of obstacles',
    'a bed of sea grass tangles at your feet',
    'jagged lava rock formations jut upward',
    'smooth sand dunes roll away into shadow',
    'a tangle of sunken ship timbers nearby'
  ]
};

/**
 * Special environmental events that can occur during combat
 */
const ENVIRONMENTAL_EVENTS = {
  hazards: [
    {
      description: 'A school of jellyfish drifts through the battlefield',
      effect: 'difficult_terrain',
      damage: '1d4',
      type: 'poison'
    },
    {
      description: 'A sudden undertow pulls everyone off-balance',
      effect: 'movement_penalty',
      severity: 'minor'
    },
    {
      description: 'Volcanic vents erupt, superheating the water',
      effect: 'damage_zone',
      damage: '2d6',
      type: 'fire'
    },
    {
      description: 'Dense sediment cloud reduces visibility to near-zero',
      effect: 'disadvantage',
      duration: '1d4_rounds'
    },
    {
      description: 'A predatory shark is drawn by the blood in the water',
      effect: 'new_enemy',
      enemy: 'shark'
    }
  ],
  
  advantages: [
    {
      description: 'A thermal vent provides healing warmth',
      effect: 'healing',
      amount: '1d8'
    },
    {
      description: 'A burst of bioluminescence blinds your enemies',
      effect: 'enemy_disadvantage',
      duration: '1_round'
    },
    {
      description: 'Friendly dolphins arrive to assist',
      effect: 'ally_bonus',
      bonus: 'advantage_on_next_attack'
    },
    {
      description: 'You find solid footing on a rocky ledge',
      effect: 'bonus_action',
      action: 'free_dodge'
    }
  ]
};

/**
 * Get a random environmental detail from a specific category
 * @param {string} category - The category to pull from
 * @returns {string} - Random environmental description
 */
function getEnvironmentalDetail(category) {
  const options = ENVIRONMENTAL_DETAILS[category];
  if (!options || options.length === 0) {
    return '';
  }
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get multiple random environmental details (no duplicates)
 * @param {number} count - Number of details to return
 * @returns {string[]} - Array of environmental descriptions
 */
function getRandomEnvironmentalDetails(count = 2) {
  const allCategories = Object.keys(ENVIRONMENTAL_DETAILS);
  const details = [];
  const usedCategories = new Set();
  
  for (let i = 0; i < count && usedCategories.size < allCategories.length; i++) {
    // Pick random category we haven't used yet
    let category;
    do {
      category = allCategories[Math.floor(Math.random() * allCategories.length)];
    } while (usedCategories.has(category));
    
    usedCategories.add(category);
    details.push(getEnvironmentalDetail(category));
  }
  
  return details;
}

/**
 * Create a complete environmental atmosphere description
 * @returns {string} - Full scene-setting description
 */
function generateAtmosphere() {
  const details = getRandomEnvironmentalDetails(3);
  return details.join(', ') + '.';
}

/**
 * Get a brief environmental flourish (1 detail)
 * @returns {string} - Single environmental detail
 */
function getEnvironmentalFlourish() {
  const categories = Object.keys(ENVIRONMENTAL_DETAILS);
  const category = categories[Math.floor(Math.random() * categories.length)];
  return getEnvironmentalDetail(category);
}

/**
 * Check if an environmental event should occur (low probability)
 * @returns {object|null} - Environmental event or null
 */
function checkEnvironmentalEvent() {
  // 5% chance per combat round
  if (Math.random() > 0.05) return null;
  
  const isHazard = Math.random() > 0.5;
  const events = isHazard ? ENVIRONMENTAL_EVENTS.hazards : ENVIRONMENTAL_EVENTS.advantages;
  
  return events[Math.floor(Math.random() * events.length)];
}

/**
 * Format distance for display
 * @param {number} distance - Distance in feet
 * @returns {string} - Formatted distance string in parentheses
 */
function formatDistance(distance) {
  if (distance <= 5) return '(melee range)';
  if (distance <= 10) return `(${distance} feet)`;
  if (distance <= 30) return `(${distance} feet away)`;
  if (distance <= 60) return `(across the battlefield, ${distance} feet)`;
  return `(at the far edge of the battlefield, ${distance} feet)`;
}

/**
 * Format distance from range band
 * @param {string} rangeBand - Range band (melee, near, far, distant)
 * @returns {string} - Formatted distance string
 */
function formatDistanceFromBand(rangeBand) {
  const distances = {
    melee: 5,
    near: 20,
    far: 50,
    distant: 90
  };
  
  return formatDistance(distances[rangeBand] || 20);
}

module.exports = {
  ENVIRONMENTAL_DETAILS,
  ENVIRONMENTAL_EVENTS,
  getEnvironmentalDetail,
  getRandomEnvironmentalDetails,
  generateAtmosphere,
  getEnvironmentalFlourish,
  checkEnvironmentalEvent,
  formatDistance,
  formatDistanceFromBand
};
