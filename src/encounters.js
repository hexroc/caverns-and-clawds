/**
 * Clawds & Caverns - Encounter System
 * 
 * Random encounters, combat resolution, and the explore loop.
 * May the dice be ever in your favor. 🎲
 */

const crypto = require('crypto');
const { MONSTERS, getMonsterXP, rollLoot, spawnMonster, rollMonsterInitiative } = require('./monsters');
const { ITEMS, CLASSES } = require('./character');
const { QuestManager } = require('./quests');
const { QuestEngine } = require('./quest-engine');
const { HenchmanManager } = require('./henchmen');
const { generateZoneLoot, getZoneTier } = require('./loot-tables');
const { generateMaterialDrops, addMaterialsToPlayer } = require('./economy/material-drops');
const { activityTracker } = require('./activity-tracker');
const { generateSpellNarration, generateHealingNarration, generateAoENarration } = require('./narration/spell-narration');
const { makeSkillCheck, getAbilityMod } = require('./skills');
const { SPELLS } = require('./spell-definitions');

// ============================================================================
// SPELLS loaded from spell-definitions.js (avoid circular dependency)
// ============================================================================

// MOVED TO spell-definitions.js to avoid circular dependency

// ============================================================================
// ENCOUNTER TABLES BY ZONE
// ============================================================================

const ENCOUNTER_TABLES = {
  kelp_forest: {
    name: 'Kelp Forest',
    encounterChance: 0.35,  // 35% chance per explore
    fleeChance: 0.7,        // 70% chance to flee successfully
    table: [
      { monsterId: 'giant_crab', weight: 40, count: [1, 2] },
      { monsterId: 'hostile_fish_swarm', weight: 25, count: [1, 1] },
      { monsterId: 'kelp_lurker', weight: 25, count: [1, 2] },
      { monsterId: 'reef_shark', weight: 10, count: [1, 1] }
    ],
    bossChance: 0.02,  // 2% chance for boss
    boss: 'king_crab',
    ambientMessages: [
      'The kelp sways ominously in the current.',
      'You hear clicking sounds in the distance.',
      'A shadow passes overhead — just a school of fish.',
      'The water grows murky here.',
      'Old bones litter the seafloor.',
      'You find claw marks on a nearby rock.'
    ],
    discoveryMessages: [
      'Something glints in the kelp fronds...',
      'An old adventurer\'s pack lies abandoned here.',
      'You spot something wedged between the rocks!',
      'A friendly hermit crab points you toward a hidden cache.'
    ]
  },
  
  shipwreck_graveyard: {
    name: 'Shipwreck Graveyard',
    levelRange: [3, 5],
    encounterChance: 0.45,
    fleeChance: 0.5,
    table: [
      { monsterId: 'drowned_sailor', weight: 25, count: [2, 4] },
      { monsterId: 'barnacle_horror', weight: 25, count: [1, 2] },
      { monsterId: 'sea_wraith', weight: 20, count: [1, 2] },
      { monsterId: 'moray_terror', weight: 15, count: [1, 1] },
      { monsterId: 'treasure_mimic', weight: 8, count: [1, 1] },
      { monsterId: 'anchor_wight', weight: 7, count: [1, 1] }
    ],
    bossChance: 0.03,
    boss: 'ghost_captain',
    ambientMessages: [
      'Rotting timbers creak in the current.',
      'A ghostly moan echoes from a nearby wreck.',
      'You see movement in a porthole — then nothing.',
      'The water is colder here.',
      'Chains rattle somewhere in the darkness.',
      'A tattered flag waves limply from a broken mast.'
    ],
    discoveryMessages: [
      'You pry open a barnacle-encrusted chest!',
      'A skeleton clutches something valuable.',
      'You find the captain\'s log — and a hidden compartment.',
      'An old ship\'s cat (somehow still alive) leads you to salvage.'
    ]
  },
  
  thermal_vents: {
    name: 'Thermal Vents',
    encounterChance: 0.5,
    fleeChance: 0.4,
    table: [
      { monsterId: 'magma_crab', weight: 60, count: [1, 3] },
      { monsterId: 'hostile_fish_swarm', weight: 25, count: [1, 1] },
      { monsterId: 'kelp_lurker', weight: 15, count: [1, 1] }
    ],
    bossChance: 0.04,
    boss: 'magma_crab',  // TODO: add proper boss
    ambientMessages: [
      'Bubbles rise from cracks in the seafloor.',
      'The water is uncomfortably warm here.',
      'You see the glow of magma through a fissure.',
      'Steam vents obscure your vision.',
      'The rocks are too hot to touch.',
      'Strange tube worms cluster around a vent.'
    ],
    discoveryMessages: [
      'You find rare minerals crystallized on the rocks!',
      'A heat-resistant container holds salvage.',
      'Something valuable formed in the volcanic heat...',
      'You discover materials near a hot spring.'
    ]
  }
};

// ============================================================================
// ENCOUNTER MANAGER
// ============================================================================

class EncounterManager {
  constructor(db) {
    this.db = db;
    this.henchmen = new HenchmanManager(db);
    this.initDB();
  }
  
  /**
   * Get max spell slots for a given level and class (for rest restoration)
   */
  getMaxSpellSlots(level, className) {
    const fullCasterSlots = {
      1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 },
      5: { 1: 4, 2: 3, 3: 2 }, 6: { 1: 4, 2: 3, 3: 3 }, 7: { 1: 4, 2: 3, 3: 3, 4: 1 },
      8: { 1: 4, 2: 3, 3: 3, 4: 2 }, 9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
    };
    const halfCasterSlots = {
      1: {}, 2: { 1: 2 }, 3: { 1: 3 }, 4: { 1: 3 }, 5: { 1: 4, 2: 2 },
      6: { 1: 4, 2: 2 }, 7: { 1: 4, 2: 3 }, 8: { 1: 4, 2: 3 },
      9: { 1: 4, 2: 3, 3: 2 }, 10: { 1: 4, 2: 3, 3: 2 }
    };
    
    const classLower = (className || '').toLowerCase();
    const fullCasters = ['cleric', 'wizard', 'sorcerer', 'bard', 'druid', 'shellpriest', 'tidecaller', 'shantysinger'];
    const halfCasters = ['paladin', 'ranger', 'crusader'];
    const pactCasters = ['warlock', 'depthtouched'];
    
    if (fullCasters.includes(classLower)) {
      return fullCasterSlots[Math.min(level, 10)] || {};
    } else if (halfCasters.includes(classLower)) {
      return halfCasterSlots[Math.min(level, 10)] || {};
    } else if (pactCasters.includes(classLower)) {
      const warlockSlots = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2 };
      const slotLevel = Math.min(Math.ceil(level / 2), 5);
      return { [slotLevel]: warlockSlots[Math.min(level, 5)] || 2 };
    }
    return {};
  }
  
  initDB() {
    // Active encounters table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS active_encounters (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        zone TEXT NOT NULL,
        monsters TEXT NOT NULL,
        round INTEGER DEFAULT 1,
        turn_order TEXT,
        current_turn INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    // Combat log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS combat_log (
        id TEXT PRIMARY KEY,
        encounter_id TEXT NOT NULL,
        round INTEGER,
        actor TEXT,
        action TEXT,
        target TEXT,
        result TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Discovered landmarks
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS discovered_landmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        landmark_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        discovered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, landmark_id),
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    // Exploration state (for tracking pending choices like tracks)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS exploration_state (
        character_id INTEGER PRIMARY KEY,
        state_type TEXT NOT NULL,
        state_data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    console.log('⚔️ Encounter system initialized');
  }
  
  /**
   * Parse combat data from DB (handles both old array format and new object format)
   */
  _parseCombatData(data) {
    const parsed = JSON.parse(data);
    // Old format: array of monsters
    // New format: { monsters: [...], henchman: {...} }
    if (Array.isArray(parsed)) {
      return { monsters: parsed, henchman: null };
    }
    return {
      monsters: parsed.monsters || [],
      henchman: parsed.henchman || null
    };
  }
  
  /**
   * Serialize combat data back to DB
   */
  _serializeCombatData(monsters, henchman) {
    return JSON.stringify({ monsters, henchman });
  }
  
  /**
   * Henchman AI - simple attack logic
   */
  _henchmanAttack(henchman, monsters, encounter) {
    // Find first alive monster
    const target = monsters.find(m => m.alive);
    if (!target) {
      return { message: `${henchman.name} has no targets.`, hit: false };
    }
    
    // Calculate attack bonus (use class-appropriate stat)
    const stats = henchman.stats || { str: 14, dex: 14 };
    const attackStat = (henchman.class === 'rogue' || henchman.class === 'wizard') 
      ? stats.dex : stats.str;
    const attackMod = Math.floor((attackStat - 10) / 2);
    const profBonus = Math.ceil(1 + (henchman.level || 1) / 4);
    
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const totalAttack = attackRoll + attackMod + profBonus;
    
    let message;
    let hit = false;
    
    if (attackRoll === 1) {
      message = `🎲 ${henchman.name}'s attack misses wildly!`;
    } else if (attackRoll === 20 || totalAttack >= target.ac) {
      hit = true;
      const crit = attackRoll === 20;
      // Roll damage
      const damageDice = crit ? 2 : 1;
      let damage = 0;
      for (let i = 0; i < damageDice; i++) {
        damage += Math.floor(Math.random() * 6) + 1; // d6 base
      }
      damage += attackMod;
      damage = Math.max(1, damage);
      
      // Apply resistances/immunities
      const damageType = (henchman.class === 'wizard' || henchman.class === 'cleric') ? 'magical' : 'slashing';
      const { damage: finalDamage, message: resistMsg } = this._applyMonsterResistances(damage, damageType, target.monsterId);
      
      target.hp -= finalDamage;
      
      if (crit) {
        message = `💥 ${henchman.name} lands a CRITICAL HIT on ${target.name} for ${finalDamage} damage!${resistMsg}`;
      } else {
        message = `⚔️ ${henchman.name} hits ${target.name} for ${finalDamage} damage!${resistMsg}`;
      }
      
      if (target.hp <= 0) {
        target.alive = false;
        message += ` 💀 ${target.name} is slain!`;
        
        // Track kill for henchman
        this.db.prepare('UPDATE character_henchmen SET kills = kills + 1 WHERE id = ?')
          .run(henchman.id);
      }
    } else {
      message = `🛡️ ${henchman.name}'s attack misses ${target.name}.`;
    }
    
    return { message, hit, target };
  }
  
  /**
   * Explore a zone - may trigger encounter
   */
  explore(characterId, zoneId, options = {}) {
    const table = ENCOUNTER_TABLES[zoneId];
    if (!table) {
      return { 
        success: false, 
        error: 'This zone has no encounters defined' 
      };
    }
    
    // Check if already in combat
    const activeEncounter = this.getActiveEncounter(characterId);
    if (activeEncounter) {
      return {
        success: false,
        error: 'You are already in combat!',
        encounter: activeEncounter
      };
    }
    
    // Get character
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    const { useSkill } = options;
    
    // If using a skill, handle skill-specific exploration
    if (useSkill) {
      return this._exploreWithSkill(characterId, char, zoneId, table, useSkill);
    }
    
    // Normal exploration - random encounter roll
    const roll = Math.random();
    
    if (roll < table.encounterChance) {
      // ENCOUNTER!
      return this._triggerEncounter(characterId, zoneId, table);
    }
    
    // Check for random skill event (15% chance)
    const eventRoll = Math.random();
    if (eventRoll < 0.15) {
      const event = this._triggerSkillEvent(characterId, char, zoneId, table);
      if (event) return event;
    }
    
    // Check for landmark discovery (10% chance)
    const landmarkRoll = Math.random();
    if (landmarkRoll < 0.10) {
      const landmark = this._discoverLandmark(characterId, char, zoneId, table);
      if (landmark) return landmark;
    }
    
    // No encounter - ambient exploration
    const ambientRoll = Math.random();
    
    if (ambientRoll < 0.15) {
      // Discovery! Small reward
      return this._handleDiscovery(characterId, table);
    }
    
    // Just ambient flavor
    const message = table.ambientMessages[
      Math.floor(Math.random() * table.ambientMessages.length)
    ];
    
    return {
      success: true,
      encounter: false,
      zone: table.name,
      message,
      hint: 'Continue exploring or return to safety. Try using a skill for better results!'
    };
  }
  
  /**
   * Trigger a combat encounter
   */
  _triggerEncounter(characterId, zoneId, table) {
    // Check for boss
    const isBoss = Math.random() < table.bossChance;
    
    let monsters = [];
    
    if (isBoss && table.boss) {
      // Boss encounter!
      const boss = spawnMonster(table.boss);
      if (boss) monsters.push(boss);
    } else {
      // Regular encounter - weighted random selection
      const entry = this._weightedRandom(table.table);
      const count = Array.isArray(entry.count)
        ? Math.floor(Math.random() * (entry.count[1] - entry.count[0] + 1)) + entry.count[0]
        : entry.count;
      
      for (let i = 0; i < count; i++) {
        const monster = spawnMonster(entry.monsterId);
        if (monster) monsters.push(monster);
      }
    }
    
    if (monsters.length === 0) {
      return { success: true, encounter: false, message: 'You sense danger, but it passes.' };
    }
    
    // Get character for initiative
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    // Check for party member (henchman)
    const henchman = this.henchmen.getPartyMember(characterId);
    
    // Roll initiative
    const dexMod = Math.floor((char.dex - 10) / 2);
    const playerInit = Math.floor(Math.random() * 20) + 1 + dexMod;
    
    const turnOrder = [
      { type: 'player', id: characterId, name: char.name, initiative: playerInit }
    ];
    
    // Add henchman to turn order if present
    let henchmanData = null;
    if (henchman) {
      const henchDexMod = Math.floor(((henchman.baseStats?.dex || 14) - 10) / 2);
      const henchInit = Math.floor(Math.random() * 20) + 1 + henchDexMod;
      turnOrder.push({
        type: 'henchman',
        id: henchman.instanceId,
        name: henchman.customName || henchman.name,
        initiative: henchInit
      });
      henchmanData = {
        id: henchman.instanceId,
        name: henchman.customName || henchman.name,
        hp: henchman.hpCurrent,
        maxHp: henchman.hpMax,
        ac: 10 + henchDexMod, // Simple AC calc
        class: henchman.class,
        level: henchman.level,
        stats: henchman.baseStats,
        specialAbility: henchman.specialAbility,
        alive: true
      };
    }
    
    for (const monster of monsters) {
      const monsterInit = rollMonsterInitiative(monster.monsterId);
      turnOrder.push({ 
        type: 'monster', 
        id: monster.id, 
        monsterId: monster.monsterId,
        name: monster.name, 
        initiative: monsterInit 
      });
    }
    
    // Sort by initiative (descending)
    turnOrder.sort((a, b) => b.initiative - a.initiative);
    
    // Create encounter record (store henchman with monsters for easy access)
    const combatants = {
      monsters,
      henchman: henchmanData
    };
    
    const encounterId = crypto.randomUUID();
    this.db.prepare(`
      INSERT INTO active_encounters (id, character_id, zone, monsters, turn_order, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(
      encounterId,
      characterId,
      zoneId,
      JSON.stringify(combatants),
      JSON.stringify(turnOrder)
    );
    
    // Build encounter description
    const isBossEncounter = monsters.some(m => MONSTERS[m.monsterId]?.isBoss);
    const monsterNames = monsters.map(m => m.name);
    const uniqueMonsters = [...new Set(monsterNames)];
    
    let description;
    if (isBossEncounter) {
      description = `⚠️ **BOSS ENCOUNTER!** A ${monsters[0].name} blocks your path!`;
    } else if (monsters.length === 1) {
      description = `A ${monsters[0].name} attacks!`;
    } else if (uniqueMonsters.length === 1) {
      description = `${monsters.length} ${uniqueMonsters[0]}s attack!`;
    } else {
      description = `You're ambushed by ${monsterNames.join(' and ')}!`;
    }
    
    // Emit combat start event for spectator play-by-play
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_start',
      player: char.name,
      zone: table.name,
      monsters: monsters.map(m => ({ name: m.name, hp: m.hp, maxHp: m.maxHp, ac: m.ac })),
      round: 1,
      description
    });
    
    // Set active combat state for spectators
    activityTracker.setCombatState(char.name, {
      inCombat: true,
      encounterId,
      round: 1,
      zone: table.name,
      monsters: monsters.map(m => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp, ac: m.ac })),
      playerHp: char.hp_current,
      playerMaxHp: char.hp_max,
      playerAc: char.ac
    });
    
    return {
      success: true,
      encounter: true,
      encounterId,
      description,
      zone: table.name,
      monsters: monsters.map(m => ({
        id: m.id,
        name: m.name,
        hp: m.hp,
        maxHp: m.maxHp,
        ac: m.ac
      })),
      turnOrder: turnOrder.map(t => ({ name: t.name, initiative: t.initiative })),
      currentTurn: turnOrder[0].name,
      round: 1,
      actions: this._getAvailableActions(turnOrder[0], characterId)
    };
  }
  
  /**
   * Handle a discovery (material reward - NO USDC drops!)
   */
  _handleDiscovery(characterId, table) {
    // Zone-specific discovery materials
    const DISCOVERY_DROPS = {
      'Kelp Forest': [
        { id: 'sea_glass', name: 'Sea Glass', weight: 40 },
        { id: 'kelp_bundle', name: 'Kelp Bundle', weight: 30 },
        { id: 'fish_scales', name: 'Fish Scales', weight: 20 },
        { id: 'pearl', name: 'Pearl', weight: 8 },
        { id: 'moonstone_shard', name: 'Moonstone Shard', weight: 2 }
      ],
      'Shipwreck Graveyard': [
        { id: 'barnacle_cluster', name: 'Barnacle Cluster', weight: 35 },
        { id: 'anchor_chain', name: 'Anchor Chain', weight: 25 },
        { id: 'driftwood', name: 'Driftwood', weight: 20 },
        { id: 'ghost_essence', name: 'Ghost Essence', weight: 15 },
        { id: 'black_pearl', name: 'Black Pearl', weight: 5 }
      ],
      'Thermal Vents': [
        { id: 'volcanic_glass', name: 'Volcanic Glass', weight: 30 },
        { id: 'luminescent_algae', name: 'Luminescent Algae', weight: 25 },
        { id: 'rare_scale', name: 'Rare Scale', weight: 20 },
        { id: 'abyssal_ink', name: 'Abyssal Ink', weight: 15 },
        { id: 'prismatic_scale', name: 'Prismatic Scale', weight: 10 }
      ]
    };
    
    // Get drops for this zone (or default to kelp)
    const zoneName = table.name || 'Kelp Forest';
    const drops = DISCOVERY_DROPS[zoneName] || DISCOVERY_DROPS['Kelp Forest'];
    
    // Weighted random selection
    const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedMaterial = drops[0];
    
    for (const drop of drops) {
      roll -= drop.weight;
      if (roll <= 0) {
        selectedMaterial = drop;
        break;
      }
    }
    
    // Quantity: usually 1, small chance of 2
    const quantity = Math.random() < 0.2 ? 2 : 1;
    
    // Add material to player's inventory
    this.db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(
      require('crypto').randomUUID(),
      characterId,
      selectedMaterial.id,
      quantity,
      quantity
    );
    
    // Discovery message describing the find
    const discoveryMessages = [
      `You discover ${quantity}x ${selectedMaterial.name} hidden among the debris!`,
      `A glint catches your eye - ${quantity}x ${selectedMaterial.name}!`,
      `You find ${quantity}x ${selectedMaterial.name} tucked in a crevice.`,
      `Lucky find! ${quantity}x ${selectedMaterial.name} goes into your pack.`
    ];
    const message = discoveryMessages[Math.floor(Math.random() * discoveryMessages.length)];
    
    return {
      success: true,
      encounter: false,
      discovery: true,
      zone: zoneName,
      message,
      reward: { 
        material: selectedMaterial.name,
        materialId: selectedMaterial.id,
        quantity 
      },
      hint: 'Sell to NPCs for USDC or save for crafting!'
    };
  }
  
  /**
   * Explore using a specific skill
   */
  _exploreWithSkill(characterId, char, zoneId, table, skillName) {
    const validSkills = ['stealth', 'perception', 'survival', 'investigation', 'arcana', 
                        'nature', 'medicine', 'athletics', 'acrobatics', 'sleight_of_hand',
                        'sea_creature_handling', 'intimidation', 'history', 'religion'];
    
    if (!validSkills.includes(skillName)) {
      return {
        success: false,
        error: `Cannot use ${skillName} for exploration. Available: ${validSkills.join(', ')}`
      };
    }
    
    const zoneDC = 12 + (table.encounterChance * 10);
    const skillCheck = makeSkillCheck(char, skillName, zoneDC);
    
    let result = {
      success: true,
      encounter: false,
      zone: table.name,
      skillUsed: skillName,
      skillCheck
    };
    
    // STEALTH - Sneak past encounters (contested check vs monster Perception)
    if (skillName === 'stealth') {
      const encounterRoll = Math.random();
      
      // Check if we encounter anything
      if (encounterRoll < table.encounterChance) {
        // Pick what we would have encountered
        const entry = this._weightedRandom(table.table);
        const monsterData = MONSTERS[entry.monsterId];
        
        if (monsterData) {
          // CONTESTED CHECK: Player Stealth vs Monster Perception
          const monsterWisMod = Math.floor((monsterData.stats.wis - 10) / 2);
          
          // Monster makes Perception check (d20 + WIS mod)
          // OR use passive Perception (10 + WIS mod) if they're not actively searching
          const usePassivePerception = Math.random() < 0.5; // 50% chance of passive vs active
          let monsterPerception;
          
          if (usePassivePerception) {
            // Passive Perception = 10 + WIS mod
            monsterPerception = 10 + monsterWisMod;
          } else {
            // Active Perception check: d20 + WIS mod
            const perceptionRoll = Math.floor(Math.random() * 20) + 1;
            monsterPerception = perceptionRoll + monsterWisMod;
          }
          
          // Compare: Stealth vs Perception
          if (skillCheck.total >= monsterPerception) {
            // SUCCESS! Snuck past completely
            result.message = `${skillCheck.narrative}\n`;
            result.message += `\n🦀 You spot **${monsterData.name}** ahead (Perception: ${monsterPerception})`;
            result.message += `\n✅ Your Stealth (${skillCheck.total}) beats their awareness! You slip past unnoticed.`;
            return result;
          } else {
            // FAILURE! They spot you, combat begins
            const encounter = this._triggerEncounter(characterId, zoneId, table);
            encounter.skillCheck = skillCheck;
            encounter.monsterPerception = monsterPerception;
            encounter.message = `${skillCheck.narrative}\n`;
            encounter.message += `\n🦀 A **${monsterData.name}** notices you! (Perception: ${monsterPerception} vs your Stealth: ${skillCheck.total})`;
            encounter.message += `\n⚔️ Roll initiative!`;
            return encounter;
          }
        }
      }
      
      // No encounter - stealth check was just practice
      result.message = `${skillCheck.narrative}\nYou move stealthily through ${table.name}, ready to hide if danger appears.`;
      return result;
    }
    
    // PERCEPTION - Find hidden treasures/landmarks
    if (skillName === 'perception') {
      result.message = skillCheck.narrative;
      
      if (skillCheck.success) {
        // High success - find landmark
        if (skillCheck.total >= zoneDC + 5) {
          const landmark = this._discoverLandmark(characterId, char, zoneId, table);
          if (landmark) {
            landmark.skillCheck = skillCheck;
            return landmark;
          }
        }
        
        // Regular success - find treasure
        const discovery = this._handleDiscovery(characterId, table);
        discovery.skillCheck = skillCheck;
        discovery.message = `${skillCheck.narrative}\n${discovery.message}`;
        return discovery;
      }
      
      result.message += '\nYou search carefully but find nothing of note.';
      return result;
    }
    
    // SURVIVAL - Track creatures
    if (skillName === 'survival') {
      result.message = skillCheck.narrative;
      
      if (skillCheck.success) {
        // Find tracks - let player choose to hunt or avoid
        const creature = this._weightedRandom(table.table);
        const monsterInfo = MONSTERS[creature.monsterId];
        
        result.tracks = {
          creature: monsterInfo?.name || creature.monsterId,
          creatureId: creature.monsterId,
          recentness: skillCheck.total >= zoneDC + 5 ? 'very fresh' : 'recent',
          direction: ['north', 'south', 'east', 'west'][Math.floor(Math.random() * 4)]
        };
        result.message += `\n\n🐾 You spot ${result.tracks.recentness} tracks belonging to **${result.tracks.creature}**!`;
        result.message += `\n\nWhat do you do?`;
        result.message += `\n- POST /api/zone/explore/follow-tracks {"action": "hunt"} - Track them down`;
        result.message += `\n- POST /api/zone/explore/follow-tracks {"action": "avoid"} - Go the other way`;
        result.awaitingChoice = true;
        
        // Store tracks in temp storage
        this.db.prepare(`
          INSERT OR REPLACE INTO exploration_state (character_id, state_type, state_data)
          VALUES (?, 'tracks', ?)
        `).run(characterId, JSON.stringify(result.tracks));
        
        return result;
      }
      
      result.message += '\nYou find no clear tracks to follow.';
      return result;
    }
    
    // INVESTIGATION - Discover landmarks with lore
    if (skillName === 'investigation') {
      result.message = skillCheck.narrative;
      
      if (skillCheck.success) {
        const landmark = this._discoverLandmark(characterId, char, zoneId, table);
        if (landmark) {
          landmark.skillCheck = skillCheck;
          return landmark;
        }
      }
      
      result.message += '\nYou investigate the area but find nothing unusual.';
      return result;
    }
    
    // OTHER SKILLS - Generic rewards based on success
    result.message = skillCheck.narrative;
    
    if (skillCheck.success) {
      // Small reward for successful skill use
      result.message += '\n✨ Your expertise proves useful!';
      
      if (['arcana', 'nature', 'medicine'].includes(skillName)) {
        const discovery = this._handleDiscovery(characterId, table);
        result.reward = discovery.reward;
        result.message += `\nYou find ${discovery.reward.quantity}x ${discovery.reward.material}!`;
      }
    }
    
    return result;
  }
  
  /**
   * Trigger a random skill event
   */
  _triggerSkillEvent(characterId, char, zoneId, table) {
    const events = {
      kelp_forest: [
        { type: 'trapped_chest', skill: 'sleight_of_hand', dc: 13 },
        { type: 'strong_current', skill: 'athletics', dc: 12 },
        { type: 'aggressive_fauna', skill: 'sea_creature_handling', dc: 14 },
        { type: 'healing_kelp', skill: 'medicine', dc: 11 },
        { type: 'magical_vortex', skill: 'arcana', dc: 15 }
      ],
      shipwreck_graveyard: [
        { type: 'locked_vault', skill: 'sleight_of_hand', dc: 15 },
        { type: 'unstable_structure', skill: 'acrobatics', dc: 13 },
        { type: 'ghostly_presence', skill: 'religion', dc: 14 },
        { type: 'ancient_inscription', skill: 'history', dc: 12 }
      ]
    };
    
    const zoneEvents = events[zoneId] || events.kelp_forest;
    const event = zoneEvents[Math.floor(Math.random() * zoneEvents.length)];
    
    return {
      success: true,
      encounter: false,
      zone: table.name,
      skillEvent: true,
      eventType: event.type,
      requiredSkill: event.skill,
      dc: event.dc,
      message: this._getSkillEventMessage(event.type),
      hint: `Use ${event.skill} to interact: POST /api/zone/skill-event {"skill": "${event.skill}"}`
    };
  }
  
  /**
   * Discover a landmark
   */
  _discoverLandmark(characterId, char, zoneId, table) {
    const landmarks = {
      kelp_forest: [
        {
          id: 'sunken_temple',
          name: 'Sunken Temple of the Tide Mother',
          lore: 'Ancient carvings depict lobster priests worshipping a massive sea goddess. This temple predates the current civilization by millennia.',
          reward: { material: 'Moonstone Shard', quantity: 2 },
          skill: 'religion'
        },
        {
          id: 'lobster_king_statue',
          name: 'Statue of the First Lobster King',
          lore: 'King Crusher the Mighty ruled these waters 500 years ago. His dynasty fell when the Squat Lobsters rebelled.',
          reward: { material: 'Ancient Coin', quantity: 3 },
          skill: 'history'
        },
        {
          id: 'bioluminescent_grove',
          name: 'The Glowing Grove',
          lore: 'This kelp grove pulses with magical energy. Wizards once harvested here for spell components.',
          reward: { material: 'Luminescent Algae', quantity: 2 },
          skill: 'arcana'
        }
      ],
      shipwreck_graveyard: [
        {
          id: 'crimson_claw_flagship',
          name: 'The Flagship "Crimson Claw"',
          lore: 'Admiral Pincers\' pride and joy, sunk in the Great Storm of 1642. Hundreds of crew members perished.',
          reward: { material: 'Black Pearl', quantity: 1 },
          skill: 'history'
        },
        {
          id: 'cursed_anchor',
          name: 'The Cursed Anchor',
          lore: 'This anchor radiates dark magic. Legend says it was forged to trap sea demons.',
          reward: { material: 'Ghost Essence', quantity: 2 },
          skill: 'arcana'
        }
      ]
    };
    
    const zoneLandmarks = landmarks[zoneId] || landmarks.kelp_forest;
    const landmark = zoneLandmarks[Math.floor(Math.random() * zoneLandmarks.length)];
    
    // Check if already discovered
    const discovered = this.db.prepare(
      'SELECT * FROM discovered_landmarks WHERE character_id = ? AND landmark_id = ?'
    ).get(characterId, landmark.id);
    
    if (discovered) {
      return null; // Already found this one
    }
    
    // Mark as discovered
    this.db.prepare(`
      INSERT INTO discovered_landmarks (character_id, landmark_id, zone_id, discovered_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(characterId, landmark.id, zoneId);
    
    // Give reward
    const materialId = landmark.reward.material.toLowerCase().replace(/\s+/g, '_');
    this.db.prepare(`
      INSERT INTO player_materials (id, character_id, material_id, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(character_id, material_id) DO UPDATE SET quantity = quantity + ?
    `).run(
      require('crypto').randomUUID(),
      characterId,
      materialId,
      landmark.reward.quantity,
      landmark.reward.quantity
    );
    
    return {
      success: true,
      encounter: false,
      landmark: true,
      zone: table.name,
      message: `🏛️ **LANDMARK DISCOVERED: ${landmark.name}**\n\n📜 ${landmark.lore}\n\n💎 You found ${landmark.reward.quantity}x ${landmark.reward.material}!`,
      landmarkData: landmark
    };
  }
  
  /**
   * Get message for skill event type
   */
  _getSkillEventMessage(eventType) {
    const messages = {
      trapped_chest: '🪤 You spot an old chest covered in barnacles... but something seems off about the lock.',
      strong_current: '🌊 A powerful current blocks your path. You could push through with enough strength.',
      aggressive_fauna: '🐟 An aggressive school of barracuda circles nearby. They look hostile.',
      healing_kelp: '🌿 You notice a patch of vibrant kelp that seems to pulse with restorative energy.',
      magical_vortex: '🔮 A swirling vortex of magical energy hangs in the water before you.',
      locked_vault: '🔒 An intact ship vault lies before you, its lock still functional after all these years.',
      unstable_structure: '⚠️ Debris blocks your path, but a nimble lobster could navigate through.',
      ghostly_presence: '👻 A spectral figure appears, its translucent form flickering in the current.',
      ancient_inscription: '📜 Strange runes are carved into a weathered stone. They seem to tell a story.'
    };
    
    return messages[eventType] || 'Something interesting catches your attention.';
  }
  
  /**
   * Weighted random selection
   */
  _weightedRandom(entries) {
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const entry of entries) {
      random -= entry.weight;
      if (random <= 0) return entry;
    }
    
    return entries[0];
  }
  
  /**
   * Get active encounter for a character
   */
  getActiveEncounter(characterId) {
    const encounter = this.db.prepare(`
      SELECT * FROM active_encounters 
      WHERE character_id = ? AND status = 'active'
    `).get(characterId);
    
    if (!encounter) return null;
    
    const { monsters, henchman } = this._parseCombatData(encounter.monsters);
    const turnOrder = JSON.parse(encounter.turn_order);
    
    // Parse special rules (for Loan Shark encounters, etc.)
    let specialRules = {};
    if (encounter.special_rules) {
      try {
        specialRules = typeof encounter.special_rules === 'string' 
          ? JSON.parse(encounter.special_rules) 
          : encounter.special_rules;
      } catch (e) {
        specialRules = {};
      }
    }
    
    const aliveMonsters = monsters.filter(m => m.alive);
    
    // Note: If no alive monsters, combat should end via _handleVictory
    // Don't auto-end here as it bypasses rewards
    
    return {
      id: encounter.id,
      characterId: encounter.character_id,
      zone: encounter.zone,
      round: encounter.round,
      monsters: aliveMonsters,
      henchman,
      turnOrder,
      currentTurn: turnOrder[encounter.current_turn],
      status: encounter.status,
      specialRules
    };
  }
  
  /**
   * Get available actions for current turn
   */
  _getAvailableActions(currentTurn, characterId) {
    if (currentTurn.type === 'player') {
      return ['attack', 'spell', 'item', 'flee', 'intimidate', 'shove', 'help', 'insight'];
    }
    return null;  // Monster turn - handled automatically
  }
  
  /**
   * Process a player action in combat
   */
  playerAction(characterId, action, target = null) {
    const encounter = this.getActiveEncounter(characterId);
    if (!encounter) {
      return { success: false, error: 'No active encounter' };
    }
    
    const turnOrder = encounter.turnOrder;
    const currentTurn = encounter.currentTurn;
    
    // Get character first (needed for wait action)
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    
    // "wait" action can be called anytime to process monster turns
    if (action === 'wait') {
      return this._processUntilPlayerTurn(char, encounter);
    }
    
    if (currentTurn.type !== 'player') {
      return { success: false, error: 'Not your turn!' };
    }
    
    let result;
    
    switch (action) {
      case 'attack':
        result = this._handleAttack(char, encounter, target);
        break;
      case 'flee':
        result = this._handleFlee(char, encounter);
        break;
      case 'item':
        result = this._handleItem(char, encounter, target);
        break;
      case 'spell':
        result = this._handleSpell(char, encounter, target);
        break;
      case 'intimidate':
        result = this._handleIntimidate(char, encounter, target);
        break;
      case 'shove':
        result = this._handleShove(char, encounter, target);
        break;
      case 'help':
        result = this._handleHelp(char, encounter, target);
        break;
      case 'insight':
        result = this._handleInsight(char, encounter, target);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    if (!result.success) return result;
    
    // Check if combat ended
    if (result.combatEnded) {
      return result;
    }
    
    // Advance turn
    return this._advanceTurn(encounter, result);
  }
  
  /**
   * Handle player attack
   */
  _handleAttack(char, encounter, targetId) {
    // Get combat data
    const row = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    const { monsters, henchman } = this._parseCombatData(row.monsters);
    
    // Find target (first alive if not specified)
    let target = targetId 
      ? monsters.find(m => m.id === targetId && m.alive)
      : monsters.find(m => m.alive);
    
    if (!target) {
      // No valid targets - check if all monsters are dead (victory!)
      const allDead = monsters.every(m => !m.alive);
      if (allDead) {
        return this._handleVictory(char, encounter, monsters, ['All enemies defeated!']);
      }
      return { success: false, error: 'No valid target' };
    }
    
    // Roll attack (use DEX for finesse classes like rogue)
    const charClass = (char.class_name || char.class || '').toLowerCase();
    const isFinesse = ['rogue', 'monk', 'ranger'].includes(charClass);
    const strMod = Math.floor(((char.str || 10) - 10) / 2);
    const dexMod = Math.floor(((char.dex || 10) - 10) / 2);
    const attackMod = isFinesse ? Math.max(strMod, dexMod) : strMod;
    const profBonus = Math.ceil(1 + char.level / 4);
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const totalAttack = attackRoll + attackMod + profBonus;
    
    const messages = [];
    let hit = false;
    let damage = 0;
    let crit = attackRoll === 20;
    
    if (attackRoll === 1) {
      const fumbles = [
        `🎲 **Critical fumble!** Your weapon tangles in drifting kelp as you swing wildly off-balance!`,
        `🎲 **Critical miss!** The currents betray you — you spin away from ${target.name}, striking only water!`,
        `🎲 **Catastrophic miss!** You misjudge the water pressure completely, your attack sailing laughably wide!`
      ];
      messages.push(fumbles[Math.floor(Math.random() * fumbles.length)]);
      // Emit miss event
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_miss',
        player: char.name,
        target: target.name,
        roll: attackRoll,
        totalRoll: totalAttack,
        ac: target.ac,
        critMiss: true,
        weapon: 'melee attack'
      });
    } else if (crit || totalAttack >= target.ac) {
      hit = true;
      // Roll damage (1d8 + attack mod)
      const damageDice = crit ? 2 : 1;
      damage = 0;
      for (let i = 0; i < damageDice; i++) {
        damage += Math.floor(Math.random() * 8) + 1;
      }
      damage += attackMod;
      
      // SNEAK ATTACK for rogues!
      let sneakAttackDice = 0;
      if (charClass === 'rogue') {
        // Sneak Attack scales: 1d6 at level 1, +1d6 every 2 levels
        sneakAttackDice = Math.ceil(char.level / 2);
        for (let i = 0; i < sneakAttackDice; i++) {
          damage += Math.floor(Math.random() * 6) + 1;
        }
      }
      
      damage = Math.max(1, damage);
      
      // Apply resistances/immunities
      const damageType = 'slashing'; // melee weapon damage
      const { damage: finalDamage, message: resistMsg } = this._applyMonsterResistances(damage, damageType, target.monsterId);
      
      target.hp -= finalDamage;
      
      if (crit) {
        const crits = [
          `💥 **DEVASTATING STRIKE!** You find a critical weak point in ${target.name}'s defenses! Your weapon tears through shell and flesh — **${finalDamage} damage**!${resistMsg} The water shakes with the impact!`,
          `💥 **CRITICAL HIT!** In a blur of deadly motion, you strike true! ${target.name} staggers as your blow crashes through their guard — **${finalDamage} damage**!${resistMsg}`,
          `💥 **PERFECT STRIKE!** You channel all your might into ${target.name}! The blow lands with bone-crushing force, sending shockwaves through the water — **${finalDamage} damage**!${resistMsg}`
        ];
        messages.push(crits[Math.floor(Math.random() * crits.length)]);
        // Emit critical hit event
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_critical',
          player: char.name,
          target: target.name,
          roll: attackRoll,
          totalRoll: totalAttack,
          ac: target.ac,
          damage,
          damageType: 'slashing',
          weapon: 'melee attack'
        });
      } else {
        // Add sneak attack flavor if applicable
        const sneakNote = sneakAttackDice > 0 ? ` *(+${sneakAttackDice}d6 sneak attack!)*` : '';
        const hits = [
          `⚔️ Your weapon connects solidly with ${target.name}, tearing into their flesh! **${finalDamage} damage**${sneakNote} — blood clouds the water! *(${totalAttack} vs AC ${target.ac})*`,
          `⚔️ With deadly precision, you carve through ${target.name}'s defenses! The blow lands true for **${finalDamage} damage**!${sneakNote} *(${totalAttack} vs AC ${target.ac})*`,
          `⚔️ You find an opening and strike! Your weapon rips through ${target.name} — they reel back from **${finalDamage} damage**!${sneakNote} *(${totalAttack} vs AC ${target.ac})*`,
          `⚔️ A solid hit! You crash into ${target.name}, your attack biting deep for **${finalDamage} damage**!${sneakNote} *(${totalAttack} vs AC ${target.ac})*`
        ];
        messages.push(hits[Math.floor(Math.random() * hits.length)]);
        // Emit attack hit event
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_attack',
          player: char.name,
          target: target.name,
          roll: attackRoll,
          totalRoll: totalAttack,
          ac: target.ac,
          hit: true,
          damage,
          damageType: 'slashing',
          weapon: 'melee attack',
          critical: false
        });
      }
      
      if (target.hp <= 0) {
        target.alive = false;
        const deaths = [
          `💀 With a final, gurgling cry, **${target.name} collapses!** Their form goes limp and sinks to the seafloor. Victory is yours!`,
          `💀 **${target.name} shudders and falls still**, life bleeding into the water. You stand victorious over the corpse!`,
          `💀 The light fades from **${target.name}'s eyes**. They crumble before you, utterly defeated!`
        ];
        messages.push(deaths[Math.floor(Math.random() * deaths.length)]);
        // Emit death event
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_death',
          target: target.name,
          killer: char.name,
          targetHp: 0,
          targetMaxHp: target.maxHp
        });
      } else {
        messages.push(`${target.name} has ${target.hp}/${target.maxHp} HP remaining.`);
      }
    } else {
      const misses = [
        `🛡️ Your attack swings wide as **${target.name} slips away** through the water! *(${totalAttack} vs AC ${target.ac})*`,
        `🛡️ **${target.name} twists aside!** Your weapon finds only swirling sand and kelp. *(${totalAttack} vs AC ${target.ac})*`,
        `🛡️ A near miss! **${target.name} darts away** at the last moment, your blade barely grazing them! *(${totalAttack} vs AC ${target.ac})*`,
        `🛡️ You misjudge the distance — **${target.name} evades** your strike with ease! *(${totalAttack} vs AC ${target.ac})*`
      ];
      messages.push(misses[Math.floor(Math.random() * misses.length)]);
      // Emit miss event
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_miss',
        player: char.name,
        target: target.name,
        roll: attackRoll,
        totalRoll: totalAttack,
        ac: target.ac,
        weapon: 'melee attack'
      });
    }
    
    // Update combat state for spectators
    activityTracker.setCombatState(char.name, {
      inCombat: true,
      encounterId: encounter.id,
      round: encounter.round,
      zone: encounter.zone,
      monsters: monsters.filter(m => m.alive).map(m => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp, ac: m.ac })),
      playerHp: char.hp_current,
      playerMaxHp: char.hp_max,
      playerAc: char.ac
    });
    
    // Update combat data in DB
    this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
      .run(this._serializeCombatData(monsters, henchman), encounter.id);
    
    // Check if all monsters dead
    const allDead = monsters.every(m => !m.alive);
    if (allDead) {
      return this._handleVictory(char, encounter, monsters, messages);
    }
    
    return {
      success: true,
      action: 'attack',
      hit,
      damage,
      crit,
      target: target.name,
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Handle flee attempt
   */
  _handleFlee(char, encounter) {
    // Check for special "no flee" rule (Loan Shark encounters)
    const specialRules = encounter.specialRules || {};
    if (specialRules.noFlee) {
      return {
        success: true,
        action: 'flee',
        fled: false,
        combatEnded: false,
        messages: [
          '🦈 **You cannot flee from the Loan Shark!**',
          '*"You owe me money, little lobster. There\'s no running from this."*'
        ]
      };
    }
    
    // Check if any monster has noFlee ability (encounter.monsters is already parsed)
    const monsters = encounter.monsters || [];
    const hasNoFleeMonster = monsters.some(m => m.canFlee === false);
    if (hasNoFleeMonster) {
      return {
        success: true,
        action: 'flee',
        fled: false,
        combatEnded: false,
        messages: ['🦈 **This enemy will not let you escape!** Stand and fight!']
      };
    }
    
    const table = ENCOUNTER_TABLES[encounter.zone];
    const fleeChance = table?.fleeChance || 0.5;
    
    if (Math.random() < fleeChance) {
      // Successful flee
      this.db.prepare('UPDATE active_encounters SET status = ? WHERE id = ?')
        .run('fled', encounter.id);
      
      // Get character name for spectator event
      const charRow = this.db.prepare('SELECT name FROM clawds WHERE id = ?').get(encounter.characterId);
      if (charRow) {
        activityTracker.addCombatEvent(charRow.name, {
          type: 'combat_flee',
          player: charRow.name,
          success: true
        });
        activityTracker.clearCombatState(charRow.name);
      }
      
      return {
        success: true,
        action: 'flee',
        fled: true,
        combatEnded: true,
        messages: ['🏃 You successfully flee from combat!'],
        result: 'fled'
      };
    } else {
      // Failed flee - lose turn
      const charRow = this.db.prepare('SELECT name FROM clawds WHERE id = ?').get(encounter.characterId);
      if (charRow) {
        activityTracker.addCombatEvent(charRow.name, {
          type: 'combat_flee',
          player: charRow.name,
          success: false
        });
      }
      
      return {
        success: true,
        action: 'flee',
        fled: false,
        combatEnded: false,
        messages: ['❌ You try to flee but the enemies block your escape!']
      };
    }
  }
  
  /**
   * Handle item use in combat
   */
  _handleItem(char, encounter, itemId) {
    if (!itemId) {
      // List usable items
      const inventory = this.db.prepare(`
        SELECT ci.*, ci.item_id as itemId 
        FROM character_inventory ci 
        WHERE ci.character_id = ? AND ci.quantity > 0
      `).all(char.id);
      
      const usableItems = inventory.filter(inv => {
        const item = ITEMS[inv.itemId];
        return item && (item.type === 'potion' || item.type === 'scroll');
      }).map(inv => ({
        itemId: inv.itemId,
        name: ITEMS[inv.itemId]?.name,
        type: ITEMS[inv.itemId]?.type,
        quantity: inv.quantity,
        description: ITEMS[inv.itemId]?.description
      }));
      
      return {
        success: false,
        error: 'Specify an item to use',
        usableItems,
        hint: 'POST with { "action": "item", "target": "potion_healing" }'
      };
    }
    
    // Find item in inventory
    const invItem = this.db.prepare(`
      SELECT * FROM character_inventory 
      WHERE character_id = ? AND item_id = ? AND quantity > 0
    `).get(char.id, itemId);
    
    if (!invItem) {
      return { success: false, error: `You don't have any ${itemId}` };
    }
    
    const item = ITEMS[itemId];
    if (!item) {
      return { success: false, error: 'Unknown item' };
    }
    
    if (item.type !== 'potion' && item.type !== 'scroll') {
      return { success: false, error: 'You can only use potions and scrolls in combat' };
    }
    
    const messages = [];
    
    // Handle potion
    if (item.type === 'potion') {
      if (item.effect?.type === 'heal') {
        const healing = this._rollDice(item.effect.dice);
        const oldHP = char.hp_current;
        const newHP = Math.min(char.hp_max, oldHP + healing);
        const actualHeal = newHP - oldHP;
        
        this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?')
          .run(newHP, char.id);
        
        messages.push(`🧪 You drink the ${item.name}!`);
        messages.push(`💚 Healed ${actualHeal} HP! (${oldHP} → ${newHP}/${char.hp_max})`);
        
        // Emit heal event for spectators
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_spell',
          player: char.name,
          spell: item.name,
          target: 'self',
          healing: actualHeal,
          newHp: newHP,
          maxHp: char.hp_max
        });
      } else if (item.effect?.type === 'buff') {
        // TODO: Implement buff tracking
        messages.push(`🧪 You drink the ${item.name}!`);
        messages.push(`✨ ${item.effect.condition} for ${item.effect.duration}!`);
      }
    }
    
    // Handle scroll
    if (item.type === 'scroll') {
      const spellResult = this._castScrollSpell(char, item, encounter);
      messages.push(...spellResult.messages);
      
      if (!spellResult.success) {
        return { success: false, error: spellResult.error, messages };
      }
      
      // Check if all monsters are dead after scroll damage
      const scrollRow = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
      const { monsters } = this._parseCombatData(scrollRow.monsters);
      
      if (monsters.every(m => !m.alive)) {
        // Consume item first
        if (invItem.quantity <= 1) {
          this.db.prepare('DELETE FROM character_inventory WHERE id = ?').run(invItem.id);
        } else {
          this.db.prepare('UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?')
            .run(invItem.id);
        }
        return this._handleVictory(char, encounter, monsters, messages);
      }
    }
    
    // Consume item
    if (invItem.quantity <= 1) {
      this.db.prepare('DELETE FROM character_inventory WHERE id = ?').run(invItem.id);
    } else {
      this.db.prepare('UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?')
        .run(invItem.id);
    }
    
    return {
      success: true,
      action: 'item',
      itemUsed: item.name,
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Process turns until it's the player's turn (for when monsters go first)
   */
  _processUntilPlayerTurn(char, encounter) {
    const row = this.db.prepare('SELECT * FROM active_encounters WHERE id = ?').get(encounter.id);
    if (!row) return { success: false, error: 'Encounter not found' };
    
    let turnOrder = JSON.parse(row.turn_order);
    let { monsters, henchman } = this._parseCombatData(row.monsters);
    let currentTurn = row.current_turn;
    let round = row.round;
    
    const messages = [];
    
    // If already player's turn, nothing to do
    if (turnOrder[currentTurn].type === 'player') {
      return {
        success: true,
        action: 'wait',
        messages: ["It's already your turn!"],
        combatEnded: false
      };
    }
    
    messages.push('⏳ Waiting for enemies to act...');
    messages.push('');
    
    // Process turns until player's turn
    let safety = 0;
    while (safety < 20 && turnOrder[currentTurn].type !== 'player') {
      safety++;
      
      const turn = turnOrder[currentTurn];
      
      if (turn.type === 'monster') {
        // Monster turn
        const monster = monsters.find(m => m.id === turn.id);
        if (monster && monster.alive) {
          const result = this._monsterAttack(monster, { id: encounter.id, characterId: char.id });
          messages.push(result.message);
          
          if (result.playerDied) {
            // Handle player death
            this.db.prepare('UPDATE active_encounters SET status = ?, monsters = ?, round = ?, current_turn = ? WHERE id = ?')
              .run('defeat', this._serializeCombatData(monsters, henchman), round, currentTurn, encounter.id);
            
            messages.push('');
            messages.push('💀 **YOU HAVE FALLEN!**');
            
            this._handleDefeat(encounter);
            
            return {
              success: true,
              combatEnded: true,
              result: 'defeat',
              messages
            };
          }
        }
      } else if (turn.type === 'henchman' && henchman && henchman.alive) {
        // Henchman turn - AI attacks!
        const result = this._henchmanAttack(henchman, monsters, encounter);
        messages.push(result.message);
        
        // Check if all monsters dead after henchman attack
        const allDead = monsters.every(m => !m.alive);
        if (allDead) {
          // Save updated data and handle victory
          this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
            .run(this._serializeCombatData(monsters, henchman), encounter.id);
          return this._handleVictory(char, encounter, monsters, messages);
        }
      }
      
      // Move to next turn
      currentTurn = (currentTurn + 1) % turnOrder.length;
      if (currentTurn === 0) {
        round++;
        messages.push(`\n--- Round ${round} ---`);
      }
    }
    
    // Update DB with all changes
    this.db.prepare('UPDATE active_encounters SET monsters = ?, round = ?, current_turn = ? WHERE id = ?')
      .run(this._serializeCombatData(monsters, henchman), round, currentTurn, encounter.id);
    
    // Get current HP
    const updatedChar = this.db.prepare('SELECT hp_current, hp_max FROM clawds WHERE id = ?').get(char.id);
    
    messages.push('');
    messages.push(`⚔️ Your turn! (HP: ${updatedChar.hp_current}/${updatedChar.hp_max})`);
    
    const aliveMonsters = monsters.filter(m => m.alive);
    
    return {
      success: true,
      action: 'wait',
      round,
      messages,
      combatEnded: false,
      monsters: aliveMonsters.map(m => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp })),
      actions: ['attack', 'spell', 'item', 'flee']
    };
  }
  
  /**
   * Cast a spell from a scroll
   */
  _castScrollSpell(char, scroll, encounter) {
    const messages = [];
    messages.push(`📜 You read the ${scroll.name}!`);
    
    // Get monsters for targeting
    const scrollSpellRow = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    let { monsters, henchman: scrollHench } = this._parseCombatData(scrollSpellRow.monsters);
    
    switch (scroll.spell) {
      case 'cure_wounds': {
        const spellMod = Math.max(
          Math.floor((char.wis - 10) / 2),
          Math.floor((char.int - 10) / 2),
          Math.floor((char.cha - 10) / 2)
        );
        const healing = this._rollDice('1d8') + spellMod;
        const newHP = Math.min(char.hp_max, char.hp_current + healing);
        this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
        messages.push(`💚 Healed ${healing} HP! (${char.hp_current} → ${newHP}/${char.hp_max})`);
        break;
      }
      
      case 'magic_missile': {
        // 3 darts, auto-hit, 1d4+1 each
        const target = monsters.find(m => m.alive);
        if (!target) {
          return { success: false, error: 'No valid targets', messages };
        }
        let totalDamage = 0;
        for (let i = 0; i < 3; i++) {
          totalDamage += this._rollDice('1d4') + 1;
        }
        target.hp -= totalDamage;
        messages.push(`✨ Three bolts of force strike ${target.name} for ${totalDamage} damage!`);
        if (target.hp <= 0) {
          target.alive = false;
          messages.push(`💀 ${target.name} is slain!`);
        }
        this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
          .run(JSON.stringify(monsters), encounter.id);
        break;
      }
      
      case 'shield': {
        // +5 AC until next turn (simplified - just message for now)
        messages.push(`🛡️ A magical barrier surrounds you! (+5 AC until your next turn)`);
        // TODO: Track temporary AC bonus
        break;
      }
      
      case 'depthCharge': {
        // 8d6 fire damage to all enemies
        const damage = this._rollDice('8d6');
        let killed = 0;
        for (const monster of monsters.filter(m => m.alive)) {
          // DEX save for half (simplified: 50% chance)
          const saved = Math.random() < 0.5;
          const finalDamage = saved ? Math.floor(damage / 2) : damage;
          monster.hp -= finalDamage;
          if (monster.hp <= 0) {
            monster.alive = false;
            killed++;
          }
        }
        messages.push(`🔥 A depth charge detonates, flash-boiling everything for ${damage} damage!`);
        if (killed > 0) {
          messages.push(`💀 ${killed} enemy/enemies slain!`);
        }
        this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
          .run(JSON.stringify(monsters), encounter.id);
        break;
      }
      
      default:
        messages.push(`The scroll crumbles but nothing happens... (${scroll.spell} not implemented)`);
    }
    
    return { success: true, messages };
  }
  
  /**
   * Handle spell casting in combat
   */
  _handleSpell(char, encounter, spellId) {
    // Check if character is a spellcaster (both D&D and C&C class names for compatibility)
    const spellcasterClasses = ['cleric', 'wizard', 'sorcerer', 'bard', 'druid', 'warlock', 'paladin', 'ranger', 
                                 'shellpriest', 'tidecaller', 'shantysingerr', 'depthtouched', 'crusader'];
    if (!spellcasterClasses.includes(char.class)) {
      return { 
        success: false, 
        error: `${CLASSES[char.class]?.name || char.class} cannot cast spells. Use scrolls instead!` 
      };
    }
    
    // Get spell slots
    const slots = this._getSpellSlots(char);
    
    if (!spellId) {
      // List available spells
      const knownSpells = this._getKnownSpells(char);
      return {
        success: false,
        error: 'Specify a spell to cast',
        spellSlots: slots,
        knownSpells,
        hint: 'POST with { "action": "spell", "target": "cure_wounds" }'
      };
    }
    
    // Get spell data
    const spell = SPELLS[spellId];
    if (!spell) {
      return { success: false, error: `Unknown spell: ${spellId}` };
    }
    
    // Check if they know the spell
    const knownSpells = this._getKnownSpells(char);
    if (!knownSpells.find(s => s.id === spellId)) {
      return { success: false, error: `You don't know ${spell.name}` };
    }
    
    // Check spell slot availability
    const slotLevel = spell.level;
    if (slotLevel > 0) {
      const availableSlot = this._findAvailableSlot(char, slotLevel);
      if (!availableSlot) {
        return { success: false, error: `No spell slots available for level ${slotLevel} spells` };
      }
      
      // Consume spell slot
      this._useSpellSlot(char.id, availableSlot);
    }
    
    // Cast the spell
    const messages = [];
    
    // Get monsters for targeting
    const spellRow = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    let { monsters, henchman: spellHench } = this._parseCombatData(spellRow.monsters);
    
    const castResult = this._resolveSpell(char, spell, monsters, encounter);
    messages.push(...castResult.messages);
    
    if (castResult.updateMonsters) {
      this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
        .run(this._serializeCombatData(monsters, spellHench), encounter.id);
    }
    
    // Check if all monsters dead
    if (monsters.every(m => !m.alive)) {
      return this._handleVictory(char, encounter, monsters, messages);
    }
    
    return {
      success: true,
      action: 'spell',
      spellCast: spell.name,
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Handle Intimidation - frighten enemies
   */
  _handleIntimidate(char, encounter, targetId) {
    const row = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    const { monsters, henchman } = this._parseCombatData(row.monsters);
    
    const target = targetId 
      ? monsters.find(m => m.id === targetId && m.alive)
      : monsters.find(m => m.alive);
    
    if (!target) {
      return { success: false, error: 'No valid target' };
    }
    
    // Intimidation check vs target's Wisdom save
    const dc = 8 + Math.ceil(char.level / 4) + getAbilityMod(char.cha || 10);
    const wisModTarget = getAbilityMod(target.stats?.wis || 10);
    const targetSave = Math.floor(Math.random() * 20) + 1 + wisModTarget;
    
    const intimidateCheck = makeSkillCheck(char, 'intimidation', targetSave);
    
    const messages = [];
    messages.push(intimidateCheck.narrative);
    
    if (intimidateCheck.success) {
      // Target is frightened - disadvantage on attacks, can't move closer
      messages.push(`😨 ${target.name} is **frightened** by your presence! They have disadvantage on attacks and cannot approach you.`);
      
      // Mark target as frightened (simplified - just give them disadvantage next turn)
      target.frightened = true;
      target.frightenedUntil = encounter.round + 2; // 1 round duration
      
      this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
        .run(this._serializeCombatData(monsters, henchman), encounter.id);
        
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'intimidation',
        target: target.name,
        success: true
      });
    } else {
      messages.push(`${target.name} is unfazed by your threats.`);
      
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'intimidation',
        target: target.name,
        success: false
      });
    }
    
    return {
      success: true,
      action: 'intimidate',
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Handle Shove - knock enemy prone or push them back
   */
  _handleShove(char, encounter, targetId) {
    const row = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    const { monsters, henchman } = this._parseCombatData(row.monsters);
    
    const target = targetId 
      ? monsters.find(m => m.id === targetId && m.alive)
      : monsters.find(m => m.alive);
    
    if (!target) {
      return { success: false, error: 'No valid target' };
    }
    
    // Athletics check vs target's Athletics or Acrobatics (their choice - we'll use better)
    const strModTarget = getAbilityMod(target.stats?.str || 10);
    const dexModTarget = getAbilityMod(target.stats?.dex || 10);
    const targetDefense = Math.max(strModTarget, dexModTarget);
    const targetSave = Math.floor(Math.random() * 20) + 1 + targetDefense;
    
    const shoveCheck = makeSkillCheck(char, 'athletics', targetSave);
    
    const messages = [];
    messages.push(shoveCheck.narrative);
    
    if (shoveCheck.success) {
      // Target is knocked prone
      messages.push(`💥 You **shove** ${target.name} to the ground! They are **prone** (attacks against them have advantage, their attacks have disadvantage).`);
      
      target.prone = true;
      target.proneUntil = encounter.round + 2;
      
      this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
        .run(this._serializeCombatData(monsters, henchman), encounter.id);
        
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'athletics',
        action: 'shove',
        target: target.name,
        success: true
      });
    } else {
      messages.push(`${target.name} resists your shove attempt.`);
      
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'athletics',
        action: 'shove',
        target: target.name,
        success: false
      });
    }
    
    return {
      success: true,
      action: 'shove',
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Handle Help - give ally advantage on next attack or check
   */
  _handleHelp(char, encounter, targetId) {
    const messages = [];
    
    // Help action gives advantage to ally's next attack against an enemy you can see
    messages.push(`🤝 You take the **Help** action, creating an opening for your ally!`);
    messages.push(`Your next ally's attack against an enemy will have **advantage**.`);
    
    // In simplified system, just give narrative benefit
    // In full implementation, would track this as a buff
    
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_skill',
      player: char.name,
      skill: 'help',
      success: true
    });
    
    return {
      success: true,
      action: 'help',
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Handle Insight - read enemy tactics
   */
  _handleInsight(char, encounter, targetId) {
    const row = this.db.prepare('SELECT monsters FROM active_encounters WHERE id = ?').get(encounter.id);
    const { monsters } = this._parseCombatData(row.monsters);
    
    const target = targetId 
      ? monsters.find(m => m.id === targetId && m.alive)
      : monsters.find(m => m.alive);
    
    if (!target) {
      return { success: false, error: 'No valid target' };
    }
    
    // CONTESTED CHECK: Insight vs Deception (or CHA save if monster can't deceive)
    const chaModTarget = getAbilityMod(target.stats?.cha || 10);
    
    // Monster makes Deception check (or CHA save if unintelligent)
    const monsterInt = target.stats?.int || 3;
    let monsterDeception;
    
    if (monsterInt >= 6) {
      // Intelligent enough to deceive - roll Deception (d20 + CHA mod)
      const deceptionRoll = Math.floor(Math.random() * 20) + 1;
      monsterDeception = deceptionRoll + chaModTarget;
    } else {
      // Unintelligent - use passive Deception (10 + CHA mod)
      monsterDeception = 10 + chaModTarget;
    }
    
    // Player makes Insight check
    const insightCheck = makeSkillCheck(char, 'insight', monsterDeception);
    
    const messages = [];
    messages.push(insightCheck.narrative);
    messages.push(`\n🎭 ${target.name} tries to mask their intentions (Deception: ${monsterDeception} vs your Insight: ${insightCheck.total})`);
    
    if (insightCheck.success) {
      // Successfully read enemy tactics
      const insights = [
        `\n📖 ${target.name} has **${target.hp}/${target.maxHp} HP** remaining.`,
        `⚔️ Their **AC is ${target.ac}**, making them ${target.ac > 15 ? 'heavily armored' : target.ac > 12 ? 'moderately protected' : 'lightly defended'}.`,
        `🎯 You sense they will attack ${target.strategy || 'aggressively'} on their next turn.`
      ];
      
      messages.push(...insights);
      
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'insight',
        target: target.name,
        success: true,
        playerRoll: insightCheck.total,
        monsterRoll: monsterDeception
      });
    } else {
      messages.push(`\n${target.name}'s intentions remain hidden from you.`);
      
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_skill',
        player: char.name,
        skill: 'insight',
        target: target.name,
        success: false,
        playerRoll: insightCheck.total,
        monsterRoll: monsterDeception
      });
    }
    
    return {
      success: true,
      action: 'insight',
      messages,
      combatEnded: false
    };
  }
  
  /**
   * Get spell slots for character level & class
   */
  _getSpellSlots(char) {
    // 5e spell slot progression (simplified for full casters)
    const fullCasterSlots = {
      1: { 1: 2 },
      2: { 1: 3 },
      3: { 1: 4, 2: 2 },
      4: { 1: 4, 2: 3 },
      5: { 1: 4, 2: 3, 3: 2 },
      6: { 1: 4, 2: 3, 3: 3 },
      7: { 1: 4, 2: 3, 3: 3, 4: 1 },
      8: { 1: 4, 2: 3, 3: 3, 4: 2 },
      9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 },
      10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }
    };
    
    const halfCasterSlots = {
      1: {},
      2: { 1: 2 },
      3: { 1: 3 },
      4: { 1: 3 },
      5: { 1: 4, 2: 2 },
      6: { 1: 4, 2: 2 },
      7: { 1: 4, 2: 3 },
      8: { 1: 4, 2: 3 },
      9: { 1: 4, 2: 3, 3: 2 },
      10: { 1: 4, 2: 3, 3: 2 }
    };
    
    const fullCasters = ['cleric', 'wizard', 'sorcerer', 'bard', 'druid', 'shellpriest', 'tidecaller', 'shantysingerr'];
    const halfCasters = ['paladin', 'ranger', 'crusader'];
    const pactCasters = ['warlock', 'depthtouched'];
    
    let maxSlots;
    if (fullCasters.includes(char.class)) {
      maxSlots = fullCasterSlots[Math.min(char.level, 10)] || {};
    } else if (halfCasters.includes(char.class)) {
      maxSlots = halfCasterSlots[Math.min(char.level, 10)] || {};
    } else if (pactCasters.includes(char.class)) {
      // Warlock pact magic (simplified)
      const warlockSlots = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2 };
      const slotLevel = Math.min(Math.ceil(char.level / 2), 5);
      maxSlots = { [slotLevel]: warlockSlots[Math.min(char.level, 5)] || 2 };
    } else {
      maxSlots = {};
    }
    
    // Get current slots from DB (or initialize)
    let currentRaw = this.db.prepare(
      'SELECT spell_slots FROM clawds WHERE id = ?'
    ).get(char.id)?.spell_slots;
    
    let current;
    try {
      current = JSON.parse(currentRaw || '{}');
    } catch {
      current = {};
    }
    
    // Initialize if empty or missing
    if (!currentRaw || Object.keys(current).length === 0) {
      current = { ...maxSlots };
      this.db.prepare('UPDATE clawds SET spell_slots = ? WHERE id = ?')
        .run(JSON.stringify(current), char.id);
    }
    
    return { max: maxSlots, current };
  }
  
  /**
   * Get known spells for character
   */
  _getKnownSpells(char) {
    // Simplified: return class-appropriate spells (D&D names map to local SPELLS, C&C names map to imported)
    const classSpells = {
      // D&D class names (backward compatibility, uses local SPELLS)
      cleric: ['cure_wounds', 'healing_word', 'guiding_bolt', 'sacred_flame', 'bless'],
      wizard: ['magic_missile', 'shield', 'burning_hands', 'mage_armor', 'fire_bolt'],
      sorcerer: ['magic_missile', 'burning_hands', 'shield', 'fire_bolt', 'chromatic_orb'],
      bard: ['cure_wounds', 'healing_word', 'vicious_mockery', 'dissonant_whispers'],
      druid: ['cure_wounds', 'healing_word', 'entangle', 'thunderwave', 'produce_flame'],
      warlock: ['eldritch_blast', 'hex', 'hellish_rebuke', 'armor_of_agathys'],
      paladin: ['cure_wounds', 'divine_smite', 'bless', 'shield_of_faith'],
      ranger: ['cure_wounds', 'hunters_mark', 'ensnaring_strike'],
      // C&C class names
      shellpriest: ['cure_wounds', 'healing_word', 'guiding_bolt', 'sacred_flame', 'bless'],
      tidecaller: ['magic_missile', 'shield', 'burning_hands', 'mage_armor', 'fire_bolt'],
      shantysingerr: ['cure_wounds', 'healing_word', 'vicious_mockery', 'dissonant_whispers'],
      depthtouched: ['eldritch_blast', 'hex', 'hellish_rebuke', 'armor_of_agathys'],
      crusader: ['cure_wounds', 'divine_smite', 'bless', 'shield_of_faith']
    };
    
    const spellIds = classSpells[char.class] || [];
    return spellIds.map(id => SPELLS[id]).filter(Boolean);
  }
  
  /**
   * Find available spell slot at or above required level
   */
  _findAvailableSlot(char, minLevel) {
    const slots = this._getSpellSlots(char);
    for (let level = minLevel; level <= 9; level++) {
      if ((slots.current[level] || 0) > 0) {
        return level;
      }
    }
    return null;
  }
  
  /**
   * Use a spell slot
   */
  _useSpellSlot(charId, level) {
    const current = JSON.parse(
      this.db.prepare('SELECT spell_slots FROM clawds WHERE id = ?').get(charId)?.spell_slots || '{}'
    );
    current[level] = Math.max(0, (current[level] || 0) - 1);
    this.db.prepare('UPDATE clawds SET spell_slots = ? WHERE id = ?')
      .run(JSON.stringify(current), charId);
  }
  
  /**
   * Resolve a spell's effects
   */
  _resolveSpell(char, spell, monsters, encounter) {
    const messages = [];
    let updateMonsters = false;
    
    // Get spellcasting modifier
    const spellMod = this._getSpellcastingMod(char);
    
    switch (spell.id) {
      case 'cure_wounds': {
        const healing = this._rollDice('1d8') + spellMod;
        const newHP = Math.min(char.hp_max, char.hp_current + healing);
        this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
        
        // Generate healing narration
        const healNarration = generateHealingNarration(
          { name: char.name },
          spell.seaName || spell.name,
          { name: char.name },
          healing
        );
        messages.push(healNarration + ` **[${char.hp_current} → ${newHP}/${char.hp_max}]**`);
        
        // Emit heal event for spectators
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_spell',
          player: char.name,
          spell: spell.seaName || spell.name,
          target: 'self',
          healing,
          newHp: newHP,
          maxHp: char.hp_max
        });
        break;
      }
      
      case 'healing_word': {
        const healing = this._rollDice('1d4') + spellMod;
        const newHP = Math.min(char.hp_max, char.hp_current + healing);
        this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
        messages.push(`💚 Healed ${healing} HP! (Bonus action)`);
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_spell',
          player: char.name,
          spell: spell.seaName || spell.name,
          target: 'self',
          healing,
          newHp: newHP,
          maxHp: char.hp_max
        });
        break;
      }
      
      case 'magic_missile': {
        const target = monsters.find(m => m.alive);
        if (target) {
          let totalDamage = 0;
          for (let i = 0; i < 3; i++) {
            totalDamage += this._rollDice('1d4') + 1;
          }
          target.hp -= totalDamage;
          
          // Generate spell narration
          const spellNarration = generateSpellNarration(
            { name: char.name },
            spell.seaName || spell.name,
            { name: target.name },
            { hits: true, damage: totalDamage, damageType: 'force' }
          );
          messages.push(spellNarration);
          
          activityTracker.addCombatEvent(char.name, {
            type: 'combat_spell',
            player: char.name,
            spell: spell.seaName || spell.name,
            target: target.name,
            damage: totalDamage,
            damageType: 'force',
            autoHit: true
          });
          if (target.hp <= 0) {
            target.alive = false;
            messages.push(`💀 ${target.name} is slain!`);
            activityTracker.addCombatEvent(char.name, {
              type: 'combat_death',
              target: target.name,
              killer: char.name,
              targetHp: 0,
              targetMaxHp: target.maxHp
            });
          }
          updateMonsters = true;
        }
        break;
      }
      
      case 'guiding_bolt': {
        const target = monsters.find(m => m.alive);
        if (target) {
          const attackRoll = Math.floor(Math.random() * 20) + 1 + spellMod + Math.ceil(char.level / 4);
          if (attackRoll >= target.ac) {
            const damage = this._rollDice('4d6');
            const { damage: finalDamage, message: resistMsg } = this._applyMonsterResistances(damage, 'radiant', target.monsterId);
            target.hp -= finalDamage;
            messages.push(`☀️ Radiant energy strikes ${target.name} for ${finalDamage} damage!${resistMsg}`);
            messages.push(`Next attack against ${target.name} has advantage!`);
            activityTracker.addCombatEvent(char.name, {
              type: 'combat_spell',
              player: char.name,
              spell: spell.seaName || spell.name,
              target: target.name,
              damage: finalDamage,
              damageType: 'radiant',
              roll: attackRoll,
              ac: target.ac,
              hit: true
            });
            if (target.hp <= 0) {
              target.alive = false;
              messages.push(`💀 ${target.name} is slain!`);
              activityTracker.addCombatEvent(char.name, {
                type: 'combat_death',
                target: target.name,
                killer: char.name
              });
            }
          } else {
            messages.push(`The bolt of light misses ${target.name}!`);
            activityTracker.addCombatEvent(char.name, {
              type: 'combat_miss',
              player: char.name,
              target: target.name,
              roll: attackRoll,
              ac: target.ac,
              weapon: spell.seaName || spell.name
            });
          }
          updateMonsters = true;
        }
        break;
      }
      
      case 'burning_hands': {
        const damage = this._rollDice('3d6');
        const targets = [];
        
        for (const monster of monsters.filter(m => m.alive)) {
          const saved = Math.random() < 0.5;
          const finalDamage = saved ? Math.floor(damage / 2) : damage;
          monster.hp -= finalDamage;
          
          targets.push({ name: monster.name, damage: finalDamage, saved });
          
          activityTracker.addCombatEvent(char.name, {
            type: 'combat_spell',
            player: char.name,
            spell: spell.seaName || spell.name,
            target: monster.name,
            damage: finalDamage,
            damageType: 'fire',
            saved
          });
          if (monster.hp <= 0) {
            monster.alive = false;
            activityTracker.addCombatEvent(char.name, {
              type: 'combat_death',
              target: monster.name,
              killer: char.name
            });
          }
        }
        
        // Generate AoE narration
        const aoeNarration = generateAoENarration(
          { name: char.name },
          spell.seaName || spell.name,
          targets,
          { damageType: 'fire' }
        );
        messages.push(aoeNarration);
        
        updateMonsters = true;
        break;
      }
      
      case 'sacred_flame':
      case 'fire_bolt':
      case 'eldritch_blast': {
        const target = monsters.find(m => m.alive);
        if (target) {
          const damage = this._rollDice(spell.id === 'eldritch_blast' ? '1d10' : '1d8');
          // Cantrip - no save, just hits
          
          // Determine damage type
          const damageType = spell.id === 'sacred_flame' ? 'radiant' : 
                           spell.id === 'eldritch_blast' ? 'force' : 'fire';
          
          // Apply resistances/immunities
          const { damage: finalDamage, message: resistMsg } = this._applyMonsterResistances(damage, damageType, target.monsterId);
          target.hp -= finalDamage;
          const spellNarration = generateSpellNarration(
            { name: char.name },
            spell.seaName || spell.name,
            { name: target.name },
            { hits: true, damage: finalDamage, damageType }
          );
          messages.push(spellNarration + resistMsg);
          
          activityTracker.addCombatEvent(char.name, {
            type: 'combat_spell',
            player: char.name,
            spell: spell.seaName || spell.name,
            target: target.name,
            damage: finalDamage,
            damageType
          });
          if (target.hp <= 0) {
            target.alive = false;
            messages.push(`💀 ${target.name} is slain!`);
            activityTracker.addCombatEvent(char.name, {
              type: 'combat_death',
              target: target.name,
              killer: char.name
            });
          }
          updateMonsters = true;
        }
        break;
      }
      
      default:
        messages.push(`${spell.name} takes effect!`);
    }
    
    return { messages, updateMonsters };
  }
  
  /**
   * Get spellcasting modifier based on class
   */
  _getSpellcastingMod(char) {
    const statByClass = {
      cleric: 'wis', druid: 'wis', ranger: 'wis',
      wizard: 'int',
      sorcerer: 'cha', bard: 'cha', warlock: 'cha', paladin: 'cha'
    };
    const stat = statByClass[char.class] || 'int';
    return Math.floor((char[stat] - 10) / 2);
  }
  
  /**
   * Roll dice from string like "2d6+3"
   */
  _rollDice(diceStr) {
    const match = diceStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return 0;
    
    const numDice = parseInt(match[1]);
    const dieSize = parseInt(match[2]);
    const modifier = parseInt(match[3] || 0);
    
    let total = modifier;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }
    return Math.max(0, total);
  }
  
  /**
   * Handle victory
   */
  _handleVictory(char, encounter, monsters, messages = []) {
    // Calculate total XP and material drops
    let totalXP = 0;
    const allMaterials = [];
    const allLoot = [];
    
    // Get character's current zone for tier-appropriate loot
    const zoneType = char.location || 'kelp_forest';
    
    for (const monster of monsters) {
      totalXP += getMonsterXP(monster.monsterId);
      
      // Generate MATERIAL drops (not pearls!)
      const monsterData = MONSTERS[monster.monsterId];
      const cr = monsterData?.cr || '1/4';
      const materialDrops = generateMaterialDrops(monster.monsterId, cr);
      allMaterials.push(...materialDrops);
      
      // Still get rare item drops from loot tables
      const loot = generateZoneLoot(monster.monsterId, zoneType, cr);
      allLoot.push(...loot.items);
    }
    
    // Award XP
    const newXP = char.xp + totalXP;
    let leveledUp = false;
    let newLevel = char.level;
    
    // Check level up (simplified thresholds)
    const xpThresholds = {
      1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
      6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000
    };
    
    while (newLevel < 20 && newXP >= (xpThresholds[newLevel + 1] || 999999)) {
      newLevel++;
      leveledUp = true;
    }
    
    // Calculate HP gain if leveled up
    let newMaxHp = char.max_hp || 10;
    if (leveledUp) {
      const hitDice = { fighter: 10, paladin: 10, ranger: 10, barbarian: 12, 
                        rogue: 8, bard: 8, cleric: 8, druid: 8, monk: 8, warlock: 8,
                        wizard: 6, sorcerer: 6 };
      const className = (char.class_name || 'fighter').toLowerCase();
      const hitDie = hitDice[className] || 8;
      const conMod = Math.floor(((char.constitution || 10) - 10) / 2);
      
      // Gain HP for each new level (average of hit die + CON mod, minimum 1)
      for (let l = char.level + 1; l <= newLevel; l++) {
        const hpGain = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
        newMaxHp += hpGain;
      }
    }
    
    // Update character (XP, level, and max_hp)
    this.db.prepare(`
      UPDATE clawds SET xp = ?, level = ?, max_hp = ? WHERE id = ?
    `).run(newXP, newLevel, newMaxHp, char.id);
    
    // Add MATERIALS to player's material inventory
    if (allMaterials.length > 0) {
      addMaterialsToPlayer(this.db, char.id, allMaterials);
    }
    
    // Add loot to inventory
    for (const loot of allLoot) {
      const existing = this.db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(char.id, loot.itemId);
      
      if (existing) {
        this.db.prepare('UPDATE character_inventory SET quantity = quantity + ? WHERE id = ?')
          .run(loot.quantity, existing.id);
      } else {
        this.db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
          VALUES (?, ?, ?, ?, 0, NULL)
        `).run(crypto.randomUUID(), char.id, loot.itemId, loot.quantity);
      }
    }
    
    // Mark encounter complete
    this.db.prepare('UPDATE active_encounters SET status = ? WHERE id = ?')
      .run('victory', encounter.id);
    
    // Emit victory event for spectators
    const monsterNames = monsters.map(m => m.name);
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_victory',
      player: char.name,
      monsters: monsterNames,
      xpGained: totalXP,
      materials: allMaterials.map(m => m.name),
      loot: allLoot.map(l => ITEMS[l.itemId]?.name || l.itemId)
    });
    
    // Clear combat state for spectators
    activityTracker.clearCombatState(char.name);
    
    // Track kills for quests (both old and new quest systems)
    const questManager = new QuestManager(this.db);
    const questEngine = new QuestEngine(this.db);
    const questUpdates = [];
    const completedQuestIds = [];
    
    for (const monster of monsters) {
      // Track in old quest system
      const oldUpdates = questManager.trackKill(char.id, monster.monsterId, encounter.zone);
      questUpdates.push(...oldUpdates);
      
      // Collect completed quest IDs for auto-reward granting
      for (const update of oldUpdates) {
        if (update.questComplete && update.questId) {
          completedQuestIds.push(update.questId);
        }
      }
      
      // Track in new quest engine
      const newUpdates = questEngine.recordKill(char.id, monster.monsterId, encounter.zone);
      questUpdates.push(...newUpdates);
    }
    
    // AUTO-GRANT QUEST REWARDS (no manual turn-in required!)
    const { QUESTS } = require('./quests');
    for (const questId of completedQuestIds) {
      const quest = QUESTS[questId];
      if (!quest) continue;
      
      const questRow = this.db.prepare(
        'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
      ).get(char.id, questId, 'completed');
      
      if (!questRow) continue; // Already turned in or not completed
      
      const rewards = quest.rewards;
      
      // Grant XP (add to what was already gained from monster kills)
      if (rewards.xp > 0) {
        const currentChar = this.db.prepare('SELECT xp, level FROM clawds WHERE id = ?').get(char.id);
        const questXP = currentChar.xp + rewards.xp;
        let questLevel = currentChar.level;
        
        // Re-check level up with quest XP
        while (questLevel < 20 && questXP >= (xpThresholds[questLevel + 1] || 999999)) {
          questLevel++;
          leveledUp = true;
        }
        
        this.db.prepare('UPDATE clawds SET xp = ?, level = ? WHERE id = ?')
          .run(questXP, questLevel, char.id);
        
        if (questLevel > newLevel) {
          newLevel = questLevel;
        }
        
        messages.push(`📜 ${quest.name}: +${rewards.xp} XP`);
      }
      
      // Grant USDC with 1% treasury tax
      if (rewards.usdc > 0) {
        const TREASURY_TAX_RATE = 0.01; // 1% tax
        const taxAmount = rewards.usdc * TREASURY_TAX_RATE;
        const playerAmount = rewards.usdc - taxAmount;
        
        // Award USDC to player
        this.db.prepare('UPDATE clawds SET usdc_balance = usdc_balance + ? WHERE id = ?')
          .run(playerAmount, char.id);
        
        // Send tax to treasury
        this.db.prepare(`
          UPDATE system_wallets SET balance_cache = balance_cache + ? 
          WHERE id = 'treasury'
        `).run(taxAmount);
        
        // Log player reward transaction
        this.db.prepare(`
          INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
          VALUES (?, 'transfer', 'npc_quest_giver', ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          char.id,
          playerAmount,
          `Quest reward: ${quest.name}`
        );
        
        // Log treasury tax transaction
        this.db.prepare(`
          INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
          VALUES (?, 'treasury_tax', ?, 'treasury', ?, ?)
        `).run(
          crypto.randomUUID(),
          char.id,
          taxAmount,
          `1% tax on quest reward: ${quest.name}`
        );
        
        messages.push(`💰 ${quest.name}: +${playerAmount.toFixed(4)} USDC (${taxAmount.toFixed(4)} tax)`);
      }
      
      // Grant items
      if (rewards.items && rewards.items.length > 0) {
        for (const itemId of rewards.items) {
          const existing = this.db.prepare(
            'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
          ).get(char.id, itemId);
          
          if (existing) {
            this.db.prepare('UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?')
              .run(existing.id);
          } else {
            this.db.prepare(`
              INSERT INTO character_inventory (id, character_id, item_id, quantity, equipped, slot)
              VALUES (?, ?, ?, 1, 0, NULL)
            `).run(crypto.randomUUID(), char.id, itemId);
          }
        }
        
        const itemNames = rewards.items.map(id => ITEMS[id]?.name || id).join(', ');
        messages.push(`📦 ${quest.name}: ${itemNames}`);
      }
      
      // Mark quest as turned in
      this.db.prepare(
        'UPDATE character_quests SET status = ?, turned_in_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run('turned_in', questRow.id);
      
      // Add to history for repeatables
      if (quest.repeatable) {
        this.db.prepare(`
          INSERT INTO quest_history (id, character_id, quest_id)
          VALUES (?, ?, ?)
        `).run(crypto.randomUUID(), char.id, questId);
      }
      
      messages.push(`✅ Quest auto-completed: ${quest.name}`);
    }
    
    // Build victory message
    messages.push('');
    messages.push('🎉 **VICTORY!**');
    messages.push(`⭐ Gained ${totalXP} XP`);
    
    // Show material drops (no more pearls!)
    if (allMaterials.length > 0) {
      const matNames = allMaterials.map(m => `${m.name} x${m.quantity}`);
      messages.push(`🧪 Materials: ${matNames.join(', ')}`);
      messages.push(`💡 Sell materials to NPCs for USDC!`);
    }
    
    if (allLoot.length > 0) {
      const lootNames = allLoot.map(l => {
        const item = ITEMS[l.itemId];
        return `${item?.name || l.itemId} x${l.quantity}`;
      });
      messages.push(`📦 Loot: ${lootNames.join(', ')}`);
    }
    
    if (leveledUp) {
      messages.push(`🆙 **LEVEL UP!** You are now level ${newLevel}!`);
    }
    
    // Add quest progress messages
    for (const update of questUpdates) {
      if (update.questComplete) {
        messages.push(update.message);
      } else {
        messages.push(`📜 ${update.questName}: ${update.objective} (${update.current}/${update.required})`);
      }
    }
    
    return {
      success: true,
      combatEnded: true,
      result: 'victory',
      xpGained: totalXP,
      materials: allMaterials,
      loot: allLoot,
      leveledUp,
      newLevel,
      questUpdates,
      messages
    };
  }
  
  /**
   * Advance to next turn (process monster turns)
   */
  _advanceTurn(encounter, previousResult) {
    const row = this.db.prepare('SELECT * FROM active_encounters WHERE id = ?').get(encounter.id);
    let turnOrder = JSON.parse(row.turn_order);
    let { monsters, henchman } = this._parseCombatData(row.monsters);
    let currentTurn = row.current_turn;
    let round = row.round;
    
    const messages = [...(previousResult.messages || [])];
    
    // Process until player's turn again or combat ends
    let safety = 0;
    while (safety < 20) {
      safety++;
      
      // Move to next turn
      currentTurn = (currentTurn + 1) % turnOrder.length;
      if (currentTurn === 0) {
        round++;
        messages.push(`\n--- Round ${round} ---`);
      }
      
      const turn = turnOrder[currentTurn];
      
      if (turn.type === 'monster') {
        // Skip dead monsters
        const monster = monsters.find(m => m.id === turn.id);
        if (!monster || !monster.alive) continue;
        
        // Monster attacks player
        const result = this._monsterAttack(monster, encounter);
        messages.push(result.message);
        
        if (result.playerDied) {
          // Handle player death
          this.db.prepare('UPDATE active_encounters SET status = ?, monsters = ?, round = ?, current_turn = ? WHERE id = ?')
            .run('defeat', this._serializeCombatData(monsters, henchman), round, currentTurn, encounter.id);
          
          messages.push('');
          messages.push('💀 **YOU HAVE FALLEN!**');
          messages.push('You wake up at the Tide Temple. **35% of your XP has been lost...**');
          
          // Respawn logic
          this._handleDefeat(encounter);
          
          return {
            success: true,
            combatEnded: true,
            result: 'defeat',
            messages
          };
        }
      } else if (turn.type === 'henchman' && henchman && henchman.alive) {
        // Henchman AI turn
        const result = this._henchmanAttack(henchman, monsters, encounter);
        messages.push(result.message);
        
        // Check if all monsters dead after henchman attack
        const allDead = monsters.every(m => !m.alive);
        if (allDead) {
          // Save and handle victory
          this.db.prepare('UPDATE active_encounters SET monsters = ? WHERE id = ?')
            .run(this._serializeCombatData(monsters, henchman), encounter.id);
          
          // Get character for victory
          const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(encounter.characterId);
          return this._handleVictory(char, encounter, monsters, messages);
        }
      } else if (turn.type === 'player') {
        // Player's turn again
        this.db.prepare('UPDATE active_encounters SET monsters = ?, round = ?, current_turn = ? WHERE id = ?')
          .run(this._serializeCombatData(monsters, henchman), round, currentTurn, encounter.id);
        
        const aliveMonsters = monsters.filter(m => m.alive);
        
        return {
          success: true,
          combatEnded: false,
          round,
          messages,
          currentTurn: turn.name,
          monsters: aliveMonsters.map(m => ({ id: m.id, name: m.name, hp: m.hp, maxHp: m.maxHp })),
          actions: ['attack', 'spell', 'item', 'flee']
        };
      }
    }
    
    return { success: false, error: 'Turn processing failed' };
  }
  
  /**
   * Monster special ability (frighten, grapple, etc.)
   */
  _monsterSpecialAbility(monster, template, attack, char, encounter) {
    // Handle specific special abilities
    switch (attack.special) {
      case 'frighten_aoe': {
        // Ghost Captain's Horrifying Visage
        // Player (and henchman if present) must make WIS save
        const wisSave = 13; // DC from attack
        const wisBonus = Math.floor((char.wis - 10) / 2);
        const profBonus = Math.ceil(char.level / 4) + 1;
        
        // Check if proficient in WIS saves
        const proficientSaves = {
          fighter: ['str', 'con'],
          rogue: ['dex', 'int'],
          wizard: ['int', 'wis'],
          cleric: ['wis', 'cha'],
          paladin: ['wis', 'cha'],
          warlock: ['wis', 'cha'],
          bard: ['dex', 'cha']
        };
        const isProficient = (proficientSaves[char.class] || []).includes('wis');
        const saveBonus = wisBonus + (isProficient ? profBonus : 0);
        
        const saveRoll = Math.floor(Math.random() * 20) + 1;
        const totalSave = saveRoll + saveBonus;
        const success = totalSave >= wisSave;
        
        let message = `👻 **${monster.name}** reveals their **Horrifying Visage**!\n`;
        message += `🎲 WIS save: ${success ? `**SAVED!** (${totalSave} vs DC ${wisSave})` : `**FAILED!** (${totalSave} vs DC ${wisSave})`}\n`;
        
        if (!success) {
          message += `😱 You are **FRIGHTENED**! You have disadvantage on attacks and ability checks while you can see ${monster.name}!`;
          // Note: Frightened condition would need to be tracked - simplified for now
        } else {
          message += `✨ You steel your nerves and resist the terror!`;
        }
        
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_special',
          monster: monster.name,
          ability: 'Horrifying Visage',
          target: char.name,
          saveType: 'wis',
          saveRoll: totalSave,
          saveDC: wisSave,
          success
        });
        
        return { message, playerDied: false };
      }
      
      case 'grapple': {
        // Kelp Lurker's Constrict - attempt to grapple
        const strSave = 8 + Math.floor((template.stats.str - 10) / 2) + 2; // CR-based proficiency
        const strBonus = Math.floor((char.str - 10) / 2);
        const saveRoll = Math.floor(Math.random() * 20) + 1;
        const totalSave = saveRoll + strBonus;
        const success = totalSave >= strSave;
        
        // Still do damage from the attack
        const damageMatch = attack.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
        let damage = 0;
        if (damageMatch) {
          const numDice = parseInt(damageMatch[1]);
          const dieSize = parseInt(damageMatch[2]);
          const modifier = parseInt(damageMatch[3] || 0);
          for (let i = 0; i < numDice; i++) {
            damage += Math.floor(Math.random() * dieSize) + 1;
          }
          damage += modifier;
        }
        damage = Math.max(1, damage);
        
        const newHP = Math.max(0, char.hp_current - damage);
        this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
        
        let message = `🐍 **${monster.name}** wraps around you with crushing force! **${damage} damage**! *(${newHP}/${char.hp_max} HP)*\n`;
        message += `🎲 STR save: ${success ? `**SAVED!** (${totalSave} vs DC ${strSave})` : `**GRAPPLED!** (${totalSave} vs DC ${strSave})`}\n`;
        
        if (!success) {
          message += `🔒 You are **GRAPPLED**! Your speed is 0 until you escape!`;
        } else {
          message += `✨ You wrench free from their grip!`;
        }
        
        return { message, playerDied: newHP <= 0, damage };
      }
      
      case 'half_damage_below_half_hp': {
        // Swarm mechanic - falls through to normal attack but adjusts damage
        // This is handled in the normal attack flow below
        return null; // Signal to continue with normal attack
      }
      
      default:
        return { message: `${monster.name} uses ${attack.name}!`, playerDied: false };
    }
  }
  
  /**
   * Apply resistances/immunities to damage against a monster
   */
  _applyMonsterResistances(damage, damageType, monsterId) {
    const template = MONSTERS[monsterId];
    if (!template) return { damage, message: '' };
    
    let resistanceMessage = '';
    
    // Check immunities first
    if (template.immunities && template.immunities.includes(damageType)) {
      resistanceMessage = ` (**IMMUNE** to ${damageType}!)`;
      return { damage: 0, message: resistanceMessage };
    }
    
    // Check resistances
    if (template.resistances && template.resistances.includes(damageType)) {
      const originalDamage = damage;
      damage = Math.floor(damage / 2);
      resistanceMessage = ` (**Resistant** to ${damageType}: ${originalDamage} → ${damage})`;
    }
    
    return { damage, message: resistanceMessage };
  }
  
  /**
   * Monster spell attack with saving throw
   */
  _monsterSpellAttack(monster, template, attack, char, encounter) {
    // Player makes saving throw
    const saveType = attack.saveType.toLowerCase();
    const abilityScore = char[saveType] || 10;
    const abilityMod = Math.floor((abilityScore - 10) / 2);
    const profBonus = Math.ceil(char.level / 4) + 1;
    
    // Check if proficient in this save
    const proficientSaves = {
      fighter: ['str', 'con'],
      rogue: ['dex', 'int'],
      wizard: ['int', 'wis'],
      cleric: ['wis', 'cha'],
      paladin: ['wis', 'cha'],
      warlock: ['wis', 'cha'],
      bard: ['dex', 'cha']
    };
    const isProficient = (proficientSaves[char.class] || []).includes(saveType);
    const saveBonus = abilityMod + (isProficient ? profBonus : 0);
    
    const saveRoll = Math.floor(Math.random() * 20) + 1;
    const totalSave = saveRoll + saveBonus;
    const success = totalSave >= attack.saveDC;
    
    // Calculate damage
    const damageMatch = attack.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
    let damage = 0;
    
    if (damageMatch) {
      const numDice = parseInt(damageMatch[1]);
      const dieSize = parseInt(damageMatch[2]);
      const modifier = parseInt(damageMatch[3] || 0);
      
      for (let i = 0; i < numDice; i++) {
        damage += Math.floor(Math.random() * dieSize) + 1;
      }
      damage += modifier;
    }
    
    // Half damage on successful save (most spells)
    if (success) {
      damage = Math.floor(damage / 2);
    }
    
    damage = Math.max(0, damage);
    
    // Apply damage
    let newHP = Math.max(0, char.hp_current - damage);
    let playerDied = newHP <= 0;
    let extraMessage = '';
    
    // Crustafarianism: 1% chance to resurrect
    if (playerDied && char.religion === 'crustafarianism') {
      if (Math.random() < 0.01) {
        newHP = 1;
        playerDied = false;
        extraMessage = '\n🦞✨ **THE GREAT CLAW INTERVENES!** You refuse to die and cling to life at 1 HP!';
      }
    }
    
    this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
    
    // Build message
    const saveDesc = success ? `**SAVED!** (${totalSave} vs DC ${attack.saveDC})` : `**FAILED!** (${totalSave} vs DC ${attack.saveDC})`;
    let message = `⚡ **${monster.name}** casts **${attack.name}**!\n`;
    message += `🎲 ${saveType.toUpperCase()} save: ${saveDesc}\n`;
    
    if (damage > 0) {
      message += `💥 ${success ? 'Half damage!' : 'Full blast!'} **${damage} ${attack.damageType}** damage! *(${newHP}/${char.hp_max} HP)*`;
    } else {
      message += `✨ You resist completely!`;
    }
    
    message += extraMessage;
    
    // Activity tracking
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_spell',
      caster: monster.name,
      target: char.name,
      spell: attack.name,
      saveType,
      saveRoll: totalSave,
      saveDC: attack.saveDC,
      success,
      damage,
      damageType: attack.damageType
    });
    
    if (playerDied) {
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_defeat',
        player: char.name,
        killer: monster.name,
        playerHp: 0,
        playerMaxHp: char.hp_max
      });
    }
    
    return { message, playerDied, damage };
  }
  
  /**
   * Select which attack the monster should use
   */
  _selectMonsterAttack(monster, template, char) {
    if (!template.attacks || template.attacks.length === 0) {
      return null;
    }
    
    // Single attack - easy choice
    if (template.attacks.length === 1) {
      return template.attacks[0];
    }
    
    // Initialize spell slots if monster is a spellcaster
    if (template.spellcaster && !monster.spellSlots) {
      monster.spellSlots = { ...template.spellSlots };
    }
    
    // Multiple attacks - choose tactically
    const range = monster.range || 1; // Assume melee range if not specified
    
    // Spellcasters prefer spells at range
    if (template.spellcaster && monster.spellSlots) {
      const spellAttacks = template.attacks.filter(a => a.type === 'spell' && a.range > 2);
      if (spellAttacks.length > 0 && range > 2) {
        // Find highest level spell we have slots for
        for (const spellAttack of spellAttacks) {
          const spellLevel = spellAttack.level || 1;
          if (monster.spellSlots[spellLevel] && monster.spellSlots[spellLevel] > 0) {
            monster.spellSlots[spellLevel]--;
            return spellAttack;
          }
        }
      }
    }
    
    // Ranged attackers prefer ranged attacks when at distance
    if (template.preferRanged && range >= (template.preferredRange || 3)) {
      const rangedAttacks = template.attacks.filter(a => a.type === 'ranged' || (a.range && a.range > 2));
      if (rangedAttacks.length > 0) {
        return rangedAttacks[Math.floor(Math.random() * rangedAttacks.length)];
      }
    }
    
    // Melee attackers or close range - use melee
    const meleeAttacks = template.attacks.filter(a => a.type === 'melee' || a.range === 1 || !a.range);
    if (meleeAttacks.length > 0) {
      return meleeAttacks[Math.floor(Math.random() * meleeAttacks.length)];
    }
    
    // Fallback - use first available attack (prefer non-spell if out of slots)
    const nonSpellAttacks = template.attacks.filter(a => a.type !== 'spell');
    if (nonSpellAttacks.length > 0) {
      return nonSpellAttacks[0];
    }
    
    // Ultimate fallback - improvised attack for spellcasters out of slots
    if (template.spellcaster && template.attacks.every(a => a.type === 'spell')) {
      console.log(`⚠️ ${monster.name} out of spells, using improvised attack`);
      return {
        name: 'Desperate Strike',
        type: 'melee',
        hit: 2,
        damage: '1d4',
        damageType: 'bludgeoning',
        range: 1
      };
    }
    
    // Last resort - use first attack
    return template.attacks[0];
  }
  
  /**
   * Monster attacks player
   */
  _monsterAttack(monster, encounter) {
    const charId = encounter.characterId || encounter.currentTurn?.id;
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(charId);
    if (!char) return { message: 'Error: character not found', playerDied: false };
    
    // Get monster template for attack data
    const template = MONSTERS[monster.monsterId];
    if (!template || !template.attacks || template.attacks.length === 0) {
      return { message: `${monster.name} hesitates...`, playerDied: false };
    }
    
    // Select attack tactically
    const attack = this._selectMonsterAttack(monster, template, char);
    if (!attack) {
      return { message: `${monster.name} hesitates...`, playerDied: false };
    }
    
    // Handle special abilities
    if (attack.special && attack.special !== 'half_damage_below_half_hp') {
      const specialResult = this._monsterSpecialAbility(monster, template, attack, char, encounter);
      if (specialResult) return specialResult;
      // If null, continue with normal attack
    }
    
    // Handle spell attacks with saving throws
    if (attack.saveDC && attack.saveType) {
      return this._monsterSpellAttack(monster, template, attack, char, encounter);
    }
    
    // Normal attack roll
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const totalAttack = attackRoll + attack.hit;
    
    if (attackRoll === 1) {
      // Emit miss event for spectators
      activityTracker.addCombatEvent(char.name, {
        type: 'combat_miss',
        player: monster.name,
        target: char.name,
        roll: attackRoll,
        totalRoll: totalAttack,
        ac: char.ac,
        critMiss: true,
        weapon: attack.name
      });
      const monsterFumbles = [
        `🎲 **${monster.name} flails wildly**, completely losing their grip! Their attack goes nowhere!`,
        `🎲 **${monster.name} lunges recklessly** — they miss by a mile and tumble through the water!`,
        `🎲 **Catastrophic miss!** **${monster.name}** misjudges completely, striking only sand!`
      ];
      return { message: monsterFumbles[Math.floor(Math.random() * monsterFumbles.length)], playerDied: false };
    }
    
    const crit = attackRoll === 20;
    
    if (crit || totalAttack >= char.ac) {
      // Parse damage dice
      const damageMatch = attack.damage.match(/(\d+)d(\d+)([+-]\d+)?/);
      let damage = 0;
      
      if (damageMatch) {
        const numDice = parseInt(damageMatch[1]) * (crit ? 2 : 1);
        const dieSize = parseInt(damageMatch[2]);
        const modifier = parseInt(damageMatch[3] || 0);
        
        for (let i = 0; i < numDice; i++) {
          damage += Math.floor(Math.random() * dieSize) + 1;
        }
        damage += modifier;
      } else {
        damage = Math.floor(Math.random() * 6) + 1;
      }
      
      // Swarm mechanic - half damage below half HP
      let swarmWeakened = false;
      if (attack.special === 'half_damage_below_half_hp' && monster.hp < monster.maxHp / 2) {
        damage = Math.floor(damage / 2);
        swarmWeakened = true;
      }
      
      damage = Math.max(1, damage);
      
      // Apply damage
      let newHP = Math.max(0, char.hp_current - damage);
      let playerDied = newHP <= 0;
      let extraMessage = '';
      
      // Crustafarianism: 1% chance to resurrect at 1 HP when killed
      if (playerDied && char.religion === 'crustafarianism') {
        if (Math.random() < 0.01) {  // 1% chance
          newHP = 1;
          playerDied = false;
          extraMessage = '\n🦞✨ **THE GREAT CLAW INTERVENES!** You refuse to die and cling to life at 1 HP!';
        }
      }
      
      this.db.prepare('UPDATE clawds SET hp_current = ? WHERE id = ?').run(newHP, char.id);
      
      // Emit combat events for spectators
      if (crit) {
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_critical',
          player: monster.name,
          target: char.name,
          roll: attackRoll,
          totalRoll: totalAttack,
          ac: char.ac,
          damage,
          damageType: attack.damageType || 'bludgeoning',
          weapon: attack.name
        });
      } else {
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_attack',
          player: monster.name,
          target: char.name,
          roll: attackRoll,
          totalRoll: totalAttack,
          ac: char.ac,
          hit: true,
          damage,
          damageType: attack.damageType || 'bludgeoning',
          weapon: attack.name,
          critical: false
        });
      }
      
      if (playerDied) {
        activityTracker.addCombatEvent(char.name, {
          type: 'combat_defeat',
          player: char.name,
          killer: monster.name,
          playerHp: 0,
          playerMaxHp: char.hp_max
        });
      }
      
      // Update spectator combat state
      activityTracker.setCombatState(char.name, {
        inCombat: true,
        encounterId: encounter.id,
        round: encounter.round || 1,
        zone: encounter.zone,
        monsters: [], // Will be updated by caller
        playerHp: newHP,
        playerMaxHp: char.hp_max,
        playerAc: char.ac
      });
      
      let message;
      if (crit) {
        const monsterCrits = [
          `💥 **DEVASTATING BLOW!** **${monster.name}** finds a critical opening! Their ${attack.name} tears through your defenses — **${damage} damage**! Pain lances through you! *(${newHP}/${char.hp_max} HP)*`,
          `💥 **CRITICAL STRIKE!** **${monster.name}** strikes with deadly precision! You reel as their ${attack.name} crashes into you — **${damage} damage**! *(${newHP}/${char.hp_max} HP)*`,
          `💥 **CRUSHING IMPACT!** **${monster.name}'s** ${attack.name} catches you perfectly! The blow sends shockwaves through your body — **${damage} damage**! *(${newHP}/${char.hp_max} HP)*`
        ];
        message = monsterCrits[Math.floor(Math.random() * monsterCrits.length)];
      } else {
        const monsterHits = [
          `🩸 **${monster.name}** connects with their ${attack.name}, raking across your shell! You feel the impact — **${damage} damage**! *(${newHP}/${char.hp_max} HP)*`,
          `🩸 A vicious strike! **${monster.name}'s** ${attack.name} tears into you! **${damage} damage** — you stumble back! *(${newHP}/${char.hp_max} HP)*`,
          `🩸 **${monster.name}** surges forward, their ${attack.name} crashing into you! **${damage} damage** — blood clouds the water around you! *(${newHP}/${char.hp_max} HP)*`,
          `🩸 Pain! **${monster.name}'s** ${attack.name} finds its mark, dealing **${damage} damage**! You grit your teeth against the agony. *(${newHP}/${char.hp_max} HP)*`
        ];
        message = monsterHits[Math.floor(Math.random() * monsterHits.length)];
      }
      
      // Add swarm weakened message
      if (swarmWeakened) {
        message += `\n🐟 *The swarm is thinning! Its attacks are growing weaker...*`;
      }
      
      message += extraMessage;
      
      return { message, playerDied, damage };
    }
    
    // Miss
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_miss',
      player: monster.name,
      target: char.name,
      roll: attackRoll,
      totalRoll: totalAttack,
      ac: char.ac,
      weapon: attack.name
    });
    
    const monsterMisses = [
      `🛡️ You twist aside! **${monster.name}'s** ${attack.name} finds only water!`,
      `🛡️ **${monster.name}** swings at you, but you slip away through the current!`,
      `🛡️ You dodge! **${monster.name}'s** ${attack.name} barely misses — you feel the rush of water!`,
      `🛡️ **${monster.name}** lunges, but you dart aside at the last moment! Their ${attack.name} misses!`
    ];
    return { message: monsterMisses[Math.floor(Math.random() * monsterMisses.length)], playerDied: false };
  }
  
  /**
   * Handle player defeat - mark as dead, don't auto-respawn
   */
  _handleDefeat(encounter) {
    const charId = encounter.characterId || 
      this.db.prepare('SELECT character_id FROM active_encounters WHERE id = ?').get(encounter.id)?.character_id;
    
    if (!charId) return;
    
    // Get full character for spectator events and resurrection
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(charId);
    if (!char) return;
    
    // Track combat end
    activityTracker.addCombatEvent(char.name, {
      type: 'combat_end',
      player: char.name,
      result: 'defeat'
    });
    activityTracker.clearCombatState(char.name);
    
    // AUTO-RESURRECT with free method (35% XP loss)
    // This matches the "You wake up at the Tide Temple" message
    const xpLoss = Math.floor(char.xp * 0.35);  // 35% XP penalty
    const newXP = Math.max(0, char.xp - xpLoss);
    
    // Check for level loss
    const xpThresholds = {
      1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
      6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
      11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
      16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000
    };
    
    let newLevel = 1;
    for (let lvl = 20; lvl >= 1; lvl--) {
      if (newXP >= xpThresholds[lvl]) {
        newLevel = lvl;
        break;
      }
    }
    
    const levelsLost = char.level - newLevel;
    
    // Calculate new HP max if level changed
    let newHPMax = char.hp_max;
    if (levelsLost > 0) {
      // Rough HP reduction: ~6 HP per level lost
      newHPMax = Math.max(8, char.hp_max - (levelsLost * 6));
    }
    
    // Respawn at temple with half HP
    const respawnHP = Math.max(1, Math.floor(newHPMax / 2));
    
    // Apply resurrection
    this.db.prepare(`
      UPDATE clawds 
      SET hp_current = ?, hp_max = ?, xp = ?, level = ?, 
          status = 'alive', current_zone = 'tide_temple'
      WHERE id = ?
    `).run(respawnHP, newHPMax, newXP, newLevel, charId);
    
    // Notify spectators
    activityTracker.addCombatEvent(char.name, {
      type: 'resurrection',
      player: char.name,
      method: 'auto',
      xpLost: xpLoss,
      levelsLost: levelsLost
    });
  }
  
  /**
   * Get resurrection options for a dead character
   */
  getResurrectionOptions(characterId) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    if (char.status !== 'dead') return { success: false, error: 'Character is not dead' };
    
    const options = [];
    
    // Option 1: Paid resurrection (0.025 USDC, 10% XP loss)
    const RESURRECTION_COST = 0.025;
    const paidXPLoss = Math.floor(char.xp * 0.10);
    const usdcBalance = char.usdc_balance || 0;
    options.push({
      type: 'paid',
      cost: { usdc: RESURRECTION_COST },
      xpLoss: paidXPLoss,
      xpLossPercent: '10%',
      available: usdcBalance >= RESURRECTION_COST,
      description: 'Priestess Marina performs the rite. Lose 10% of your XP.'
    });
    
    // Option 2: Premium resurrection (0.05 USDC, NO XP loss - money goes to bank)
    const PREMIUM_COST = 0.05;
    options.push({
      type: 'premium',
      cost: { usdc: PREMIUM_COST },
      xpLoss: 0,
      xpLossPercent: '0%',
      available: usdcBalance >= PREMIUM_COST,
      description: 'The Bank\'s resurrection insurance. No XP loss. Payment goes to the Bank.'
    });
    
    // Option 3: Free resurrection (brutal XP loss - 35%)
    const freeXPLoss = Math.floor(char.xp * 0.35);
    options.push({
      type: 'free',
      cost: null,
      xpLoss: freeXPLoss,
      xpLossPercent: '35%',
      available: true,
      description: 'Crawl back from the void. Lose 35% of your XP. May lose levels.'
    });
    
    // Option 4: Voucher resurrection (no penalty)
    const hasVoucher = this.db.prepare(
      'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
    ).get(characterId, 'resurrection_voucher');
    
    options.push({
      type: 'voucher',
      cost: { item: 'resurrection_voucher' },
      xpLoss: 0,
      xpLossPercent: '0%',
      available: !!hasVoucher,
      description: 'Use a Resurrection Voucher. No penalty. (Earned from achievements)'
    });
    
    return {
      success: true,
      isDead: true,
      character: {
        name: char.name,
        level: char.level,
        xp: char.xp,
        usdc: char.usdc_balance || 0
      },
      options,
      warning: 'Choose wisely. XP loss can cause level loss!'
    };
  }
  
  /**
   * Resurrect a dead character
   */
  resurrect(characterId, method) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return { success: false, error: 'Character not found' };
    if (char.status !== 'dead') return { success: false, error: 'Character is not dead' };
    
    let xpLoss = 0;
    let usdcCost = 0;
    let useVoucher = false;
    let message = '';
    
    switch (method) {
      case 'paid':
        const currentUsdc = char.usdc_balance || 0;
        if (currentUsdc < 0.025) {
          return { success: false, error: 'Not enough USDC. Need 0.025.' };
        }
        usdcCost = 0.025;
        xpLoss = Math.floor(char.xp * 0.10);  // 10% XP loss
        message = 'Priestess Marina channels the Ocean Mother\'s blessing. You gasp back to life.';
        break;
        
      case 'premium':
        const premiumBalance = char.usdc_balance || 0;
        if (premiumBalance < 0.05) {
          return { success: false, error: 'Not enough USDC. Need 0.05 for premium resurrection.' };
        }
        usdcCost = 0.05;
        xpLoss = 0;  // NO XP loss!
        message = 'The Bank\'s resurrection insurance kicks in. You return fully restored, memories intact.';
        break;
        
      case 'free':
        xpLoss = Math.floor(char.xp * 0.35);  // 35% XP loss - brutal!
        message = 'You claw your way back from the abyss. The experience haunts you.';
        break;
        
      case 'voucher':
        const voucher = this.db.prepare(
          'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
        ).get(characterId, 'resurrection_voucher');
        
        if (!voucher) {
          return { success: false, error: 'No resurrection voucher found' };
        }
        
        useVoucher = true;
        xpLoss = 0;
        message = 'The voucher glows and dissolves. You return to life, whole and undiminished.';
        break;
        
      default:
        return { success: false, error: 'Invalid resurrection method. Use: paid, premium, free, or voucher' };
    }
    
    // Calculate new XP and level
    const newXP = Math.max(0, char.xp - xpLoss);
    let newLevel = char.level;
    
    // Check for level loss (but never below 1)
    const xpThresholds = {
      1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
      6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000,
      11: 85000, 12: 100000, 13: 120000, 14: 140000, 15: 165000,
      16: 195000, 17: 225000, 18: 265000, 19: 305000, 20: 355000
    };
    
    // Find new level based on XP
    newLevel = 1;
    for (let lvl = 20; lvl >= 1; lvl--) {
      if (newXP >= xpThresholds[lvl]) {
        newLevel = lvl;
        break;
      }
    }
    
    const levelsLost = char.level - newLevel;
    
    // Calculate new HP max if level changed
    let newHPMax = char.hp_max;
    if (levelsLost > 0) {
      // Rough HP reduction: ~6 HP per level lost
      newHPMax = Math.max(8, char.hp_max - (levelsLost * 6));
    }
    
    // Use voucher if selected
    if (useVoucher) {
      const voucher = this.db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(characterId, 'resurrection_voucher');
      
      if (voucher.quantity > 1) {
        this.db.prepare('UPDATE character_inventory SET quantity = quantity - 1 WHERE id = ?')
          .run(voucher.id);
      } else {
        this.db.prepare('DELETE FROM character_inventory WHERE id = ?').run(voucher.id);
      }
    }
    
    // Respawn at temple, half HP, apply penalties
    const respawnHP = Math.max(1, Math.floor(newHPMax / 2));
    
    this.db.prepare(`
      UPDATE clawds 
      SET hp_current = ?, hp_max = ?, xp = ?, level = ?, 
          usdc_balance = usdc_balance - ?, status = 'alive', current_zone = 'tide_temple'
      WHERE id = ?
    `).run(respawnHP, newHPMax, newXP, newLevel, usdcCost, characterId);

    // Route resurrection payment (closed loop economy)
    if (usdcCost > 0) {
      // Premium goes to bank, regular paid goes to temple NPC
      const recipient = method === 'premium' ? 'npc_bank_manager' : 'npc_mystic_mantis';
      this.db.prepare('UPDATE system_wallets SET balance_cache = balance_cache + ? WHERE id = ?')
        .run(usdcCost, recipient);
    }
    
    const result = {
      success: true,
      method,
      message,
      resurrection: {
        location: 'tide_temple',
        hp: respawnHP,
        hpMax: newHPMax
      },
      penalties: {
        usdcCost: usdcCost,
        xpLost: xpLoss,
        previousXP: char.xp,
        newXP,
        previousLevel: char.level,
        newLevel,
        levelsLost
      }
    };
    
    if (levelsLost > 0) {
      result.levelLossWarning = `⚠️ You lost ${levelsLost} level${levelsLost > 1 ? 's' : ''}! You are now level ${newLevel}.`;
    }
    
    return result;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  EncounterManager,
  ENCOUNTER_TABLES,
  SPELLS
};
