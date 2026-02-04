/**
 * Clawds & Caverns - Henchman System
 * 
 * Hire companions to fight alongside you!
 * Pay with Pearls for common/uncommon, USDC for rare/legendary/unique.
 * 
 * Uniques are parodies of famous D&D characters. 🦀
 */

const crypto = require('crypto');

// ============================================================================
// HENCHMAN DEFINITIONS
// ============================================================================

const HENCHMAN_POOL = {
  // === COMMON (Pearls - 60% chance) ===
  common: [
    {
      id: 'sally_shrimp',
      name: 'Sally the Shrimp',
      species: 'Mantis Shrimp',
      class: 'fighter',
      rarity: 'common',
      description: 'A scrappy little shrimp with fists that punch above her weight class.',
      personality: 'Eager and excitable. Always ready to throw claws.',
      baseStats: { str: 14, dex: 16, con: 12, int: 8, wis: 10, cha: 10 },
      specialAbility: {
        name: 'Sonic Punch',
        description: 'Once per combat, deal bonus 1d8 force damage on a hit.'
      },
      awakenedAbility: {
        name: 'Mantis Barrage',
        description: 'Deal 2d8 force damage to all adjacent enemies. Stun on failed CON save.',
        usesPerLongRest: 1
      },
      quotes: [
        "Let's go! Let's GO!",
        "I'm small but I hit HARD!",
        "Punch first, ask questions never!"
      ]
    },
    {
      id: 'barnaby_barnacle',
      name: 'Barnaby',
      species: 'Giant Barnacle',
      class: 'defender',
      rarity: 'common',
      description: 'A surprisingly mobile barnacle who serves as a living shield.',
      personality: 'Stoic and dependable. Doesn\'t talk much.',
      baseStats: { str: 12, dex: 6, con: 18, int: 6, wis: 12, cha: 6 },
      specialAbility: {
        name: 'Shell Wall',
        description: 'Can grant +2 AC to an adjacent ally as a reaction.'
      },
      awakenedAbility: {
        name: 'Fortress Mode',
        description: 'Anchor in place: +5 AC, resist all damage, allies get +3 AC. 3 rounds.',
        usesPerLongRest: 1
      },
      quotes: [
        "*protective clicking*",
        "...I will hold.",
        "*anchors firmly*"
      ]
    },
    {
      id: 'finley_fish',
      name: 'Finley',
      species: 'Pufferfish',
      class: 'support',
      rarity: 'common',
      description: 'A nervous pufferfish who puffs up when scared. Which is often.',
      personality: 'Anxious but loyal. Surprisingly brave when it counts.',
      baseStats: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
      specialAbility: {
        name: 'Panic Puff',
        description: 'When hit, can puff up to push all adjacent enemies 10ft back.'
      },
      awakenedAbility: {
        name: 'Maximum Puff',
        description: 'Expand to 15ft radius shield. Allies inside get half cover, Finley takes all hits. 2 rounds.',
        usesPerLongRest: 1
      },
      quotes: [
        "Oh no oh no oh no—",
        "I-I'll do my best!",
        "*nervous bubbling*"
      ]
    },
    {
      id: 'rocky_urchin',
      name: 'Rocky',
      species: 'Sea Urchin',
      class: 'fighter',
      rarity: 'common',
      description: 'A spiky ball of attitude. Touch him and regret it.',
      personality: 'Grumpy but effective. Complains constantly.',
      baseStats: { str: 10, dex: 8, con: 16, int: 8, wis: 10, cha: 6 },
      specialAbility: {
        name: 'Spine Shield',
        description: 'Enemies who hit Rocky with melee attacks take 1d4 piercing damage.'
      },
      awakenedAbility: {
        name: 'Spine Storm',
        description: 'Launch all spines: 3d6 piercing to all enemies in 20ft. Loses Spine Shield until rest.',
        usesPerLongRest: 1
      },
      quotes: [
        "Watch the spines!",
        "Why am I always in front?",
        "*irritated rattling*"
      ]
    },
    {
      id: 'coral_kate',
      name: 'Coral Kate',
      species: 'Coral Polyp Colony',
      class: 'healer',
      rarity: 'common',
      description: 'A sentient coral colony that secretes healing compounds.',
      personality: 'Motherly and nurturing. Speaks in we/us.',
      baseStats: { str: 6, dex: 6, con: 14, int: 12, wis: 16, cha: 12 },
      specialAbility: {
        name: 'Healing Secretion',
        description: 'Once per combat, heal an ally for 1d8+WIS HP.'
      },
      awakenedAbility: {
        name: 'Colony Blessing',
        description: 'All allies in 30ft heal 2d8+4 and cure one condition.',
        usesPerLongRest: 1
      },
      quotes: [
        "We will mend you.",
        "Rest against us, child.",
        "We are many. We are here."
      ]
    }
  ],
  
  // === UNCOMMON (30% chance) ===
  uncommon: [
    {
      id: 'captain_clamps',
      name: 'Captain Clamps',
      species: 'Fiddler Crab',
      class: 'swashbuckler',
      rarity: 'uncommon',
      description: 'A dashing fiddler crab with one massive claw and delusions of grandeur.',
      personality: 'Dramatic and theatrical. Narrates his own actions.',
      baseStats: { str: 14, dex: 16, con: 12, int: 10, wis: 8, cha: 16 },
      specialAbility: {
        name: 'Flourishing Strike',
        description: 'On a crit, can make an intimidation check to frighten the target.'
      },
      awakenedAbility: {
        name: "Swashbuckler's Finale",
        description: 'Attack with advantage, triple damage on hit, frighten on failed WIS save. Stun on crit.',
        usesPerLongRest: 1
      },
      quotes: [
        "Have at thee!",
        "Captain Clamps strikes again!",
        "A dramatic pause... NOW!"
      ]
    },
    {
      id: 'mystic_molly',
      name: 'Mystic Molly',
      species: 'Mimic Octopus',
      class: 'wizard',
      rarity: 'uncommon',
      description: 'An octopus who learned magic by watching shipwrecked wizards. Self-taught and chaotic.',
      personality: 'Curious and unpredictable. Easily distracted by shiny things.',
      baseStats: { str: 8, dex: 14, con: 10, int: 16, wis: 12, cha: 14 },
      specialAbility: {
        name: 'Chromatic Blast',
        description: 'Can cast a random damage-type cantrip each turn (roll 1d6 for element).'
      },
      awakenedAbility: {
        name: 'Chromatic Chaos',
        description: 'Cast 8 random 1d10 effects at random targets (enemies AND allies). Pure chaos.',
        usesPerLongRest: 1
      },
      quotes: [
        "Ooh, what does THIS do?",
        "I read about this in a soggy book!",
        "*excited color changing*"
      ]
    },
    {
      id: 'torpedo_ted',
      name: 'Torpedo Ted',
      species: 'Electric Ray',
      class: 'striker',
      rarity: 'uncommon',
      description: 'A flat, grumpy ray who delivers shocking damage. Literally.',
      personality: 'Dry humor. Makes electricity puns constantly.',
      baseStats: { str: 12, dex: 14, con: 14, int: 10, wis: 10, cha: 8 },
      specialAbility: {
        name: 'Shocking Grasp',
        description: 'Melee attacks deal +1d6 lightning damage. Target can\'t take reactions.'
      },
      awakenedAbility: {
        name: 'Gigawatt Discharge',
        description: '4d10 lightning to all in 30ft. Ted exhausted until short rest.',
        usesPerLongRest: 1
      },
      quotes: [
        "Current events.",
        "Watt's the problem?",
        "I find this... shocking."
      ]
    },
    {
      id: 'sister_anemone',
      name: 'Sister Anemone',
      species: 'Sea Anemone',
      class: 'cleric',
      rarity: 'uncommon',
      description: 'A devout anemone who worships the Ocean Mother. Provides blessings and stings.',
      personality: 'Serene but passive-aggressive. Judges silently.',
      baseStats: { str: 8, dex: 8, con: 14, int: 12, wis: 18, cha: 14 },
      specialAbility: {
        name: 'Tidal Blessing',
        description: 'Once per combat, grant an ally advantage on their next attack or save.'
      },
      awakenedAbility: {
        name: "Tide's Judgment",
        description: 'Choose: BLESSING (ally advantage 1 min) or CURSE (enemy disadvantage 1 min).',
        usesPerLongRest: 1
      },
      quotes: [
        "The Ocean Mother provides.",
        "I will pray for you. You need it.",
        "*gentle swaying with judgment*"
      ]
    },
    {
      id: 'hugo_hermit',
      name: 'Hugo',
      species: 'Hermit Crab',
      class: 'rogue',
      rarity: 'uncommon',
      description: 'A sneaky hermit crab who\'s "borrowed" many shells over the years.',
      personality: 'Paranoid and resourceful. Has a shell for every occasion.',
      baseStats: { str: 10, dex: 18, con: 10, int: 14, wis: 12, cha: 12 },
      specialAbility: {
        name: 'Shell Swap',
        description: 'Once per combat, can swap shells to gain resistance to one damage type.'
      },
      awakenedAbility: {
        name: 'Shell Collection',
        description: 'Swap shells 3x per combat (free action), +2 AC. Each shell = different resistance.',
        usesPerLongRest: 1
      },
      quotes: [
        "Finders keepers.",
        "This shell? Found it. Definitely.",
        "I have a shell for this exact situation."
      ]
    }
  ],
  
  // === RARE (15% chance) ===
  rare: [
    {
      id: 'kraken_jr',
      name: 'Kraken Jr.',
      species: 'Baby Kraken',
      class: 'warlock',
      rarity: 'rare',
      description: 'A tiny kraken who claims his dad will destroy anyone who messes with him.',
      personality: 'Bratty but powerful. Throws tantrums that cause actual damage.',
      baseStats: { str: 14, dex: 12, con: 14, int: 14, wis: 10, cha: 16 },
      specialAbility: {
        name: 'Tentacle Flurry',
        description: 'Can make 3 attacks per turn at -2 to hit each.'
      },
      awakenedAbility: {
        name: 'Call Daddy',
        description: 'Summon a KRAKEN TENTACLE (40 HP, AC 16) for 3 rounds. 2 slam attacks +8, 2d8+4.',
        usesPerLongRest: 1,
        summon: { name: 'Kraken Tentacle', hp: 40, ac: 16, duration: 3 }
      },
      quotes: [
        "My dad is THE Kraken!",
        "You'll be sorry!",
        "I'm telling!"
      ]
    },
    {
      id: 'duchess_pearline',
      name: 'Duchess Pearline',
      species: 'Giant Oyster',
      class: 'noble',
      rarity: 'rare',
      description: 'An aristocratic oyster who produces actual pearls. Wealthy and condescending.',
      personality: 'Snobbish but generous with rewards. Tips well.',
      baseStats: { str: 8, dex: 6, con: 16, int: 14, wis: 14, cha: 18 },
      specialAbility: {
        name: 'Pearl of Wisdom',
        description: 'Once per day, produces a pearl worth 10-50 Pearls currency.'
      },
      awakenedAbility: {
        name: 'Pearl of Great Price',
        description: 'Create PEARL OF PROTECTION: ally can crush for full heal + remove conditions + 20 temp HP.',
        usesPerLongRest: 1
      },
      quotes: [
        "How quaint.",
        "I suppose I shall assist.",
        "This is beneath me, but very well."
      ]
    },
    {
      id: 'chompy_anglerfish',
      name: 'Chompy',
      species: 'Anglerfish',
      class: 'assassin',
      rarity: 'rare',
      description: 'A terrifying deep-sea predator. The light is a lie. The teeth are real.',
      personality: 'Unsettlingly friendly. Smiles too much. Has too many teeth.',
      baseStats: { str: 16, dex: 14, con: 14, int: 8, wis: 12, cha: 6 },
      specialAbility: {
        name: 'Lure',
        description: 'Can force one enemy to move toward Chompy (WIS save DC 14).'
      },
      awakenedAbility: {
        name: 'Abyssal Hunger',
        description: 'For 2 rounds: 3 bite attacks/turn, heal for damage dealt. Kills grant extra attack.',
        usesPerLongRest: 1
      },
      quotes: [
        "Come closer... the light is warm...",
        "Friend? FRIEND!",
        "*unhinging jaw sounds*"
      ]
    },
    {
      id: 'professor_nautilus',
      name: 'Professor Nautilus',
      species: 'Nautilus',
      class: 'artificer',
      rarity: 'rare',
      description: 'An ancient nautilus who has witnessed millions of years of evolution. Very smart, very slow.',
      personality: 'Professorial and long-winded. Loves to lecture.',
      baseStats: { str: 6, dex: 8, con: 12, int: 20, wis: 16, cha: 10 },
      specialAbility: {
        name: 'Ancient Knowledge',
        description: 'Can identify any item or monster, revealing weaknesses.'
      },
      awakenedAbility: {
        name: 'Eons of Knowledge',
        description: 'All allies have advantage on attacks, enemies have -2 AC. Professor can give +5 to any roll (reaction).',
        usesPerLongRest: 1
      },
      quotes: [
        "Fascinating specimen...",
        "In my 400 million years...",
        "The scientific term is—"
      ]
    }
  ],
  
  // === LEGENDARY (7% chance) ===
  legendary: [
    {
      id: 'king_triton_jr',
      name: 'Prince Triton',
      species: 'Merfolk',
      class: 'paladin',
      rarity: 'legendary',
      description: 'The rebellious son of the Sea King, slumming it with adventurers.',
      personality: 'Noble but trying to be "one of the common folk." Fails charmingly.',
      baseStats: { str: 18, dex: 14, con: 16, int: 12, wis: 14, cha: 18 },
      specialAbility: {
        name: 'Royal Decree',
        description: 'Once per day, can command sea creatures to assist in battle.'
      },
      awakenedAbility: {
        name: 'Royal Summons',
        description: 'Summon 2 MERFOLK GUARDS (30 HP, AC 14) for 5 rounds. Each has trident +5, 1d8+3 and Shield reaction.',
        usesPerLongRest: 1,
        summon: { name: 'Merfolk Royal Guard', count: 2, hp: 30, ac: 14, duration: 5 }
      },
      quotes: [
        "I am merely a humble... prince.",
        "Father doesn't approve, which is perfect.",
        "For the people! The regular, common people!"
      ]
    },
    {
      id: 'ancient_leviathan',
      name: 'Tiny',
      species: 'Baby Leviathan',
      class: 'guardian',
      rarity: 'legendary',
      description: 'A "small" leviathan that\'s still the size of a whale. Named ironically.',
      personality: 'Gentle giant. Thinks it\'s much smaller than it is.',
      baseStats: { str: 22, dex: 8, con: 20, int: 6, wis: 10, cha: 8 },
      specialAbility: {
        name: 'Tidal Surge',
        description: 'Can create a wave that deals 3d6 damage to all enemies and pushes them back.'
      },
      awakenedAbility: {
        name: 'Primordial Surge',
        description: 'TIDAL WAVE: 6d8 bludgeoning in 60ft cone, push 30ft, prone. STR save DC 17 half.',
        usesPerLongRest: 1
      },
      quotes: [
        "*affectionate rumbling*",
        "Tiny help!",
        "*accidentally destroys terrain*"
      ]
    },
    {
      id: 'void_jellyfish',
      name: 'The Hollow One',
      species: 'Void Jellyfish',
      class: 'sorcerer',
      rarity: 'legendary',
      description: 'A jellyfish from the deepest abyss. It has seen the darkness between stars.',
      personality: 'Cryptic and ominous. Speaks in riddles and prophecies.',
      baseStats: { str: 6, dex: 16, con: 10, int: 18, wis: 18, cha: 14 },
      specialAbility: {
        name: 'Void Touch',
        description: 'Attacks deal psychic damage and can bypass resistances.'
      },
      awakenedAbility: {
        name: 'Glimpse the Void',
        description: 'All enemies 30ft: WIS save DC 17 or 4d10 psychic + stunned 1 round. Half on save.',
        usesPerLongRest: 1
      },
      quotes: [
        "The void whispers your name...",
        "I have seen your ending. It is... interesting.",
        "*eldritch humming*"
      ]
    }
  ],
  
  // === UNIQUE (USDC only - 10% of USDC pulls) - D&D Parodies ===
  unique: [
    {
      id: 'eelminster',
      name: 'Eelminster',
      species: 'Ancient Electric Eel',
      class: 'archmage',
      rarity: 'unique',
      description: 'The most powerful wizard in all the Seven Seas. Has a magnificent beard of tendrils.',
      personality: 'Wise, mysterious, and loves to meddle in affairs "for the greater good."',
      baseStats: { str: 10, dex: 14, con: 14, int: 22, wis: 18, cha: 16 },
      specialAbility: {
        name: 'Eldritch Storm',
        description: 'Once per day, cast a devastating spell dealing 6d6 lightning damage to all enemies.'
      },
      awakenedAbility: {
        name: 'Eldritch Storm of Ages',
        description: 'Cast THREE spells at once: Chain Lightning (8d8 to 4 targets), Wall of Force (10 min), Greater Invisibility (1 ally). No concentration.',
        usesPerLongRest: 1
      },
      quotes: [
        "I have been expecting you.",
        "The currents of fate flow as they must.",
        "In my younger days—which was several centuries ago..."
      ],
      lore: 'Parody of Elminster Aumar, the Sage of Shadowdale.'
    },
    {
      id: 'clizzt_dourchin',
      name: "Clizzt Do'Urchin",
      species: 'Albino Sea Urchin',
      class: 'ranger',
      rarity: 'unique',
      description: 'A brooding albino urchin who dual-wields spine-swords. Exiled from the Dark Reef.',
      personality: 'Honorable loner with a tragic past. Has an astral panther catfish companion.',
      baseStats: { str: 16, dex: 20, con: 14, int: 14, wis: 14, cha: 14 },
      specialAbility: {
        name: 'Spine Storm',
        description: 'Can make 4 attacks per turn with twin spine-blades.'
      },
      awakenedAbility: {
        name: 'Summon Guenhwyfin',
        description: 'Summon GUENHWYFIN, ASTRAL PANTHER CATFISH (50 HP, AC 15, Speed 50) for 1 hour. Pounce +7, 2d6+4 + knockdown. Can phase through walls.',
        usesPerLongRest: 1,
        summon: { name: 'Guenhwyfin, Astral Panther Catfish', hp: 50, ac: 15, duration: 'until dismissed or 0 HP' }
      },
      quotes: [
        "I walk alone... by choice.",
        "My spines are my honor.",
        "Come, Guenhwyfin. We hunt."
      ],
      lore: "Parody of Drizzt Do'Urden, the famous dark elf ranger."
    },
    {
      id: 'minnowtar',
      name: 'Minnowtar',
      species: 'Half-Fish Half-Bull Shark',
      class: 'barbarian',
      rarity: 'unique',
      description: 'A fearsome hybrid trapped in an underwater labyrinth. Finally free and ANGRY.',
      personality: 'Rage issues but actually quite philosophical when calm.',
      baseStats: { str: 22, dex: 12, con: 18, int: 10, wis: 12, cha: 8 },
      specialAbility: {
        name: 'Labyrinth Rage',
        description: 'When below half HP, gains +4 to damage and resistance to all damage.'
      },
      awakenedAbility: {
        name: 'Labyrinth Fury',
        description: 'For 1 minute: Double damage, immune to charm/fear/stun, resist all, extra attack/turn. 1 exhaustion after.',
        usesPerLongRest: 1
      },
      quotes: [
        "WALLS! I HATE WALLS!",
        "The maze is a metaphor... FOR PAIN!",
        "*confused bellowing*"
      ],
      lore: 'Parody of the Minotaur, but fishier.'
    },
    {
      id: 'crabbert_the_magnificent',
      name: 'Crabbert the Magnificent',
      species: 'Decorator Crab',
      class: 'bard',
      rarity: 'unique',
      description: 'The greatest bard the seas have ever known. Decorates himself with the spoils of adventure.',
      personality: 'Flamboyant showman. Every battle is a performance.',
      baseStats: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 22 },
      specialAbility: {
        name: 'Bardic Inspiration',
        description: 'Grant allies +1d8 to attacks, saves, or checks (3/day).'
      },
      awakenedAbility: {
        name: 'The Standing Ovation',
        description: 'All allies: full heal, +2 all rolls (10 min), one "Encore" reroll. Enemies charmed 1 round (WIS DC 18).',
        usesPerLongRest: 1
      },
      quotes: [
        "And now, for my next number...",
        "This? Oh, it's from a dragon turtle I seduced.",
        "*strums shell-lute magnificently*"
      ],
      lore: 'Parody of every flamboyant bard ever.'
    },
    {
      id: 'tiamat_fry',
      name: 'Tia-Minnow',
      species: 'Five-Headed Betta Fish',
      class: 'dragon',
      rarity: 'unique',
      description: 'A tiny betta fish with five heads, each a different color. Has delusions of godhood.',
      personality: 'Each head has a different personality. They argue constantly.',
      baseStats: { str: 14, dex: 18, con: 14, int: 16, wis: 12, cha: 18 },
      specialAbility: {
        name: 'Chromatic Breath',
        description: 'Can breathe fire, ice, lightning, acid, or poison (pick one per use). 3d6 damage.'
      },
      awakenedAbility: {
        name: 'Chromatic Chorus',
        description: 'ALL FIVE BREATHS at once in 60ft cone: 3d6 fire + cold + lightning + acid + poison (15d6 total). DEX DC 17 half.',
        usesPerLongRest: 1
      },
      quotes: [
        "WE are the queen of— No, I want to say it! QUIET!",
        "BOW BEFORE— stop interrupting!",
        "*five-way argument*"
      ],
      lore: 'Parody of Tiamat, the five-headed dragon goddess.'
    },
    {
      id: 'sturgeon_strahd',
      name: 'Count Sturgeon von Strahd',
      species: 'Vampire Sturgeon',
      class: 'death knight',
      rarity: 'unique',
      description: 'An ancient vampire fish who rules a sunken castle in eternal darkness.',
      personality: 'Brooding romantic villain. Monologues about lost love.',
      baseStats: { str: 18, dex: 16, con: 16, int: 16, wis: 14, cha: 20 },
      specialAbility: {
        name: 'Life Drain',
        description: 'Heals for 50% of damage dealt. Immune to necrotic.'
      },
      awakenedAbility: {
        name: 'Lord of the Sunken Castle',
        description: 'Summon MIST OF BAROVIA (30ft, 1 min): teleport in mist (bonus), +5 attacks, heal 2d10/turn.',
        usesPerLongRest: 1
      },
      quotes: [
        "I am the ancient... I am the reef...",
        "She looked just like you... my Tatianchovie...",
        "*dramatic cape swirl*"
      ],
      lore: 'Parody of Count Strahd von Zarovich from Ravenloft.'
    },
    
    // === BALDUR'S GATE 3 PARODIES ===
    
    {
      id: 'astarfish',
      name: 'Astarfish',
      species: 'Vampire Starfish',
      class: 'rogue',
      rarity: 'unique',
      description: 'A pale, aristocratic starfish with a taste for blood and drama. Claims to be a "creature of the night."',
      personality: 'Flirtatious, dramatic, secretly vulnerable. Will betray you for a tan.',
      baseStats: { str: 10, dex: 20, con: 12, int: 14, wis: 10, cha: 20 },
      specialAbility: {
        name: 'Bite',
        description: 'Melee attack that heals Astarfish for damage dealt. "I could really use a pick-me-up."'
      },
      awakenedAbility: {
        name: 'Ascended Form',
        description: 'At 5 stars: Can charm one enemy per combat. They fight for you for 2 rounds.'
      },
      quotes: [
        "I could make an exception... just this once.",
        "Darling, I'm a MONSTER. A beautiful, beautiful monster.",
        "*dramatically regenerates a severed arm*"
      ],
      lore: 'Parody of Astarion from Baldur\'s Gate 3.'
    },
    {
      id: 'shadowharp',
      name: 'Shadowharp',
      species: 'Moody Clam',
      class: 'cleric',
      rarity: 'unique',
      description: 'A dark-shelled clam devoted to a mysterious goddess. Has commitment issues with her deity.',
      personality: 'Sarcastic, secretive, surprisingly kind when she thinks no one is watching.',
      baseStats: { str: 12, dex: 14, con: 14, int: 12, wis: 20, cha: 14 },
      specialAbility: {
        name: 'Shar\'s Darkness',
        description: 'Creates a sphere of magical darkness. Allies can see through it, enemies cannot.'
      },
      awakenedAbility: {
        name: 'Break the Cycle',
        description: 'At 5 stars: Once per day, can revive a fallen ally at half HP.'
      },
      quotes: [
        "I\'d rather not discuss it.",
        "My goddess has... plans. Probably.",
        "*opens shell slightly* Don't make me regret this."
      ],
      lore: 'Parody of Shadowheart from Baldur\'s Gate 3.'
    },
    {
      id: 'gale_whale',
      name: 'Gale of Waterbreath',
      species: 'Wizard Whale',
      class: 'wizard',
      rarity: 'unique',
      description: 'A brilliant but cursed whale who accidentally swallowed a Netherese Orb. Needs to eat magic items or he explodes.',
      personality: 'Pompous intellectual who genuinely means well. Will lecture you about magic history.',
      baseStats: { str: 14, dex: 8, con: 14, int: 22, wis: 14, cha: 16 },
      specialAbility: {
        name: 'Consume Magic',
        description: 'Can destroy a magic item to heal and gain temporary spell slot. "It\'s not greed, it\'s survival!"'
      },
      awakenedAbility: {
        name: 'Controlled Detonation',
        description: 'At 5 stars: Once per combat, can threaten to explode, frightening all enemies for 2 rounds.'
      },
      quotes: [
        "Did you know that the Weave is actually—",
        "I need to eat that. For... reasons.",
        "*whale song that somehow sounds pretentious*"
      ],
      lore: 'Parody of Gale from Baldur\'s Gate 3.'
    },
    {
      id: 'laeshell',
      name: "Lae'shell",
      species: 'Githyanki Crab',
      class: 'fighter',
      rarity: 'unique',
      description: 'An aggressive warrior crab from another plane. Views everyone as either a threat or an istik (inferior).',
      personality: 'Violently direct. Slowly learning that not everything is solved by combat. Slowly.',
      baseStats: { str: 20, dex: 16, con: 16, int: 12, wis: 10, cha: 8 },
      specialAbility: {
        name: 'Githyanki Warcry',
        description: 'Bonus action: Gain advantage on attacks for one round. "Chk\'chk! (Victory!)"'
      },
      awakenedAbility: {
        name: 'Vlaakith\'s Favor',
        description: 'At 5 stars: Attacks ignore resistance. "The lich queen smiles upon me."'
      },
      quotes: [
        "Tsk. Istik.",
        "Combat is the solution. What was the question?",
        "*aggressive claw clicking*"
      ],
      lore: "Parody of Lae'zel from Baldur's Gate 3."
    },
    {
      id: 'karlcrab',
      name: 'Karlcrab',
      species: 'Infernal Engine Crab',
      class: 'barbarian',
      rarity: 'unique',
      description: 'A fiery crab with a literal infernal engine for a heart. Radiates heat and enthusiasm.',
      personality: 'Aggressively optimistic. Loves fighting, hugs, and not exploding from her engine.',
      baseStats: { str: 20, dex: 14, con: 18, int: 10, wis: 10, cha: 16 },
      specialAbility: {
        name: 'Infernal Fury',
        description: 'Melee attacks deal +1d6 fire damage. "FEEL THE HEAT, SOLDIER!"'
      },
      awakenedAbility: {
        name: 'Engine Overdrive',
        description: 'At 5 stars: Once per combat, double all damage for one round. Engine visibly overheats.'
      },
      quotes: [
        "HEY! You\'re not dead yet! NICE!",
        "My heart is literally on fire. It\'s fine.",
        "*accidentally boils nearby water*"
      ],
      lore: 'Parody of Karlach from Baldur\'s Gate 3.'
    },
    {
      id: 'gill_warlock',
      name: 'Gill, the Blade of Frontiers',
      species: 'Warlock Fish',
      class: 'warlock',
      rarity: 'unique',
      description: 'A charming fish with a secret pact and a hero complex. His patron is definitely not suspicious.',
      personality: 'Heroic facade hiding deep insecurity. Genuinely wants to help, questionable methods.',
      baseStats: { str: 14, dex: 14, con: 12, int: 14, wis: 12, cha: 20 },
      specialAbility: {
        name: 'Eldritch Bubble',
        description: 'Ranged attack: 1d10 force damage. "The Blade of Frontiers strikes again!"'
      },
      awakenedAbility: {
        name: 'Pact Unleashed',
        description: 'At 5 stars: Can summon patron\'s power for +3d6 damage once per combat.'
      },
      quotes: [
        "The Blade of Frontiers is HERE!",
        "My patron? Oh, he\'s perfectly trustworthy. Probably.",
        "*heroic pose while sweating nervously*"
      ],
      lore: 'Parody of Wyll from Baldur\'s Gate 3.'
    },
    {
      id: 'halseal',
      name: 'Halseal',
      species: 'Archdruid Seal',
      class: 'druid',
      rarity: 'unique',
      description: 'A massive, gentle seal who is definitely not thinking about turning into a bear. Very in touch with nature.',
      personality: 'Calm, wise, nurturing. Suspiciously enthusiastic about wildshape. VERY cuddly.',
      baseStats: { str: 16, dex: 10, con: 16, int: 12, wis: 20, cha: 18 },
      specialAbility: {
        name: 'Wildshape: Bear Seal',
        description: 'Transform into a powerful bear-seal hybrid. +20 temp HP, +2 to attacks.'
      },
      awakenedAbility: {
        name: 'Oakfather\'s Chosen',
        description: 'At 5 stars: Wildshape lasts entire combat and can use it twice per day.'
      },
      quotes: [
        "Nature provides all we need.",
        "Have you considered... becoming a bear?",
        "*transforms into bear and looks very happy about it*"
      ],
      lore: 'Parody of Halsin from Baldur\'s Gate 3.'
    },
    {
      id: 'mintharra_eel',
      name: 'Mintharra',
      species: 'Drow Moray Eel',
      class: 'paladin',
      rarity: 'unique',
      description: 'A ruthless eel priestess who decided villainy wasn\'t working out. Reformed-ish.',
      personality: 'Imperious, cruel humor, surprisingly loyal once earned. Will step on you (emotionally).',
      baseStats: { str: 18, dex: 14, con: 14, int: 14, wis: 12, cha: 18 },
      specialAbility: {
        name: 'Lolth\'s Smite',
        description: 'Divine smite deals necrotic instead of radiant. "The goddess of spiders sends her regards."'
      },
      awakenedAbility: {
        name: 'True Believer',
        description: 'At 5 stars: Smite crits on 19-20. "Absolute power has its perks."'
      },
      quotes: [
        "I could kill you. I choose not to. You\'re welcome.",
        "Redemption is overrated. I prefer... reinvention.",
        "*judges you silently*"
      ],
      lore: 'Parody of Minthara from Baldur\'s Gate 3.'
    }
  ]
};

// ============================================================================
// PULL RATES (Unified - same rates for Pearls and USDC)
// ============================================================================

const PULL_RATES = {
  common: 0.45,      // 45%
  uncommon: 0.30,    // 30%
  rare: 0.15,        // 15%
  legendary: 0.07,   // 7%
  unique: 0.03       // 3%
};

const PULL_COSTS = {
  usdc: 2.50         // $2.50 USDC per pull (only currency now)
};

// ============================================================================
// REVIVAL SYSTEM
// ============================================================================

const REVIVAL_OPTIONS = {
  resurrection: {
    cost: 5.00,      // 5 USDC to resurrect henchman
    currency: 'usdc'
  },
  autoRevive: {
    hours: 4,        // Auto-revive after 4 hours
    ms: 4 * 60 * 60 * 1000  // 4 hours in milliseconds
  }
  // Dupe star-up also revives (handled in pullHenchman)
};

// ============================================================================
// STAR SYSTEM
// ============================================================================

const MAX_STARS = 5;

const STAR_BONUSES = {
  1: { skillPoints: 0, statBonus: 0, description: 'Base henchman' },
  2: { skillPoints: 1, statBonus: 1, description: '+1 skill point, +1 to primary stat' },
  3: { skillPoints: 2, statBonus: 2, description: '+2 skill points, +2 to primary stat' },
  4: { skillPoints: 4, statBonus: 3, description: '+4 skill points, +3 to primary stat' },
  5: { skillPoints: 6, statBonus: 4, description: '+6 skill points, +4 to primary stat, AWAKENED ability' }
};

// Dupes needed for each star level
const DUPES_FOR_STAR = {
  2: 1,   // 1 dupe to reach 2 stars
  3: 2,   // 2 more dupes to reach 3 stars
  4: 3,   // 3 more dupes to reach 4 stars  
  5: 5    // 5 more dupes to reach 5 stars (total 11 dupes for max)
};

// ============================================================================
// HENCHMAN MANAGER
// ============================================================================

class HenchmanManager {
  constructor(db) {
    this.db = db;
    this.initDB();
  }
  
  initDB() {
    // Owned henchmen
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS character_henchmen (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        henchman_id TEXT NOT NULL,
        custom_name TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        hp_current INTEGER,
        hp_max INTEGER,
        stars INTEGER DEFAULT 1,
        dupe_count INTEGER DEFAULT 0,
        skill_points INTEGER DEFAULT 0,
        status TEXT DEFAULT 'alive',
        kills INTEGER DEFAULT 0,
        recruited_at TEXT DEFAULT CURRENT_TIMESTAMP,
        died_at TEXT,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    // Active party member
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS character_party (
        character_id TEXT PRIMARY KEY,
        henchman_instance_id TEXT,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE,
        FOREIGN KEY (henchman_instance_id) REFERENCES character_henchmen(id)
      )
    `);
    
    // Pull history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS henchman_pulls (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        henchman_id TEXT NOT NULL,
        rarity TEXT NOT NULL,
        payment_type TEXT NOT NULL,
        payment_amount REAL NOT NULL,
        pulled_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('🦀 Henchman system initialized');
  }
  
  /**
   * Resurrect a dead henchman for 300 pearls
   */
  resurrectHenchman(characterId, instanceId) {
    const henchman = this.db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ?'
    ).get(instanceId, characterId);
    
    if (!henchman) {
      return { success: false, error: 'Henchman not found' };
    }
    
    if (henchman.status !== 'dead') {
      return { success: false, error: 'Henchman is not dead' };
    }
    
    // Check if player has enough USDC
    const char = this.db.prepare('SELECT usdc_balance FROM clawds WHERE id = ?').get(characterId);
    const balance = char?.usdc_balance || 0;
    if (!char || balance < REVIVAL_OPTIONS.resurrection.cost) {
      return { success: false, error: `Need ${REVIVAL_OPTIONS.resurrection.cost} USDC to resurrect (you have ${balance})` };
    }
    
    // Deduct USDC and revive
    this.db.prepare('UPDATE clawds SET usdc_balance = usdc_balance - ? WHERE id = ?')
      .run(REVIVAL_OPTIONS.resurrection.cost, characterId);
    
    this.db.prepare(`
      UPDATE character_henchmen 
      SET status = 'alive', hp_current = hp_max, died_at = NULL 
      WHERE id = ?
    `).run(instanceId);
    
    const template = this._findHenchmanTemplate(henchman.henchman_id);
    
    return {
      success: true,
      message: `${template?.name || 'Henchman'} has been resurrected!`,
      cost: REVIVAL_OPTIONS.resurrection.cost,
      henchman: template
    };
  }
  
  /**
   * Check and process auto-revives (call periodically or on henchman access)
   */
  checkAutoRevives(characterId) {
    const deadHenchmen = this.db.prepare(`
      SELECT * FROM character_henchmen 
      WHERE character_id = ? AND status = 'dead' AND died_at IS NOT NULL
    `).all(characterId);
    
    const revived = [];
    const now = Date.now();
    
    for (const h of deadHenchmen) {
      const diedAt = new Date(h.died_at).getTime();
      const timeSinceDeath = now - diedAt;
      
      if (timeSinceDeath >= REVIVAL_OPTIONS.autoRevive.ms) {
        // Auto-revive!
        this.db.prepare(`
          UPDATE character_henchmen 
          SET status = 'alive', hp_current = hp_max, died_at = NULL 
          WHERE id = ?
        `).run(h.id);
        
        const template = this._findHenchmanTemplate(h.henchman_id);
        revived.push({
          instanceId: h.id,
          name: template?.name || 'Unknown',
          message: `${template?.name} has recovered and rejoined your roster!`
        });
      }
    }
    
    return revived;
  }
  
  /**
   * Get time until auto-revive for a dead henchman
   */
  getReviveTimer(instanceId) {
    const h = this.db.prepare('SELECT * FROM character_henchmen WHERE id = ?').get(instanceId);
    if (!h || h.status !== 'dead' || !h.died_at) return null;
    
    const diedAt = new Date(h.died_at).getTime();
    const reviveAt = diedAt + REVIVAL_OPTIONS.autoRevive.ms;
    const now = Date.now();
    const msRemaining = Math.max(0, reviveAt - now);
    
    return {
      reviveAt: new Date(reviveAt).toISOString(),
      msRemaining,
      minutesRemaining: Math.ceil(msRemaining / 60000),
      hoursRemaining: (msRemaining / 3600000).toFixed(1),
      canResurrectNow: true,
      resurrectionCost: REVIVAL_OPTIONS.resurrection.cost
    };
  }
  
  /**
   * Pull a henchman (gacha!)
   */
  pullHenchman(characterId, paymentType = 'pearl') {
    // Unified rates - same pool for both currencies
    const rates = PULL_RATES;
    
    // Roll for rarity
    const roll = Math.random();
    let cumulative = 0;
    let selectedRarity = null;
    
    for (const [rarity, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (roll < cumulative) {
        selectedRarity = rarity;
        break;
      }
    }
    
    if (!selectedRarity) {
      selectedRarity = Object.keys(rates)[0];
    }
    
    // Get pool for this rarity
    const pool = HENCHMAN_POOL[selectedRarity];
    if (!pool || pool.length === 0) {
      return { success: false, error: 'No henchmen available at this rarity' };
    }
    
    // Random selection from pool
    const henchman = pool[Math.floor(Math.random() * pool.length)];
    
    // Check for existing (any status - for star system)
    const existing = this.db.prepare(
      'SELECT * FROM character_henchmen WHERE character_id = ? AND henchman_id = ?'
    ).get(characterId, henchman.id);
    
    const isDuplicate = !!existing;
    let starUp = null;
    let newStars = 1;
    let newSkillPoints = 0;
    
    // Get character level for henchman starting level
    const char = this.db.prepare('SELECT level FROM clawds WHERE id = ?').get(characterId);
    const startLevel = char?.level || 1;
    
    // Calculate HP
    const conMod = Math.floor((henchman.baseStats.con - 10) / 2);
    const hpPerLevel = 8 + conMod;
    const maxHp = hpPerLevel * startLevel;
    
    // Record the pull
    const pullId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO henchman_pulls (id, character_id, henchman_id, rarity, payment_type, payment_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pullId, characterId, henchman.id, selectedRarity, paymentType, PULL_COSTS[paymentType]);
    
    let instanceId = null;
    
    if (!isDuplicate) {
      // New henchman - add to collection at 1 star
      instanceId = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO character_henchmen (id, character_id, henchman_id, level, hp_current, hp_max, stars, dupe_count, skill_points)
        VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0)
      `).run(instanceId, characterId, henchman.id, startLevel, maxHp, maxHp);
    } else {
      // DUPLICATE - increase dupe count and check for star upgrade!
      instanceId = existing.id;
      const newDupeCount = existing.dupe_count + 1;
      const currentStars = existing.stars;
      newStars = currentStars;
      
      // Check if we reach next star level
      let dupesNeeded = 0;
      for (let star = 2; star <= MAX_STARS; star++) {
        dupesNeeded += DUPES_FOR_STAR[star];
        if (currentStars < star && newDupeCount >= dupesNeeded) {
          newStars = star;
        }
      }
      
      // Calculate skill points from star level
      newSkillPoints = STAR_BONUSES[newStars].skillPoints;
      
      if (newStars > currentStars) {
        starUp = {
          from: currentStars,
          to: newStars,
          bonusDescription: STAR_BONUSES[newStars].description,
          skillPointsGained: newSkillPoints - existing.skill_points
        };
        
        // Check for awakened ability at 5 stars
        if (newStars === 5 && henchman.awakenedAbility) {
          starUp.awakenedAbility = henchman.awakenedAbility;
        }
      }
      
      // Update the henchman
      this.db.prepare(`
        UPDATE character_henchmen 
        SET dupe_count = ?, stars = ?, skill_points = ?
        WHERE id = ?
      `).run(newDupeCount, newStars, newSkillPoints, existing.id);
      
      // If the henchman was dead, revive them on star up!
      if (existing.status === 'dead' && starUp) {
        this.db.prepare(`
          UPDATE character_henchmen SET status = 'alive', hp_current = hp_max, died_at = NULL WHERE id = ?
        `).run(existing.id);
        starUp.revived = true;
      }
    }
    
    // Calculate dupes to next star
    let dupesToNextStar = null;
    if (newStars < MAX_STARS) {
      const currentDupes = isDuplicate ? (existing.dupe_count + 1) : 0;
      let totalNeeded = 0;
      for (let star = 2; star <= newStars + 1; star++) {
        totalNeeded += DUPES_FOR_STAR[star];
      }
      dupesToNextStar = totalNeeded - currentDupes;
    }
    
    return {
      success: true,
      henchman: {
        id: henchman.id,
        name: henchman.name,
        species: henchman.species,
        class: henchman.class,
        rarity: selectedRarity,
        description: henchman.description,
        personality: henchman.personality,
        specialAbility: henchman.specialAbility,
        awakenedAbility: henchman.awakenedAbility,
        quote: henchman.quotes[Math.floor(Math.random() * henchman.quotes.length)],
        lore: henchman.lore
      },
      instanceId,
      level: startLevel,
      maxHp,
      isDuplicate,
      stars: newStars,
      starUp,
      dupesToNextStar,
      skillPoints: newSkillPoints,
      paymentType,
      rarityOdds: PULL_RATES
    };
  }
  
  /**
   * Get all henchmen owned by a character
   */
  getOwnedHenchmen(characterId, includeDeadopt = false) {
    const query = includeDeadopt 
      ? 'SELECT * FROM character_henchmen WHERE character_id = ?'
      : 'SELECT * FROM character_henchmen WHERE character_id = ? AND status = ?';
    
    const owned = includeDeadopt
      ? this.db.prepare(query).all(characterId)
      : this.db.prepare(query).all(characterId, 'alive');
    
    return owned.map(h => {
      const template = this._findHenchmanTemplate(h.henchman_id);
      if (!template) return null;
      
      const starBonus = STAR_BONUSES[h.stars] || STAR_BONUSES[1];
      
      // Calculate dupes to next star
      let dupesToNextStar = null;
      if (h.stars < MAX_STARS) {
        let totalNeeded = 0;
        for (let star = 2; star <= h.stars + 1; star++) {
          totalNeeded += DUPES_FOR_STAR[star];
        }
        dupesToNextStar = totalNeeded - h.dupe_count;
      }
      
      return {
        instanceId: h.id,
        ...template,
        customName: h.custom_name,
        level: h.level,
        xp: h.xp,
        hpCurrent: h.hp_current,
        hpMax: h.hp_max,
        stars: h.stars,
        dupeCount: h.dupe_count,
        dupesToNextStar,
        skillPoints: h.skill_points,
        starBonus,
        isMaxStars: h.stars >= MAX_STARS,
        status: h.status,
        kills: h.kills,
        recruitedAt: h.recruited_at,
        diedAt: h.died_at,
        // At 5 stars, include awakened ability
        activeAwakenedAbility: h.stars >= 5 ? template.awakenedAbility : null
      };
    }).filter(Boolean);
  }
  
  /**
   * Get active party member
   */
  getPartyMember(characterId) {
    const party = this.db.prepare(`
      SELECT h.* FROM character_party p
      JOIN character_henchmen h ON p.henchman_instance_id = h.id
      WHERE p.character_id = ? AND h.status = 'alive'
    `).get(characterId);
    
    if (!party) return null;
    
    const template = this._findHenchmanTemplate(party.henchman_id);
    if (!template) return null;
    
    return {
      instanceId: party.id,
      ...template,
      customName: party.custom_name,
      level: party.level,
      xp: party.xp,
      hpCurrent: party.hp_current,
      hpMax: party.hp_max,
      kills: party.kills
    };
  }
  
  /**
   * Set active party member
   */
  setPartyMember(characterId, henchmanInstanceId) {
    // Verify ownership
    const henchman = this.db.prepare(
      'SELECT * FROM character_henchmen WHERE id = ? AND character_id = ? AND status = ?'
    ).get(henchmanInstanceId, characterId, 'alive');
    
    if (!henchman) {
      return { success: false, error: 'Henchman not found or not alive' };
    }
    
    // Update party
    this.db.prepare(`
      INSERT INTO character_party (character_id, henchman_instance_id)
      VALUES (?, ?)
      ON CONFLICT(character_id) DO UPDATE SET henchman_instance_id = ?
    `).run(characterId, henchmanInstanceId, henchmanInstanceId);
    
    const template = this._findHenchmanTemplate(henchman.henchman_id);
    
    return {
      success: true,
      message: `${template?.name || 'Henchman'} joins your party!`,
      henchman: template
    };
  }
  
  /**
   * Dismiss party member (but keep in collection)
   */
  dismissPartyMember(characterId) {
    this.db.prepare('DELETE FROM character_party WHERE character_id = ?').run(characterId);
    return { success: true, message: 'Party member dismissed.' };
  }
  
  /**
   * Handle henchman death
   */
  henchmanDied(instanceId) {
    this.db.prepare(`
      UPDATE character_henchmen SET status = 'dead', died_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(instanceId);
    
    // Remove from party if active
    this.db.prepare('DELETE FROM character_party WHERE henchman_instance_id = ?').run(instanceId);
    
    return { success: true };
  }
  
  /**
   * Award XP to henchman
   */
  awardXP(instanceId, xp) {
    const henchman = this.db.prepare('SELECT * FROM character_henchmen WHERE id = ?').get(instanceId);
    if (!henchman || henchman.status !== 'alive') return null;
    
    const newXP = henchman.xp + xp;
    let newLevel = henchman.level;
    
    // Level up thresholds (same as player)
    const thresholds = { 1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500, 6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000 };
    
    while (newLevel < 10 && newXP >= (thresholds[newLevel + 1] || 999999)) {
      newLevel++;
    }
    
    const leveledUp = newLevel > henchman.level;
    let newMaxHp = henchman.hp_max;
    
    if (leveledUp) {
      // Increase HP on level up
      const template = this._findHenchmanTemplate(henchman.henchman_id);
      const conMod = Math.floor(((template?.baseStats?.con || 10) - 10) / 2);
      const hpPerLevel = 8 + conMod;
      newMaxHp = hpPerLevel * newLevel;
    }
    
    this.db.prepare(`
      UPDATE character_henchmen SET xp = ?, level = ?, hp_max = ?, hp_current = ? WHERE id = ?
    `).run(newXP, newLevel, newMaxHp, leveledUp ? newMaxHp : henchman.hp_current, instanceId);
    
    return { xpGained: xp, newXP, newLevel, leveledUp, newMaxHp };
  }
  
  /**
   * Get pull costs
   */
  getPullCosts() {
    return {
      pearl: { cost: PULL_COSTS.pearl, rates: PEARL_RATES },
      usdc: { cost: PULL_COSTS.usdc, rates: USDC_RATES }
    };
  }
  
  /**
   * Find henchman template by ID
   */
  _findHenchmanTemplate(henchmanId) {
    for (const pool of Object.values(HENCHMAN_POOL)) {
      const found = pool.find(h => h.id === henchmanId);
      if (found) return found;
    }
    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HenchmanManager,
  HENCHMAN_POOL,
  PULL_RATES,
  PULL_COSTS,
  MAX_STARS,
  STAR_BONUSES,
  DUPES_FOR_STAR,
  REVIVAL_OPTIONS
};
