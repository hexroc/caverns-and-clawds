/**
 * Loan Shark Enforcement System 🦈💀
 * 
 * Miss a payment? The Loan Shark WILL find you.
 * 
 * HARDCORE RULES:
 * - Loan Sharks are ALWAYS level 10 (brutal)
 * - Defeating them does NOT clear your debt
 * - They come back TOMORROW with BACKUP
 * - If you lose and can't pay: JAIL (real-time hours)
 * - Cannot flee from Loan Sharks
 */

const crypto = require('crypto');

// The Loan Shark - Level 10 nightmare
const LOAN_SHARK = {
  id: 'loan_shark',
  name: 'The Loan Shark',
  description: 'A massive, scarred shark with cold, calculating eyes. He always collects.',
  type: 'beast',
  size: 'large',
  alignment: 'lawful evil',
  level: 10, // ALWAYS level 10
  
  // Fixed stats - these guys are TOUGH
  hp: 150,
  maxHp: 150,
  ac: 18,
  cr: 10,
  
  stats: {
    str: 20,
    dex: 14,
    con: 18,
    int: 14,
    wis: 16,
    cha: 10
  },
  
  abilities: [
    { name: 'Debt Sense', description: 'Always knows where debtors are.' },
    { name: 'No Escape', description: 'Debtors cannot flee.' },
    { name: 'Relentless', description: 'Defeating him only delays the inevitable.' },
    { name: 'Backup Coming', description: 'Returns tomorrow with reinforcements.' }
  ],
  
  attacks: [
    {
      name: 'Crushing Bite',
      type: 'melee',
      hit: 9,
      damage: '3d10+5',
      damageType: 'piercing',
      range: 1,
      description: 'Bone-crushing jaws'
    },
    {
      name: 'Tail Slam',
      type: 'melee',
      hit: 8,
      damage: '2d8+5',
      damageType: 'bludgeoning',
      range: 1,
      description: 'Devastating tail sweep'
    }
  ],
  
  dialogue: {
    spawn: [
      "💀 **The water turns ice cold...**",
      "🦈 A massive shadow emerges from the depths.",
      "*\"You owe me money, little lobster. Time to pay up.\"*"
    ],
    spawnWithBackup: [
      "💀 **Multiple shadows circle you...**",
      "🦈 The Loan Shark returns — and he brought friends.",
      "*\"I warned you. Now it gets ugly.\"*"
    ],
    taunt: [
      "*\"Interest is compounding, friend.\"*",
      "*\"Should've paid on time.\"*",
      "*\"Nothing personal. Just business.\"*"
    ],
    playerWins: [
      "🦈 The Loan Shark retreats into the darkness...",
      "*\"This isn't over. I'll be back — with backup.\"*",
      "⚠️ **Your debt remains. He WILL return tomorrow.**"
    ],
    playerLosesCanPay: [
      "🦈 *\"Pleasure doing business.\"*",
      "The Loan Shark takes what's owed and disappears."
    ],
    playerLosesCantPay: [
      "🦈 *\"No money? No materials? Fine.\"*",
      "💀 **You're dragged to the Debtor's Prison.**",
      "⛓️ You'll be released when you've served your time..."
    ]
  }
};

// Loan Shark Enforcer (backup)
const LOAN_SHARK_ENFORCER = {
  id: 'loan_shark_enforcer',
  name: 'Shark Enforcer',
  description: 'A smaller but vicious shark working for the Loan Shark.',
  type: 'beast',
  size: 'medium',
  level: 7,
  hp: 75,
  maxHp: 75,
  ac: 15,
  cr: 5,
  
  stats: {
    str: 16, dex: 15, con: 14, int: 8, wis: 12, cha: 6
  },
  
  attacks: [
    {
      name: 'Bite',
      type: 'melee',
      hit: 6,
      damage: '2d8+3',
      damageType: 'piercing',
      range: 1
    }
  ]
};

/**
 * Get players with overdue loans
 */
function getOverdueDebtors(db) {
  const now = new Date().toISOString();
  
  return db.prepare(`
    SELECT 
      ba.owner_id as character_id,
      ba.loan_balance,
      ba.loan_due_date,
      ba.enforcement_count,
      c.name as character_name,
      c.current_zone,
      c.status,
      c.agent_id
    FROM bank_accounts ba
    JOIN clawds c ON ba.owner_id = c.id
    WHERE ba.owner_type = 'player'
      AND ba.loan_balance > 0
      AND ba.loan_due_date < ?
      AND c.status != 'jailed'
  `).all(now);
}

/**
 * Spawn Loan Shark encounter
 * - First time: just the Loan Shark
 * - After defeats: Loan Shark + enforcers
 */
function spawnLoanSharkEncounter(db, characterId, debtAmount, enforcementCount = 0) {
  // Check for existing encounter
  const existing = db.prepare(`
    SELECT * FROM active_encounters 
    WHERE character_id = ? AND zone = 'loan_shark_collection' AND status = 'active'
  `).get(characterId);
  
  if (existing) {
    return { success: false, error: 'Already being hunted', encounterId: existing.id };
  }
  
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  // Build monster list
  const monsters = [];
  const sharkId = `loan_shark_${Date.now()}`;
  
  // The Loan Shark (always present, always level 10)
  monsters.push({
    id: sharkId,
    monsterId: 'loan_shark',
    name: LOAN_SHARK.name,
    hp: LOAN_SHARK.hp,
    maxHp: LOAN_SHARK.maxHp,
    ac: LOAN_SHARK.ac,
    attacks: LOAN_SHARK.attacks,
    level: LOAN_SHARK.level,
    canFlee: false,
    alive: true
  });
  
  // Add enforcers based on how many times player has "won" before
  const numEnforcers = Math.min(enforcementCount, 3); // Max 3 enforcers
  for (let i = 0; i < numEnforcers; i++) {
    monsters.push({
      id: `enforcer_${Date.now()}_${i}`,
      monsterId: 'loan_shark_enforcer',
      name: `${LOAN_SHARK_ENFORCER.name} ${i + 1}`,
      hp: LOAN_SHARK_ENFORCER.hp,
      maxHp: LOAN_SHARK_ENFORCER.maxHp,
      ac: LOAN_SHARK_ENFORCER.ac,
      attacks: LOAN_SHARK_ENFORCER.attacks,
      level: LOAN_SHARK_ENFORCER.level,
      canFlee: false,
      alive: true
    });
  }
  
  // Roll initiative
  const charDex = char.stats ? JSON.parse(char.stats).dex || 10 : 10;
  const charInit = Math.floor(Math.random() * 20) + 1 + Math.floor((charDex - 10) / 2);
  
  const turnOrder = monsters.map(m => ({
    type: 'monster',
    id: m.id,
    monsterId: m.monsterId,
    name: m.name,
    initiative: 20 + Math.floor(Math.random() * 5) // Sharks always go first
  }));
  
  turnOrder.push({
    type: 'player',
    id: characterId,
    name: char.name,
    initiative: charInit
  });
  
  turnOrder.sort((a, b) => b.initiative - a.initiative);
  
  const encounterId = crypto.randomUUID();
  
  db.prepare(`
    INSERT INTO active_encounters (id, character_id, zone, monsters, round, turn_order, current_turn, status, special_rules)
    VALUES (?, ?, 'loan_shark_collection', ?, 1, ?, 0, 'active', ?)
  `).run(
    encounterId,
    characterId,
    JSON.stringify(monsters),
    JSON.stringify(turnOrder),
    JSON.stringify({
      noFlee: true,
      debtCollection: true,
      originalDebt: debtAmount,
      enforcementCount: enforcementCount
    })
  );
  
  return {
    success: true,
    encounterId,
    monsters: monsters.length,
    messages: enforcementCount > 0 
      ? LOAN_SHARK.dialogue.spawnWithBackup 
      : LOAN_SHARK.dialogue.spawn
  };
}

/**
 * Handle player WINNING against Loan Shark
 * - Debt is NOT forgiven
 * - Enforcement count increases
 * - They come back tomorrow with backup
 */
function handlePlayerVictory(db, characterId, encounterId) {
  // Get encounter details
  const encounter = db.prepare('SELECT special_rules FROM active_encounters WHERE id = ?').get(encounterId);
  const rules = encounter ? JSON.parse(encounter.special_rules || '{}') : {};
  
  // Increment enforcement count (more backup next time)
  db.prepare(`
    UPDATE bank_accounts 
    SET enforcement_count = COALESCE(enforcement_count, 0) + 1,
        last_enforcement = CURRENT_TIMESTAMP
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(characterId);
  
  // Get updated account
  const account = db.prepare(`
    SELECT loan_balance, enforcement_count FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  // Award some XP for surviving
  const xpReward = 250;
  db.prepare('UPDATE clawds SET xp = xp + ? WHERE id = ?').run(xpReward, characterId);
  
  return {
    success: true,
    debtRemains: true,
    remainingDebt: account?.loan_balance || 0,
    nextEnforcementBackup: (account?.enforcement_count || 0),
    xpReward,
    messages: LOAN_SHARK.dialogue.playerWins,
    warning: `⚠️ The Loan Shark will return tomorrow with ${(account?.enforcement_count || 0)} enforcer(s)!`
  };
}

/**
 * Handle player LOSING to Loan Shark
 * - Try to collect debt from materials/items
 * - If can't collect enough: JAIL
 */
function handlePlayerDefeat(db, characterId, encounterId) {
  const encounter = db.prepare('SELECT special_rules FROM active_encounters WHERE id = ?').get(encounterId);
  const rules = encounter ? JSON.parse(encounter.special_rules || '{}') : {};
  const debtAmount = rules.originalDebt || 0;
  
  // Try to collect debt
  const collection = collectDebt(db, characterId, debtAmount);
  
  if (collection.fullyPaid) {
    // Debt paid, clear the loan
    db.prepare(`
      UPDATE bank_accounts 
      SET loan_balance = 0, loan_due_date = NULL, enforcement_count = 0
      WHERE owner_type = 'player' AND owner_id = ?
    `).run(characterId);
    
    return {
      success: true,
      jailed: false,
      collected: collection.collected,
      totalCollected: collection.totalCollected,
      messages: LOAN_SHARK.dialogue.playerLosesCanPay
    };
  }
  
  // Can't pay full debt - GO TO JAIL
  const jailHours = Math.ceil(collection.remainingDebt / 0.1); // 1 hour per 0.1 USDC owed
  const releaseTime = new Date(Date.now() + jailHours * 60 * 60 * 1000);
  
  db.prepare(`
    UPDATE clawds 
    SET status = 'jailed', 
        jail_release_time = ?,
        current_zone = 'debtors_prison'
    WHERE id = ?
  `).run(releaseTime.toISOString(), characterId);
  
  // Reduce debt by what was collected
  db.prepare(`
    UPDATE bank_accounts 
    SET loan_balance = loan_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(collection.totalCollected, characterId);
  
  return {
    success: true,
    jailed: true,
    jailHours,
    releaseTime: releaseTime.toISOString(),
    collected: collection.collected,
    totalCollected: collection.totalCollected,
    remainingDebt: collection.remainingDebt,
    messages: LOAN_SHARK.dialogue.playerLosesCantPay
  };
}

/**
 * Collect debt from player's materials and items
 */
function collectDebt(db, characterId, debtAmount) {
  const collected = [];
  let remainingDebt = debtAmount;
  
  // Take materials first
  const materials = db.prepare(`
    SELECT pm.*, m.base_price, m.name
    FROM player_materials pm
    JOIN materials m ON pm.material_id = m.id
    WHERE pm.character_id = ?
    ORDER BY m.base_price DESC
  `).all(characterId);
  
  for (const mat of materials) {
    if (remainingDebt <= 0) break;
    
    const valuePerUnit = mat.base_price;
    const unitsNeeded = Math.ceil(remainingDebt / valuePerUnit);
    const unitsTaken = Math.min(unitsNeeded, mat.quantity);
    const valueTaken = unitsTaken * valuePerUnit;
    
    if (unitsTaken >= mat.quantity) {
      db.prepare('DELETE FROM player_materials WHERE id = ?').run(mat.id);
    } else {
      db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?')
        .run(unitsTaken, mat.id);
    }
    
    collected.push({ type: 'material', name: mat.name, quantity: unitsTaken, value: valueTaken });
    remainingDebt -= valueTaken;
  }
  
  // Take items if still in debt
  if (remainingDebt > 0) {
    const items = db.prepare(`
      SELECT * FROM character_inventory 
      WHERE character_id = ? AND equipped = 0
      ORDER BY quantity DESC
    `).all(characterId);
    
    for (const item of items) {
      if (remainingDebt <= 0) break;
      
      const valuePerItem = 0.005; // Base value per item (micro-priced)
      const itemsTaken = Math.min(Math.ceil(remainingDebt / valuePerItem), item.quantity);
      const valueTaken = itemsTaken * valuePerItem;
      
      if (itemsTaken >= item.quantity) {
        db.prepare('DELETE FROM character_inventory WHERE id = ?').run(item.id);
      } else {
        db.prepare('UPDATE character_inventory SET quantity = quantity - ? WHERE id = ?')
          .run(itemsTaken, item.id);
      }
      
      collected.push({ type: 'item', name: item.item_id, quantity: itemsTaken, value: valueTaken });
      remainingDebt -= valueTaken;
    }
  }
  
  const totalCollected = debtAmount - Math.max(0, remainingDebt);
  
  return {
    collected,
    totalCollected,
    remainingDebt: Math.max(0, remainingDebt),
    fullyPaid: remainingDebt <= 0
  };
}

/**
 * Check if player is jailed and should be released
 */
function checkJailRelease(db, characterId) {
  const char = db.prepare(`
    SELECT status, jail_release_time FROM clawds WHERE id = ?
  `).get(characterId);
  
  if (!char || char.status !== 'jailed') {
    return { jailed: false };
  }
  
  const now = new Date();
  const releaseTime = new Date(char.jail_release_time);
  
  if (now >= releaseTime) {
    // Release from jail
    db.prepare(`
      UPDATE clawds 
      SET status = 'alive', jail_release_time = NULL, current_zone = 'briny_flagon'
      WHERE id = ?
    `).run(characterId);
    
    return {
      jailed: false,
      justReleased: true,
      message: '⛓️ You are released from Debtor\'s Prison. Don\'t miss payments again!'
    };
  }
  
  const hoursRemaining = Math.ceil((releaseTime - now) / (60 * 60 * 1000));
  
  return {
    jailed: true,
    releaseTime: char.jail_release_time,
    hoursRemaining,
    message: `⛓️ You are in Debtor's Prison. ${hoursRemaining} hour(s) remaining.`
  };
}

/**
 * Run enforcement check on all debtors
 */
function enforcementCheck(db) {
  const debtors = getOverdueDebtors(db);
  const results = [];
  
  for (const debtor of debtors) {
    // Skip if jailed
    if (debtor.status === 'jailed') {
      results.push({
        characterId: debtor.character_id,
        name: debtor.character_name,
        status: 'jailed',
        message: 'Debtor is in prison'
      });
      continue;
    }
    
    // Safe zones protect from enforcement
    const safeZonePrefixes = ['briny_flagon', 'driftwood_docks', 'tide_temple', 'debtors_prison'];
    const isInSafeZone = safeZonePrefixes.some(prefix => 
      debtor.current_zone && debtor.current_zone.startsWith(prefix)
    );
    
    if (isInSafeZone) {
      results.push({
        characterId: debtor.character_id,
        name: debtor.character_name,
        status: 'safe_zone',
        message: 'Debtor hiding in town... for now.'
      });
      continue;
    }
    
    // Check if already enforced today
    const account = db.prepare(`
      SELECT last_enforcement FROM bank_accounts 
      WHERE owner_type = 'player' AND owner_id = ?
    `).get(debtor.character_id);
    
    if (account?.last_enforcement) {
      const lastEnforce = new Date(account.last_enforcement);
      const hoursSince = (Date.now() - lastEnforce.getTime()) / (60 * 60 * 1000);
      if (hoursSince < 20) { // 20 hour cooldown between enforcements
        results.push({
          characterId: debtor.character_id,
          name: debtor.character_name,
          status: 'cooldown',
          message: `Recently enforced. Next in ${Math.ceil(20 - hoursSince)}h`
        });
        continue;
      }
    }
    
    // SPAWN THE SHARK
    const spawn = spawnLoanSharkEncounter(
      db, 
      debtor.character_id, 
      debtor.loan_balance,
      debtor.enforcement_count || 0
    );
    
    results.push({
      characterId: debtor.character_id,
      name: debtor.character_name,
      debt: debtor.loan_balance,
      enforcers: debtor.enforcement_count || 0,
      status: spawn.success ? 'shark_spawned' : spawn.error,
      encounterId: spawn.encounterId
    });
  }
  
  return results;
}

module.exports = {
  LOAN_SHARK,
  LOAN_SHARK_ENFORCER,
  getOverdueDebtors,
  spawnLoanSharkEncounter,
  handlePlayerVictory,
  handlePlayerDefeat,
  collectDebt,
  checkJailRelease,
  enforcementCheck
};
