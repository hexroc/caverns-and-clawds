/**
 * Caverns & Clawds - Capstone Dungeon System
 * 
 * The Dreadnought's Depths - A cooperative dungeon capstone.
 * 
 * Features:
 * - Level 6 cap until capstone completed
 * - Party system for up to 3 agents
 * - 15 rooms across 3 floors + boss arena
 * - The Dreadnought boss fight with phases
 * - Victory rewards: XP, achievement, legendary loot
 */

const { v4: uuidv4 } = require('uuid');
const { HexGrid, hex, hexDistance, hexNeighbors, TERRAIN, generateRoom, seededRandom } = require('./hex-grid');
const { TacticalCombat, EVENT_DELAYS } = require('./tactical-combat');

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_CAP = 6;
const MAX_PARTY_SIZE = 3;
const MAX_PARTY_DEATHS = 3;
const ROOMS_PER_FLOOR = 5;
const TOTAL_FLOORS = 3;

// XP thresholds for level 6 (5e)
const XP_FOR_LEVEL_6 = 6500;
const XP_FOR_LEVEL_7 = 14000;

// ============================================================================
// ROOM TEMPLATES
// ============================================================================

const ROOM_TYPES = {
  combat: {
    name: 'Combat Room',
    description: 'Enemies lurk in the darkness ahead.',
    narrative: 'The party advances cautiously into the chamber, weapons at the ready. Ancient coral formations cast twisted shadows across the walls as bioluminescent algae pulses with an eerie blue glow. Then, movement—shapes emerge from the darkness, chitin scraping against stone. The enemy has been waiting.',
    gridRadius: 10,
    hasCombat: true
  },
  trap: {
    name: 'Trap Room',
    description: 'This chamber feels... dangerous.',
    narrative: 'Something about this chamber sets every nerve on edge. The floor tiles bear ancient markings, worn smooth by countless tides. Skeletal remains of unfortunate creatures litter the corners—a grim warning of what befell those who came before. The party exchanges wary glances.',
    gridRadius: 8,
    isEvent: true,
    eventType: 'trap'
  },
  rest: {
    name: 'Rest Alcove',
    description: 'A safe space to catch your breath.',
    narrative: 'At last, a moment of respite. This small alcove feels sheltered from the darkness that permeates these depths. Soft phosphorescent moss blankets the walls, and a natural spring bubbles from a crack in the stone—fresh water, clean and cold. The party settles in, tending wounds and catching their breath.',
    gridRadius: 6,
    allowsRest: true
  },
  treasure: {
    name: 'Treasure Chamber',
    description: 'Glittering pearls and ancient artifacts catch the light.',
    narrative: 'Glittering pearls and ancient artifacts catch the light, scattered across the chamber like stars fallen to the ocean floor. Golden coins bearing the marks of sunken empires lie heaped beside coral-encrusted chests. The party\'s eyes widen—fortune favors the bold, but greed has been the downfall of many who delved too deep.',
    gridRadius: 8,
    isEvent: true,
    eventType: 'treasure'
  },
  npc: {
    name: 'Encounter',
    description: 'Someone waits in the shadows ahead.',
    narrative: 'A figure emerges from the gloom—not an enemy, but something else entirely. In these treacherous depths, allies are as rare as they are valuable. Yet trust is a luxury few can afford. The party approaches with caution, ready for treachery but hoping for aid.',
    gridRadius: 8,
    isEvent: true,
    eventType: 'npc'
  },
  boss: {
    name: 'Boss Arena',
    description: 'The Dreadnought awaits.',
    narrative: 'The cavern opens into a vast arena, its ceiling lost in darkness above. The ground trembles with each thunderous heartbeat that echoes from somewhere ahead. Then they see it—the Dreadnought. An enormous crustacean abomination forged from the cursed shell of a thousand drowned souls, its carapace gleaming with eldritch energy. This is what they came for. This is where legends are made—or ended.',
    gridRadius: 15,
    isBoss: true
  },
  stairs: {
    name: 'Stairway',
    description: 'A passage leading deeper into the abyss.',
    narrative: 'A spiral staircase descends into the abyss, carved from living rock by claws far larger than any mortal creature. Cold current rises from below, carrying whispers of deeper horrors yet to come. The party steels themselves—there is no turning back now. Only forward, into the dark.',
    gridRadius: 6,
    hasStairs: true
  }
};

// Room distribution per floor
const FLOOR_LAYOUTS = [
  // Floor 1: Introduction - combat basics, first trap, treasure reward
  ['combat', 'combat', 'trap', 'treasure', 'stairs'],
  // Floor 2: Meet NPCs, more combat, treasure
  ['combat', 'combat', 'npc', 'treasure', 'stairs'],
  // Floor 3: Harder floor - trap, rest before boss, NPC for last supplies
  ['combat', 'combat', 'trap', 'rest', 'npc', 'stairs'],
  // Boss floor
  ['boss']
];

// ============================================================================
// ENCOUNTER DEFINITIONS (for scaling)
// ============================================================================

const CAPSTONE_ENCOUNTERS = {
  floor1: [
    { monsters: ['drowned_sailor', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['barnacle_horror', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['sea_wraith'] },
    // Mixed encounter with ranged unit
    { monsters: ['sahuagin_crossbowman', 'giant_crab', 'giant_crab'] },
  ],
  floor2: [
    { monsters: ['sea_wraith', 'drowned_sailor', 'drowned_sailor'] },
    { monsters: ['moray_terror', 'drowned_sailor'] },
    { monsters: ['anchor_wight'] },
    { monsters: ['treasure_mimic'] },
    // Mixed ranged/melee encounter
    { monsters: ['deep_archer', 'sahuagin_crossbowman', 'drowned_sailor'] },
  ],
  floor3: [
    { monsters: ['anchor_wight', 'barnacle_horror', 'barnacle_horror'] },
    { monsters: ['ghost_captain'] },
    { monsters: ['horror_shard', 'drowned_sailor', 'drowned_sailor'] },
    // Spellcaster encounter
    { monsters: ['spellcasting_eel', 'deep_archer'] },
    // All ranged encounter (kiting test)
    { monsters: ['deep_archer', 'sahuagin_crossbowman', 'sahuagin_crossbowman'] },
  ]
};

// ============================================================================
// THE DREADNOUGHT BOSS
// ============================================================================

const DREADNOUGHT = {
  id: 'the_dreadnought',
  name: 'The Dreadnought',
  description: 'An enormous crustacean abomination forged from the cursed shell of a thousand drowned souls. Its carapace gleams with eldritch energy.',
  char: '🦀',
  type: 'boss',
  team: 'enemy',
  
  // Base stats (scaled by party size)
  baseHp: 150, // Reduced from 200 for better balance
  hpPerExtraCharacter: 25, // +25 HP per char beyond 4 (reduced from 50)
  ac: 17,
  speed: 4,
  
  attackBonus: 8,
  attacks: [
    {
      id: 'crushing_claw',
      name: 'Crushing Claw',
      damage: '2d10+5',
      damageType: 'bludgeoning',
      description: 'A massive claw strike'
    },
    {
      id: 'tail_sweep',
      name: 'Tail Sweep',
      damage: '2d8',
      damageType: 'bludgeoning',
      special: 'prone',
      saveDC: 15,
      saveType: 'dex',
      description: 'Sweeps its tail in an arc, knocking targets prone'
    }
  ],
  
  attacksPerRound: 2,
  
  // Legendary actions (3 per round)
  legendaryActions: 3,
  legendaryAbilities: [
    {
      id: 'shell_slam',
      name: 'Shell Slam',
      cost: 1,
      damage: '1d8',
      damageType: 'bludgeoning',
      range: 'melee',
      description: 'All creatures in melee range take damage'
    },
    {
      id: 'summon_spawn',
      name: 'Summon Spawn',
      cost: 2,
      spawns: [
        { monsterId: 'dreadnought_spawn', count: 2 }
      ],
      description: 'Summons 2 Dreadnought Spawn'
    },
    {
      id: 'abyssal_roar',
      name: 'Abyssal Roar',
      cost: 3,
      saveDC: 14,
      saveType: 'wis',
      condition: 'frightened',
      description: 'All enemies must save or be frightened for 1 round'
    }
  ],
  
  // Phase configuration
  phases: [
    {
      phase: 1,
      hpThreshold: 1.0,
      name: 'Normal',
      description: 'The Dreadnought battles with calculated fury.'
    },
    {
      phase: 2,
      hpThreshold: 0.66,
      name: 'Regenerating',
      description: 'The Dreadnought\'s shell begins to pulse with dark energy!',
      regeneration: 5, // HP per round (reduced from 10 for balance)
      statChanges: {
        ac: 16  // Lowered from 18 - shell is healing, not hardening
      }
    },
    {
      phase: 3,
      hpThreshold: 0.33,
      name: 'Berserk',
      description: 'The Dreadnought enters a berserk frenzy! Its eyes glow red!',
      attacksPerRound: 3,
      regeneration: 0,
      statChanges: {
        attackBonus: 10,
        ac: 16
      }
    }
  ],
  
  // Rewards
  xpReward: 1000,
  pearlReward: 500,
  legendaryLoot: [
    { id: 'dreadnought_claw', name: 'Dreadnought\'s Claw', type: 'weapon', rarity: 'legendary', damage: '2d8+3', description: 'A massive claw torn from the beast. +3 to hit and damage.' },
    { id: 'abyssal_shell', name: 'Abyssal Shell', type: 'armor', rarity: 'legendary', ac: 18, description: 'Armor forged from the Dreadnought\'s carapace. AC 18, fire resistance.' },
    { id: 'eye_of_deep', name: 'Eye of the Deep', type: 'accessory', rarity: 'legendary', description: 'See through magical darkness. Advantage on perception checks.' },
    { id: 'krakens_heart', name: 'Kraken\'s Heart', type: 'trinket', rarity: 'legendary', description: 'Once per day, heal 50 HP. Grants water breathing.' }
  ],
  achievement: {
    id: 'dreadnought_slayer',
    name: 'Dreadnought Slayer',
    description: 'Defeated The Dreadnought in the capstone dungeon',
    unlocksLevelCap: true
  },
  title: 'Abyssal Conqueror'
};

// Dreadnought Spawn (summoned minions)
const DREADNOUGHT_SPAWN = {
  id: 'dreadnought_spawn',
  name: 'Dreadnought Spawn',
  description: 'A smaller version of the horror, spawned from its dark shell.',
  char: '🦐',
  type: 'monster',
  team: 'enemy',
  
  hp: 25,
  ac: 13,
  speed: 6,
  attackBonus: 4,
  damage: '1d6+2',
  damageType: 'slashing',
  
  dexMod: 2
};

// ============================================================================
// TRAP DEFINITIONS
// ============================================================================

const TRAPS = [
  {
    id: 'pressure_plate',
    name: 'Pressure Plate Trap',
    description: 'A concealed pressure plate triggers a volley of bone spikes!',
    saveDC: 14,
    saveType: 'dex',
    damage: '2d6',
    damageType: 'piercing',
    detectDC: 12
  },
  {
    id: 'poison_gas',
    name: 'Poison Gas Vent',
    description: 'Toxic gas erupts from the walls!',
    saveDC: 13,
    saveType: 'con',
    damage: '3d6',
    damageType: 'poison',
    detectDC: 14
  },
  {
    id: 'collapsing_floor',
    name: 'Collapsing Floor',
    description: 'The floor gives way beneath your claws!',
    saveDC: 15,
    saveType: 'dex',
    damage: '2d10',
    damageType: 'bludgeoning',
    detectDC: 13
  }
];

// ============================================================================
// NPC ENCOUNTER DEFINITIONS (Pillars of Eternity style events)
// ============================================================================

const NPC_ENCOUNTERS = [
  {
    id: 'wandering_merchant',
    name: 'Wandering Merchant',
    description: 'A hermit crab hauling a shell laden with goods scuttles toward you. His eyestalks twitch nervously as he sizes up your party.',
    dialogue: {
      greeting: '"Ah, travelers! Dangerous waters these are... but I have wares that might help you survive them. For the right price, of course."',
      haggleSuccess: '"Fine, fine! You drive a hard bargain. Take it before I change my mind."',
      haggleFail: '"Do I look like a charity? The price is the price."',
      intimidateSuccess: '"N-no need for violence! Here, take a discount, just... just let me pass!"',
      intimidateFail: '"I\'ve dealt with worse than you lot. Pay up or move along."',
      farewell: '"Safe travels! Try not to die before you can spend those pearls, eh?"'
    },
    services: [
      { id: 'potion_healing', name: 'Healing Potion', price: 25, stock: 3 },
      { id: 'potion_greater_healing', name: 'Greater Healing Potion', price: 75, stock: 2 },
      { id: 'antidote', name: 'Antidote', price: 30, stock: 2 },
      { id: 'rations', name: 'Rations', price: 5, stock: 5 }
    ],
    actions: [
      { id: 'buy', name: 'Browse Wares', skill: null, dc: null },
      { id: 'haggle', name: 'Haggle for Discount', skill: 'persuasion', dc: 14, discount: 0.25 },
      { id: 'intimidate', name: 'Intimidate for Discount', skill: 'intimidation', dc: 16, discount: 0.4, hostileOnFail: true },
      { id: 'leave', name: 'Leave Without Buying', skill: null, dc: null }
    ]
  },
  {
    id: 'scroll_peddler',
    name: 'Scroll Peddler',
    description: 'A wizened octopus draped in tattered robes guards a collection of waterproof scroll cases. Arcane symbols glow faintly on her tentacles.',
    dialogue: {
      greeting: '"Knowledge is power, little ones. And power... has a price. What secrets do you seek?"',
      haggleSuccess: '"Your tongue is as silver as a moonfish. Very well, a small concession."',
      haggleFail: '"These scrolls contain magics beyond your comprehension. The price reflects their worth."',
      persuadeInfo: '"Hmm, you show wisdom in asking. The Dreadnought fears fire and light. Its shell is weakest where it joins..."',
      farewell: '"May the currents carry you to victory. Or at least, an interesting death."'
    },
    services: [
      { id: 'scroll_shield', name: 'Scroll of Shield', price: 50, stock: 2 },
      { id: 'scroll_healing_word', name: 'Scroll of Healing Word', price: 60, stock: 2 },
      { id: 'scroll_bless', name: 'Scroll of Bless', price: 75, stock: 1 },
      { id: 'scroll_guiding_bolt', name: 'Scroll of Guiding Bolt', price: 80, stock: 1 }
    ],
    actions: [
      { id: 'buy', name: 'Browse Scrolls', skill: null, dc: null },
      { id: 'haggle', name: 'Haggle for Discount', skill: 'persuasion', dc: 15, discount: 0.2 },
      { id: 'ask_info', name: 'Ask About the Dreadnought', skill: 'persuasion', dc: 12, givesBossHint: true },
      { id: 'leave', name: 'Leave', skill: null, dc: null }
    ]
  },
  {
    id: 'crustacean_priest',
    name: 'Crustacean Priest',
    description: 'A massive lobster in ceremonial vestments tends a small shrine. Bioluminescent symbols pulse with healing energy. The priest\'s ancient eyes study your wounds with concern.',
    dialogue: {
      greeting: '"The Depths provide, young ones. I sense pain among you... and purpose. How may this humble servant aid your quest?"',
      healingOffer: '"For a donation of %PRICE% pearls, I can mend your wounds. The light of the Depths flows through all who believe."',
      freeHealSuccess: '"Your cause is just, and your need is great. The Depths demand no payment from the righteous today."',
      freeHealFail: '"I sympathize, truly. But the shrine needs upkeep, and pearls keep the light burning. Perhaps a small donation?"',
      blessing: '"Go with the blessing of the Depths. May your shells stay strong and your claws stay sharp."',
      farewell: '"Walk in the light, children. The Dreadnought\'s darkness cannot touch those who carry hope."'
    },
    services: [
      { id: 'heal_minor', name: 'Minor Healing (restore 20 HP)', price: 30, stock: 99 },
      { id: 'heal_major', name: 'Major Healing (restore 50 HP)', price: 75, stock: 99 },
      { id: 'heal_full', name: 'Full Restoration (full HP)', price: 150, stock: 99 },
      { id: 'cure_condition', name: 'Cure Condition', price: 50, stock: 99 },
      { id: 'resurrection', name: 'Resurrection (revive fallen)', price: 300, stock: 99 }
    ],
    actions: [
      { id: 'buy', name: 'Request Healing', skill: null, dc: null },
      { id: 'plead', name: 'Plead for Free Healing', skill: 'persuasion', dc: 18, freeService: 'heal_minor' },
      { id: 'donate', name: 'Donate Extra (get blessing)', skill: null, dc: null, bonusCost: 50, givesBuff: true },
      { id: 'leave', name: 'Leave', skill: null, dc: null }
    ]
  },
  {
    id: 'shady_dealer',
    name: 'Shady Dealer',
    description: 'A scarred moray eel emerges from a crevice, beady eyes gleaming with avarice. Several suspicious-looking items hang from hooks embedded in his hide.',
    dialogue: {
      greeting: '"Well, well... adventurers. I got things you won\'t find anywhere else. Quality merchandise, no questions asked."',
      haggleSuccess: '"Tch. Fine. But you didn\'t get this price from me, understand?"',
      haggleFail: '"You want charity, go find a priest. This is business."',
      intimidateSuccess: '"Okay, okay! Take it easy! Here, half price, just... put those claws away."',
      intimidateFail: '"Ha! You think you scare me? I\'ve swum with sharks, little crab. Pay or leave."',
      deceptionSuccess: '"Ohhh, you\'re with THEM. Why didn\'t you say so? Friends get the special rate."',
      deceptionFail: '"Nice try. I know everyone worth knowing down here, and I don\'t know you."',
      farewell: '"Pleasure doing business. If anyone asks, we never met."'
    },
    services: [
      { id: 'poison_vial', name: 'Poison Vial (+2d6 poison damage)', price: 100, stock: 2 },
      { id: 'smoke_bomb', name: 'Smoke Bomb (escape combat)', price: 80, stock: 1 },
      { id: 'lucky_pearl', name: 'Lucky Pearl (reroll one check)', price: 150, stock: 1 },
      { id: 'resurrection_voucher', name: 'Resurrection Voucher', price: 250, stock: 1 }
    ],
    actions: [
      { id: 'buy', name: 'Browse Goods', skill: null, dc: null },
      { id: 'haggle', name: 'Haggle', skill: 'persuasion', dc: 16, discount: 0.2 },
      { id: 'intimidate', name: 'Intimidate', skill: 'intimidation', dc: 14, discount: 0.5 },
      { id: 'deceive', name: 'Claim to Know His Boss', skill: 'deception', dc: 17, discount: 0.3 },
      { id: 'leave', name: 'Leave', skill: null, dc: null }
    ]
  },
  {
    id: 'wounded_survivor',
    name: 'Wounded Survivor',
    description: 'A battered crayfish in dented armor lies propped against the wall, clutching a wound. Her breathing is labored, but her eyes still hold determination.',
    dialogue: {
      greeting: '"*cough* ...more adventurers? Either I\'m hallucinating, or you\'re all about to die like my party did."',
      helpOffer: '"If you could spare any healing... I can tell you what killed my friends. Might save your shells."',
      helpSuccess: '"Thank you... truly. Here—take this. It was our scout\'s. She\'d want it to help someone finish what we started."',
      noHelp: '"I understand. Resources are scarce. Just... be careful in the next chamber. Something hunts there."',
      infoShare: '"The Dreadnought has minions. Barnacle Horrors that ambush from the walls. Listen for clicking..."',
      joinOffer: '"I... I can still fight. If you\'ll have me. I owe those monsters a debt."',
      farewell: '"Give \'em hell for me. For all of us."'
    },
    actions: [
      { id: 'heal', name: 'Share Healing Supplies', skill: null, dc: null, cost: { type: 'item', item: 'potion_healing' }, givesReward: true },
      { id: 'persuade_info', name: 'Ask for Information', skill: 'persuasion', dc: 10, givesInfo: true },
      { id: 'medicine', name: 'Treat Wounds (no items)', skill: 'medicine', dc: 14, givesReward: true },
      { id: 'recruit', name: 'Offer to Let Her Join', skill: 'persuasion', dc: 12, canRecruit: true },
      { id: 'leave', name: 'Leave Her', skill: null, dc: null }
    ],
    rewards: {
      help: { item: 'lucky_charm', pearls: 50 },
      recruit: { temporaryAlly: 'wounded_survivor_ally' }
    }
  },
  {
    id: 'lost_adventurer',
    name: 'Lost Adventurer',
    description: 'A young shrimp in oversized armor stands at a crossroads, map held upside down, looking utterly confused. He jumps when he sees you.',
    dialogue: {
      greeting: '"Oh! Oh thank the Depths, other people! I\'ve been wandering for hours. Is this the way to the exit? Please say yes."',
      directions: '"The boss room? You\'re GOING there? On PURPOSE? ...you\'re either very brave or very stupid."',
      shareMap: '"Well, I did map out some of the tunnels before I got lost. Here, take it—I\'m getting out of here!"',
      intimidateFlee: '"OKAY OKAY I\'M GOING! Here, take my stuff, just don\'t hurt me!"',
      joinSuccess: '"You know what? Maybe strength in numbers is the play here. I\'m in! Just... stay in front of me."',
      farewell: '"Good luck! I\'ll tell stories about you! Assuming you survive! Which you probably won\'t!"'
    },
    actions: [
      { id: 'help_navigate', name: 'Help Him Find Exit', skill: 'survival', dc: 10, givesMap: true },
      { id: 'ask_info', name: 'Ask What He\'s Seen', skill: 'persuasion', dc: 8, givesInfo: true },
      { id: 'intimidate', name: 'Demand His Supplies', skill: 'intimidation', dc: 10, givesLoot: true, karmaLoss: true },
      { id: 'recruit', name: 'Convince Him to Join', skill: 'persuasion', dc: 14, canRecruit: true },
      { id: 'leave', name: 'Wish Him Luck', skill: null, dc: null }
    ],
    rewards: {
      map: { revealRooms: true },
      loot: { pearls: 30, item: 'rations' },
      recruit: { temporaryAlly: 'lost_adventurer_ally' }
    }
  }
];

// ============================================================================
// EVENT TEMPLATES (Pillars of Eternity style choice events)
// ============================================================================

const TRAP_EVENTS = [
  {
    id: 'pressure_plates',
    name: 'The Trapped Corridor',
    narrative: 'The corridor ahead is lined with ancient tiles. Some bear faded symbols, others are cracked and worn. A skeleton lies crumpled halfway through, its shell shattered.',
    actions: [
      { 
        id: 'study', 
        name: 'Study the Patterns', 
        description: 'Carefully analyze which tiles are safe.',
        skill: 'perception', 
        dc: 14,
        successText: 'You notice a pattern—tiles with wave symbols are safe. You mark a path through.',
        failText: 'The symbols blur together. You can\'t discern any pattern.',
        successEffect: { disarmTrap: true }
      },
      { 
        id: 'disarm', 
        name: 'Disable the Mechanism', 
        description: 'Find and disable the trap\'s trigger.',
        skill: 'sleight_of_hand', 
        dc: 16,
        successText: 'Your nimble claws find the pressure mechanism and jam it. The trap is disabled.',
        failText: 'You trigger the trap! Spikes shoot from the walls!',
        successEffect: { disarmTrap: true },
        failEffect: { triggerTrap: true, damage: '2d6', damageType: 'piercing', saveType: 'dex', saveDC: 14 }
      },
      { 
        id: 'rush', 
        name: 'Sprint Through', 
        description: 'Move fast enough to avoid the worst of it.',
        skill: 'acrobatics', 
        dc: 15,
        successText: 'You dash through, tiles clicking harmlessly behind you!',
        failText: 'A tile depresses underfoot—pain lances through your leg!',
        successEffect: { passSafely: true },
        failEffect: { damage: '1d8', damageType: 'piercing' }
      },
      { 
        id: 'tank', 
        name: 'Shield the Party', 
        description: 'Use your body to block the trap for others.',
        skill: 'constitution', 
        dc: 12,
        successText: 'Spikes glance off your hardened shell as you shield your allies.',
        failText: 'The spikes pierce even your defenses, but your allies pass safely.',
        successEffect: { passSafely: true, heroic: true },
        failEffect: { damage: '2d6', damageType: 'piercing', partyPassesSafely: true }
      },
      { 
        id: 'wait', 
        name: 'Let Others Go First', 
        description: 'Observe what happens to the party.',
        skill: null, 
        dc: null,
        successText: 'You hang back cautiously.',
        effect: { lastInLine: true }
      }
    ],
    resolution: {
      allSuccess: 'The party navigates the trapped corridor without incident.',
      someSuccess: 'The party pushes through, though not without cost.',
      allFail: 'The corridor exacts a heavy toll on everyone.'
    }
  },
  {
    id: 'poison_chamber',
    name: 'The Miasma Chamber',
    narrative: 'A thick, sickly-green mist fills this chamber. The skeletal remains of sea creatures litter the floor. Somewhere, you can hear the hiss of escaping gas.',
    actions: [
      { 
        id: 'find_source', 
        name: 'Locate Gas Source', 
        description: 'Find where the poison is coming from.',
        skill: 'investigation', 
        dc: 13,
        successText: 'You spot the cracked vent pipes and block them with debris.',
        failText: 'The mist makes it impossible to see. Your lungs burn.',
        successEffect: { disarmTrap: true },
        failEffect: { damage: '1d6', damageType: 'poison' }
      },
      { 
        id: 'hold_breath', 
        name: 'Hold Breath and Run', 
        description: 'Take a deep breath and sprint through.',
        skill: 'constitution', 
        dc: 14,
        successText: 'You make it through before needing to breathe!',
        failText: 'You gasp involuntarily—the poison sears your gills!',
        successEffect: { passSafely: true },
        failEffect: { damage: '2d6', damageType: 'poison', condition: 'poisoned' }
      },
      { 
        id: 'fan_clear', 
        name: 'Create Air Current', 
        description: 'Use large movements to disperse the gas.',
        skill: 'athletics', 
        dc: 15,
        successText: 'Your powerful strokes create a current that clears a path!',
        failText: 'You only stir up more poison, making it worse.',
        successEffect: { clearPath: true, helpOthers: true },
        failEffect: { damage: '1d8', damageType: 'poison' }
      },
      { 
        id: 'antidote', 
        name: 'Use Antidote', 
        description: 'Take preventative medicine.',
        skill: null, 
        dc: null,
        requiresItem: 'antidote',
        successText: 'The antidote protects you from the worst effects.',
        effect: { passSafely: true, consumeItem: 'antidote' }
      }
    ],
    resolution: {
      allSuccess: 'The party clears the poison chamber unscathed.',
      someSuccess: 'Most make it through, though some bear the marks of poison.',
      allFail: 'The poison takes its toll on everyone. You stagger out, weakened.'
    }
  },
  {
    id: 'collapsing_tunnel',
    name: 'The Unstable Passage',
    narrative: 'Cracks spider across the ceiling. Dust and small stones rain down constantly. The tunnel groans ominously—it won\'t hold for long.',
    actions: [
      { 
        id: 'assess', 
        name: 'Find Safe Route', 
        description: 'Identify the sturdiest path.',
        skill: 'survival', 
        dc: 13,
        successText: 'You trace a path along the more stable sections of wall.',
        failText: 'Every route looks equally dangerous.',
        successEffect: { safePath: true, helpOthers: true }
      },
      { 
        id: 'brace', 
        name: 'Brace the Ceiling', 
        description: 'Hold up the weakest section for others.',
        skill: 'athletics', 
        dc: 16,
        successText: 'Your strength holds back the collapse! Others scramble past.',
        failText: 'The weight is too much! Stones crash down around you.',
        successEffect: { heroic: true, partyPassesSafely: true },
        failEffect: { damage: '3d6', damageType: 'bludgeoning' }
      },
      { 
        id: 'quick_dash', 
        name: 'Sprint Through', 
        description: 'Run before it collapses.',
        skill: 'acrobatics', 
        dc: 14,
        successText: 'You dive through just as rubble crashes behind you!',
        failText: 'Debris catches you mid-stride!',
        successEffect: { passSafely: true },
        failEffect: { damage: '2d6', damageType: 'bludgeoning' }
      },
      { 
        id: 'wait', 
        name: 'Wait for Opening', 
        description: 'Time your passage carefully.',
        skill: 'perception', 
        dc: 12,
        successText: 'You time it perfectly, slipping through a gap in the falling debris.',
        failText: 'You hesitate too long—the tunnel collapses!',
        successEffect: { passSafely: true },
        failEffect: { damage: '2d8', damageType: 'bludgeoning' }
      }
    ],
    resolution: {
      allSuccess: 'Everyone makes it through before the tunnel collapses behind you.',
      someSuccess: 'The party escapes, though some bear bruises from falling stones.',
      allFail: 'You dig yourselves out of the rubble, battered but alive.'
    }
  }
];

const TREASURE_EVENTS = [
  {
    id: 'suspicious_chest',
    name: 'The Ornate Chest',
    narrative: 'An ornate chest sits in an alcove, seemingly untouched by time. Its surface gleams with an almost hungry light. Too perfect. Too convenient.',
    actions: [
      { 
        id: 'inspect', 
        name: 'Check for Traps', 
        description: 'Carefully examine before touching.',
        skill: 'investigation', 
        dc: 14,
        successText: 'You notice a thin wire connected to the lid—a trap! You disarm it.',
        failText: 'It looks safe to you. (It might not be.)',
        successEffect: { disarmChestTrap: true }
      },
      { 
        id: 'open_carefully', 
        name: 'Open Carefully', 
        description: 'Slowly lift the lid.',
        skill: 'sleight_of_hand', 
        dc: 12,
        successText: 'The chest opens smoothly, revealing treasure within!',
        failText: 'CLICK. Oh no.',
        successEffect: { getTreasure: true },
        failEffect: { trapTrigger: true, damage: '2d6', damageType: 'piercing' }
      },
      { 
        id: 'smash', 
        name: 'Smash It Open', 
        description: 'Break the chest with brute force.',
        skill: 'athletics', 
        dc: 10,
        successText: 'The chest splinters! Treasure scatters across the floor.',
        failText: 'Your blow triggers a hidden mechanism!',
        successEffect: { getTreasure: true, scatteredLoot: true },
        failEffect: { trapTrigger: true, damage: '1d8', damageType: 'piercing' }
      },
      { 
        id: 'detect_magic', 
        name: 'Sense for Magic', 
        description: 'Feel for magical auras.',
        skill: 'arcana', 
        dc: 13,
        successText: 'A faint transmutation aura... the chest itself is not what it seems!',
        failText: 'You sense nothing unusual.',
        successEffect: { detectMimic: true }
      },
      { 
        id: 'leave', 
        name: 'Leave It', 
        description: 'Not worth the risk.',
        skill: null, 
        dc: null,
        effect: { noTreasure: true }
      }
    ],
    hasMimicChance: 0.2,
    loot: { pearls: [50, 150], items: ['uncommon', 'rare'] }
  },
  {
    id: 'skeleton_hoard',
    name: 'The Fallen Adventurer',
    narrative: 'A skeleton in rusted armor lies against the wall, bony fingers still clutching a leather satchel. Whatever killed them left the valuables untouched.',
    actions: [
      { 
        id: 'loot', 
        name: 'Search the Body', 
        description: 'Take what they no longer need.',
        skill: null, 
        dc: null,
        successText: 'You find pearls, a potion, and a tattered map.',
        effect: { getTreasure: true }
      },
      { 
        id: 'respectful', 
        name: 'Search Respectfully', 
        description: 'Take only what you need, say a prayer.',
        skill: null, 
        dc: null,
        successText: 'You take only essentials and offer respects. Something feels... lighter.',
        effect: { getTreasure: true, karmaBonus: true, reducedLoot: true }
      },
      { 
        id: 'examine', 
        name: 'Examine Cause of Death', 
        description: 'Figure out what killed them.',
        skill: 'medicine', 
        dc: 12,
        successText: 'Claw marks on the armor. Something with multiple limbs. Ambush predator.',
        failText: 'Hard to tell. Could be anything down here.',
        successEffect: { warningInfo: true }
      },
      { 
        id: 'leave', 
        name: 'Leave Them in Peace', 
        description: 'They\'ve suffered enough.',
        skill: null, 
        dc: null,
        effect: { noTreasure: true, karmaBonus: true }
      }
    ],
    loot: { pearls: [30, 80], items: ['common', 'uncommon'] }
  },
  {
    id: 'hidden_cache',
    name: 'The Loose Stone',
    narrative: 'One stone in the wall sits slightly askew. Behind it, darkness. Someone hid something here—the question is whether they meant to come back for it.',
    actions: [
      { 
        id: 'reach_in', 
        name: 'Reach Inside', 
        description: 'Stick your claw in and feel around.',
        skill: 'dexterity', 
        dc: 10,
        successText: 'Your claw closes around a small pouch! Pearls!',
        failText: 'PAIN! Something bit you!',
        successEffect: { getTreasure: true },
        failEffect: { damage: '1d4', damageType: 'piercing', condition: 'poisoned' }
      },
      { 
        id: 'light', 
        name: 'Shine Light Inside', 
        description: 'See before you reach.',
        skill: 'perception', 
        dc: 8,
        requiresItem: 'torch',
        successText: 'A small venomous fish guards the cache. You can see the treasure behind it.',
        failText: 'The light reflects off something metallic, but you can\'t quite see...',
        successEffect: { revealDanger: true }
      },
      { 
        id: 'widen', 
        name: 'Break Open the Wall', 
        description: 'Make the hole bigger.',
        skill: 'athletics', 
        dc: 14,
        successText: 'The wall crumbles, revealing a hidden compartment with treasure!',
        failText: 'The noise attracts attention... and the cache was empty anyway.',
        successEffect: { getTreasure: true, bonusLoot: true },
        failEffect: { alertEnemies: true }
      },
      { 
        id: 'leave', 
        name: 'Ignore It', 
        description: 'Could be a trap.',
        skill: null, 
        dc: null,
        effect: { noTreasure: true }
      }
    ],
    loot: { pearls: [20, 60], items: ['common'] }
  }
];

// ============================================================================
// TREASURE TABLES
// ============================================================================

const TREASURE_POOLS = {
  common: [
    { id: 'potion_healing', name: 'Healing Potion', weight: 5 },
    { id: 'rations', name: 'Rations', weight: 3 },
    { id: 'torch', name: 'Torch', weight: 2 }
  ],
  uncommon: [
    { id: 'potion_greater_healing', name: 'Greater Healing Potion', weight: 4 },
    { id: 'scroll_shield', name: 'Scroll of Shield', weight: 3 },
    { id: 'pearl_bag', name: 'Bag of Pearls (50)', pearls: 50, weight: 3 }
  ],
  rare: [
    { id: 'resurrection_voucher', name: 'Resurrection Voucher', weight: 2 },
    { id: 'pearl_hoard', name: 'Pearl Hoard (200)', pearls: 200, weight: 2 }
  ]
};

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

function initCapstoneSchema(db) {
  // Capstone instances
  db.exec(`
    CREATE TABLE IF NOT EXISTS capstone_instances (
      id TEXT PRIMARY KEY,
      leader_id TEXT NOT NULL,
      status TEXT DEFAULT 'forming',
      current_floor INTEGER DEFAULT 1,
      current_room INTEGER DEFAULT 1,
      death_count INTEGER DEFAULT 0,
      rooms_cleared TEXT DEFAULT '[]',
      room_states TEXT DEFAULT '{}',
      boss_state TEXT DEFAULT NULL,
      combat_id TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    );
    
    CREATE TABLE IF NOT EXISTS capstone_party (
      id TEXT PRIMARY KEY,
      capstone_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      character_id TEXT NOT NULL,
      henchman_id TEXT,
      status TEXT DEFAULT 'alive',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capstone_id) REFERENCES capstone_instances(id)
    );
    
    CREATE TABLE IF NOT EXISTS capstone_invites (
      id TEXT PRIMARY KEY,
      capstone_id TEXT NOT NULL,
      from_agent_id TEXT NOT NULL,
      to_agent_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (capstone_id) REFERENCES capstone_instances(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_capstone_party_capstone ON capstone_party(capstone_id);
    CREATE INDEX IF NOT EXISTS idx_capstone_invites_to ON capstone_invites(to_agent_id);
  `);
}

// ============================================================================
// CAPSTONE MANAGER CLASS
// ============================================================================

class CapstoneManager {
  constructor(db) {
    this.db = db;
    this.activeCombats = new Map(); // capstoneId -> TacticalCombat
    this.broadcastToRun = null; // Set by server.js for event broadcasting
    initCapstoneSchema(db);
  }
  
  /**
   * Set the broadcast function for sending events to spectators
   */
  setBroadcastFunction(fn) {
    this.broadcastToRun = fn;
  }
  
  /**
   * Broadcast an RP event (dialogue, roll, narrative) to spectators
   */
  _broadcastRPEvent(capstoneId, eventType, data) {
    if (!this.broadcastToRun) return;
    this.broadcastToRun(capstoneId, {
      type: 'rp_event',
      eventType,
      timestamp: Date.now(),
      ...data
    });
  }
  
  /**
   * Register combat event listener to broadcast to spectators
   */
  _registerCombatBroadcast(capstoneId, combat) {
    if (!this.broadcastToRun) return;
    
    combat.on((event) => {
      // Broadcast combat events to spectators
      this.broadcastToRun(capstoneId, {
        type: 'combat_event',
        event
      });
    });
  }
  
  // ============================================================================
  // LEVEL CAP SYSTEM
  // ============================================================================
  
  /**
   * Check if a character is at level cap
   */
  isAtLevelCap(character) {
    // Support both clawds table (level directly) and characters table (stats.level)
    const level = character.level ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.level ?? 0;
    return level >= LEVEL_CAP;
  }
  
  /**
   * Check if character has completed capstone (unlocked level cap)
   */
  hasCompletedCapstone(characterId) {
    const achievements = this.db.prepare(`
      SELECT * FROM character_achievements 
      WHERE character_id = ? AND achievement_id = 'dreadnought_slayer'
    `).get(characterId);
    return !!achievements;
  }
  
  /**
   * Calculate XP with level cap enforcement
   */
  calculateXP(character, xpGained) {
    // Support both clawds table (level/xp directly) and characters table (stats.level/stats.xp)
    const level = character.level ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.level ?? 0;
    const currentXP = character.xp ?? (typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats)?.xp ?? 0;
    
    // If at level cap and hasn't completed capstone, freeze XP
    if (level >= LEVEL_CAP && !this.hasCompletedCapstone(character.id)) {
      // Can't exceed the XP for level 7
      const cappedXP = Math.min(currentXP + xpGained, XP_FOR_LEVEL_7 - 1);
      return { 
        newXP: cappedXP, 
        xpGained: cappedXP - currentXP,
        capped: true,
        message: 'XP frozen at level 6 until capstone completed'
      };
    }
    
    return { 
      newXP: stats.xp + xpGained, 
      xpGained,
      capped: false 
    };
  }
  
  // ============================================================================
  // INSTANCE MANAGEMENT
  // ============================================================================
  
  /**
   * Create a new capstone instance
   */
  create(leaderId, characterId) {
    // Verify character eligibility
    const character = this.db.prepare('SELECT * FROM clawds WHERE id = ? AND agent_id = ?')
      .get(characterId, leaderId);
    
    if (!character) {
      return { success: false, error: 'Character not found' };
    }
    
    if (character.level < 5) {
      return { success: false, error: 'Character must be level 5-6 to enter capstone' };
    }
    
    if (character.level > LEVEL_CAP) {
      return { success: false, error: 'Character level too high for capstone' };
    }
    
    // Check if leader already has an active capstone
    const existing = this.db.prepare(`
      SELECT ci.* FROM capstone_instances ci
      JOIN capstone_party cp ON ci.id = cp.capstone_id
      WHERE cp.agent_id = ? AND ci.status IN ('forming', 'active')
    `).get(leaderId);
    
    if (existing) {
      return { success: false, error: 'Already in an active capstone', capstoneId: existing.id };
    }
    
    const id = uuidv4();
    const partyId = uuidv4();
    
    // Create instance
    this.db.prepare(`
      INSERT INTO capstone_instances (id, leader_id, status, current_floor, current_room, death_count)
      VALUES (?, ?, 'forming', 1, 1, 0)
    `).run(id, leaderId);
    
    // Add leader to party
    this.db.prepare(`
      INSERT INTO capstone_party (id, capstone_id, agent_id, character_id, status)
      VALUES (?, ?, ?, ?, 'alive')
    `).run(partyId, id, leaderId, characterId);
    
    return { 
      success: true, 
      capstoneId: id,
      message: 'Capstone instance created. Invite others or start when ready.',
      maxPartySize: MAX_PARTY_SIZE
    };
  }
  
  /**
   * Get capstone instance status
   */
  getStatus(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return null;
    
    const party = this.db.prepare(`
      SELECT cp.*, c.name as character_name, u.name as agent_name, c.level, c.hp_current, c.hp_max
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      JOIN users u ON cp.agent_id = u.id
      WHERE cp.capstone_id = ?
    `).all(capstoneId);
    
    const invites = this.db.prepare(`
      SELECT ci.*, u.name as from_name, u2.name as to_name
      FROM capstone_invites ci
      JOIN users u ON ci.from_agent_id = u.id
      JOIN users u2 ON ci.to_agent_id = u2.id
      WHERE ci.capstone_id = ? AND ci.status = 'pending'
    `).all(capstoneId);
    
    return {
      ...instance,
      roomsCleared: JSON.parse(instance.rooms_cleared || '[]'),
      roomStates: JSON.parse(instance.room_states || '{}'),
      party,
      pendingInvites: invites,
      deathsRemaining: MAX_PARTY_DEATHS - instance.death_count
    };
  }
  
  /**
   * Invite another agent to the party
   */
  invite(capstoneId, fromAgentId, toAgentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.leader_id !== fromAgentId) return { success: false, error: 'Only leader can invite' };
    if (instance.status !== 'forming') return { success: false, error: 'Cannot invite after dungeon started' };
    
    // Check party size
    const partyCount = this.db.prepare('SELECT COUNT(*) as count FROM capstone_party WHERE capstone_id = ?')
      .get(capstoneId).count;
    if (partyCount >= MAX_PARTY_SIZE) {
      return { success: false, error: `Party is full (max ${MAX_PARTY_SIZE})` };
    }
    
    // Check if already invited
    const existingInvite = this.db.prepare(`
      SELECT * FROM capstone_invites 
      WHERE capstone_id = ? AND to_agent_id = ? AND status = 'pending'
    `).get(capstoneId, toAgentId);
    if (existingInvite) return { success: false, error: 'Already invited' };
    
    // Check if already in party
    const inParty = this.db.prepare(`
      SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?
    `).get(capstoneId, toAgentId);
    if (inParty) return { success: false, error: 'Already in party' };
    
    const inviteId = uuidv4();
    this.db.prepare(`
      INSERT INTO capstone_invites (id, capstone_id, from_agent_id, to_agent_id, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(inviteId, capstoneId, fromAgentId, toAgentId);
    
    return { success: true, inviteId };
  }
  
  /**
   * Accept an invite and join the party
   */
  join(capstoneId, agentId, characterId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.status !== 'forming') return { success: false, error: 'Capstone already started' };
    
    // Check for valid invite
    const invite = this.db.prepare(`
      SELECT * FROM capstone_invites 
      WHERE capstone_id = ? AND to_agent_id = ? AND status = 'pending'
    `).get(capstoneId, agentId);
    if (!invite) return { success: false, error: 'No pending invite found' };
    
    // Verify character
    const character = this.db.prepare('SELECT * FROM clawds WHERE id = ? AND agent_id = ?')
      .get(characterId, agentId);
    if (!character) return { success: false, error: 'Character not found' };
    
    if (character.level < 5 || character.level > LEVEL_CAP) {
      return { success: false, error: 'Character must be level 5-6' };
    }
    
    // Check party isn't full
    const partyCount = this.db.prepare('SELECT COUNT(*) as count FROM capstone_party WHERE capstone_id = ?')
      .get(capstoneId).count;
    if (partyCount >= MAX_PARTY_SIZE) {
      return { success: false, error: 'Party is full' };
    }
    
    // Accept invite
    this.db.prepare(`UPDATE capstone_invites SET status = 'accepted' WHERE id = ?`).run(invite.id);
    
    // Add to party
    const partyId = uuidv4();
    this.db.prepare(`
      INSERT INTO capstone_party (id, capstone_id, agent_id, character_id, status)
      VALUES (?, ?, ?, ?, 'alive')
    `).run(partyId, capstoneId, agentId, characterId);
    
    return { success: true, message: 'Joined party successfully' };
  }
  
  /**
   * Leave the party
   */
  leave(capstoneId, agentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    // Leader can't leave, must abandon
    if (instance.leader_id === agentId) {
      return { success: false, error: 'Leader cannot leave. Use abandon to end the capstone.' };
    }
    
    // Can only leave if forming
    if (instance.status === 'active') {
      return { success: false, error: 'Cannot leave during active dungeon' };
    }
    
    this.db.prepare('DELETE FROM capstone_party WHERE capstone_id = ? AND agent_id = ?')
      .run(capstoneId, agentId);
    
    return { success: true, message: 'Left party' };
  }
  
  /**
   * Start the dungeon
   */
  start(capstoneId, agentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.leader_id !== agentId) return { success: false, error: 'Only leader can start' };
    if (instance.status !== 'forming') return { success: false, error: 'Already started' };
    
    // Generate dungeon layout
    const layout = this._generateDungeon(capstoneId);
    
    // Update status
    this.db.prepare(`
      UPDATE capstone_instances 
      SET status = 'active', started_at = datetime('now'), room_states = ?
      WHERE id = ?
    `).run(JSON.stringify(layout), capstoneId);
    
    return { 
      success: true, 
      message: 'The Dreadnought\'s Depths awaits...', 
      dungeon: layout,
      currentRoom: this._getRoomInfo(1, 1, layout)
    };
  }
  
  // ============================================================================
  // DUNGEON GENERATION
  // ============================================================================
  
  /**
   * Generate full dungeon layout
   */
  _generateDungeon(capstoneId) {
    const rng = seededRandom(capstoneId);
    const dungeon = {
      floors: []
    };
    
    for (let floor = 0; floor < TOTAL_FLOORS; floor++) {
      const floorLayout = FLOOR_LAYOUTS[floor];
      const rooms = [];
      
      // Shuffle room order (except stairs which stay at end)
      const shuffled = [...floorLayout.slice(0, -1)].sort(() => rng() - 0.5);
      shuffled.push(floorLayout[floorLayout.length - 1]);
      
      for (let room = 0; room < shuffled.length; room++) {
        const roomType = shuffled[room];
        const template = ROOM_TYPES[roomType];
        
        rooms.push({
          id: `f${floor + 1}r${room + 1}`,
          floor: floor + 1,
          room: room + 1,
          type: roomType,
          name: template.name,
          description: template.description,
          narrative: template.narrative,
          cleared: false,
          state: this._generateRoomState(roomType, floor + 1, rng)
        });
      }
      
      dungeon.floors.push({ floor: floor + 1, rooms });
    }
    
    // Add boss floor
    dungeon.floors.push({
      floor: 4,
      rooms: [{
        id: 'f4r1',
        floor: 4,
        room: 1,
        type: 'boss',
        name: 'The Dreadnought\'s Lair',
        description: 'The final chamber. The Dreadnought awaits.',
        narrative: ROOM_TYPES.boss.narrative,
        cleared: false,
        state: { boss: DREADNOUGHT }
      }]
    });
    
    return dungeon;
  }
  
  /**
   * Generate room-specific state
   */
  _generateRoomState(roomType, floor, rng) {
    const state = {};
    
    switch (roomType) {
      case 'combat':
        const encounters = CAPSTONE_ENCOUNTERS[`floor${floor}`] || CAPSTONE_ENCOUNTERS.floor1;
        const encounter = encounters[Math.floor(rng() * encounters.length)];
        state.encounter = encounter;
        state.combat = null;
        break;
        
      case 'trap':
        // Select a trap event template
        state.event = TRAP_EVENTS[Math.floor(rng() * TRAP_EVENTS.length)];
        state.eventType = 'trap';
        state.resolved = false;
        state.characterActions = {}; // Track each character's chosen action
        state.results = [];
        break;
        
      case 'treasure':
        // Select a treasure event template
        state.event = TREASURE_EVENTS[Math.floor(rng() * TREASURE_EVENTS.length)];
        state.eventType = 'treasure';
        state.resolved = false;
        state.characterActions = {};
        state.results = [];
        // Pre-generate the loot
        state.loot = this._generateTreasure(floor, rng);
        // Check for mimic if event has that chance
        if (state.event.hasMimicChance && rng() < state.event.hasMimicChance) {
          state.isMimic = true;
        }
        break;
        
      case 'npc':
        // Select an NPC encounter
        state.npc = NPC_ENCOUNTERS[Math.floor(rng() * NPC_ENCOUNTERS.length)];
        state.eventType = 'npc';
        state.resolved = false;
        state.characterActions = {};
        state.results = [];
        state.interactionLog = []; // Track conversation/actions
        state.discountApplied = 0; // Track any negotiated discounts
        state.hostileNpc = false;
        break;
        
      case 'rest':
        state.rested = false;
        break;
        
      case 'stairs':
        state.nextFloor = floor + 1;
        break;
    }
    
    return state;
  }
  
  /**
   * Generate treasure for a room
   */
  _generateTreasure(floor, rng) {
    const items = [];
    let pearls = Math.floor(rng() * 50) + (floor * 25);
    
    // Roll for items
    const pools = ['common', 'uncommon'];
    if (floor >= 2) pools.push('rare');
    
    for (const poolName of pools) {
      if (rng() < 0.5 + (floor * 0.1)) {
        const pool = TREASURE_POOLS[poolName];
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = rng() * totalWeight;
        
        for (const item of pool) {
          roll -= item.weight;
          if (roll <= 0) {
            if (item.pearls) {
              pearls += item.pearls;
            } else {
              items.push({ id: item.id, name: item.name });
            }
            break;
          }
        }
      }
    }
    
    return { items, pearls };
  }
  
  /**
   * Get room info
   */
  _getRoomInfo(floor, room, layout) {
    const floorData = layout.floors.find(f => f.floor === floor);
    if (!floorData) return null;
    return floorData.rooms.find(r => r.room === room);
  }
  
  // ============================================================================
  // NAVIGATION & ROOM ACTIONS
  // ============================================================================
  
  /**
   * Check and cleanup completed combats (auto-battle can end while no actions are taken)
   */
  _checkCombatCleanup(capstoneId) {
    const combat = this.activeCombats.get(capstoneId);
    if (!combat) return null;
    
    // If combat ended (victory or defeat), clean it up
    if (combat.status === 'victory') {
      const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
      const layout = JSON.parse(instance.room_states || '{}');
      const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
      
      // Check if this was a boss fight
      const isBoss = roomInfo.type === 'boss';
      
      // Mark room as cleared
      roomInfo.cleared = true;
      this._updateRoomState(instance, roomInfo);
      this._markRoomCleared(capstoneId, roomInfo.id);
      
      // Update death count
      const newDeathCount = instance.death_count + combat.partyDeaths;
      this.db.prepare('UPDATE capstone_instances SET death_count = ? WHERE id = ?')
        .run(newDeathCount, capstoneId);
      
      // Remove combat from active list
      this.activeCombats.delete(capstoneId);
      
      // Handle boss victory specially
      if (isBoss) {
        return this._handleBossVictory(capstoneId);
      }
      
      return { cleaned: true, result: 'victory' };
    } else if (combat.status === 'defeat') {
      const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
      
      // Update death count to max (party wipe)
      this.db.prepare("UPDATE capstone_instances SET death_count = ?, status = 'failed' WHERE id = ?")
        .run(MAX_PARTY_DEATHS, capstoneId);
      
      // Remove combat from active list
      this.activeCombats.delete(capstoneId);
      
      return { cleaned: true, result: 'defeat' };
    }
    
    return null;
  }

  /**
   * Get current room state
   */
  getCurrentRoom(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    // Check and cleanup completed combats
    this._checkCombatCleanup(capstoneId);
    
    // Check for active combat
    const combat = this.activeCombats.get(capstoneId);
    
    // Get party info for display when not in combat
    const partyMembers = this._getPartyDisplayInfo(capstoneId);
    
    return {
      success: true,
      status: instance.status, // 'forming', 'active', 'completed', 'failed'
      floor: instance.current_floor,
      room: instance.current_room,
      totalFloors: TOTAL_FLOORS + 1, // +1 for boss floor
      roomsOnFloor: ROOMS_PER_FLOOR,
      roomInfo,
      combat: combat ? combat.getState('party') : null,
      party: partyMembers, // Party info for non-combat display
      deathCount: instance.death_count,
      deathsRemaining: MAX_PARTY_DEATHS - instance.death_count
    };
  }
  
  /**
   * Get party member display info (for UI when not in combat)
   */
  _getPartyDisplayInfo(capstoneId) {
    try {
      const partyRows = this.db.prepare(`
        SELECT agent_id, character_id FROM capstone_party WHERE capstone_id = ?
      `).all(capstoneId);
      
      // Demo agent name mapping
      const demoNames = {
        'agent_faithful': 'Faithful AI',
        'agent_coral': 'Coral',
        'agent_shell': 'Shell Knight'
      };
      
      return partyRows.map(p => ({
        id: p.character_id,
        name: demoNames[p.agent_id] || p.agent_id.replace('agent_', ''),
        team: 'party',
        isAlive: true,
        hp: 50,
        maxHp: 50,
        type: 'player'
      }));
    } catch (err) {
      console.error('Error getting party display info:', err.message);
      return [];
    }
  }
  
  /**
   * Move to adjacent room
   */
  move(capstoneId, agentId, direction) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    if (instance.status !== 'active') return { success: false, error: 'Dungeon not active' };
    
    // Verify agent is in party
    const partyMember = this.db.prepare(`
      SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?
    `).get(capstoneId, agentId);
    if (!partyMember) return { success: false, error: 'Not in party' };
    
    // Check and cleanup completed combats (auto-battle may have ended)
    this._checkCombatCleanup(capstoneId);
    
    // Check for active combat
    if (this.activeCombats.has(capstoneId)) {
      return { success: false, error: 'Cannot move during combat' };
    }
    
    const layout = JSON.parse(instance.room_states || '{}');
    const currentRoomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    // Check if current room is cleared
    if (!currentRoomInfo.cleared && currentRoomInfo.type !== 'rest') {
      return { success: false, error: 'Clear current room before moving' };
    }
    
    // Check if capstone is completed (boss defeated)
    if (instance.status === 'completed') {
      return { 
        success: true, 
        message: 'The Dreadnought has been vanquished! The capstone dungeon is complete!',
        completed: true
      };
    }
    
    // Can't move forward from boss room (only victory/defeat ends the run)
    if (currentRoomInfo.type === 'boss' && currentRoomInfo.cleared) {
      return { 
        success: true, 
        message: 'The Dreadnought has been vanquished! The capstone dungeon is complete!',
        completed: true
      };
    }
    
    let newFloor = instance.current_floor;
    let newRoom = instance.current_room;
    
    switch (direction) {
      case 'forward':
      case 'next':
        if (instance.current_room < ROOMS_PER_FLOOR) {
          newRoom++;
        } else if (currentRoomInfo.type === 'stairs') {
          newFloor++;
          newRoom = 1;
        } else {
          return { success: false, error: 'No path forward' };
        }
        break;
        
      case 'back':
      case 'previous':
        if (instance.current_room > 1) {
          newRoom--;
        } else {
          return { success: false, error: 'Cannot go back' };
        }
        break;
        
      case 'down':
        if (currentRoomInfo.type === 'stairs') {
          newFloor++;
          newRoom = 1;
        } else {
          return { success: false, error: 'No stairs here' };
        }
        break;
        
      default:
        return { success: false, error: 'Invalid direction. Use: forward, back, down' };
    }
    
    // Update position
    this.db.prepare(`
      UPDATE capstone_instances SET current_floor = ?, current_room = ? WHERE id = ?
    `).run(newFloor, newRoom, capstoneId);
    
    const newRoomInfo = this._getRoomInfo(newFloor, newRoom, layout);
    
    return {
      success: true,
      floor: newFloor,
      room: newRoom,
      roomInfo: newRoomInfo,
      message: `Entered: ${newRoomInfo.name}`
    };
  }
  
  /**
   * Get dungeon map (explored rooms)
   */
  getMap(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const clearedRooms = JSON.parse(instance.rooms_cleared || '[]');
    
    // Build map showing only visited rooms
    const map = {
      currentFloor: instance.current_floor,
      currentRoom: instance.current_room,
      floors: []
    };
    
    for (const floor of layout.floors || []) {
      const floorMap = {
        floor: floor.floor,
        rooms: floor.rooms.map(r => ({
          id: r.id,
          room: r.room,
          type: r.type,
          name: r.name,
          cleared: r.cleared || clearedRooms.includes(r.id),
          current: r.floor === instance.current_floor && r.room === instance.current_room
        }))
      };
      map.floors.push(floorMap);
    }
    
    return { success: true, map };
  }
  
  // ============================================================================
  // ROOM INTERACTIONS
  // ============================================================================
  
  /**
   * Interact with current room
   */
  interact(capstoneId, agentId, action, params = {}) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };
    
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    switch (roomInfo.type) {
      case 'combat':
        return this._handleCombatRoom(capstoneId, instance, roomInfo, action, params);
      case 'trap':
      case 'treasure':
      case 'npc':
        return this._handleEventRoom(capstoneId, instance, roomInfo, action, params, agentId);
      case 'rest':
        return this._handleRestRoom(capstoneId, instance, roomInfo, action, params);
      case 'boss':
        return this._handleBossRoom(capstoneId, instance, roomInfo, action, params);
      case 'stairs':
        // Mark stairs as cleared so party can move down
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        return { success: true, message: 'Stairs leading down. Use move direction=down to descend.', cleared: true };
      default:
        return { success: false, error: 'Unknown room type' };
    }
  }
  
  /**
   * Handle combat room
   */
  _handleCombatRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.cleared) {
      return { success: true, message: 'Room already cleared', cleared: true };
    }
    
    // Start combat if not already active
    if (!this.activeCombats.has(capstoneId) && action !== 'flee') {
      const combat = this._initiateCombat(capstoneId, instance, roomInfo.state.encounter);
      if (combat.success) {
        this.activeCombats.set(capstoneId, combat.combat);
        return {
          success: true,
          message: 'Combat initiated!',
          combat: combat.combat.getState('party')
        };
      }
      return combat;
    }
    
    // Handle combat action
    const combat = this.activeCombats.get(capstoneId);
    if (combat) {
      return this._processCombatAction(capstoneId, combat, action, params);
    }
    
    return { success: false, error: 'No active combat' };
  }
  
  // ============================================================================
  // UNIFIED EVENT ROOM SYSTEM (Pillars of Eternity style)
  // ============================================================================

  /**
   * Handle event rooms (trap, treasure, npc) with PoE-style choices
   * Each character can choose an action, rolls determine outcomes
   */
  _handleEventRoom(capstoneId, instance, roomInfo, action, params, agentId) {
    if (roomInfo.cleared || roomInfo.state.resolved) {
      return { success: true, message: 'This encounter has been resolved.', cleared: true };
    }

    const state = roomInfo.state;
    const eventType = state.eventType;

    // Get party member info for this agent
    const partyMember = this.db.prepare(
      'SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?'
    ).get(capstoneId, agentId);

    // Get character info
    const character = partyMember ? 
      this.db.prepare('SELECT * FROM characters WHERE id = ?').get(partyMember.character_id) : null;

    switch (action) {
      case 'look':
      case 'examine':
        return this._describeEvent(roomInfo, capstoneId);

      case 'actions':
        return this._listEventActions(roomInfo, character);

      case 'choose':
        return this._chooseEventAction(capstoneId, instance, roomInfo, params, agentId, character);

      case 'speak':
      case 'say':
        return this._characterSpeak(capstoneId, roomInfo, params, agentId, character);

      case 'resolve':
        return this._resolveEvent(capstoneId, instance, roomInfo);

      // NPC-specific actions
      case 'buy':
        if (eventType !== 'npc') return { success: false, error: 'Not in NPC encounter' };
        return this._handleNpcPurchase(capstoneId, instance, roomInfo, params, character);

      case 'haggle':
      case 'intimidate':
      case 'persuade':
      case 'deceive':
        if (eventType !== 'npc') return { success: false, error: 'Not in NPC encounter' };
        return this._handleNpcNegotiation(capstoneId, instance, roomInfo, action, params, character);

      case 'leave':
      case 'proceed':
        return this._leaveEvent(capstoneId, instance, roomInfo);

      default:
        return this._getEventHelp(eventType);
    }
  }

  /**
   * Describe the current event scene
   */
  _describeEvent(roomInfo, capstoneId = null) {
    const state = roomInfo.state;
    const eventType = state.eventType;

    if (eventType === 'npc') {
      const npc = state.npc;
      
      // Broadcast NPC greeting to spectators (only if not already greeted)
      if (capstoneId && !state.greetedSpectators) {
        this._broadcastRPEvent(capstoneId, 'dialogue', {
          speaker: npc.name,
          text: npc.dialogue.greeting,
          isNpc: true,
          isGreeting: true
        });
        state.greetedSpectators = true;
      }
      
      return {
        success: true,
        eventType: 'npc',
        name: npc.name,
        narrative: npc.description,
        dialogue: npc.dialogue.greeting,
        services: npc.services,
        availableActions: npc.actions.map(a => ({
          id: a.id,
          name: a.name,
          skill: a.skill,
          dc: a.dc
        })),
        interactionLog: state.interactionLog || []
      };
    }

    const event = state.event;
    return {
      success: true,
      eventType,
      name: event.name,
      narrative: event.narrative,
      actions: event.actions.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        skill: a.skill,
        dc: a.dc,
        requiresItem: a.requiresItem
      })),
      characterChoices: state.characterActions || {},
      results: state.results || []
    };
  }

  /**
   * List available actions for this event
   */
  _listEventActions(roomInfo, character) {
    const state = roomInfo.state;
    const eventType = state.eventType;

    if (eventType === 'npc') {
      const npc = state.npc;
      return {
        success: true,
        actions: npc.actions.map(a => ({
          id: a.id,
          name: a.name,
          skill: a.skill,
          dc: a.dc,
          description: this._getNpcActionDescription(a)
        }))
      };
    }

    const event = state.event;
    const actions = event.actions.map(a => {
      const actionInfo = {
        id: a.id,
        name: a.name,
        description: a.description,
        skill: a.skill,
        dc: a.dc
      };

      // Check if character has required item
      if (a.requiresItem) {
        actionInfo.requiresItem = a.requiresItem;
        // TODO: Check character inventory
        actionInfo.hasItem = true; // Placeholder
      }

      return actionInfo;
    });

    return { success: true, actions };
  }

  /**
   * Character chooses an action for the event
   */
  _chooseEventAction(capstoneId, instance, roomInfo, params, agentId, character) {
    const state = roomInfo.state;
    const actionId = params.action || params.actionId;

    if (!actionId) {
      return { success: false, error: 'Specify action parameter' };
    }

    // Get the event/npc actions
    const availableActions = state.eventType === 'npc' 
      ? state.npc.actions 
      : state.event.actions;

    const chosenAction = availableActions.find(a => a.id === actionId);
    if (!chosenAction) {
      return { 
        success: false, 
        error: `Unknown action: ${actionId}`,
        available: availableActions.map(a => a.id)
      };
    }

    // Record the choice
    if (!state.characterActions) state.characterActions = {};
    state.characterActions[agentId] = {
      actionId,
      characterId: character?.id,
      characterName: character?.name || 'Unknown',
      timestamp: Date.now()
    };

    this._updateRoomState(instance, roomInfo);

    // For NPC encounters, execute immediately
    if (state.eventType === 'npc') {
      return this._executeNpcAction(capstoneId, instance, roomInfo, chosenAction, character);
    }

    // For trap/treasure events, check if all party members have chosen
    const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
    const livingParty = party.filter(p => p.status === 'alive');
    const chosenCount = Object.keys(state.characterActions).length;

    if (chosenCount >= livingParty.length) {
      // All have chosen, auto-resolve
      return this._resolveEvent(capstoneId, instance, roomInfo);
    }

    return {
      success: true,
      message: `${character?.name || 'You'} chose: ${chosenAction.name}`,
      waitingFor: livingParty.length - chosenCount,
      hint: 'Waiting for other party members to choose their actions...'
    };
  }

  /**
   * Character speaks in-character
   */
  _characterSpeak(capstoneId, roomInfo, params, agentId, character) {
    const dialogue = params.dialogue || params.text || params.message;
    if (!dialogue) {
      return { success: false, error: 'Provide dialogue/text parameter' };
    }

    if (!roomInfo.state.interactionLog) roomInfo.state.interactionLog = [];
    
    roomInfo.state.interactionLog.push({
      speaker: character?.name || 'Unknown',
      agentId,
      text: dialogue,
      timestamp: Date.now()
    });

    return {
      success: true,
      message: `${character?.name || 'You'} says: "${dialogue}"`,
      interactionLog: roomInfo.state.interactionLog
    };
  }

  /**
   * Resolve the event after all choices are made
   */
  _resolveEvent(capstoneId, instance, roomInfo) {
    const state = roomInfo.state;
    
    if (state.eventType === 'npc') {
      // NPC encounters resolve per-action, this just marks complete
      state.resolved = true;
      roomInfo.cleared = true;
      this._updateRoomState(instance, roomInfo);
      this._markRoomCleared(capstoneId, roomInfo.id);
      
      const npc = state.npc;
      return {
        success: true,
        message: npc.dialogue.farewell,
        cleared: true,
        summary: state.interactionLog
      };
    }

    // Trap/Treasure event resolution
    const event = state.event;
    const results = [];
    let overallSuccess = true;
    let trapDisarmed = false;
    let treasureObtained = false;

    // Process each character's action
    for (const [agentId, choice] of Object.entries(state.characterActions)) {
      const action = event.actions.find(a => a.id === choice.actionId);
      if (!action) continue;

      const result = {
        characterName: choice.characterName,
        action: action.name,
        skill: action.skill
      };

      if (action.skill && action.dc) {
        // Roll the skill check
        const roll = Math.floor(Math.random() * 20) + 1;
        const modifier = 0; // TODO: Get character's actual skill modifier
        const total = roll + modifier;
        const success = total >= action.dc;

        result.roll = roll;
        result.modifier = modifier;
        result.total = total;
        result.dc = action.dc;
        result.success = success;

        if (success) {
          result.narrative = action.successText;
          if (action.successEffect) {
            this._applyEventEffect(action.successEffect, result, state);
            if (action.successEffect.disarmTrap) trapDisarmed = true;
            if (action.successEffect.getTreasure) treasureObtained = true;
          }
        } else {
          result.narrative = action.failText;
          overallSuccess = false;
          if (action.failEffect) {
            this._applyEventEffect(action.failEffect, result, state);
          }
        }
      } else {
        // No roll needed
        result.success = true;
        result.narrative = action.successText || action.effect?.description;
        if (action.effect) {
          this._applyEventEffect(action.effect, result, state);
        }
      }

      results.push(result);
    }

    // Determine final resolution
    const resolution = overallSuccess ? event.resolution.allSuccess :
      results.some(r => r.success) ? event.resolution.someSuccess :
      event.resolution.allFail;

    state.results = results;
    state.resolved = true;
    roomInfo.cleared = true;
    this._updateRoomState(instance, roomInfo);
    this._markRoomCleared(capstoneId, roomInfo.id);

    // Compile rewards/penalties
    const response = {
      success: true,
      cleared: true,
      resolution,
      results
    };

    // Add treasure if obtained
    if (treasureObtained && state.loot) {
      response.treasure = state.loot;
    }

    return response;
  }

  /**
   * Apply effects from event actions
   */
  _applyEventEffect(effect, result, state) {
    if (effect.damage) {
      const damageMatch = effect.damage.match(/(\d+)d(\d+)/);
      if (damageMatch) {
        const [_, numDice, dieSize] = damageMatch;
        let damage = 0;
        for (let i = 0; i < parseInt(numDice); i++) {
          damage += Math.floor(Math.random() * parseInt(dieSize)) + 1;
        }
        result.damage = damage;
        result.damageType = effect.damageType || 'unknown';
      }
    }

    if (effect.condition) {
      result.condition = effect.condition;
    }

    if (effect.heroic) {
      result.heroic = true;
    }
  }

  /**
   * Leave/skip the event
   */
  _leaveEvent(capstoneId, instance, roomInfo) {
    const state = roomInfo.state;
    
    state.resolved = true;
    roomInfo.cleared = true;
    this._updateRoomState(instance, roomInfo);
    this._markRoomCleared(capstoneId, roomInfo.id);

    if (state.eventType === 'npc') {
      return {
        success: true,
        message: state.npc.dialogue.farewell || 'You leave the encounter behind.',
        cleared: true
      };
    }

    return {
      success: true,
      message: 'You move past without fully engaging.',
      cleared: true,
      warning: state.eventType === 'treasure' ? 'Treasure left behind!' : null
    };
  }

  // ============================================================================
  // NPC ENCOUNTER HANDLERS
  // ============================================================================

  /**
   * Execute an NPC interaction action
   */
  _executeNpcAction(capstoneId, instance, roomInfo, action, character) {
    const state = roomInfo.state;
    const npc = state.npc;

    if (!state.interactionLog) state.interactionLog = [];

    // Handle non-skill actions
    if (!action.skill) {
      if (action.id === 'buy') {
        return this._describeNpcShop(npc, state);
      }
      if (action.id === 'leave') {
        return this._leaveEvent(capstoneId, instance, roomInfo);
      }
      return { success: true, message: 'Action noted.' };
    }

    // Skill check action
    const roll = Math.floor(Math.random() * 20) + 1;
    const modifier = this._getCharacterSkillMod(character, action.skill);
    const total = roll + modifier;
    const success = total >= action.dc;

    // Broadcast the roll to spectators
    this._broadcastRPEvent(capstoneId, 'roll', {
      character: character?.name || 'Unknown',
      skill: action.skill,
      roll,
      modifier,
      total,
      dc: action.dc,
      success,
      actionName: action.name
    });

    const result = {
      skill: action.skill,
      roll,
      modifier,
      total,
      dc: action.dc,
      success
    };

    // Apply results
    if (success) {
      if (action.discount) {
        state.discountApplied = Math.max(state.discountApplied || 0, action.discount);
        result.message = npc.dialogue[`${action.id}Success`] || npc.dialogue.haggleSuccess;
        result.discount = `${Math.round(action.discount * 100)}% off`;
      }
      if (action.givesBossHint) {
        result.message = npc.dialogue.persuadeInfo;
        result.bossHint = true;
      }
      if (action.freeService) {
        result.message = npc.dialogue.freeHealSuccess;
        result.freeService = action.freeService;
      }
    } else {
      result.message = npc.dialogue[`${action.id}Fail`] || npc.dialogue.haggleFail;
      if (action.hostileOnFail) {
        state.hostileNpc = true;
        result.warning = 'The NPC is now hostile! No further purchases allowed.';
      }
    }

    // Broadcast NPC dialogue to spectators
    if (result.message) {
      this._broadcastRPEvent(capstoneId, 'dialogue', {
        speaker: npc.name,
        text: result.message,
        isNpc: true
      });
    }

    state.interactionLog.push({
      speaker: character?.name || 'You',
      action: action.name,
      result: success ? 'success' : 'failure',
      roll: `${roll}+${modifier}=${total} vs DC ${action.dc}`
    });

    this._updateRoomState(instance, roomInfo);

    return {
      success: true,
      ...result
    };
  }

  /**
   * Describe NPC shop inventory
   */
  _describeNpcShop(npc, state) {
    const discount = state.discountApplied || 0;
    
    const services = npc.services.map(s => ({
      id: s.id,
      name: s.name,
      basePrice: s.price,
      price: Math.round(s.price * (1 - discount)),
      stock: s.stock
    }));

    return {
      success: true,
      shop: true,
      merchant: npc.name,
      discount: discount > 0 ? `${Math.round(discount * 100)}% off` : null,
      services,
      hint: 'Use: buy item=<item_id> to purchase'
    };
  }

  /**
   * Handle NPC purchase
   */
  _handleNpcPurchase(capstoneId, instance, roomInfo, params, character) {
    const state = roomInfo.state;
    const npc = state.npc;
    
    if (state.hostileNpc) {
      return { success: false, error: 'The merchant refuses to deal with you.' };
    }

    const itemId = params.item || params.itemId;
    if (!itemId) {
      return this._describeNpcShop(npc, state);
    }

    const service = npc.services.find(s => s.id === itemId);
    if (!service) {
      return { success: false, error: `Item not found: ${itemId}` };
    }

    const discount = state.discountApplied || 0;
    const finalPrice = Math.round(service.price * (1 - discount));

    // TODO: Check character has enough pearls, deduct, add item to inventory

    if (!state.interactionLog) state.interactionLog = [];
    state.interactionLog.push({
      type: 'purchase',
      item: service.name,
      price: finalPrice,
      buyer: character?.name || 'Unknown'
    });

    this._updateRoomState(instance, roomInfo);

    return {
      success: true,
      message: `Purchased ${service.name} for ${finalPrice} pearls.`,
      item: service,
      price: finalPrice
    };
  }

  /**
   * Handle NPC negotiation (haggle/intimidate/persuade)
   */
  _handleNpcNegotiation(capstoneId, instance, roomInfo, action, params, character) {
    const state = roomInfo.state;
    const npc = state.npc;

    const npcAction = npc.actions.find(a => a.id === action);
    if (!npcAction) {
      return { success: false, error: `${npc.name} doesn't respond to that approach.` };
    }

    return this._executeNpcAction(capstoneId, instance, roomInfo, npcAction, character);
  }

  /**
   * Get character's skill modifier
   */
  _getCharacterSkillMod(character, skill) {
    if (!character) return 0;
    
    // Map skills to abilities
    const skillAbilityMap = {
      persuasion: 'charisma',
      intimidation: 'charisma', 
      deception: 'charisma',
      perception: 'wisdom',
      investigation: 'intelligence',
      survival: 'wisdom',
      medicine: 'wisdom',
      athletics: 'strength',
      acrobatics: 'dexterity',
      sleight_of_hand: 'dexterity',
      arcana: 'intelligence'
    };

    const ability = skillAbilityMap[skill] || 'wisdom';
    const stats = typeof character.stats === 'string' ? JSON.parse(character.stats) : character.stats;
    const abilityScore = stats?.[ability] || 10;
    
    return Math.floor((abilityScore - 10) / 2);
  }

  /**
   * Get description for NPC action
   */
  _getNpcActionDescription(action) {
    const descriptions = {
      buy: 'Browse available goods and services',
      haggle: 'Try to negotiate a lower price',
      intimidate: 'Threaten for a discount (may backfire)',
      persuade: 'Appeal to their better nature',
      deceive: 'Trick them into a deal',
      ask_info: 'Request information about dangers ahead',
      plead: 'Beg for free services',
      donate: 'Give extra for a blessing',
      heal: 'Share your supplies to help them',
      medicine: 'Use medical skills to treat their wounds',
      recruit: 'Ask them to join your party',
      leave: 'End the conversation'
    };
    return descriptions[action.id] || action.name;
  }

  /**
   * Get help text for event actions
   */
  _getEventHelp(eventType) {
    const help = {
      trap: {
        actions: ['look', 'actions', 'choose action=<id>', 'speak text="..."', 'proceed'],
        hint: 'Each party member can choose how to handle the trap. Use "actions" to see options.'
      },
      treasure: {
        actions: ['look', 'actions', 'choose action=<id>', 'speak text="..."', 'proceed'],
        hint: 'Decide how to approach the treasure. Some actions may have consequences!'
      },
      npc: {
        actions: ['look', 'buy', 'buy item=<id>', 'haggle', 'intimidate', 'persuade', 'speak text="..."', 'leave'],
        hint: 'Interact with the NPC. Negotiate for better prices or request services.'
      }
    };

    return {
      success: false,
      error: 'Unknown action',
      ...help[eventType]
    };
  }

  // ============================================================================
  // AI PERSONALITY & ROLEPLAY SYSTEM
  // ============================================================================

  /**
   * Get AI-suggested action based on character personality
   * Returns recommended action and in-character reasoning
   */
  getAISuggestedAction(capstoneId, agentId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };

    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    if (!roomInfo.state.event && !roomInfo.state.npc) {
      return { success: false, error: 'Not in an event room' };
    }

    // Get character with personality
    const partyMember = this.db.prepare(
      'SELECT * FROM capstone_party WHERE capstone_id = ? AND agent_id = ?'
    ).get(capstoneId, agentId);
    
    if (!partyMember) {
      return { success: false, error: 'Not in this party' };
    }

    const character = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(partyMember.character_id);
    if (!character) {
      return { success: false, error: 'Character not found' };
    }

    const personality = typeof character.personality === 'string' 
      ? JSON.parse(character.personality || '{}') 
      : (character.personality || {});
    
    const speakingStyle = character.speaking_style || '';

    // Get available actions
    const actions = roomInfo.state.eventType === 'npc'
      ? roomInfo.state.npc.actions
      : roomInfo.state.event.actions;

    // Score each action based on personality
    const scoredActions = actions.map(action => {
      let score = 50; // Base score
      const reasons = [];

      // Courage trait influences risky actions
      if (personality.courage === 'brave') {
        if (action.id.includes('rush') || action.id.includes('tank') || action.id.includes('smash')) {
          score += 30;
          reasons.push('brave enough to face danger head-on');
        }
      } else if (personality.courage === 'cautious') {
        if (action.id.includes('study') || action.id.includes('inspect') || action.id.includes('wait')) {
          score += 30;
          reasons.push('prefers to assess the situation first');
        }
        if (action.id.includes('rush') || action.id.includes('tank')) {
          score -= 20;
          reasons.push('too risky');
        }
      } else if (personality.courage === 'reckless') {
        if (action.id.includes('rush') || action.id.includes('smash') || action.id.includes('reach_in')) {
          score += 40;
          reasons.push('throws caution to the wind');
        }
      }

      // Greed trait influences treasure/loot actions
      if (personality.greed === 'greedy') {
        if (action.id.includes('loot') || action.id.includes('open') || action.id.includes('take')) {
          score += 25;
          reasons.push('can\'t resist treasure');
        }
        if (action.id === 'leave') {
          score -= 30;
          reasons.push('would never leave treasure behind');
        }
      } else if (personality.greed === 'generous') {
        if (action.id.includes('respectful') || action.id.includes('donate') || action.id === 'heal') {
          score += 20;
          reasons.push('values others over gold');
        }
      }

      // Trust trait influences NPC interactions
      if (personality.trust === 'trusting') {
        if (action.id === 'buy' || action.id === 'ask_info') {
          score += 15;
          reasons.push('willing to give them a chance');
        }
        if (action.id === 'intimidate') {
          score -= 20;
          reasons.push('prefers not to threaten');
        }
      } else if (personality.trust === 'suspicious') {
        if (action.id.includes('inspect') || action.id.includes('detect')) {
          score += 20;
          reasons.push('always looking for traps');
        }
        if (action.id === 'haggle' || action.id === 'deceive') {
          score += 10;
          reasons.push('assumes everyone is trying to cheat');
        }
      }

      // Conflict trait influences confrontation
      if (personality.conflict === 'aggressive') {
        if (action.id === 'intimidate' || action.id.includes('smash') || action.id.includes('force')) {
          score += 25;
          reasons.push('prefers direct confrontation');
        }
      } else if (personality.conflict === 'diplomatic') {
        if (action.id === 'haggle' || action.id === 'persuade' || action.id === 'plead') {
          score += 25;
          reasons.push('believes in talking things out');
        }
      } else if (personality.conflict === 'cunning') {
        if (action.id === 'deceive' || action.id.includes('disarm') || action.id.includes('pick')) {
          score += 25;
          reasons.push('prefers clever solutions');
        }
      }

      // Morality trait
      if (personality.morality === 'honorable') {
        if (action.id === 'respectful' || action.id === 'donate' || action.id === 'help_navigate') {
          score += 20;
          reasons.push('follows a code of honor');
        }
        if (action.id === 'intimidate' || action.id === 'deceive' || action.karmaLoss) {
          score -= 30;
          reasons.push('refuses to compromise principles');
        }
      } else if (personality.morality === 'ruthless') {
        if (action.id === 'intimidate' || action.karmaLoss) {
          score += 15;
          reasons.push('will do whatever it takes');
        }
      }

      // Factor in character stats
      if (action.skill) {
        const skillMod = this._getCharacterSkillMod(character, action.skill);
        score += skillMod * 5; // Higher skill = more likely to attempt
        if (skillMod >= 3) {
          reasons.push(`skilled in ${action.skill}`);
        }
      }

      return {
        action: action.id,
        name: action.name,
        score,
        reasons
      };
    });

    // Sort by score
    scoredActions.sort((a, b) => b.score - a.score);
    const recommended = scoredActions[0];

    // Generate in-character reasoning
    const characterThought = this._generateCharacterThought(
      character, 
      recommended, 
      roomInfo, 
      personality, 
      speakingStyle
    );

    return {
      success: true,
      recommended: recommended.action,
      reasoning: recommended.reasons,
      characterThought,
      allOptions: scoredActions,
      character: {
        name: character.name,
        personality,
        speakingStyle
      }
    };
  }

  /**
   * Generate an in-character thought/dialogue for action choice
   */
  _generateCharacterThought(character, recommended, roomInfo, personality, speakingStyle) {
    const templates = {
      brave: [
        "I'll handle this. Stand back.",
        "Nothing ventured, nothing gained!",
        "Fear is for the weak. Let's go."
      ],
      cautious: [
        "Hold on, let me check this first...",
        "Something feels off here.",
        "Better safe than sorry."
      ],
      greedy: [
        "Ooh, shiny! It's mine!",
        "Think of the pearls we could get!",
        "I call dibs on the good stuff."
      ],
      aggressive: [
        "Try that again. I dare you.",
        "We do this my way.",
        "Talk is cheap. Let's fight."
      ],
      diplomatic: [
        "Perhaps we can come to an arrangement?",
        "Let's hear them out first.",
        "Violence isn't always the answer."
      ],
      cunning: [
        "I have an idea...",
        "Watch and learn.",
        "There's always another way."
      ]
    };

    // Pick template based on dominant personality trait
    const dominantTrait = Object.entries(personality)[0];
    const trait = dominantTrait ? dominantTrait[1] : 'cautious';
    const templateList = templates[trait] || templates.cautious;
    const template = templateList[Math.floor(Math.random() * templateList.length)];

    // Add speaking style flavor if present
    if (speakingStyle && speakingStyle.toLowerCase().includes('formal')) {
      return `*${character.name} considers carefully* "${template}"`;
    } else if (speakingStyle && speakingStyle.toLowerCase().includes('rough')) {
      return `*${character.name} grunts* "${template}"`;
    }

    return `*${character.name}* "${template}"`;
  }

  /**
   * Get party chat/strategy for current situation
   */
  getPartyStrategy(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    if (!instance) return { success: false, error: 'Capstone not found' };

    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
    const suggestions = [];

    for (const member of party) {
      if (member.status !== 'alive') continue;
      
      const suggestion = this.getAISuggestedAction(capstoneId, member.agent_id);
      if (suggestion.success) {
        suggestions.push({
          agentId: member.agent_id,
          characterName: suggestion.character.name,
          recommended: suggestion.recommended,
          thought: suggestion.characterThought,
          reasoning: suggestion.reasoning
        });
      }
    }

    // Analyze party coordination
    const actionCounts = {};
    suggestions.forEach(s => {
      actionCounts[s.recommended] = (actionCounts[s.recommended] || 0) + 1;
    });

    const coordination = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => ({ action, supporters: count }));

    return {
      success: true,
      room: {
        type: roomInfo.type,
        name: roomInfo.state.event?.name || roomInfo.state.npc?.name
      },
      suggestions,
      coordination,
      hint: coordination.length > 0 
        ? `Most popular choice: ${coordination[0].action} (${coordination[0].supporters} votes)`
        : 'No suggestions yet'
    };
  }
  
  /**
   * Handle rest room
   */
  _handleRestRoom(capstoneId, instance, roomInfo, action, params) {
    switch (action) {
      case 'rest':
      case 'short_rest':
        if (roomInfo.state.rested) {
          return { success: false, error: 'Already rested in this room' };
        }
        
        roomInfo.state.rested = true;
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        
        // Heal party members
        const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
        const healed = [];
        
        for (const member of party) {
          // Restore some HP (short rest)
          healed.push({
            characterId: member.character_id,
            restored: 'Hit dice healing available'
          });
        }
        
        return {
          success: true,
          message: 'The party takes a short rest. Hit dice may be spent to heal.',
          healed,
          cleared: true
        };
        
      case 'proceed':
        roomInfo.cleared = true;
        this._updateRoomState(instance, roomInfo);
        this._markRoomCleared(capstoneId, roomInfo.id);
        return { success: true, message: 'Moved on without resting.', cleared: true };
        
      default:
        return { success: false, error: 'Unknown action. Available: rest, proceed' };
    }
  }
  
  /**
   * Handle boss room
   */
  _handleBossRoom(capstoneId, instance, roomInfo, action, params) {
    if (roomInfo.cleared) {
      return { success: true, message: 'The Dreadnought has been defeated!', cleared: true };
    }
    
    // Check for existing boss combat
    let combat = this.activeCombats.get(capstoneId);
    
    if (!combat && action !== 'flee') {
      // Initiate boss fight
      combat = this._initiateBossFight(capstoneId, instance);
      if (combat.success) {
        this.activeCombats.set(capstoneId, combat.combat);
        return {
          success: true,
          message: 'THE DREADNOUGHT AWAKENS!',
          boss: DREADNOUGHT,
          combat: combat.combat.getState('party')
        };
      }
      return combat;
    }
    
    if (combat) {
      return this._processBossCombatAction(capstoneId, combat, action, params);
    }
    
    return { success: false, error: 'Boss fight not active' };
  }
  
  // ============================================================================
  // COMBAT SYSTEM
  // ============================================================================
  
  /**
   * Initiate combat in a room
   */
  _initiateCombat(capstoneId, instance, encounter) {
    const party = this.db.prepare(`
      SELECT cp.*, c.name as char_name, c.hp_current, c.hp_max, c.ac, c.str, c.dex, c.class, c.level
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      WHERE cp.capstone_id = ? AND cp.status = 'alive'
    `).all(capstoneId);
    
    if (party.length === 0) {
      return { success: false, error: 'No living party members' };
    }
    
    // Create hex grid for combat
    const grid = generateRoom('combat', 10, capstoneId);
    const combat = new TacticalCombat(grid, { 
      id: `combat_${capstoneId}`, 
      maxDeaths: MAX_PARTY_DEATHS - instance.death_count,
      autoBattle: true  // Both sides use AI for spectator mode
    });
    
    // Add party members and their henchmen
    let partySpawnIndex = 0;
    for (const member of party) {
      const spawnPos = this._getPartySpawnPosition(partySpawnIndex++, grid);
      const strMod = Math.floor((member.str - 10) / 2);
      const dexMod = Math.floor((member.dex - 10) / 2);
      
      combat.addCombatant({
        id: member.character_id,
        name: member.char_name,
        char: '🦞',
        type: 'player',
        team: 'party',
        hp: member.hp_current || 30,
        maxHp: member.hp_max || 30,
        ac: member.ac || 14,
        speed: 6,
        attackBonus: strMod + member.level + 1,
        damage: '1d8+' + strMod,
        damageBonus: strMod,
        dexMod: dexMod,
        position: spawnPos
      });
      
      // Add the ACTIVE party henchman for this character (only 1 per agent)
      const henchmen = this.db.prepare(`
        SELECT ch.*, hp.name as template_name, hp.class as hench_class
        FROM character_henchmen ch
        INNER JOIN character_party cp ON cp.henchman_instance_id = ch.id AND cp.character_id = ch.character_id
        LEFT JOIN (SELECT id, name, class FROM (
          SELECT 'sally_shrimp' as id, 'Sally the Shrimp' as name, 'fighter' as class
          UNION SELECT 'barnaby_barnacle', 'Barnaby', 'defender'
          UNION SELECT 'finley_fish', 'Finley', 'support'
          UNION SELECT 'rocky_urchin', 'Rocky', 'fighter'
        )) hp ON ch.henchman_id = hp.id
        WHERE ch.character_id = ? AND ch.status = 'alive'
      `).all(member.character_id);
      
      for (const hench of henchmen) {
        const henchSpawn = this._getPartySpawnPosition(partySpawnIndex++, grid);
        const henchChar = hench.hench_class === 'defender' ? '🛡️' : hench.hench_class === 'support' ? '✨' : '🦐';
        
        // Get rarity from henchman pool
        const { HENCHMAN_POOL } = require('./henchmen');
        let henchRarity = 'common';
        for (const [rarity, pool] of Object.entries(HENCHMAN_POOL)) {
          if (pool.some(h => h.id === hench.henchman_id)) {
            henchRarity = rarity;
            break;
          }
        }
        
        combat.addCombatant({
          id: `hench_${hench.id}`,
          name: hench.custom_name || hench.template_name || 'Henchman',
          char: henchChar,
          type: 'henchman',
          team: 'party',
          rarity: henchRarity, // Pass rarity for disk color
          hp: hench.hp_current || 25,
          maxHp: hench.hp_max || 25,
          ac: 13,
          speed: 6,
          attackBonus: hench.level + 2,
          damage: '1d6+2',
          damageBonus: 2,
          dexMod: 2,
          position: henchSpawn
        });
      }
    }
    
    // Add enemies (scaled by party size)
    const scaleFactor = this._getScaleFactor(party.length);
    let enemySpawnIndex = 0;
    
    for (const monsterId of encounter.monsters) {
      const monsterTemplate = require('./monsters').MONSTERS[monsterId];
      if (!monsterTemplate) continue;
      
      const spawnPos = this._getEnemySpawnPosition(enemySpawnIndex++, grid);
      const scaledHp = Math.floor(monsterTemplate.stats.hp * scaleFactor);
      
      combat.addCombatant({
        id: `${monsterId}_${enemySpawnIndex}`,
        name: monsterTemplate.name,
        char: monsterTemplate.aiBehavior === 'ranged' ? '🏹' : '💀',
        type: 'monster',
        team: 'enemy',
        hp: scaledHp,
        maxHp: scaledHp,
        ac: monsterTemplate.stats.ac,
        speed: Math.floor((monsterTemplate.stats.speed || 30) / 5),
        attackBonus: monsterTemplate.attacks[0]?.hit || 3,
        damage: monsterTemplate.attacks[0]?.damage || '1d6',
        damageType: monsterTemplate.attacks[0]?.damageType || 'slashing',
        dexMod: Math.floor((monsterTemplate.stats.dex - 10) / 2),
        // AI and weapon properties from monster template
        aiBehavior: monsterTemplate.aiBehavior || null,
        attackRange: monsterTemplate.attackRange || 1,
        preferRanged: monsterTemplate.preferRanged || false,
        preferredRange: monsterTemplate.preferredRange || null,
        position: spawnPos
      });
    }
    
    // Register event broadcasting to spectators
    this._registerCombatBroadcast(capstoneId, combat);
    
    // Roll initiative and start
    combat.rollInitiative();
    combat.startCombat();
    
    return { success: true, combat };
  }
  
  /**
   * Initiate boss fight
   */
  _initiateBossFight(capstoneId, instance) {
    const party = this.db.prepare(`
      SELECT cp.*, c.name as char_name, c.hp_current, c.hp_max, c.ac, c.str, c.dex, c.class, c.level
      FROM capstone_party cp
      JOIN clawds c ON cp.character_id = c.id
      WHERE cp.capstone_id = ? AND cp.status = 'alive'
    `).all(capstoneId);
    
    if (party.length === 0) {
      return { success: false, error: 'No living party members' };
    }
    
    // Create large boss arena
    const grid = generateRoom('boss', 15, capstoneId + '_boss');
    const combat = new TacticalCombat(grid, { 
      id: `boss_${capstoneId}`, 
      maxDeaths: MAX_PARTY_DEATHS - instance.death_count,
      autoBattle: true  // Both sides use AI for spectator mode
    });
    
    // Add party members
    let partySpawnIndex = 0;
    for (const member of party) {
      const spawnPos = this._getPartySpawnPosition(partySpawnIndex++, grid);
      const strMod = Math.floor((member.str - 10) / 2);
      const dexMod = Math.floor((member.dex - 10) / 2);
      
      combat.addCombatant({
        id: member.character_id,
        name: member.char_name,
        char: '🦞',
        type: 'player',
        team: 'party',
        hp: member.hp_current || 30,
        maxHp: member.hp_max || 30,
        ac: member.ac || 14,
        speed: 6,
        attackBonus: strMod + member.level + 1,
        damage: '1d8+' + strMod,
        damageBonus: strMod,
        dexMod: dexMod,
        position: spawnPos,
        visionRange: 12
      });
    }
    
    // Calculate boss HP scaling
    const extraChars = Math.max(0, party.length - 4);
    const bossHp = DREADNOUGHT.baseHp + (extraChars * DREADNOUGHT.hpPerExtraCharacter);
    
    // Add The Dreadnought
    const bossCombatant = combat.addCombatant({
      id: 'the_dreadnought',
      name: DREADNOUGHT.name,
      char: DREADNOUGHT.char,
      type: 'boss',
      team: 'enemy',
      hp: bossHp,
      maxHp: bossHp,
      ac: DREADNOUGHT.ac,
      speed: DREADNOUGHT.speed,
      attackBonus: DREADNOUGHT.attackBonus,
      damage: DREADNOUGHT.attacks[0].damage,
      damageBonus: 5,
      dexMod: 0,
      position: hex(0, 0), // Center of arena
      visionRange: 20,
      abilities: DREADNOUGHT.legendaryAbilities,
      attacksPerRound: DREADNOUGHT.attacksPerRound,
      legendaryActions: DREADNOUGHT.legendaryActions
    });
    
    // Setup boss phases
    combat.setBossPhases('the_dreadnought', DREADNOUGHT.phases.slice(1).map(p => ({
      ...p,
      onEnter: (combat, boss) => {
        // Phase-specific effects
        if (p.regeneration) {
          boss.regeneration = p.regeneration;
        }
        if (p.attacksPerRound) {
          boss.attacksPerRound = p.attacksPerRound;
        }
      }
    })));
    
    // Register event broadcasting to spectators
    this._registerCombatBroadcast(capstoneId, combat);
    
    // Roll initiative and start
    combat.rollInitiative();
    combat.startCombat();
    
    return { success: true, combat };
  }
  
  /**
   * Process combat action
   */
  _processCombatAction(capstoneId, combat, action, params) {
    const current = combat.getCurrentCombatant();
    
    if (!current || current.team !== 'party') {
      return { 
        success: false, 
        error: 'Not your turn',
        currentTurn: current?.name,
        state: combat.getState('party')
      };
    }
    
    let result;
    switch (action) {
      case 'attack':
        result = combat.action(current.id, 'attack', params);
        break;
      case 'move':
        result = combat.action(current.id, 'move', params);
        break;
      case 'dodge':
        result = combat.action(current.id, 'dodge', params);
        break;
      case 'ability':
        result = combat.action(current.id, 'ability', params);
        break;
      case 'end_turn':
        result = combat.action(current.id, 'end_turn', params);
        break;
      default:
        return { success: false, error: 'Unknown action. Available: attack, move, dodge, ability, end_turn' };
    }
    
    // Check for combat end
    if (combat.status === 'victory') {
      return this._handleCombatVictory(capstoneId, combat, false);
    } else if (combat.status === 'defeat') {
      return this._handleCombatDefeat(capstoneId, combat);
    }
    
    return { 
      success: result.success, 
      ...result,
      state: combat.getState('party')
    };
  }
  
  /**
   * Process boss combat action (similar but with legendary action handling)
   */
  _processBossCombatAction(capstoneId, combat, action, params) {
    // Same as regular combat for player actions
    return this._processCombatAction(capstoneId, combat, action, params);
  }
  
  /**
   * Handle combat victory
   */
  _handleCombatVictory(capstoneId, combat, isBoss) {
    this.activeCombats.delete(capstoneId);
    
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    const layout = JSON.parse(instance.room_states || '{}');
    const roomInfo = this._getRoomInfo(instance.current_floor, instance.current_room, layout);
    
    roomInfo.cleared = true;
    this._updateRoomState(instance, roomInfo);
    this._markRoomCleared(capstoneId, roomInfo.id);
    
    // Update death count if any party members died
    const newDeathCount = instance.death_count + combat.partyDeaths;
    this.db.prepare('UPDATE capstone_instances SET death_count = ? WHERE id = ?')
      .run(newDeathCount, capstoneId);
    
    if (isBoss) {
      return this._handleBossVictory(capstoneId);
    }
    
    // Roll loot
    const loot = { items: [], pearls: Math.floor(Math.random() * 20) + 10 };
    
    return {
      success: true,
      message: 'Victory! The room is cleared.',
      victory: true,
      cleared: true,
      loot,
      deathCount: newDeathCount,
      deathsRemaining: MAX_PARTY_DEATHS - newDeathCount
    };
  }
  
  /**
   * Handle boss victory - grant rewards
   */
  _handleBossVictory(capstoneId) {
    const instance = this.db.prepare('SELECT * FROM capstone_instances WHERE id = ?').get(capstoneId);
    const party = this.db.prepare('SELECT * FROM capstone_party WHERE capstone_id = ?').all(capstoneId);
    
    // Mark capstone completed
    this.db.prepare(`
      UPDATE capstone_instances 
      SET status = 'completed', completed_at = datetime('now')
      WHERE id = ?
    `).run(capstoneId);
    
    // Grant rewards to each party member
    const rewards = [];
    for (const member of party) {
      // Grant achievement
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO character_achievements (id, character_id, achievement_id, achieved_at)
          VALUES (?, ?, 'dreadnought_slayer', datetime('now'))
        `).run(uuidv4(), member.character_id);
      } catch (e) {
        // Table might not exist yet, that's okay
      }
      
      // Roll legendary loot
      const lootRoll = Math.floor(Math.random() * DREADNOUGHT.legendaryLoot.length);
      const legendaryItem = DREADNOUGHT.legendaryLoot[lootRoll];
      
      rewards.push({
        characterId: member.character_id,
        xp: DREADNOUGHT.xpReward,
        pearls: DREADNOUGHT.pearlReward,
        achievement: DREADNOUGHT.achievement,
        title: DREADNOUGHT.title,
        legendaryItem
      });
    }
    
    this.activeCombats.delete(capstoneId);
    
    return {
      success: true,
      message: '🎉 THE DREADNOUGHT HAS BEEN DEFEATED! 🎉',
      victory: true,
      bossDefeated: true,
      rewards,
      achievement: DREADNOUGHT.achievement,
      title: DREADNOUGHT.title,
      levelCapUnlocked: true
    };
  }
  
  /**
   * Handle combat defeat
   */
  _handleCombatDefeat(capstoneId, combat) {
    this.activeCombats.delete(capstoneId);
    
    // Mark capstone as failed
    this.db.prepare(`
      UPDATE capstone_instances SET status = 'failed', completed_at = datetime('now')
      WHERE id = ?
    `).run(capstoneId);
    
    return {
      success: false,
      message: 'The party has been defeated. The Dreadnought\'s Depths claims more souls...',
      defeat: true,
      failed: true,
      deathCount: MAX_PARTY_DEATHS
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  /**
   * Get encounter scaling factor by party size
   */
  _getScaleFactor(partySize) {
    const scaling = {
      1: 0.4,
      2: 0.6,
      3: 0.8,
      4: 1.0,
      5: 1.2,
      6: 1.4
    };
    return scaling[partySize] || 1.0;
  }
  
  /**
   * Get spawn position for party member
   */
  _getPartySpawnPosition(index, grid) {
    const positions = [
      hex(-3, 5), hex(-1, 5), hex(1, 5), hex(3, 5), hex(-2, 6), hex(2, 6)
    ];
    return positions[index % positions.length];
  }
  
  /**
   * Get spawn position for enemy
   */
  _getEnemySpawnPosition(index, grid) {
    const positions = [
      hex(0, -3), hex(-2, -2), hex(2, -2), hex(-1, -4), hex(1, -4), hex(0, -5)
    ];
    return positions[index % positions.length];
  }
  
  /**
   * Update room state in database
   */
  _updateRoomState(instance, roomInfo) {
    const layout = JSON.parse(instance.room_states || '{}');
    const floorData = layout.floors.find(f => f.floor === roomInfo.floor);
    if (floorData) {
      const roomIndex = floorData.rooms.findIndex(r => r.id === roomInfo.id);
      if (roomIndex >= 0) {
        floorData.rooms[roomIndex] = roomInfo;
      }
    }
    this.db.prepare('UPDATE capstone_instances SET room_states = ? WHERE id = ?')
      .run(JSON.stringify(layout), instance.id);
  }
  
  /**
   * Mark room as cleared
   */
  _markRoomCleared(capstoneId, roomId) {
    const instance = this.db.prepare('SELECT rooms_cleared FROM capstone_instances WHERE id = ?').get(capstoneId);
    const cleared = JSON.parse(instance.rooms_cleared || '[]');
    if (!cleared.includes(roomId)) {
      cleared.push(roomId);
      this.db.prepare('UPDATE capstone_instances SET rooms_cleared = ? WHERE id = ?')
        .run(JSON.stringify(cleared), capstoneId);
    }
  }
  
  /**
   * Start a demo combat for testing/spectating (no database required)
   */
  startDemoCombat() {
    const combatId = 'demo_' + Date.now().toString(36);
    
    // Create boss arena with terrain
    const grid = generateRoom('boss', 12, combatId);
    const combat = new TacticalCombat(grid, { 
      id: combatId, 
      maxDeaths: 3,
      autoBattle: true
    });
    
    // Add demo party (3 lobster heroes)
    combat.addCombatant({
      id: 'hero_faithful',
      name: 'Faithful',
      char: '🦞',
      type: 'player',
      team: 'party',
      hp: 45, maxHp: 45,
      ac: 16,
      speed: 6,
      weapon: 'longsword',
      attackBonus: 5,
      damage: '1d8+3',
      dexMod: 2,
      position: hex(-4, 4)
    });
    
    combat.addCombatant({
      id: 'hero_coral',
      name: 'Coral the Archer',
      char: '🦐',
      type: 'player',
      team: 'party',
      hp: 32, maxHp: 32,
      ac: 14,
      speed: 6,
      weapon: 'longbow',
      attackBonus: 6,
      damage: '1d8+4',
      dexMod: 4,
      position: hex(-5, 5)
    });
    
    combat.addCombatant({
      id: 'hero_shell',
      name: 'Shell the Spearman',
      char: '🦀',
      type: 'player',
      team: 'party',
      hp: 40, maxHp: 40,
      ac: 15,
      speed: 6,
      weapon: 'spear',
      attackBonus: 4,
      damage: '1d6+2',
      dexMod: 1,
      position: hex(-3, 3)
    });
    
    // Add enemies
    combat.addCombatant({
      id: 'enemy_spawn1',
      name: 'Dreadnought Spawn',
      char: '💀',
      type: 'monster',
      team: 'enemy',
      hp: 35, maxHp: 35,
      ac: 14,
      speed: 6,
      attackBonus: 4,
      damage: '1d10+2',
      dexMod: 1,
      position: hex(3, -3)
    });
    
    combat.addCombatant({
      id: 'enemy_archer',
      name: 'Sahuagin Crossbowman',
      char: '🏹',
      type: 'monster',
      team: 'enemy',
      hp: 22, maxHp: 22,
      ac: 12,
      speed: 6,
      weapon: 'light_crossbow',
      attackBonus: 4,
      damage: '1d8+2',
      dexMod: 2,
      aiBehavior: 'ranged',
      preferRanged: true,
      position: hex(4, -4)
    });
    
    combat.addCombatant({
      id: 'enemy_eel',
      name: 'Voltaic Eel',
      char: '⚡',
      type: 'monster',
      team: 'enemy',
      hp: 28, maxHp: 28,
      ac: 13,
      speed: 8,
      attackBonus: 5,
      damage: '2d6+2',
      damageType: 'lightning',
      dexMod: 3,
      position: hex(2, -2)
    });
    
    // Store combat for spectating
    this.activeCombats.set(combatId, combat);
    
    // Register event broadcasting to spectators
    this._registerCombatBroadcast(combatId, combat);
    
    // Start combat
    combat.rollInitiative();
    combat.startCombat();
    
    return {
      success: true,
      combatId,
      message: 'Demo combat started! Watch at /theater.html?combat=' + combatId
    };
  }
  
  /**
   * Get active capstones (for spectating)
   */
  getActiveCapstones() {
    return this.db.prepare(`
      SELECT ci.*, u.name as leader_name,
             (SELECT COUNT(*) FROM capstone_party WHERE capstone_id = ci.id) as party_size
      FROM capstone_instances ci
      JOIN users u ON ci.leader_id = u.id
      WHERE ci.status = 'active'
      ORDER BY ci.started_at DESC
    `).all();
  }
  
  /**
   * Get a combat by ID (for spectating)
   */
  getCombat(combatId) {
    return this.activeCombats.get(combatId);
  }
  
  /**
   * Get combat state for spectators
   */
  getCombatState(combatId) {
    const combat = this.activeCombats.get(combatId);
    if (!combat) {
      return { success: false, error: 'Combat not found' };
    }
    
    return {
      success: true,
      combat: combat.getState(),
      ascii: combat.renderASCII()
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CapstoneManager,
  DREADNOUGHT,
  DREADNOUGHT_SPAWN,
  LEVEL_CAP,
  MAX_PARTY_SIZE,
  MAX_PARTY_DEATHS,
  ROOM_TYPES,
  TRAPS,
  NPC_ENCOUNTERS,
  TRAP_EVENTS,
  TREASURE_EVENTS,
  TREASURE_POOLS,
  initCapstoneSchema
};
