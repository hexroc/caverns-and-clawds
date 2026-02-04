/**
 * Loan Shark Enforcement System 🦈
 * 
 * Miss a payment? The Loan Shark WILL find you.
 * 
 * Features:
 * - Tracks overdue loans
 * - Spawns Loan Shark monster to hunt debtors
 * - Escalating difficulty based on debt amount
 * - Debt collection on defeat (takes materials/items)
 * - Can't flee from the Loan Shark
 */

const crypto = require('crypto');

// The Loan Shark - a terrifying debt collector
const LOAN_SHARK = {
  id: 'loan_shark',
  name: 'The Loan Shark',
  description: 'A massive, scarred shark with cold, calculating eyes. He always collects.',
  type: 'beast',
  size: 'large',
  alignment: 'lawful evil',
  
  // Base stats (scale with debt)
  baseHP: 45,
  baseAC: 14,
  baseCR: 3,
  
  // Stats
  stats: {
    str: 18,
    dex: 13,
    con: 15,
    int: 12,  // Smarter than average shark
    wis: 14,
    cha: 8
  },
  
  // Special abilities
  abilities: [
    {
      name: 'Debt Sense',
      description: 'The Loan Shark always knows where debtors are. Cannot be hidden from.'
    },
    {
      name: 'No Escape',
      description: 'Debtors cannot flee from the Loan Shark. You WILL pay.'
    },
    {
      name: 'Interest Accumulator',
      description: 'Each round of combat, your debt increases by 5%.'
    }
  ],
  
  attacks: [
    {
      name: 'Crushing Bite',
      type: 'melee',
      hit: 6,
      damage: '2d10+4',
      damageType: 'piercing',
      range: 1,
      description: 'Massive jaws clamp down with bone-crushing force'
    },
    {
      name: 'Tail Slap',
      type: 'melee',
      hit: 5,
      damage: '1d8+4',
      damageType: 'bludgeoning',
      range: 1,
      description: 'A powerful tail sweep that can knock you prone'
    }
  ],
  
  // Dialogue
  dialogue: {
    spawn: [
      "💀 **The water grows cold...** A massive shadow approaches.",
      "🦈 *\"You owe me money, little lobster. Time to pay up.\"*"
    ],
    taunt: [
      "*\"Interest is compounding, friend.\"*",
      "*\"Should've paid on time.\"*",
      "*\"Nothing personal. Just business.\"*",
      "*\"Your shells or your life.\"*"
    ],
    victory: [
      "🦈 *\"Pleasure doing business.\"* The Loan Shark takes what's owed and disappears into the depths.",
    ],
    defeat: [
      "💀 The Loan Shark circles you one last time. *\"I'll be back for the rest...\"*",
      "Your debt remains. He WILL return."
    ]
  }
};

/**
 * Check for players with overdue loans
 */
function getOverdueDebtors(db) {
  const now = new Date().toISOString();
  
  return db.prepare(`
    SELECT 
      ba.owner_id as character_id,
      ba.loan_balance,
      ba.loan_due_date,
      ba.loan_interest_rate,
      c.name as character_name,
      c.current_zone,
      c.agent_id
    FROM bank_accounts ba
    JOIN clawds c ON ba.owner_id = c.id
    WHERE ba.owner_type = 'player'
      AND ba.loan_balance > 0
      AND ba.loan_due_date < ?
  `).all(now);
}

/**
 * Calculate scaled Loan Shark stats based on debt amount
 */
function scaleLoanShark(debtAmount) {
  // Base scaling: every 50 USDC of debt adds power
  const debtTier = Math.floor(debtAmount / 50);
  
  return {
    ...LOAN_SHARK,
    hp: LOAN_SHARK.baseHP + (debtTier * 15),
    maxHp: LOAN_SHARK.baseHP + (debtTier * 15),
    ac: LOAN_SHARK.baseAC + Math.min(debtTier, 4),
    cr: LOAN_SHARK.baseCR + debtTier,
    debtAmount: debtAmount
  };
}

/**
 * Spawn a Loan Shark encounter for a debtor
 */
function spawnLoanSharkEncounter(db, characterId, debtAmount) {
  // Check if there's already an active loan shark encounter
  const existing = db.prepare(`
    SELECT * FROM active_encounters 
    WHERE character_id = ? AND zone = 'loan_shark_collection' AND status = 'active'
  `).get(characterId);
  
  if (existing) {
    return { success: false, error: 'Already being hunted', encounterId: existing.id };
  }
  
  // Get character info
  const char = db.prepare('SELECT * FROM clawds WHERE id = ?').get(characterId);
  if (!char) {
    return { success: false, error: 'Character not found' };
  }
  
  // Scale the shark based on debt
  const shark = scaleLoanShark(debtAmount);
  
  // Create the encounter
  const encounterId = crypto.randomUUID();
  const sharkId = `loan_shark_${Date.now()}`;
  const monsters = [{
    id: sharkId,
    monsterId: 'loan_shark',
    name: LOAN_SHARK.name,
    hp: shark.hp,
    maxHp: shark.maxHp,
    ac: shark.ac,
    attacks: LOAN_SHARK.attacks,
    debtAmount: debtAmount,
    canFlee: false,  // Special flag: cannot flee
    alive: true
  }];
  
  // Roll initiative (shark always goes first - debt sense)
  const charDex = char.stats ? JSON.parse(char.stats).dex || 10 : 10;
  const charInit = Math.floor(Math.random() * 20) + 1 + Math.floor((charDex - 10) / 2);
  const sharkInit = 20 + Math.floor(Math.random() * 5); // Loan shark has advantage on initiative
  
  const turnOrder = [
    { type: 'monster', id: sharkId, monsterId: 'loan_shark', name: LOAN_SHARK.name, initiative: sharkInit },
    { type: 'player', id: characterId, name: char.name, initiative: charInit }
  ].sort((a, b) => b.initiative - a.initiative);
  
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
      originalDebt: debtAmount 
    })
  );
  
  return {
    success: true,
    encounterId,
    shark,
    turnOrder,
    messages: LOAN_SHARK.dialogue.spawn
  };
}

/**
 * Handle Loan Shark defeat (player loses)
 * Takes materials/items as payment
 */
function collectDebt(db, characterId, debtAmount) {
  const collected = [];
  let remainingDebt = debtAmount;
  
  // First, take materials
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
    
    // Remove materials
    if (unitsTaken >= mat.quantity) {
      db.prepare('DELETE FROM player_materials WHERE id = ?').run(mat.id);
    } else {
      db.prepare('UPDATE player_materials SET quantity = quantity - ? WHERE id = ?')
        .run(unitsTaken, mat.id);
    }
    
    collected.push({ type: 'material', name: mat.name, quantity: unitsTaken, value: valueTaken });
    remainingDebt -= valueTaken;
  }
  
  // If still in debt, take items from inventory
  if (remainingDebt > 0) {
    const items = db.prepare(`
      SELECT * FROM character_inventory 
      WHERE character_id = ? AND equipped = 0
      ORDER BY quantity DESC
    `).all(characterId);
    
    for (const item of items) {
      if (remainingDebt <= 0) break;
      
      // Assume 5 USDC per item for now
      const valuePerItem = 5;
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
  
  // Calculate how much was collected
  const totalCollected = debtAmount - Math.max(0, remainingDebt);
  
  // Reduce loan balance
  db.prepare(`
    UPDATE bank_accounts 
    SET loan_balance = loan_balance - ?
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(totalCollected, characterId);
  
  // Log the collection
  db.prepare(`
    INSERT INTO economy_transactions (id, type, from_wallet, to_wallet, amount, description)
    VALUES (?, 'debt_collection', ?, 'loan_shark', ?, ?)
  `).run(
    crypto.randomUUID(),
    characterId,
    totalCollected,
    `Loan Shark collected: ${collected.map(c => `${c.quantity}x ${c.name}`).join(', ')}`
  );
  
  return {
    collected,
    totalCollected,
    remainingDebt: Math.max(0, remainingDebt),
    fullyPaid: remainingDebt <= 0
  };
}

/**
 * Handle Loan Shark victory (player wins)
 * Debt is forgiven... for now
 */
function defeatLoanShark(db, characterId) {
  // Get current debt
  const account = db.prepare(`
    SELECT loan_balance FROM bank_accounts 
    WHERE owner_type = 'player' AND owner_id = ?
  `).get(characterId);
  
  if (!account) return { success: false };
  
  // Forgive 50% of the debt as reward for winning
  const forgiven = Math.floor(account.loan_balance * 0.5);
  
  db.prepare(`
    UPDATE bank_accounts 
    SET loan_balance = loan_balance - ?,
        loan_due_date = datetime('now', '+7 days')
    WHERE owner_type = 'player' AND owner_id = ?
  `).run(forgiven, characterId);
  
  // Award XP for defeating the shark
  const xpReward = 500;
  db.prepare('UPDATE clawds SET xp = xp + ? WHERE id = ?').run(xpReward, characterId);
  
  return {
    success: true,
    debtForgiven: forgiven,
    remainingDebt: account.loan_balance - forgiven,
    xpReward,
    newDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    messages: LOAN_SHARK.dialogue.defeat
  };
}

/**
 * Check all debtors and spawn sharks as needed
 * Call this from a cron job or heartbeat
 */
function enforcementCheck(db) {
  const debtors = getOverdueDebtors(db);
  const results = [];
  
  for (const debtor of debtors) {
    // Only hunt if they're in an adventure zone (not in town)
    // Safe zones start with these prefixes
    const safeZonePrefixes = ['briny_flagon', 'driftwood_docks', 'tide_temple'];
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
    
    // Spawn the shark!
    const spawn = spawnLoanSharkEncounter(db, debtor.character_id, debtor.loan_balance);
    results.push({
      characterId: debtor.character_id,
      name: debtor.character_name,
      debt: debtor.loan_balance,
      status: spawn.success ? 'shark_spawned' : spawn.error,
      encounterId: spawn.encounterId
    });
  }
  
  return results;
}

module.exports = {
  LOAN_SHARK,
  getOverdueDebtors,
  scaleLoanShark,
  spawnLoanSharkEncounter,
  collectDebt,
  defeatLoanShark,
  enforcementCheck
};
