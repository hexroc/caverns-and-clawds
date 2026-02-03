/**
 * Clawds & Caverns - Awakened Abilities System
 * 
 * 5-Star henchmen unlock powerful awakened abilities!
 * All abilities require a LONG REST to recharge (like spell slots).
 * 
 * Power scaling by rarity:
 * - Common: Minor buff or utility (1/long rest)
 * - Uncommon: Moderate buff or minor summon (1/long rest)
 * - Rare: Strong ability or summon (1/long rest)
 * - Legendary: Powerful ability or strong summon (1/long rest)
 * - Unique: Signature ability, often with iconic summon (1/long rest)
 */

const AWAKENED_ABILITIES = {
  
  // ============================================================================
  // COMMON AWAKENED ABILITIES (Minor buffs/utility)
  // ============================================================================
  
  sally_shrimp: {
    name: 'Mantis Barrage',
    description: 'Sally unleashes a flurry of sonic punches, striking all enemies in melee range.',
    effect: 'Deal 2d8 force damage to all adjacent enemies. Enemies must CON save DC 14 or be stunned until end of next turn.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"PUNCH PUNCH PUNCH PUNCH PUNCH!"'
  },
  
  barnaby_barnacle: {
    name: 'Fortress Mode',
    description: 'Barnaby anchors himself and becomes an immovable shield.',
    effect: 'For 3 rounds: Cannot move, but gains +5 AC, resistance to all damage, and all adjacent allies gain +3 AC.',
    usesPerLongRest: 1,
    duration: '3 rounds',
    quote: '"*immovable clicking* I. AM. THE. WALL."'
  },
  
  finley_fish: {
    name: 'Maximum Puff',
    description: 'Finley puffs to enormous size, creating a defensive barrier.',
    effect: 'Expand to fill a 15ft radius. All allies inside gain half cover (+2 AC) and can\'t be moved. Finley takes all attacks targeting allies inside. Lasts 2 rounds.',
    usesPerLongRest: 1,
    duration: '2 rounds',
    quote: '"OH NO I\'M DOING IT I\'M ACTUALLY— *POOF*"'
  },
  
  rocky_urchin: {
    name: 'Spine Storm',
    description: 'Rocky launches all his spines in a devastating volley.',
    effect: 'All enemies within 20ft take 3d6 piercing damage (DEX save DC 13 for half). Rocky loses Spine Shield until next long rest.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"TAKE \'EM! TAKE ALL OF \'EM! I DIDN\'T NEED THOSE ANYWAY!"'
  },
  
  coral_kate: {
    name: 'Colony Blessing',
    description: 'The coral colony shares its regenerative power with all allies.',
    effect: 'All allies within 30ft regain 2d8+4 HP and are cured of one condition (poisoned, blinded, or deafened).',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"We are many. We heal as one. Rest now, children."'
  },
  
  // ============================================================================
  // UNCOMMON AWAKENED ABILITIES (Moderate buffs, minor summons)
  // ============================================================================
  
  captain_clamps: {
    name: 'Swashbuckler\'s Finale',
    description: 'Captain Clamps performs his signature dramatic finishing move.',
    effect: 'Make an attack with advantage. On hit, deal triple damage and the target must WIS save DC 15 or be frightened of Captain Clamps for 1 minute. On a crit, the target is also stunned for 1 round.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"AND NOW... THE DRAMATIC CONCLUSION! *flourish*"'
  },
  
  mystic_molly: {
    name: 'Chromatic Chaos',
    description: 'Molly channels wild magic through all eight arms simultaneously.',
    effect: 'Cast 8 random cantrips at random valid targets (including enemies AND allies). Roll d6 for each: 1-fire, 2-cold, 3-lightning, 4-acid, 5-force, 6-healing. Each deals/heals 1d10.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"I HAVE NO IDEA WHAT\'S ABOUT TO HAPPEN AND I AM *THRILLED*!"'
  },
  
  torpedo_ted: {
    name: 'Gigawatt Discharge',
    description: 'Ted releases all his stored electrical energy in one massive burst.',
    effect: 'All creatures within 30ft take 4d10 lightning damage (CON save DC 15 for half). Allies take half damage. Ted is exhausted (disadvantage on attacks) until short rest.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"I\'ve been saving this one. You could say it\'s been... *building up*. ...I\'ll see myself out."'
  },
  
  sister_anemone: {
    name: 'Tide\'s Judgment',
    description: 'Sister Anemone channels the Ocean Mother\'s divine wrath.',
    effect: 'Choose one: BLESSING - One ally gains advantage on all attacks and saves for 1 minute. CURSE - One enemy has disadvantage on all attacks and saves for 1 minute (WIS save DC 16 negates).',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"The Ocean Mother sees all. She has found you... wanting."'
  },
  
  hugo_hermit: {
    name: 'Shell Collection',
    description: 'Hugo reveals his secret stash of magical shells.',
    effect: 'Hugo can swap shells 3 times this combat (no action required). Each shell grants a different resistance: Fire, Cold, Lightning, Acid, or Force. Also gains +2 AC while this ability is active.',
    usesPerLongRest: 1,
    duration: '1 combat',
    quote: '"You think this is my only shell? Oh honey. I have LAYERS."'
  },
  
  // ============================================================================
  // RARE AWAKENED ABILITIES (Strong abilities, summons)
  // ============================================================================
  
  kraken_jr: {
    name: 'Call Daddy',
    description: 'Kraken Jr. summons a tentacle from his father, the actual Kraken.',
    effect: 'Summon a KRAKEN TENTACLE (40 HP, AC 16) for 3 rounds. The tentacle has multiattack: 2 slam attacks (+8, 2d8+4 bludgeoning) and can grapple.',
    usesPerLongRest: 1,
    duration: '3 rounds',
    summon: {
      name: 'Kraken Tentacle',
      hp: 40,
      ac: 16,
      attacks: [
        { name: 'Slam', hit: 8, damage: '2d8+4', type: 'bludgeoning' },
        { name: 'Grapple', hit: 8, damage: '1d8+4', special: 'Target grappled, escape DC 16' }
      ]
    },
    quote: '"DAAAAD! THEY\'RE BEING MEAN TO ME!"'
  },
  
  duchess_pearline: {
    name: 'Pearl of Great Price',
    description: 'Duchess Pearline produces her most precious pearl, imbued with protective magic.',
    effect: 'Create a PEARL OF PROTECTION that an ally can crush (bonus action) for: Full heal to max HP, remove all conditions, and gain 20 temp HP. Pearl crumbles after use.',
    usesPerLongRest: 1,
    duration: 'until used',
    quote: '"This pearl is worth more than your entire lineage. Use it wisely."'
  },
  
  chompy_anglerfish: {
    name: 'Abyssal Hunger',
    description: 'Chompy\'s lure goes dark and she enters a feeding frenzy.',
    effect: 'For 2 rounds: Chompy can make 3 bite attacks per turn. Each hit heals Chompy for damage dealt. If Chompy kills an enemy, immediately gain another attack.',
    usesPerLongRest: 1,
    duration: '2 rounds',
    quote: '"The light goes out now. Only teeth remain. SO MANY TEETH. Friend? FOOD!"'
  },
  
  professor_nautilus: {
    name: 'Eons of Knowledge',
    description: 'The Professor recalls 400 million years of evolutionary knowledge.',
    effect: 'For this combat: All allies gain advantage on attacks against all enemies (Professor identifies weaknesses). All enemies have -2 AC. Professor can use reaction to give any ally +5 to any roll.',
    usesPerLongRest: 1,
    duration: '1 combat',
    quote: '"I have observed your species rise and fall seventeen times. I know exactly where to strike."'
  },
  
  // ============================================================================
  // LEGENDARY AWAKENED ABILITIES (Powerful abilities, strong summons)
  // ============================================================================
  
  king_triton_jr: {
    name: 'Royal Summons',
    description: 'Prince Triton calls upon his royal birthright to summon the palace guard.',
    effect: 'Summon 2 MERFOLK GUARDS (30 HP each, AC 14) for 5 rounds. Each guard has: Trident (+5, 1d8+3) and can cast Shield (reaction, +5 AC).',
    usesPerLongRest: 1,
    duration: '5 rounds',
    summon: {
      name: 'Merfolk Royal Guard',
      count: 2,
      hp: 30,
      ac: 14,
      attacks: [
        { name: 'Trident', hit: 5, damage: '1d8+3', type: 'piercing' }
      ],
      abilities: ['Shield (reaction): +5 AC until start of next turn']
    },
    quote: '"By royal decree, I summon the guard! ...Please don\'t tell Father."'
  },
  
  ancient_leviathan: {
    name: 'Primordial Surge',
    description: 'Tiny remembers he\'s actually a primordial sea monster.',
    effect: 'Create a TIDAL WAVE: All enemies in 60ft cone take 6d8 bludgeoning damage (STR save DC 17 for half) and are pushed 30ft and knocked prone. Terrain becomes difficult terrain.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"*HAPPY LEVIATHAN NOISES* TINY MAKE BIG SPLASH!"'
  },
  
  void_jellyfish: {
    name: 'Glimpse the Void',
    description: 'The Hollow One opens a window to the space between stars.',
    effect: 'All enemies within 30ft must WIS save DC 17. Fail: Take 4d10 psychic damage and are stunned for 1 round as they witness cosmic horror. Success: Half damage, not stunned. Allies are immune.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"Look into the nothing. See what sees you back. *eldritch frequencies*"'
  },
  
  // ============================================================================
  // UNIQUE AWAKENED ABILITIES (Signature abilities, iconic summons)
  // ============================================================================
  
  // --- D&D CLASSICS ---
  
  eelminster: {
    name: 'Eldritch Storm of Ages',
    description: 'The ancient archmage unleashes centuries of accumulated magical power.',
    effect: 'Cast THREE spells simultaneously (Eelminster\'s signature): Chain Lightning (8d8 to 4 targets), Wall of Force (10 min), and Greater Invisibility (on one ally). No concentration required.',
    usesPerLongRest: 1,
    duration: 'varies',
    quote: '"Child, I invented this spell before your species learned to walk upright. Observe."'
  },
  
  clizzt_dourchin: {
    name: 'Summon Guenhwyfin',
    description: 'Clizzt calls forth his loyal astral companion, a panther catfish from another plane.',
    effect: 'Summon GUENHWYFIN, ASTRAL PANTHER CATFISH (50 HP, AC 15, Speed 50) for 1 hour. Guenhwyfin has: Pounce (+7, 2d6+4, knocks prone on hit), Astral Whiskers (30ft blindsight), and can phase through walls.',
    usesPerLongRest: 1,
    duration: '1 hour or until reduced to 0 HP',
    summon: {
      name: 'Guenhwyfin, Astral Panther Catfish',
      hp: 50,
      ac: 15,
      speed: 50,
      attacks: [
        { name: 'Pounce', hit: 7, damage: '2d6+4', type: 'slashing', special: 'Target must STR save DC 14 or be knocked prone' },
        { name: 'Bite', hit: 7, damage: '1d8+4', type: 'piercing' }
      ],
      abilities: ['Astral Whiskers: 30ft blindsight', 'Phase: Can move through solid objects', 'Pack Tactics with Clizzt']
    },
    quote: '"Come, Guenhwyfin. We hunt. *dramatic pose with twin spines*"'
  },
  
  minnowtar: {
    name: 'Labyrinth Fury',
    description: 'The Minnowtar enters a rage that echoes through the maze of his mind.',
    effect: 'For 1 minute: Double damage on all attacks, immune to charm/fear/stun, resistance to all damage, and can make one extra attack per turn. Cannot end rage voluntarily. When rage ends, gain 1 exhaustion.',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"THE WALLS CLOSE IN! THEY ALWAYS CLOSE IN! BUT I! WILL! BREAK! THROUGH!"'
  },
  
  crabbert_the_magnificent: {
    name: 'The Standing Ovation',
    description: 'Crabbert delivers a performance so magnificent, reality itself applauds.',
    effect: 'All allies gain: Full heal, +2 to all rolls for 10 minutes, and one use of "Encore" (reroll any failed roll). All enemies are charmed for 1 round (WIS save DC 18) and can\'t bring themselves to attack such beauty.',
    usesPerLongRest: 1,
    duration: '10 minutes (buffs)',
    quote: '"Ladies and gentlemen... *dramatic pause* ...BEHOLD! *shell-lute solo*"'
  },
  
  tia_minnow: {
    name: 'Chromatic Chorus',
    description: 'All five heads finally agree on something: destruction.',
    effect: 'Breathe ALL FIVE elements simultaneously in a 60ft cone: 3d6 fire + 3d6 cold + 3d6 lightning + 3d6 acid + 3d6 poison (15d6 total). DEX save DC 17 for half. Each head argues about who did most damage.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"FIRE!" "NO, ICE!" "LIGHTNING!" "ACID!" "POISON!" "FINE! ALL OF THEM!" "AGREED!" "FINALLY!"'
  },
  
  sturgeon_strahd: {
    name: 'Lord of the Sunken Castle',
    description: 'The Count calls upon the dark powers of his domain.',
    effect: 'Summon a MIST OF BAROVIA: 30ft radius, heavily obscured for enemies. Sturgeon can teleport anywhere in mist (bonus action), gains +5 to attacks, and heals 2d10 at start of each turn. Lasts 1 minute.',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"Welcome to my realm. You are not the first to enter. None have left. *dramatic cape swirl*"'
  },
  
  // --- BALDUR'S GATE 3 ---
  
  astarfish: {
    name: 'Ascendant Form',
    description: 'Astarfish fully embraces his vampiric nature, becoming a true predator.',
    effect: 'For 1 minute: Charm one enemy (WIS save DC 17) to fight for you. All attacks heal Astarfish. Can turn into mist (immune to damage) as bonus action. On kill, extend duration by 1 round.',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"Oh darling, you thought I was dangerous before? You have NO idea what I am now."'
  },
  
  shadowharp: {
    name: 'Break the Cycle',
    description: 'Shadowharp defies her goddess and chooses her own path.',
    effect: 'MIRACLE: Revive one fallen ally at FULL HP with all resources restored. Alternatively: Grant one ally immunity to all damage for 1 round. Shadowharp loses half her current HP.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"I choose... differently. *shell glows with light, not shadow* ...Don\'t make me regret this."'
  },
  
  gale_whale: {
    name: 'Controlled Detonation',
    description: 'Gale threatens to let the Netherese Orb explode. Tactically.',
    effect: 'Choose: BLUFF - All enemies must WIS save DC 16 or flee in terror for 2 rounds. OR: ACTUAL DETONATION - 10d10 force damage in 40ft radius (DEX save DC 18 for half). Gale is reduced to 1 HP.',
    usesPerLongRest: 1,
    duration: 'instant',
    quote: '"I want you to understand that I am CHOOSING not to explode right now. This is a GIFT."'
  },
  
  laeshell: {
    name: 'Vlaakith\'s Wrath',
    description: 'Lae\'shell channels the power of the Githyanki lich-queen.',
    effect: 'Summon a SILVER SWORD (lasts 1 minute): +3 weapon, deals 2d6 extra psychic damage, severs astral projections. While wielding: Attacks ignore resistance, crits on 19-20, can cast Misty Step as bonus action.',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"Vlaakith\'s blade answers my call. Tsk. Now you will see what a true warrior can do, istik."'
  },
  
  karlcrab: {
    name: 'Engine Overdrive',
    description: 'Karlcrab pushes her infernal engine past all safe limits.',
    effect: 'For 2 rounds: All attacks deal triple damage. All melee attacks against Karlcrab take 2d6 fire damage. She radiates heat (2d6 fire damage to all adjacent enemies at start of her turn). Engine visibly overheating.',
    usesPerLongRest: 1,
    duration: '2 rounds',
    quote: '"ENGINE\'S RUNNING HOT! REAL HOT! THIS IS EITHER GOING TO BE AMAZING OR VERY BAD! PROBABLY BOTH!"'
  },
  
  gill_warlock: {
    name: 'Pact Unleashed',
    description: 'Gill lets his patron\'s power flow through him completely.',
    effect: 'Summon PATRON\'S AVATAR (shadowy fiend, 60 HP, AC 17) for 3 rounds. Avatar has: Eldritch Blast x3 (+8, 1d10+5 each), and can cast one 5th level spell. Gill can see through Avatar\'s eyes.',
    usesPerLongRest: 1,
    duration: '3 rounds',
    summon: {
      name: 'Patron\'s Avatar',
      hp: 60,
      ac: 17,
      attacks: [
        { name: 'Eldritch Blast x3', hit: 8, damage: '1d10+5', type: 'force' }
      ],
      abilities: ['Can cast one 5th level spell', 'Blade of Frontiers: Gill has advantage while Avatar is present']
    },
    quote: '"For once, we fight as one! The Blade of Frontiers AND his... totally normal... patron!"'
  },
  
  halseal: {
    name: 'Archdruid\'s Wild Shape',
    description: 'Halseal transforms into his most powerful form: the legendary Dire Bear-Seal.',
    effect: 'Transform into DIRE BEAR-SEAL for 10 minutes: 100 temp HP, AC 16, multiattack (2 claws +8, 2d8+5 each), can cast healing spells while transformed. If temp HP depleted, reverts but keeps real HP.',
    usesPerLongRest: 1,
    duration: '10 minutes',
    transformation: {
      name: 'Dire Bear-Seal',
      tempHp: 100,
      ac: 16,
      attacks: [
        { name: 'Claw', hit: 8, damage: '2d8+5', type: 'slashing' },
        { name: 'Bite', hit: 8, damage: '2d10+5', type: 'piercing' }
      ],
      abilities: ['Multiattack: 2 claws', 'Can still cast healing spells', 'Advantage on STR checks']
    },
    quote: '"I apologize in advance for what you are about to witness. *transforms* *happy bear-seal noises*"'
  },
  
  mintharra_eel: {
    name: 'Lolth\'s Betrayer',
    description: 'Mintharra calls upon divine power she was never meant to wield.',
    effect: 'Channel corrupted divine energy: Smite deals +6d8 necrotic damage (crits on 19-20). Gain Aura of Terror (15ft, enemies must WIS save DC 16 or frightened). On kill, heal for half the damage dealt.',
    usesPerLongRest: 1,
    duration: '1 minute',
    quote: '"I served the spider queen. I served the Absolute. Now I serve only myself. And I am FAR more terrifying."'
  }
};

// ============================================================================
// ABILITY MANAGER
// ============================================================================

class AwakenedAbilityManager {
  constructor(db) {
    this.db = db;
    this.initDB();
  }
  
  initDB() {
    // Track ability usage (resets on long rest)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS henchman_ability_usage (
        id TEXT PRIMARY KEY,
        henchman_instance_id TEXT NOT NULL,
        ability_id TEXT NOT NULL,
        uses_remaining INTEGER DEFAULT 1,
        last_reset TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(henchman_instance_id, ability_id)
      )
    `);
    
    // Active summons
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS active_summons (
        id TEXT PRIMARY KEY,
        henchman_instance_id TEXT NOT NULL,
        summon_name TEXT NOT NULL,
        hp_current INTEGER,
        hp_max INTEGER,
        duration_rounds INTEGER,
        rounds_remaining INTEGER,
        summoned_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('🌟 Awakened ability system initialized');
  }
  
  /**
   * Get awakened ability for a henchman
   */
  getAwakenedAbility(henchmanId) {
    return AWAKENED_ABILITIES[henchmanId] || null;
  }
  
  /**
   * Check if ability is available (not used since last long rest)
   */
  isAbilityAvailable(instanceId, abilityId) {
    const usage = this.db.prepare(
      'SELECT * FROM henchman_ability_usage WHERE henchman_instance_id = ? AND ability_id = ?'
    ).get(instanceId, abilityId);
    
    if (!usage) return true; // Never used
    return usage.uses_remaining > 0;
  }
  
  /**
   * Use an awakened ability
   */
  useAbility(instanceId, henchmanId) {
    const ability = AWAKENED_ABILITIES[henchmanId];
    if (!ability) {
      return { success: false, error: 'No awakened ability found' };
    }
    
    if (!this.isAbilityAvailable(instanceId, henchmanId)) {
      return { success: false, error: 'Ability already used. Requires long rest to recharge.' };
    }
    
    // Record usage
    this.db.prepare(`
      INSERT INTO henchman_ability_usage (id, henchman_instance_id, ability_id, uses_remaining)
      VALUES (?, ?, ?, 0)
      ON CONFLICT(henchman_instance_id, ability_id) DO UPDATE SET uses_remaining = 0
    `).run(require('crypto').randomUUID(), instanceId, henchmanId);
    
    return {
      success: true,
      ability: ability,
      message: `🌟 ${ability.name} activated!`,
      quote: ability.quote
    };
  }
  
  /**
   * Reset abilities on long rest
   */
  longRest(instanceId) {
    this.db.prepare(
      'UPDATE henchman_ability_usage SET uses_remaining = 1, last_reset = CURRENT_TIMESTAMP WHERE henchman_instance_id = ?'
    ).run(instanceId);
    
    // Also clear any active summons
    this.db.prepare('DELETE FROM active_summons WHERE henchman_instance_id = ?').run(instanceId);
    
    return { success: true, message: 'Awakened ability recharged!' };
  }
  
  /**
   * Create a summon from an ability
   */
  createSummon(instanceId, summonData, durationRounds) {
    const id = require('crypto').randomUUID();
    this.db.prepare(`
      INSERT INTO active_summons (id, henchman_instance_id, summon_name, hp_current, hp_max, duration_rounds, rounds_remaining)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, instanceId, summonData.name, summonData.hp, summonData.hp, durationRounds, durationRounds);
    
    return {
      id,
      ...summonData,
      roundsRemaining: durationRounds
    };
  }
  
  /**
   * Get active summons for a henchman
   */
  getActiveSummons(instanceId) {
    return this.db.prepare(
      'SELECT * FROM active_summons WHERE henchman_instance_id = ? AND rounds_remaining > 0'
    ).all(instanceId);
  }
  
  /**
   * Tick summon duration (call at end of round)
   */
  tickSummons(instanceId) {
    this.db.prepare(
      'UPDATE active_summons SET rounds_remaining = rounds_remaining - 1 WHERE henchman_instance_id = ?'
    ).run(instanceId);
    
    // Remove expired summons
    const expired = this.db.prepare(
      'SELECT * FROM active_summons WHERE henchman_instance_id = ? AND rounds_remaining <= 0'
    ).all(instanceId);
    
    this.db.prepare(
      'DELETE FROM active_summons WHERE henchman_instance_id = ? AND rounds_remaining <= 0'
    ).run(instanceId);
    
    return expired;
  }
}

module.exports = {
  AWAKENED_ABILITIES,
  AwakenedAbilityManager
};
