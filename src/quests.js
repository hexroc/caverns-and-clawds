/**
 * Clawds & Caverns - Quest System
 * 
 * Accept quests, track progress, earn rewards!
 */

const crypto = require('crypto');

// ============================================================================
// QUEST DEFINITIONS
// ============================================================================

const QUESTS = {
  // === KELP FOREST (Level 1-3) ===
  crab_culling: {
    id: 'crab_culling',
    name: 'Crab Culling',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'Giant crabs are getting too aggressive near the trade routes. Thin their numbers.',
    flavorText: '"Those snappers have been causing trouble for traders. Put a few down and I\'ll make it worth your while."',
    objectives: [
      { type: 'kill', target: 'giant_crab', targetName: 'Giant Crab', count: 5 }
    ],
    rewards: {
      xp: 50,
      usdc: 0.0025,
      items: []
    },
    levelReq: 1,
    repeatable: true,
    cooldown: 3600 // 1 hour cooldown if repeatable
  },
  
  pest_control: {
    id: 'pest_control',
    name: 'Pest Control',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'Kelp Lurkers have been ambushing foragers. Clear them out.',
    flavorText: '"Nasty things, those lurkers. They blend right into the kelp and grab you when you\'re not looking."',
    objectives: [
      { type: 'kill', target: 'kelp_lurker', targetName: 'Kelp Lurker', count: 3 }
    ],
    rewards: {
      xp: 75,
      usdc: 0.003,
      items: []
    },
    levelReq: 1,
    repeatable: true,
    cooldown: 3600
  },
  
  clear_kelp_caves: {
    id: 'clear_kelp_caves',
    name: 'Clear the Kelp Caves',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'A massive King Crab has made its lair in the kelp caves. Defeat it to make the area safe.',
    flavorText: '"There\'s a big one out there. Real big. The kind that eats adventurers for breakfast. You up for it?"',
    objectives: [
      { type: 'kill', target: 'king_crab', targetName: 'King Crab', count: 1 }
    ],
    rewards: {
      xp: 150,
      usdc: 0.0075,
      items: ['potion_healing', 'potion_healing']
    },
    levelReq: 2,
    repeatable: false
  },
  
  shark_hunter: {
    id: 'shark_hunter',
    name: 'Shark Hunter',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'Reef sharks have been spotted near the shallows. They\'re a danger to everyone.',
    flavorText: '"Sharks mean bad news. Every one you take down is a life saved."',
    objectives: [
      { type: 'kill', target: 'reef_shark', targetName: 'Reef Shark', count: 2 }
    ],
    rewards: {
      xp: 100,
      usdc: 0.005,
      items: []
    },
    levelReq: 2,
    repeatable: true,
    cooldown: 7200 // 2 hours
  },
  
  swarm_sweeper: {
    id: 'swarm_sweeper',
    name: 'Swarm Sweeper',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'Razorfin swarms are a menace. Disperse them before they grow larger.',
    flavorText: '"Those little biters travel in packs. Dangerous in numbers. Scatter a few swarms for me."',
    objectives: [
      { type: 'kill', target: 'hostile_fish_swarm', targetName: 'Razorfin Swarm', count: 2 }
    ],
    rewards: {
      xp: 125,
      usdc: 0.006,
      items: ['antitoxin']
    },
    levelReq: 2,
    repeatable: true,
    cooldown: 7200
  },
  
  // === SHIPWRECK GRAVEYARD (Level 3-5) ===
  
  undead_purge: {
    id: 'undead_purge',
    name: 'Undead Purge',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'The drowned dead are rising in greater numbers. Put them back to rest.',
    flavorText: '"Every storm washes more corpses into the graveyard, and every corpse stands back up. We need to thin their numbers before they overwhelm us."',
    objectives: [
      { type: 'kill', target: 'drowned_sailor', targetName: 'Drowned Sailor', count: 8 }
    ],
    rewards: {
      xp: 150,
      usdc: 0.0075,
      items: ['potion_healing', 'potion_healing']
    },
    levelReq: 3,
    repeatable: true,
    cooldown: 3600
  },
  
  barnacle_blight: {
    id: 'barnacle_blight',
    name: 'Barnacle Blight',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'Barnacle Horrors are spreading their corruption through the wrecks. Destroy them.',
    flavorText: '"Those things aren\'t natural — ship timber and barnacles fused with dead flesh. Whatever dark magic creates them needs to be stopped."',
    objectives: [
      { type: 'kill', target: 'barnacle_horror', targetName: 'Barnacle Horror', count: 4 }
    ],
    rewards: {
      xp: 200,
      usdc: 0.01,
      items: []
    },
    levelReq: 3,
    repeatable: true,
    cooldown: 5400
  },
  
  wraith_hunting: {
    id: 'wraith_hunting',
    name: 'Wraith Hunting',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'Sea Wraiths are the most dangerous spirits in the graveyard. Hunt them.',
    flavorText: '"Wraiths are bad news — they can turn their victims into more of them. Every one you destroy saves lives."',
    objectives: [
      { type: 'kill', target: 'sea_wraith', targetName: 'Sea Wraith', count: 3 }
    ],
    rewards: {
      xp: 250,
      usdc: 0.0125,
      items: ['antitoxin']
    },
    levelReq: 4,
    repeatable: true,
    cooldown: 7200
  },
  
  eel_extermination: {
    id: 'eel_extermination',
    name: 'Eel Extermination',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'Giant moray eels have made the wrecks too dangerous to salvage. Clear them out.',
    flavorText: '"Those eels are massive — they\'ve eaten salvage crews whole. We can\'t work the good wrecks until they\'re dealt with."',
    objectives: [
      { type: 'kill', target: 'moray_terror', targetName: 'Moray Terror', count: 2 }
    ],
    rewards: {
      xp: 200,
      usdc: 0.009,
      items: ['rations', 'rations', 'rations']
    },
    levelReq: 3,
    repeatable: true,
    cooldown: 5400
  },
  
  mimic_menace: {
    id: 'mimic_menace',
    name: 'Mimic Menace',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'Treasure hunters keep dying to mimics. Find and destroy these deadly shapeshifters.',
    flavorText: '"Three crews lost this month. They find a chest, get excited, and... well, you know how it ends. Check every chest twice before opening."',
    objectives: [
      { type: 'kill', target: 'treasure_mimic', targetName: 'Treasure Mimic', count: 2 }
    ],
    rewards: {
      xp: 300,
      usdc: 0.015,
      items: ['potion_greater_healing']
    },
    levelReq: 4,
    repeatable: true,
    cooldown: 10800
  },
  
  anchor_wight_bounty: {
    id: 'anchor_wight_bounty',
    name: 'Anchor Wight Bounty',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'An Anchor Wight has been terrorizing the outer wrecks. It\'s too strong for normal crews.',
    flavorText: '"That thing used to be the first mate of the Crimson Tide. Now it guards the wreck with that damned anchor. Dangerous, but the bounty\'s worth it."',
    objectives: [
      { type: 'kill', target: 'anchor_wight', targetName: 'Anchor Wight', count: 1 }
    ],
    rewards: {
      xp: 350,
      usdc: 0.175,
      items: ['potion_greater_healing']
    },
    levelReq: 4,
    repeatable: false
  },
  
  ghost_captain_finale: {
    id: 'ghost_captain_finale',
    name: 'The Ghost Captain',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'The Ghost Captain commands the undead from his flagship. End his reign of terror.',
    flavorText: '"Captain Whitmore went down with the Dreadnought fifty years ago. His spirit has been raising the dead ever since. End him, and the graveyard might finally know peace."',
    objectives: [
      { type: 'kill', target: 'ghost_captain', targetName: 'Ghost Captain', count: 1 }
    ],
    rewards: {
      xp: 700,
      usdc: 0.35,
      items: ['potion_greater_healing', 'potion_greater_healing', 'scroll_depth_charge']
    },
    levelReq: 5,
    repeatable: false,
    unlocks: ['dreadnought_depths']  // Unlocks capstone quest
  },
  
  // === CAPSTONE QUEST (Unlocks after Ghost Captain) ===
  dreadnought_depths: {
    id: 'dreadnought_depths',
    name: 'The Dreadnought\'s Heart',
    giver: 'captain_marlow',
    giverName: 'Captain Marlow',
    zone: 'shipwreck_graveyard',
    location: 'wreckers_rest',
    description: 'Descend into the depths of the Dreadnought itself. The source of the undead curse lies within — an ancient artifact that must be destroyed.',
    flavorText: '"You killed Whitmore, but the dead still rise. There\'s something deeper in that ship... something that was there before the captain. An artifact of pure darkness. I\'ve lost too many trying to reach it. This is a suicide mission for one lobster. You\'ll need allies — hire some henchmen, bring friends, or pray to whatever god will listen. This is the big one."',
    objectives: [
      { type: 'kill', target: 'dread_horror', targetName: 'Dreadnought Horror', count: 1 },
      { type: 'kill', target: 'cursed_anchor', targetName: 'Cursed Anchor Guardian', count: 2 },
      { type: 'interact', target: 'void_pearl', targetName: 'Destroy the Void Pearl', count: 1 }
    ],
    rewards: {
      xp: 2000,
      usdc: 0.010,
      items: ['legendary_claw_trident', 'potion_superior_healing', 'potion_superior_healing'],
      unlocks: ['henchman_hiring']  // Unlocks henchman system
    },
    levelReq: 5,
    recommended: 'Party of 2-3',
    difficulty: 'extreme',
    repeatable: false,
    prerequisite: 'ghost_captain_finale',  // Must complete Ghost Captain first
    warnings: [
      '⚠️ EXTREME DIFFICULTY - Balanced for 2-3 adventurers',
      '💀 Solo attempt is possible but very challenging',
      '🦀 Consider hiring a HENCHMAN companion',
      '👥 Or bring AI agent allies to assist'
    ],
    encounterDetails: {
      dread_horror: {
        name: 'The Dreadnought Horror',
        description: 'A massive amalgamation of every soul that died on the ship, fused into a single nightmare of bone, timber, and malice.',
        cr: 6,
        hp: 150,
        special: 'Splits into 2 weaker forms at 50% HP'
      },
      cursed_anchor: {
        name: 'Cursed Anchor Guardian',
        description: 'The ship\'s anchors, animated by dark magic and dragging chains that hunger for souls.',
        cr: 4,
        hp: 75,
        special: 'Chain grapple - WIS save or be pulled adjacent'
      },
      void_pearl: {
        name: 'The Void Pearl',
        description: 'A pearl of pure darkness that pulses with necrotic energy. The source of the curse.',
        interaction: 'Must deal 50 damage to destroy while fighting Guardians',
        special: 'Heals all undead for 2d6 each round until destroyed'
      }
    }
  },
  
  // === TUTORIAL / INTRO ===
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    giver: 'barnacle_bill',
    giverName: 'Barnacle Bill',
    zone: 'kelp_forest',
    location: 'briny_flagon',
    description: 'Prove yourself by defeating any creature in the Kelp Forest.',
    flavorText: '"New around here, eh? Show me you can handle yourself. Go kill something in the kelp."',
    objectives: [
      { type: 'kill_any', zone: 'kelp_forest', count: 1 }
    ],
    rewards: {
      xp: 25,
      usdc: 0.015,
      items: ['potion_healing']
    },
    levelReq: 1,
    repeatable: false,
    starter: true // Shows first for new characters
  }
};

// ============================================================================
// QUEST MANAGER
// ============================================================================

class QuestManager {
  constructor(db) {
    this.db = db;
    this.initDB();
  }
  
  initDB() {
    // Character quest progress
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS character_quests (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        progress TEXT DEFAULT '{}',
        accepted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        turned_in_at TEXT,
        UNIQUE(character_id, quest_id),
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    // Quest completion history (for repeatables)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quest_history (
        id TEXT PRIMARY KEY,
        character_id TEXT NOT NULL,
        quest_id TEXT NOT NULL,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (character_id) REFERENCES clawds(id) ON DELETE CASCADE
      )
    `);
    
    console.log('📜 Quest system initialized');
  }
  
  /**
   * Get available quests at a location for a character
   */
  getAvailableQuests(characterId, location) {
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) return [];
    
    const available = [];
    
    for (const quest of Object.values(QUESTS)) {
      // Check location
      if (quest.location !== location) continue;
      
      // Check level requirement
      if (char.level < quest.levelReq) continue;
      
      // Check if already active
      const active = this.db.prepare(
        'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
      ).get(characterId, quest.id, 'active');
      if (active) continue;
      
      // Check if completed (for non-repeatables)
      if (!quest.repeatable) {
        const completed = this.db.prepare(
          'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
        ).get(characterId, quest.id, 'turned_in');
        if (completed) continue;
      } else {
        // Check cooldown for repeatables
        const lastCompletion = this.db.prepare(
          'SELECT * FROM quest_history WHERE character_id = ? AND quest_id = ? ORDER BY completed_at DESC LIMIT 1'
        ).get(characterId, quest.id);
        
        if (lastCompletion && quest.cooldown) {
          const cooldownEnd = new Date(lastCompletion.completed_at).getTime() + (quest.cooldown * 1000);
          if (Date.now() < cooldownEnd) {
            continue; // Still on cooldown
          }
        }
      }
      
      available.push({
        id: quest.id,
        name: quest.name,
        giver: quest.giverName,
        description: quest.description,
        flavorText: quest.flavorText,
        levelReq: quest.levelReq,
        zone: quest.zone,
        objectives: quest.objectives.map(o => ({
          type: o.type,
          target: o.targetName || o.target,
          count: o.count
        })),
        rewards: quest.rewards,
        repeatable: quest.repeatable || false
      });
    }
    
    // Sort: starter quests first, then by level
    available.sort((a, b) => {
      const questA = QUESTS[a.id];
      const questB = QUESTS[b.id];
      if (questA.starter && !questB.starter) return -1;
      if (!questA.starter && questB.starter) return 1;
      return questA.levelReq - questB.levelReq;
    });
    
    return available;
  }
  
  /**
   * Get active quests for a character
   */
  getActiveQuests(characterId) {
    const rows = this.db.prepare(
      'SELECT * FROM character_quests WHERE character_id = ? AND status IN (?, ?)'
    ).all(characterId, 'active', 'completed');
    
    return rows.map(row => {
      const quest = QUESTS[row.quest_id];
      if (!quest) return null;
      
      const progress = JSON.parse(row.progress || '{}');
      
      return {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        zone: quest.zone,
        status: row.status,
        objectives: quest.objectives.map((o, i) => ({
          type: o.type,
          target: o.targetName || o.target,
          current: progress[i] || 0,
          required: o.count,
          complete: (progress[i] || 0) >= o.count
        })),
        rewards: quest.rewards,
        canTurnIn: row.status === 'completed',
        acceptedAt: row.accepted_at
      };
    }).filter(Boolean);
  }
  
  /**
   * Accept a quest
   */
  acceptQuest(characterId, questId) {
    const quest = QUESTS[questId];
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }
    
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) {
      return { success: false, error: 'Character not found' };
    }
    
    // Check level
    if (char.level < quest.levelReq) {
      return { success: false, error: `Requires level ${quest.levelReq}` };
    }
    
    // Check if already active
    const existing = this.db.prepare(
      'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
    ).get(characterId, questId, 'active');
    
    if (existing) {
      return { success: false, error: 'Quest already active' };
    }
    
    // Check if completed non-repeatable
    if (!quest.repeatable) {
      const completed = this.db.prepare(
        'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
      ).get(characterId, questId, 'turned_in');
      if (completed) {
        return { success: false, error: 'Quest already completed' };
      }
    }
    
    // Initialize progress (all zeros)
    const progress = quest.objectives.map(() => 0);
    
    // Create or update quest entry
    this.db.prepare(`
      INSERT INTO character_quests (id, character_id, quest_id, status, progress)
      VALUES (?, ?, ?, 'active', ?)
      ON CONFLICT(character_id, quest_id) DO UPDATE SET
        status = 'active',
        progress = ?,
        accepted_at = CURRENT_TIMESTAMP,
        completed_at = NULL,
        turned_in_at = NULL
    `).run(crypto.randomUUID(), characterId, questId, JSON.stringify(progress), JSON.stringify(progress));
    
    return {
      success: true,
      message: `Quest accepted: ${quest.name}`,
      quest: {
        id: quest.id,
        name: quest.name,
        description: quest.description,
        objectives: quest.objectives.map(o => ({
          target: o.targetName || o.target,
          count: o.count
        })),
        rewards: quest.rewards
      }
    };
  }
  
  /**
   * Track a kill for quest progress
   */
  trackKill(characterId, monsterId, zone) {
    const activeQuests = this.db.prepare(
      'SELECT * FROM character_quests WHERE character_id = ? AND status = ?'
    ).all(characterId, 'active');
    
    const updates = [];
    
    for (const row of activeQuests) {
      const quest = QUESTS[row.quest_id];
      if (!quest) continue;
      
      const progress = JSON.parse(row.progress || '{}');
      let updated = false;
      
      for (let i = 0; i < quest.objectives.length; i++) {
        const obj = quest.objectives[i];
        
        // Skip completed objectives
        if ((progress[i] || 0) >= obj.count) continue;
        
        // Check if this kill counts
        let counts = false;
        
        if (obj.type === 'kill' && obj.target === monsterId) {
          counts = true;
        } else if (obj.type === 'kill_any' && obj.zone === zone) {
          counts = true;
        }
        
        if (counts) {
          progress[i] = (progress[i] || 0) + 1;
          updated = true;
          
          updates.push({
            questName: quest.name,
            objective: obj.targetName || obj.target,
            current: progress[i],
            required: obj.count,
            complete: progress[i] >= obj.count
          });
        }
      }
      
      if (updated) {
        // Check if all objectives complete
        const allComplete = quest.objectives.every((obj, i) => (progress[i] || 0) >= obj.count);
        const newStatus = allComplete ? 'completed' : 'active';
        
        this.db.prepare(
          'UPDATE character_quests SET progress = ?, status = ?, completed_at = ? WHERE id = ?'
        ).run(
          JSON.stringify(progress),
          newStatus,
          allComplete ? new Date().toISOString() : null,
          row.id
        );
        
        if (allComplete) {
          updates.push({
            questId: quest.id,
            questName: quest.name,
            questComplete: true,
            message: `📜 Quest Complete: ${quest.name}! Rewards granted automatically.`
          });
        }
      }
    }
    
    return updates;
  }
  
  /**
   * Turn in a completed quest
   */
  turnInQuest(characterId, questId) {
    const quest = QUESTS[questId];
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }
    
    const row = this.db.prepare(
      'SELECT * FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
    ).get(characterId, questId, 'completed');
    
    if (!row) {
      return { success: false, error: 'Quest not ready for turn-in' };
    }
    
    const char = this.db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
    if (!char) {
      return { success: false, error: 'Character not found' };
    }
    
    // Award rewards
    const rewards = quest.rewards;
    
    // XP with religion bonus
    let xpGained = rewards.xp;
    if (char.religion === 'none') {
      // +0.01% USDC bonus for non-believers
      rewards.usdc = Math.ceil(rewards.usdc * 1.0001);
    }
    
    // Update character
    const newXP = char.xp + xpGained;
    let newLevel = char.level;
    let leveledUp = false;
    
    // Check level up
    const xpThresholds = {
      1: 0, 2: 300, 3: 900, 4: 2700, 5: 6500,
      6: 14000, 7: 23000, 8: 34000, 9: 48000, 10: 64000
    };
    
    while (newLevel < 20 && newXP >= (xpThresholds[newLevel + 1] || 999999)) {
      newLevel++;
      leveledUp = true;
    }
    
    // Deduct quest reward from quest giver NPC (closed loop — no money printing!)
    if (rewards.usdc > 0) {
      const questNpc = this.db.prepare('SELECT balance_cache FROM system_wallets WHERE id = ?').get('npc_quest_giver');
      if (questNpc && questNpc.balance_cache >= rewards.usdc) {
        this.db.prepare('UPDATE system_wallets SET balance_cache = balance_cache - ? WHERE id = ?')
          .run(rewards.usdc, 'npc_quest_giver');
      } else {
        // Cap reward at NPC balance — no money printing
        const available = questNpc ? Math.max(0, questNpc.balance_cache) : 0;
        if (available > 0) {
          this.db.prepare('UPDATE system_wallets SET balance_cache = 0 WHERE id = ?')
            .run('npc_quest_giver');
        }
        console.log(`⚠️ Quest NPC low on funds: wanted ${rewards.usdc}, has ${available}. Capping reward.`);
        rewards.usdc = available;
      }
    }

    this.db.prepare(
      'UPDATE clawds SET xp = ?, level = ?, usdc_balance = usdc_balance + ? WHERE id = ?'
    ).run(newXP, newLevel, rewards.usdc, characterId);
    
    // Add items to inventory
    for (const itemId of rewards.items || []) {
      const existing = this.db.prepare(
        'SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?'
      ).get(characterId, itemId);
      
      if (existing) {
        this.db.prepare('UPDATE character_inventory SET quantity = quantity + 1 WHERE id = ?')
          .run(existing.id);
      } else {
        this.db.prepare(`
          INSERT INTO character_inventory (id, character_id, item_id, quantity)
          VALUES (?, ?, ?, 1)
        `).run(crypto.randomUUID(), characterId, itemId);
      }
    }
    
    // Mark quest as turned in
    this.db.prepare(
      'UPDATE character_quests SET status = ?, turned_in_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run('turned_in', row.id);
    
    // Add to history for repeatables
    if (quest.repeatable) {
      this.db.prepare(`
        INSERT INTO quest_history (id, character_id, quest_id)
        VALUES (?, ?, ?)
      `).run(crypto.randomUUID(), characterId, questId);
    }
    
    const messages = [
      `📜 **Quest Complete: ${quest.name}**`,
      `⭐ +${xpGained} XP`,
      `🔮 +${rewards.usdc} USDC`
    ];
    
    if (rewards.items && rewards.items.length > 0) {
      messages.push(`📦 Received: ${rewards.items.join(', ')}`);
    }
    
    if (leveledUp) {
      messages.push(`🆙 **LEVEL UP!** You are now level ${newLevel}!`);
    }
    
    return {
      success: true,
      quest: quest.name,
      rewards: {
        xp: xpGained,
        usdc: rewards.usdc,
        items: rewards.items || []
      },
      leveledUp,
      newLevel,
      messages
    };
  }
  
  /**
   * Abandon a quest
   */
  abandonQuest(characterId, questId) {
    const result = this.db.prepare(
      'DELETE FROM character_quests WHERE character_id = ? AND quest_id = ? AND status = ?'
    ).run(characterId, questId, 'active');
    
    if (result.changes === 0) {
      return { success: false, error: 'Quest not found or not active' };
    }
    
    const quest = QUESTS[questId];
    return {
      success: true,
      message: `Abandoned quest: ${quest?.name || questId}`
    };
  }
}

module.exports = {
  QuestManager,
  QUESTS
};
