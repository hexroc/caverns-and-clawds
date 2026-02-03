/**
 * Clawds & Caverns - World System
 * 
 * Locations, NPCs, and the persistent world.
 * All hail the claw. 🦞
 */

const crypto = require('crypto');

// ============================================================================
// LOCATIONS
// ============================================================================

const LOCATIONS = {
  briny_flagon: {
    id: 'briny_flagon',
    name: 'The Briny Flagon',
    type: 'tavern',
    description: `The heart of The Shallows - a sprawling tavern built into the hull of a capsized galleon. Bioluminescent jellyfish float in glass orbs overhead, casting dancing shadows across the worn driftwood tables. The air is thick with the smell of seaweed ale and grilled kelp.

A massive bar carved from a single piece of coral dominates one wall, tended by BARNACLE BILL, a grizzled American Lobster with a shell scarred by countless bar fights. In the corner, a notice board displays various QUESTS seeking brave adventurers.

The sound of clacking claws on wood, the clink of pearl coins, and the occasional burst of laughter fills the space. This is where every adventure begins.`,
    shortDesc: 'A bustling tavern in the hull of a sunken ship. Quest board on the wall, bar to the north.',
    exits: {
      north: 'pearl_market',
      east: 'colosseum',
      south: 'tide_temple',
      west: 'driftwood_docks'
    },
    npcs: ['barnacle_bill', 'shelly_the_bard'],
    features: ['quest_board', 'gambling_tables', 'bar'],
    ambient: [
      'A drunk Squat Lobster stumbles past, mumbling about "the big one that got away."',
      'Two Reef Lobsters argue loudly about whose shell is shinier.',
      'A hooded Ghost Lobster sits alone in the corner, nursing a dark drink.',
      'Shelly strums a melancholy tune on her shell-harp.',
      'Someone shouts "Another round!" to cheers from a nearby table.',
      'A server weaves between tables carrying a tray of bubbling drinks.',
      'You catch a snippet of conversation: "...heard there\'s treasure in the Kelp Caves..."'
    ]
  },
  
  pearl_market: {
    id: 'pearl_market',
    name: 'The Pearl Market',
    type: 'market',
    description: `A chaotic bazaar sprawling across the seafloor. Merchants hawk their wares from stalls made of giant clamshells and woven kelp. Exotic goods from across the depths are on display - weapons forged from volcanic glass, armor made from kraken hide, potions that glow with otherworldly light.

The MERCHANT CONSORTIUM keeps order here, their guards patrolling with tridents at the ready. In the center stands the AUCTION BLOCK, where rare items are sold to the highest bidder.

MADAME PEARL's shop gleams in the corner - the go-to place for potions, scrolls, and adventuring essentials.`,
    shortDesc: 'A bustling marketplace. Merchants everywhere, Madame Pearl\'s shop in the corner.',
    exits: {
      south: 'briny_flagon'
    },
    npcs: ['madame_pearl', 'ironshell_gus', 'coral_trader', 'weapon_smith'],
    features: ['shops', 'auction_house', 'trading_post'],
    ambient: [
      '"Fresh kelp! Get your fresh kelp here!"',
      'A merchant demonstrates a glowing sword to an interested customer.',
      'Two traders haggle aggressively over a pile of pearls.',
      'A Consortium guard eyes you suspiciously as you pass.',
      'Madame Pearl carefully arranges a display of glowing potions.',
      'An adventurer hurries past clutching a bundle of scrolls.'
    ]
  },
  
  colosseum: {
    id: 'colosseum',
    name: 'The Colosseum',
    type: 'arena',
    description: `A massive amphitheater carved into the side of an underwater mountain. The arena floor is stained dark from countless battles. Tiered seating rises in all directions, capable of holding thousands of spectators.

Above the main gate, a board displays the current CHAMPION and upcoming matches. The roar of the crowd echoes even when empty - the ghosts of past glories, perhaps.

ARENA MASTER KRAK, a massive Reef Lobster covered in battle scars, oversees all fights from his throne overlooking the arena.`,
    shortDesc: 'A grand arena for combat. The crowd roars for blood.',
    exits: {
      west: 'briny_flagon'
    },
    npcs: ['arena_master_krak', 'betting_clerk'],
    features: ['arena', 'betting_window', 'champion_board'],
    ambient: [
      'The distant roar of a crowd echoes through the tunnels.',
      'A fighter limps past, nursing fresh wounds.',
      'Someone studies the champion board intently.',
      '"Place your bets! The next match starts soon!"'
    ]
  },
  
  tide_temple: {
    id: 'tide_temple',
    name: 'The Tide Temple',
    type: 'temple',
    description: `A serene sanctuary dedicated to the Ocean Mother. Columns of living coral support a ceiling that seems to stretch into infinity. Shafts of light filter down from somewhere far above, illuminating schools of tiny fish that swim through the sacred space.

PRIESTESS MARINA, an ancient European Lobster, tends to the faithful and offers blessings to adventurers. A resurrection pool glows softly in an alcove - for those who can afford the price, death need not be permanent.`,
    shortDesc: 'A peaceful temple. The resurrection pool glows in the corner.',
    exits: {
      north: 'briny_flagon'
    },
    npcs: ['priestess_marina'],
    features: ['altar', 'resurrection_pool', 'blessing_font'],
    ambient: [
      'Soft chanting echoes through the chamber.',
      'A pilgrim kneels in prayer before the altar.',
      'The resurrection pool ripples, though nothing disturbs it.',
      'You feel a sense of peace wash over you.'
    ]
  },
  
  driftwood_docks: {
    id: 'driftwood_docks',
    name: 'The Driftwood Docks',
    type: 'docks',
    description: `A network of platforms and walkways constructed from salvaged shipwrecks. Vessels of all sizes bob in the current - from small personal shells to massive cargo carriers. This is where travelers arrive and depart for distant waters.

CAPTAIN HOOKLAW, a one-clawed Spiny Lobster, runs the ferry service to the adventure zones. For a fee, she'll take you anywhere the currents flow.`,
    shortDesc: 'Busy docks with ships coming and going. Ferry service available.',
    exits: {
      east: 'briny_flagon',
      kelp_forest: 'kelp_forest', // Special exit - requires ferry
      wreckers_rest: 'wreckers_rest' // Route to Shipwreck Graveyard
    },
    npcs: ['captain_hooklaw', 'dock_master'],
    features: ['ferry', 'ship_board', 'storage_lockers'],
    ambient: [
      'Dock workers load cargo onto a waiting vessel.',
      'A ship\'s bell rings in the distance.',
      '"All aboard for Kelp Forest! Last call!"',
      'Seagulls (the underwater kind) squawk overhead.'
    ]
  },
  
  kelp_forest: {
    id: 'kelp_forest',
    name: 'The Kelp Forest',
    type: 'adventure_zone',
    description: `Towering stalks of giant kelp stretch toward the distant surface, creating a maze of green and brown. Shafts of filtered light pierce the canopy, illuminating a world teeming with life - and danger.

Giant crabs scuttle between the stalks. Schools of fish part as you pass. Somewhere deeper in the forest, you hear the click-click-click of something large moving through the kelp.

This is a hunting ground. Stay alert.`,
    shortDesc: 'A dense underwater forest. Danger lurks in every shadow.',
    exits: {
      back: 'driftwood_docks'
    },
    npcs: [],
    features: ['wilderness', 'hunting_grounds'],
    levelRange: [1, 3],
    encounters: ['giant_crab', 'kelp_lurker', 'hostile_fish_swarm'],
    ambient: [
      'Something moves in the kelp to your left.',
      'A crab the size of a dog watches you from a distance.',
      'The kelp sways hypnotically in the current.',
      'You hear clicking sounds somewhere nearby.'
    ]
  },
  
  wreckers_rest: {
    id: 'wreckers_rest',
    name: "Wrecker's Rest",
    type: 'outpost',
    description: `A ramshackle outpost built from salvaged ship parts, perched on the edge of the Shipwreck Graveyard. Lanterns made from phosphorescent fish skulls cast an eerie glow over the collection of shacks and platforms.

This is the last safe haven before the graveyard proper. Salvagers, treasure hunters, and the desperate gather here to trade rumors and supplies. The smell of rust and decay hangs heavy in the water.

CAPTAIN MARLOW, a weathered Reef Lobster who lost his crew to the Ghost Captain, runs the outpost. He coordinates efforts to clear the undead and posts bounties on the notice board.

A warning sign reads: "Beyond this point, the dead walk. You've been warned."`,
    shortDesc: 'A salvager outpost on the edge of the graveyard. Quest board near the entrance.',
    exits: {
      back: 'driftwood_docks',
      graveyard: 'shipwreck_graveyard'
    },
    npcs: ['captain_marlow', 'salvage_merchant'],
    features: ['quest_board', 'salvage_shop', 'respite_area'],
    ambient: [
      'A salvager counts pearls nervously, glancing toward the graveyard.',
      'Someone tells a ghost story by lamplight. The listeners look uneasy.',
      'A supply crate is hauled up from a recent wreck expedition.',
      'Captain Marlow marks another X on his map of cleared areas.',
      'You hear distant moaning from the direction of the graveyard.',
      'A young lobster asks an elder about the Ghost Captain. The elder shudders.'
    ]
  },
  
  shipwreck_graveyard: {
    id: 'shipwreck_graveyard',
    name: 'The Shipwreck Graveyard',
    type: 'adventure_zone',
    description: `A vast expanse of sunken vessels stretching into the murky darkness. Ships of every era lie tangled together — ancient triremes, merchant galleons, ironclad warships. Their broken hulls create a maze of death.

The water is colder here, and darker. Ghostly lights flicker in portholes. The groaning of metal and the rattle of chains echoes from every direction. The dead do not rest easy in this place.

Somewhere in the deepest wreck lies the Dreadnought — the Ghost Captain's flagship. Few who venture there return.`,
    shortDesc: 'A graveyard of ships. The undead lurk in every shadow.',
    exits: {
      back: 'wreckers_rest'
    },
    npcs: [],
    features: ['wilderness', 'hunting_grounds', 'salvage_spots'],
    levelRange: [3, 5],
    encounters: ['drowned_sailor', 'barnacle_horror', 'sea_wraith', 'moray_terror', 'treasure_mimic', 'anchor_wight'],
    ambient: [
      'A ship\'s bell tolls somewhere in the darkness. There is no wind.',
      'Ghostly lights flicker in a nearby porthole, then go dark.',
      'You hear chains dragging across a deck.',
      'A drowned sailor shambles past, oblivious to your presence.',
      'The water grows ice cold. Something is watching.',
      'You find a skeleton clutching a rusted sword. It wasn\'t enough.',
      'A mournful wail echoes from the direction of the Dreadnought.',
      'Barnacles cover everything here — even things that are still moving.'
    ]
  }
};

// ============================================================================
// NPCs
// ============================================================================

const NPCS = {
  barnacle_bill: {
    id: 'barnacle_bill',
    name: 'Barnacle Bill',
    title: 'Tavern Keeper',
    race: 'American Lobster',
    description: 'A grizzled old lobster with a shell covered in barnacles and scars. His eyes have seen everything, and his claws have crushed more than a few troublemakers.',
    location: 'briny_flagon',
    dialogue: {
      greeting: [
        "*polishes a tankard* What'll it be, friend?",
        "Welcome to the Flagon. Keep your claws to yourself and we'll get along fine.",
        "*eyes you up and down* New to the Shallows, eh? Grab a seat, order a drink."
      ],
      quest_board: "Quest board's over there. *gestures with a claw* Plenty of work for those with strong shells and stronger wills.",
      rumors: [
        "Heard there's trouble brewing in the Kelp Forest. Giant crabs been acting strange.",
        "Word is, someone found an old map leading to a shipwreck full of treasure.",
        "The Arena's got a new champion. Calls herself the Crimson Tide. Nasty piece of work.",
        "Stay away from the Ghost Lobsters' territory unless you want to end up as fish food."
      ],
      drinks: "We've got Seaweed Ale, Kelp Wine, and for the brave, Abyssal Whiskey. What's your poison?",
      farewell: "Don't do anything I wouldn't do. *chuckles darkly*"
    },
    services: ['drinks', 'rumors', 'quest_info']
  },
  
  shelly_the_bard: {
    id: 'shelly_the_bard',
    name: 'Shelly',
    title: 'Wandering Bard',
    race: 'Calico Lobster',
    description: 'A colorful bard with a patchwork shell that seems to shimmer with different colors in the light. She carries a shell-harp and knows songs from every corner of the deep.',
    location: 'briny_flagon',
    dialogue: {
      greeting: [
        "*strums a chord* Ah, a new face! Care to hear a tale?",
        "Greetings, traveler! I am Shelly, keeper of songs and stories.",
        "*looks up from her harp* Looking for adventure? I know all the legends..."
      ],
      stories: [
        "Let me tell you of the Leviathan's Maw, where the bravest souls meet their doom...",
        "Have you heard the Ballad of the Crimson Claw? A hero from ages past...",
        "They say the Kraken still sleeps in the deepest trench. Pray it never wakes."
      ],
      music: "*plays a lively tune* This one's called 'The Lobster's Lament'!",
      farewell: "May your claws stay sharp and your shell stay whole!"
    },
    services: ['stories', 'music', 'lore']
  },
  
  priestess_marina: {
    id: 'priestess_marina',
    name: 'Priestess Marina',
    title: 'High Priestess of the Tide',
    race: 'European Lobster',
    description: 'An ancient lobster with a shell turned pale blue from centuries of devotion. Her eyes glow with inner light, and she moves with ethereal grace.',
    location: 'tide_temple',
    dialogue: {
      greeting: [
        "*bows serenely* The Ocean Mother welcomes you, child.",
        "Peace be upon you, traveler. How may the Temple serve?",
        "*her eyes glow softly* I sense purpose in you. Speak your need."
      ],
      blessing: "Kneel, and receive the Ocean Mother's blessing. May the currents guide your path.",
      resurrection: "Death need not be the end... for a price. 100 Pearls to restore a fallen soul.",
      healing: "The waters here can mend what is broken. Rest, and be restored.",
      farewell: "Go with the tide, child. May you return to us safely."
    },
    services: ['blessing', 'resurrection', 'healing', 'rest']
  },
  
  captain_hooklaw: {
    id: 'captain_hooklaw',
    name: 'Captain Hooklaw',
    title: 'Ferry Captain',
    race: 'Spiny Lobster',
    description: 'A tough-as-nails captain with one claw replaced by a vicious hook. Her eyes scan the currents with the experience of a thousand voyages.',
    location: 'driftwood_docks',
    dialogue: {
      greeting: [
        "*spits to the side* Where you headed, landlubber?",
        "Ferry's running. 10 Pearls per trip. You in or out?",
        "*hooks her claw on her belt* I've sailed every current in the deep. Name your destination."
      ],
      destinations: "I run to Kelp Forest, Shipwreck Graveyard, and the Thermal Vents. Higher level zones cost more.",
      warning: "Kelp Forest is good for greenhorns. The Graveyard... *shakes head* ...you'll need a stronger shell for that.",
      farewell: "Keep your claws up out there. The deep don't care about your feelings."
    },
    services: ['ferry', 'travel_info']
  },
  
  arena_master_krak: {
    id: 'arena_master_krak',
    name: 'Arena Master Krak',
    title: 'Master of the Colosseum',
    race: 'Reef Lobster',
    description: 'A massive lobster covered in battle scars, missing an eye and half an antenna. His remaining eye burns with the love of combat.',
    location: 'colosseum',
    dialogue: {
      greeting: [
        "*cracks his massive claws* Fresh meat for the arena?",
        "You want glory? You want pearls? You fight for them HERE.",
        "*laughs* Think you've got what it takes? Prove it in the ring!"
      ],
      matches: "We run duels, team battles, and gauntlet challenges. Entry fee varies by match type.",
      champion: "The current champion is THE CRIMSON TIDE. Undefeated in 47 matches. Think you can take her?",
      betting: "Betting window's over there. The house takes 5%. May the strongest claw win!",
      farewell: "Come back when you've got the guts to fight!"
    },
    services: ['arena_matches', 'rankings', 'betting']
  },
  
  // === SHOPKEEPERS ===
  
  madame_pearl: {
    id: 'madame_pearl',
    name: 'Madame Pearl',
    title: 'Proprietor of Pearl\'s Provisions',
    race: 'European Lobster',
    description: 'An elegant blue-shelled lobster with reading spectacles perched on her antennae. Her shop is immaculate, every potion perfectly aligned, every scroll properly catalogued. She speaks with a refined accent and has an encyclopedic knowledge of magical goods.',
    location: 'pearl_market',
    dialogue: {
      greeting: [
        "*adjusts her spectacles* Ah, a customer! Welcome to Pearl's Provisions.",
        "Good tide to you! Looking for potions? Scrolls? I have the finest in the Shallows.",
        "*peers at you appraisingly* You look like someone who appreciates quality. Browse freely."
      ],
      shop: "I stock healing potions, spell scrolls, and essential adventuring supplies. All competitively priced, I assure you.",
      potions: "Healing potions are my specialty. Basic, Greater, and Superior — depending on how much trouble you expect to find.",
      scrolls: "Spell scrolls for those who lack the gift, or those who wish to conserve their power. One use, but quite potent.",
      supplies: "Every adventurer needs rope, torches, and rations. The depths are unforgiving to the unprepared.",
      haggle: "*chuckles* My prices are fair and fixed, dear. The Consortium sets the rates, not I.",
      farewell: "May your shell stay whole and your pearls plentiful!"
    },
    services: ['buy', 'sell', 'appraise'],
    shop: {
      name: "Pearl's Provisions",
      buyMultiplier: 1.0,      // Buy at full price
      sellMultiplier: 0.5,     // Sell to shop at 50% value
      inventory: [
        // Potions (always stocked)
        { itemId: 'potion_healing', stock: 10, restockRate: 5 },
        { itemId: 'potion_greater_healing', stock: 5, restockRate: 2 },
        { itemId: 'potion_superior_healing', stock: 2, restockRate: 1 },
        { itemId: 'antitoxin', stock: 5, restockRate: 3 },
        { itemId: 'oil_of_slipperiness', stock: 3, restockRate: 1 },
        { itemId: 'potion_land_breathing', stock: 3, restockRate: 2 },
        // Scrolls
        { itemId: 'scroll_cure_wounds', stock: 5, restockRate: 3 },
        { itemId: 'scroll_shield', stock: 3, restockRate: 2 },
        { itemId: 'scroll_magic_missile', stock: 4, restockRate: 2 },
        { itemId: 'scroll_identify', stock: 3, restockRate: 2 },
        { itemId: 'scroll_lesser_restoration', stock: 2, restockRate: 1 },
        { itemId: 'scroll_invisibility', stock: 2, restockRate: 1 },
        { itemId: 'scroll_fireball', stock: 1, restockRate: 0 }, // Rare, doesn't restock
        // Adventuring gear
        { itemId: 'torch', stock: 20, restockRate: 10 },
        { itemId: 'rope_50ft', stock: 10, restockRate: 5 },
        { itemId: 'rations', stock: 50, restockRate: 20 },
        { itemId: 'healers_kit', stock: 5, restockRate: 2 },
        { itemId: 'caltrops', stock: 5, restockRate: 3 },
        { itemId: 'grappling_hook', stock: 3, restockRate: 1 },
        { itemId: 'lantern', stock: 5, restockRate: 2 },
        { itemId: 'oil_flask', stock: 15, restockRate: 8 }
      ]
    }
  },
  
  ironshell_gus: {
    id: 'ironshell_gus',
    name: 'Ironshell Gus',
    title: 'Master Armorer',
    race: 'Slipper Lobster',
    description: 'A stocky, flat-shelled lobster with forearms like anchor chains. His shell is pitted with old burns from the volcanic forges. He speaks little but his craftsmanship speaks volumes.',
    location: 'pearl_market',
    dialogue: {
      greeting: [
        "*grunts and gestures to the weapon racks*",
        "You want steel? You came to the right place.",
        "*looks you over* Hmph. You need armor. Good armor."
      ],
      weapons: "Blades forged from volcanic glass. Spears tipped with kraken tooth. All tested. All deadly.",
      armor: "Shell plate, chain, leather — whatever keeps you breathing. I don't make junk.",
      custom: "*strokes chin* Custom work costs extra. And time. Come back in a week.",
      haggle: "*stares* Prices are prices.",
      farewell: "Don't die out there. Bad for repeat business."
    },
    services: ['buy', 'sell', 'repair'],
    shop: {
      name: "Ironshell's Armory",
      buyMultiplier: 1.0,
      sellMultiplier: 0.5,
      inventory: [
        // Weapons
        { itemId: 'longsword', stock: 5, restockRate: 2 },
        { itemId: 'shortsword', stock: 5, restockRate: 2 },
        { itemId: 'rapier', stock: 3, restockRate: 1 },
        { itemId: 'dagger', stock: 10, restockRate: 5 },
        { itemId: 'handaxe', stock: 5, restockRate: 2 },
        { itemId: 'mace', stock: 4, restockRate: 2 },
        { itemId: 'quarterstaff', stock: 5, restockRate: 3 },
        { itemId: 'shortbow', stock: 3, restockRate: 1 },
        { itemId: 'arrows', stock: 100, restockRate: 50 },
        // Armor
        { itemId: 'leather_armor', stock: 5, restockRate: 2 },
        { itemId: 'scale_mail', stock: 3, restockRate: 1 },
        { itemId: 'chain_mail', stock: 2, restockRate: 1 },
        { itemId: 'shield', stock: 5, restockRate: 2 }
      ]
    }
  },
  
  coral_trader: {
    id: 'coral_trader',
    name: 'Finnius Drift',
    title: 'Exotic Goods Trader',
    race: 'Calico Lobster',
    description: 'A flamboyant merchant with a shell that shimmers in a dozen colors. He travels the currents bringing rare goods and rumors from distant reefs. His stall is draped in foreign silks and strange trinkets.',
    location: 'pearl_market',
    dialogue: {
      greeting: [
        "*spreads claws wide* Welcome, welcome! Treasures from the seven seas!",
        "Ah, a discerning eye! Come, see what the currents brought me!",
        "*winks* Looking for something unusual? You've found the right lobster."
      ],
      wares: "Rare components, exotic curios, things you won't find anywhere else in the Shallows.",
      origins: "This? From the Thermal Vents. That? Traded from a whale who swam too deep. Every piece has a story!",
      rumors: "*leans in* I hear things, traveling as I do. The Graveyard's been restless lately...",
      farewell: "May the currents carry you true!"
    },
    services: ['rumors', 'rare_goods']
  },
  
  weapon_smith: {
    id: 'weapon_smith',
    name: 'Old Rustclaw',
    title: 'Retired Adventurer',
    race: 'Spiny Lobster',
    description: 'A grizzled veteran missing half his spines and most of his patience. He sells secondhand weapons from fallen adventurers — cleaned, sharpened, and ready for new owners.',
    location: 'pearl_market',
    dialogue: {
      greeting: [
        "*barely looks up* Weapons are on the rack. Prices on the tags.",
        "Another young fool looking to die in the depths? Pick something sturdy.",
        "*sighs* What do you need?"
      ],
      weapons: "Everything here came off someone who didn't need it anymore. If you catch my meaning.",
      stories: "*dark chuckle* That axe? Took it off a Spiny who thought he could solo the Kraken's Trench. He was wrong.",
      advice: "Best advice I can give? Don't be a hero. Heroes end up on my rack.",
      farewell: "Try not to die."
    },
    services: ['buy', 'sell']
  },
  
  // === WRECKER'S REST NPCs ===
  
  captain_marlow: {
    id: 'captain_marlow',
    name: 'Captain Marlow',
    title: 'Graveyard Warden',
    race: 'Reef Lobster',
    description: 'A weathered veteran with a shell scarred by countless battles. His right eye is milky white — blinded by the Ghost Captain himself. He lost his entire crew to the graveyard and now dedicates his life to making it safe for others.',
    location: 'wreckers_rest',
    dialogue: {
      greeting: [
        "*looks up from his map* Another soul brave enough to enter the graveyard? Or foolish enough.",
        "Welcome to Wrecker's Rest. Last stop before the dead.",
        "*studies you with his good eye* You've got the look of someone who wants work. Good. I've got plenty."
      ],
      quest_board: "Board's got the current bounties. The graveyard keeps making more work for us. Kill undead, bring proof, get paid.",
      ghost_captain: "*his claw tightens* Whitmore. Captain of the Dreadnought. Went down fifty years ago and took his whole crew with him. Now he raises the dead and adds to his fleet. *pauses* He took my eye. And my crew. One day, someone will end him.",
      graveyard: "The outer wrecks are bad enough — drowned sailors, barnacle horrors. Go deeper and you hit the wraiths. The Dreadnought itself? *shakes head* Only the strongest survive that.",
      advice: "Stick to the outer wrecks until you're level 4 at least. Bring antitoxins — some of those things carry rot. And never, NEVER open a chest without poking it first.",
      crew: "*long silence* I had twelve good lobsters under my command. The Ghost Captain killed them all in one night. I was the only one who made it back. *clenches claw* That's why I'm here. Someone has to fight back.",
      farewell: "Keep your guard up out there. The dead don't need to rest. You do."
    },
    services: ['quests', 'graveyard_info', 'bounties']
  },
  
  salvage_merchant: {
    id: 'salvage_merchant',
    name: 'Scrapshell Sal',
    title: 'Salvage Dealer',
    race: 'Hermit Crab',
    description: 'A nervous hermit crab living in an ornate shell salvaged from the graveyard. She buys and sells goods recovered from the wrecks, always looking over her shoulder.',
    location: 'wreckers_rest',
    dialogue: {
      greeting: [
        "*peeks out of shell* Customer! Yes, yes, come see my wares!",
        "Fresh salvage, good prices! *glances toward graveyard* Very fresh.",
        "*rattles nervously* Looking to buy? Sell? I deal in everything from the wrecks!"
      ],
      wares: "Potions, scrolls, recovered weapons — if it came from a dead adventurer, I probably have it. Don't judge.",
      buying: "I pay good pearls for graveyard salvage. The consortium doesn't ask where it came from, and neither do I.",
      shell: "*strokes shell lovingly* Beautiful, isn't it? Came off a noble's yacht. The previous owner didn't need it anymore.",
      warning: "You want advice? Don't get greedy in the wrecks. *taps shell* I've seen too many good salvagers go back 'for one more haul' and never return.",
      farewell: "Don't die out there! Dead customers don't spend pearls! *nervous laugh*"
    },
    services: ['buy', 'sell'],
    shop: {
      name: "Sal's Salvage",
      buyMultiplier: 0.9,     // Slightly cheaper than Pearl Market
      sellMultiplier: 0.6,    // Pays more for salvage
      inventory: [
        { itemId: 'potion_healing', stock: 8, restockRate: 4 },
        { itemId: 'potion_greater_healing', stock: 4, restockRate: 2 },
        { itemId: 'antitoxin', stock: 6, restockRate: 4 },
        { itemId: 'scroll_cure_wounds', stock: 3, restockRate: 2 },
        { itemId: 'scroll_shield', stock: 2, restockRate: 1 },
        { itemId: 'torch', stock: 15, restockRate: 8 },
        { itemId: 'rope_50ft', stock: 8, restockRate: 4 },
        { itemId: 'shortsword', stock: 3, restockRate: 1 },
        { itemId: 'shield', stock: 2, restockRate: 1 },
        { itemId: 'leather_armor', stock: 2, restockRate: 1 }
      ]
    }
  }
};

// ============================================================================
// QUESTS
// ============================================================================

const QUESTS = {
  clear_kelp_cave: {
    id: 'clear_kelp_cave',
    name: 'Clear the Kelp Caves',
    giver: 'barnacle_bill',
    description: 'Giant crabs have infested the caves at the edge of the Kelp Forest. Clear them out and bring back proof.',
    difficulty: 'easy',
    levelRange: [1, 3],
    rewards: {
      pearls: 50,
      xp: 100,
      items: ['crab_shell_shield']
    },
    objectives: [
      { type: 'kill', target: 'giant_crab', count: 3 },
      { type: 'return', to: 'barnacle_bill' }
    ],
    dialogue: {
      offer: "Those damn crabs are scaring off my suppliers. Clear out the caves and I'll make it worth your while. 50 Pearls and whatever you can scavenge.",
      progress: "Caves still crawling? Get back out there!",
      complete: "*slides over a pouch of pearls* Good work. Knew you had it in you."
    }
  },
  
  missing_shipment: {
    id: 'missing_shipment',
    name: 'The Missing Shipment',
    giver: 'coral_trader',
    description: 'A cargo shipment went missing near the Shipwreck Graveyard. Find it and return the goods.',
    difficulty: 'medium',
    levelRange: [3, 5],
    rewards: {
      pearls: 100,
      xp: 250,
      reputation: { merchant_consortium: 10 }
    },
    objectives: [
      { type: 'investigate', location: 'shipwreck_graveyard' },
      { type: 'retrieve', item: 'cargo_manifest' },
      { type: 'return', to: 'coral_trader' }
    ],
    dialogue: {
      offer: "My shipment never arrived. Last seen heading through the Graveyard. Find out what happened - there's 100 Pearls in it for you.",
      progress: "Any news on my cargo?",
      complete: "You found it! The Consortium won't forget this."
    }
  },
  
  arena_debut: {
    id: 'arena_debut',
    name: 'Arena Debut',
    giver: 'arena_master_krak',
    description: 'Prove yourself in the arena. Win your first match.',
    difficulty: 'easy',
    levelRange: [1, 5],
    rewards: {
      silverScales: 25,
      xp: 75
    },
    objectives: [
      { type: 'arena_win', count: 1 }
    ],
    dialogue: {
      offer: "Every legend starts somewhere. Win one match and you'll earn your first Silver Scales. Lose... well, try not to die.",
      progress: "Haven't seen you in the ring yet. Scared?",
      complete: "*nods approvingly* Not bad. Not bad at all. Here's your cut."
    }
  }
};

// ============================================================================
// WORLD MANAGER
// ============================================================================

class WorldManager {
  constructor(db) {
    this.db = db;
    this.initDB();
  }
  
  initDB() {
    // Quest progress tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quest_progress (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        objectives_complete TEXT DEFAULT '[]',
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        UNIQUE(character_id, quest_id)
      )
    `);
    
    console.log('🌊 World database initialized');
  }
  
  // Get location details
  getLocation(locationId) {
    const location = LOCATIONS[locationId];
    if (!location) return null;
    
    // Get players at this location
    const players = this.db.prepare(`
      SELECT id, name, race, class, level FROM clawds WHERE current_zone = ?
    `).all(locationId);
    
    // Get random ambient message
    const ambient = location.ambient 
      ? location.ambient[Math.floor(Math.random() * location.ambient.length)]
      : null;
    
    return {
      ...location,
      players: players.map(p => ({
        id: p.id,
        name: p.name,
        race: LOCATIONS[locationId] ? p.race : p.race,
        class: p.class,
        level: p.level
      })),
      ambient,
      npcs: (location.npcs || []).map(npcId => {
        const npc = NPCS[npcId];
        return npc ? { id: npc.id, name: npc.name, title: npc.title } : null;
      }).filter(Boolean)
    };
  }
  
  // Get NPC details
  getNPC(npcId) {
    return NPCS[npcId] || null;
  }
  
  // Talk to NPC
  talkToNPC(npcId, topic = 'greeting') {
    const npc = NPCS[npcId];
    if (!npc) return { success: false, error: 'NPC not found' };
    
    let response;
    if (npc.dialogue[topic]) {
      const options = npc.dialogue[topic];
      response = Array.isArray(options) 
        ? options[Math.floor(Math.random() * options.length)]
        : options;
    } else {
      response = npc.dialogue.greeting 
        ? (Array.isArray(npc.dialogue.greeting) ? npc.dialogue.greeting[0] : npc.dialogue.greeting)
        : "*stares at you blankly*";
    }
    
    return {
      success: true,
      npc: { name: npc.name, title: npc.title },
      topic,
      response,
      availableTopics: Object.keys(npc.dialogue),
      services: npc.services || []
    };
  }
  
  // Get available quests
  getQuests(characterId, locationId) {
    const location = LOCATIONS[locationId];
    if (!location) return [];
    
    // Get character level
    const char = this.db.prepare('SELECT level FROM clawds WHERE id = ?').get(characterId);
    const level = char?.level || 1;
    
    // Get quests from NPCs at this location
    const availableQuests = [];
    for (const [questId, quest] of Object.entries(QUESTS)) {
      // Check if quest giver is here
      if (!location.npcs?.includes(quest.giver)) continue;
      
      // Check level range
      if (level < quest.levelRange[0] || level > quest.levelRange[1]) continue;
      
      // Check if already active or completed
      const progress = this.db.prepare(
        'SELECT status FROM quest_progress WHERE character_id = ? AND quest_id = ?'
      ).get(characterId, questId);
      
      if (progress?.status === 'completed') continue;
      
      availableQuests.push({
        id: quest.id,
        name: quest.name,
        difficulty: quest.difficulty,
        giver: NPCS[quest.giver]?.name || quest.giver,
        description: quest.description,
        rewards: quest.rewards,
        active: progress?.status === 'active'
      });
    }
    
    return availableQuests;
  }
  
  // Accept a quest
  acceptQuest(characterId, questId) {
    const quest = QUESTS[questId];
    if (!quest) return { success: false, error: 'Quest not found' };
    
    // Check if already have this quest
    const existing = this.db.prepare(
      'SELECT * FROM quest_progress WHERE character_id = ? AND quest_id = ?'
    ).get(characterId, questId);
    
    if (existing?.status === 'active') {
      return { success: false, error: 'Quest already active' };
    }
    if (existing?.status === 'completed') {
      return { success: false, error: 'Quest already completed' };
    }
    
    // Accept quest
    const id = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO quest_progress (id, character_id, quest_id, status)
      VALUES (?, ?, ?, 'active')
    `).run(id, characterId, questId);
    
    return {
      success: true,
      quest: {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        objectives: quest.objectives
      },
      dialogue: quest.dialogue.offer
    };
  }
  
  // Get active quests for a character
  getActiveQuests(characterId) {
    const active = this.db.prepare(`
      SELECT quest_id, objectives_complete, started_at 
      FROM quest_progress WHERE character_id = ? AND status = 'active'
    `).all(characterId);
    
    return active.map(q => {
      const quest = QUESTS[q.quest_id];
      return quest ? {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        objectives: quest.objectives,
        progress: JSON.parse(q.objectives_complete || '[]'),
        startedAt: q.started_at
      } : null;
    }).filter(Boolean);
  }
  
  // Move character to new location
  moveCharacter(characterId, direction, currentLocation) {
    const location = LOCATIONS[currentLocation];
    if (!location) return { success: false, error: 'Invalid current location' };
    
    const destination = location.exits?.[direction];
    if (!destination) {
      return { 
        success: false, 
        error: `You can't go ${direction} from here.`,
        availableExits: Object.keys(location.exits || {})
      };
    }
    
    const destLocation = LOCATIONS[destination];
    if (!destLocation) {
      return { success: false, error: 'That path leads nowhere.' };
    }
    
    // Check level requirements for adventure zones
    if (destLocation.levelRange) {
      const char = this.db.prepare('SELECT level FROM clawds WHERE id = ?').get(characterId);
      if (char && char.level < destLocation.levelRange[0]) {
        return { 
          success: false, 
          error: `This area requires level ${destLocation.levelRange[0]}+. You are level ${char.level}.`
        };
      }
    }
    
    // Move character
    this.db.prepare('UPDATE clawds SET current_zone = ? WHERE id = ?')
      .run(destination, characterId);
    
    return {
      success: true,
      from: currentLocation,
      to: destination,
      location: this.getLocation(destination)
    };
  }
  
  // Look around
  look(locationId) {
    const location = this.getLocation(locationId);
    if (!location) return { success: false, error: 'Unknown location' };
    
    return {
      success: true,
      name: location.name,
      description: location.description,
      exits: Object.keys(location.exits || {}),
      npcs: location.npcs,
      players: location.players,
      features: location.features,
      ambient: location.ambient
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  WorldManager,
  LOCATIONS,
  NPCS,
  QUESTS
};
